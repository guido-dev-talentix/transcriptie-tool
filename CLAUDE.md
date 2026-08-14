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
- **AI**: Anthropic Claude API (`src/lib/ai.ts`) for transcript processing, status updates, and report generation
- **Transcription**: AssemblyAI (`src/lib/assemblyai.ts`) for speech-to-text
- **File Storage**: Vercel Blob for uploads
- **Styling**: Tailwind CSS with Search X brand design tokens (see `tailwind.config.js`)

### Route Structure
- `src/app/(dashboard)/` — Protected pages using `DashboardLayout` (sidebar + main content)
- `src/app/login/`, `src/app/signup/`, `src/app/auth/` — Public auth pages
- `src/app/api/` — API route handlers

### Authentication & Authorization
- **Middleware** (`src/middleware.ts`): Redirects unauthenticated users to `/login` via Supabase session check
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

## CLI (directe database-toegang)

Er is een globaal commando `transcriptie` (wrapper naar `scripts/cli.mjs`, installatie via `scripts/install-cli.sh`) dat rechtstreeks uit de database leest — bedoeld om transcripties zonder knippen en plakken in een terminal of Claude-sessie te krijgen:

```bash
transcriptie list [-n 20] [--zoek term] [--alles]  # recente transcripties
transcriptie get <id|id-prefix>                    # opgeschoonde tekst naar stdout
transcriptie laatste                               # meest recente transcriptie
transcriptie zoek <term>                           # zoek in titel/bestand/tekst
```

Meta-info gaat naar stderr, stdout bevat alleen tekst (pipe-vriendelijk). Privé-transcripties van anderen worden standaard verborgen (`CLI_USER_EMAIL`, default guido@searchxrecruitment.com); `--alles` toont ze wel.

## Privé-transcripties

`Transcript.isPrivate` maakt een transcriptie alleen zichtbaar voor de eigenaar (`userId`) — ook admins zien hem niet (routes geven 404 om het bestaan niet te lekken). Privé-transcripties kunnen niet aan een project gekoppeld worden (anders zouden actiepunten/besluiten/verslagen in gedeelde projecten lekken); AI-verwerking doet dan alleen opschonen + samenvatting. Filter-helpers: `getTranscriptViewer()`, `transcriptPrivacyWhere()` en `canViewTranscript()` in `src/lib/auth.ts` — gebruik die in elke nieuwe route die transcripties leest.

## Environment Variables

Required:
- `ASSEMBLYAI_API_KEY` — AssemblyAI speech-to-text
- `ANTHROPIC_API_KEY` — Claude AI processing
- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_BASE_URL` — App URL (for webhooks)

Optional:
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage
- `N8N_WEBHOOK_URL` — N8N integration webhook
