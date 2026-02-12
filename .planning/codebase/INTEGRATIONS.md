# External Integrations

**Analysis Date:** 2026-02-12

## APIs & External Services

**AI Processing:**
- Anthropic Claude API - AI-powered transcript processing, summarization, action item extraction, decision extraction, and report generation
  - SDK/Client: `@anthropic-ai/sdk` 0.72.1
  - Implementation: `src/lib/ai.ts`
  - Model: `claude-sonnet-4-20250514`
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Key functions:
    - `processTranscript()` - Cleans raw transcript text and generates summaries
    - `generateStatusUpdate()` - Maintains cumulative project status ("Stand van Zaken")
    - `extractActionItems()` - Extracts action items from transcript
    - `extractDecisions()` - Extracts decisions from transcript
    - `generateReport()` - Generates meeting/weekly/summary reports
  - Uses streaming API with 10+ minute timeout support

**Speech-to-Text:**
- AssemblyAI - Automated speech recognition for audio transcription
  - SDK/Client: `assemblyai` 4.6.1
  - Implementation: `src/lib/assemblyai.ts`
  - Auth: `ASSEMBLYAI_API_KEY` environment variable
  - Key functions:
    - `uploadAndTranscribe()` - Upload audio and start transcription
    - `getTranscriptionStatus()` - Check transcription progress
    - `getSubtitles()` - Retrieve SRT/VTT subtitle format
  - Features: Language detection, webhook callbacks for async completion

## Data Storage

**Primary Database:**
- PostgreSQL
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM 5.17.0
  - Schema file: `prisma/schema.prisma`
  - Connection pattern: Singleton `PrismaClient` in `src/lib/db.ts`
  - Core models:
    - `User` - System users with roles (ADMIN, USER) and approval status
    - `Project` - Projects with optional hierarchy (parentId for nesting)
    - `Transcript` - Transcribed content with processing status
    - `ActionItem` - Tasks extracted from transcripts/reports
    - `Decision` - Decisions extracted from transcripts
    - `Report` - Generated meeting/summary reports
    - `UserProject` - Many-to-many project membership with roles
    - `SavedDestination` - Saved export destinations (Slack, Gmail)

**File Storage:**
- Vercel Blob - Cloud file storage for audio and PDF uploads
  - SDK: `@vercel/blob` 2.0.1
  - Auth: `BLOB_READ_WRITE_TOKEN` environment variable
  - Used for:
    - Audio file uploads before transcription
    - PDF document uploads

**Caching:**
- In-memory session caching via Supabase (no explicit Redis/cache layer)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - PostgreSQL-backed authentication service
  - Server client: `src/lib/supabase/server.ts` (cookie-based sessions for Server Components)
  - Browser client: `src/lib/supabase/client.ts` (auth for Client Components)
  - Middleware: `src/lib/supabase/middleware.ts` (session refresh and redirect to /login)
  - Implementation: `@supabase/ssr` 0.8.0 with cookie-based session management

**Authorization Model:**
- System-level roles: `ADMIN` | `USER` (stored in `User.role`)
- User approval: `User.approved` boolean - new signups require admin approval
- Project-level roles via `UserProject` table: `OWNER` | `ADMIN` | `MEMBER` | `VIEWER`
- Admin bypass: Admins have access to all projects and can bypass role checks
- Auth helpers: `src/lib/auth.ts`
  - `getAuthUser()` - Get current authenticated user with role/approval
  - `requireAdmin()` - Guard admin-only routes
  - `checkProjectAccess(projectId, requiredRoles?)` - Verify project membership

**Authentication Flow:**
1. User signs up via `/app/signup/` or logs in via `/app/login/`
2. Middleware redirects unauthenticated users to `/login`
3. Session validated on each request via `src/middleware.ts`
4. Protected dashboard pages in `src/app/(dashboard)/` require valid session

## Monitoring & Observability

**Error Tracking:**
- None detected - Application logs errors to console only

**Logs:**
- Console logging in development/production
  - AI call metrics logged in `src/lib/ai.ts` (duration, token usage, cost)
  - Webhook events logged in `src/app/api/webhook/route.ts`
  - N8N webhook attempts logged in `src/lib/webhook.ts`

**Debugging:**
- No external error tracking service (Sentry, etc.) configured

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from `@vercel/blob` integration and Next.js 16 compatibility)

**CI Pipeline:**
- None detected - No GitHub Actions or CI configuration found

**Deployment Requirements:**
- PostgreSQL database accessible via `DATABASE_URL`
- Supabase project for auth
- API keys configured as environment variables

## Environment Configuration

**Required environment variables:**
- `ANTHROPIC_API_KEY` - Claude API key
- `ASSEMBLYAI_API_KEY` - AssemblyAI API key
- `DATABASE_URL` - PostgreSQL connection string (postgresql://user:password@host/db)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, safe in client code)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `NEXT_PUBLIC_BASE_URL` - Application URL (e.g., https://app.searchx.com)

**Optional environment variables:**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob write token (required for file uploads)
- `N8N_WEBHOOK_URL` - N8N integration webhook URL (optional, notifications skipped if missing)

**Secrets location:**
- `.env.local` - Local development (git-ignored)
- `.env.production.local` - Production secrets (git-ignored)
- Deployment platform env vars (Vercel dashboard or similar)

## Webhooks & Callbacks

**Incoming (AssemblyAI → Application):**
- `POST /api/webhook` - Receives transcription completion/error notifications from AssemblyAI
  - Expected payload: `{ transcript_id: string, status: "completed" | "error" }`
  - Actions on completion:
    - Fetch full transcription result from AssemblyAI
    - Retrieve SRT subtitles
    - Update `Transcript` record with text, SRT, duration, language
    - Notify N8N integration
  - Webhook URL configured in `src/lib/assemblyai.ts` via `webhookUrl` parameter
  - URL must be publicly accessible (set via `NEXT_PUBLIC_BASE_URL`)

**Outgoing (Application → N8N):**
- `POST {N8N_WEBHOOK_URL}` - Sends transcription completion notifications to N8N
  - Payload: `{ event: "transcription_complete", timestamp: ISO string, transcriptId, filename, status, text, duration, destination }`
  - Source: `src/lib/webhook.ts` `notifyN8N()` function
  - Called from `src/app/api/webhook/route.ts` when transcription completes
  - Optional: If `N8N_WEBHOOK_URL` not configured, notifications are skipped (not an error)

**Webhook Error Handling:**
- N8N webhook failures logged to console but don't fail the main flow
- Webhook route returns 200 regardless of N8N status

## Third-Party Service Dependencies

**Summary of External Dependencies:**
1. **Anthropic Claude API** - Critical for AI processing (no fallback)
2. **AssemblyAI** - Critical for speech-to-text (no fallback)
3. **PostgreSQL** - Critical for data persistence
4. **Supabase Auth** - Critical for user authentication
5. **Vercel Blob** - Required for file uploads
6. **N8N** - Optional integration (graceful degradation if unavailable)

**API Rate Limiting:**
- No rate limiting configuration detected in application code
- Relies on external service rate limits (Anthropic, AssemblyAI, Supabase)

---

*Integration audit: 2026-02-12*
