# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Transcriptie Tool is a Next.js application for audio/PDF transcription and AI-powered meeting intelligence, branded as "Search X" (Talentix). It transcribes audio via AssemblyAI, processes transcripts with Claude AI (Anthropic), and organizes results into projects with action items, decisions, and reports.

The application language is **Dutch** (nl) — all UI text, error messages, and AI prompts are in Dutch.

## Commands

```bash
npm run dev          # Start development server (Next.js)
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio (database GUI)
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM (`src/lib/db.ts` — singleton pattern)
- **Auth**: Supabase Auth with cookie-based sessions (`@supabase/ssr`)
- **AI**: Claude via OpenRouter (`src/lib/ai.ts`) for transcript processing, status updates, and report generation
- **Transcription**: AssemblyAI (`src/lib/assemblyai.ts`) for speech-to-text — asynchroon via webhook + polling
- **Uploads**: in stukken van 16 MB naar `/api/upload/chunk` (tijdelijk op schijf, `src/lib/uploads.ts`), daarna `/api/upload/complete` streamt ze naar AssemblyAI. Geen externe file storage
- **Hosting**: Docker-container op de agents-VPS achter Caddy (zie Hosting & deploy)
- **Styling**: Tailwind CSS with Search X brand design tokens (see `tailwind.config.js`)

### Route Structure
- `src/app/(dashboard)/` — Protected pages using `DashboardLayout` (sidebar + main content)
- `src/app/login/`, `src/app/signup/`, `src/app/auth/` — Public auth pages
- `src/app/api/` — API route handlers

### Upload- en transcriptieflow
1. `UploadForm` splitst het bestand in stukken van 16 MB en PUT elk stuk naar `/api/upload/chunk?uploadId&index` (retry per stuk, voortgang via XHR); de server streamt elk stuk naar schijf. Max 2 GB (`MAX_UPLOAD_BYTES`); gedeelde constanten in `src/lib/upload-constants.ts` (geen node-imports, ook client-side).
2. `/api/upload/complete` controleert of alle stukken binnen zijn, streamt ze naar AssemblyAI, start de transcriptie met `webhook_url` = `NEXT_PUBLIC_BASE_URL/api/webhook` (alleen bij https) en maakt dán pas het `Transcript` aan (`status: 'processing'`, met `assemblyId`). Tijdelijke stukken worden bij elke uitkomst opgeruimd.
3. Resultaat komt binnen via `/api/webhook` (beveiligd met header `x-transcriptie-webhook-secret` = `ASSEMBLYAI_WEBHOOK_SECRET`) óf via polling: `GET /api/transcripts/[id]` haalt de status bij AssemblyAI op zolang hij `processing` is (`syncTranscriptWithAssemblyAI` in `src/lib/assemblyai.ts`). Lokaal (localhost) werkt alleen de polling-route.
4. `UploadForm`, `TranscriptList` en `TranscriptView` pollen tot `completed`/`error`; daarna start de AI-verwerking.

Waarom chunks: Node kapt één lange request standaard na 300 s af (`server.requestTimeout`) en een haperende verbinding zou anders het hele bestand opnieuw moeten sturen.

**Valkuil:** routes met grote request-bodies (`/api/upload/*`, `/api/upload-pdf`) staan bewust *buiten* de middleware-matcher (`src/middleware.ts`). De Next-middleware kapt bodies af zodra hij zelf iets awaitt (de Supabase-sessiecheck): van 16 MB kwam ~10 MB aan, zonder foutmelding. Nieuwe upload-routes daar ook uitsluiten en zelf `requireUser()` aanroepen.

### Authentication & Authorization
- **Middleware** (`src/middleware.ts`): Redirects unauthenticated users to `/login` via Supabase session check. Uitzonderingen zonder sessie: `/api/cli` (Bearer-token), `/api/webhook` (geheime header), `/api/cron` (`CRON_SECRET`), `/api/version` (publiek)
- **Supabase clients**: Server (`src/lib/supabase/server.ts`) and browser (`src/lib/supabase/client.ts`) — use the correct one based on context
- **Auth helpers** (`src/lib/auth.ts`):
  - `getAuthUser()` — Returns authenticated user with role/approval status from the `User` table
  - `requireAdmin()` — Guards admin-only routes
  - `checkProjectAccess(projectId, requiredRoles?)` — Verifies project membership; admins bypass checks
- **User roles**: `ADMIN` | `USER` (system-level); project roles: `OWNER` | `ADMIN` | `MEMBER` | `VIEWER`
- **User approval**: Users have an `approved` boolean — new signups need admin approval

### Data Model (Prisma)
Core entities: `User`, `Project` (supports hierarchy via `parentId`), `Transcript`, `ActionItem`, `Decision`, `Report`, `UserProject` (many-to-many with role), `SavedDestination`

Key relationships:
- Projects can be nested (parent/child via `ProjectHierarchy` self-relation)
- Transcripts, ActionItems, Decisions, and Reports belong to Projects
- ActionItems and Decisions can be linked to source Transcripts
- Projects have a cumulative `statusSummary` ("Stand van Zaken") auto-updated by AI

### AI Processing Pipeline (`src/lib/ai.ts`)
All AI functions use Claude Sonnet and return JSON parsed via `parseAIJsonResponse()`:
1. `processTranscript()` — Cleans raw transcript text + generates summary
2. `generateStatusUpdate()` — Maintains cumulative project status ("Stand van Zaken") by merging new transcript info with existing status
3. `generateReport()` — Generates meeting reports, weekly summaries, or general summaries

The AI process-transcript endpoint (`src/app/api/ai/process-transcript/route.ts`) uses fire-and-forget background processing — it returns immediately and updates the database asynchronously.

### Import Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`)

## CLI

Er is een globaal commando `transcriptie` (`scripts/cli.mjs`, installatie via `scripts/install-cli.sh`) om transcripties zonder knippen en plakken in een terminal of Claude-sessie te krijgen:

```bash
transcriptie list [-n 20] [--zoek term]  # recente transcripties
transcriptie get <id|id-prefix>          # opgeschoonde tekst naar stdout
transcriptie laatste                     # meest recente transcriptie
transcriptie zoek <term>                 # zoek in titel/bestand/tekst
```

Meta-info gaat naar stderr, stdout bevat alleen tekst (pipe-vriendelijk).

Twee verbindingsmodi: met `TRANSCRIPTIE_TOKEN` gezet praat de CLI via `/api/cli/*` met de productie-app (werkt op elke machine, geen repo of database nodig, respecteert de privacy-filters van de token-eigenaar); zonder token leest hij rechtstreeks uit de database via `DATABASE_URL`. Tokens beheer je onder Mijn Profiel → CLI-tokens. Uitleg voor gebruikers: `CLI-UITLEG.md`.

## Privé-transcripties

`Transcript.isPrivate` maakt een transcriptie alleen zichtbaar voor de eigenaar (`userId`) — ook admins zien hem niet (routes geven 404 om het bestaan niet te lekken). Privé-transcripties kunnen niet aan een project gekoppeld worden (anders zouden actiepunten/besluiten/verslagen in gedeelde projecten lekken); AI-verwerking doet dan alleen opschonen + samenvatting. Filter-helpers: `getTranscriptViewer()`, `transcriptPrivacyWhere()` en `canViewTranscript()` in `src/lib/auth.ts` — gebruik die in elke nieuwe route die transcripties leest.

## Hosting & deploy

Productie: https://transcriptie.talentix.ai — Docker-container `transcriptie` op de **agents-VPS** (`root@159.223.11.74`, dezelfde machine als Cyrus), map `/opt/transcriptie`, achter Caddy (`/opt/caddy/Caddyfile.active`, automatische TLS, `proxy-network`). Geen host-poort; alleen via Caddy bereikbaar. `mem_limit` 768 MB omdat Cyrus dezelfde 4 GB deelt. Database (Neon), Supabase Auth, AssemblyAI en OpenRouter zijn extern en staan niet op de VPS.

**Deploy = merge naar `main`.** `.github/workflows/deploy.yml` rsynct de repo naar de VPS, draait `docker compose --env-file .env.production up -d --build` en controleert dat `GET /api/version` de nieuwe commit-sha teruggeeft. Secret `VPS_SSH_KEY` in de GitHub-repo. `.env.production` staat alléén op de server (`/opt/transcriptie/.env.production`) en wordt door rsync met rust gelaten.

Handmatige fallback vanaf de VPS:
```bash
cd /opt/transcriptie && GIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo manual) docker compose --env-file .env.production up -d --build
docker logs -f transcriptie
```

Neon slaapt in bij inactiviteit; een cron op de VPS pingt elke 4 min `/api/cron/keep-alive` met `Authorization: Bearer $CRON_SECRET`.

De oude Vercel-deployment (`transcriptie-tool.vercel.app`) redirect alleen nog naar het nieuwe domein.

## Environment Variables

Required:
- `ASSEMBLYAI_API_KEY` — AssemblyAI speech-to-text
- `ASSEMBLYAI_WEBHOOK_SECRET` — geheime header voor `/api/webhook` (`openssl rand -hex 32`)
- `OPENROUTER_API_KEY` — AI-verwerking (`src/lib/ai.ts`)
- `DATABASE_URL` — PostgreSQL connection string (Neon)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_BASE_URL` — App URL (webhook-URL, auth-redirects); build-arg én runtime-env

Optional:
- `N8N_WEBHOOK_URL` — N8N integration webhook
- `CRON_SECRET` — beveiligt `/api/cron/keep-alive`
- `UPLOAD_TMP_DIR` — map voor upload-stukken (Docker: `/app/uploads`, volume)
- `MAX_UPLOAD_BYTES` — max bestandsgrootte (standaard 2 GB)
