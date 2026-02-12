# Codebase Concerns

**Analysis Date:** 2026-02-12

## Tech Debt

**Multiple PrismaClient Instances:**
- Issue: Several API routes instantiate new PrismaClient() instead of using the singleton from `src/lib/db.ts`
- Files: `src/app/api/upload/route.ts`, `src/app/api/transcribe-from-url/route.ts`, `src/app/api/saved-destinations/route.ts`, `src/app/api/saved-destinations/[id]/route.ts`
- Impact: Creates connection pool exhaustion risk in production, wastes database connections, violates DRY principle
- Fix approach: Replace all `new PrismaClient()` with `import { prisma } from '@/lib/db'` and use the singleton instance

**Fire-and-Forget Background Processing Without Error Propagation:**
- Issue: `processInBackground()` in `src/app/api/ai/process-transcript/route.ts` (line 241-247) fires without awaiting, and errors are only logged to console
- Files: `src/app/api/ai/process-transcript/route.ts`
- Impact: Failed transcription processing may go unnoticed; client doesn't know if AI processing actually completes; no retry mechanism exists
- Fix approach: Implement job queue (Bull, Inngest, or similar) with persistent retry logic instead of fire-and-forget; or add webhook callback mechanism to notify client of completion

**No Database Transactions for Multi-Step Operations:**
- Issue: AI processing updates transcript, then status summary, then extracts items - all separate queries with no transaction wrapping
- Files: `src/app/api/ai/process-transcript/route.ts` (lines 42-76)
- Impact: Partial failures leave database in inconsistent state; if status update fails after transcript update, data is corrupted
- Fix approach: Wrap related operations in `prisma.$transaction()` blocks

**Missing Cleanup for Cascading Deletes:**
- Issue: Project deletion cascades to transcripts, action items, decisions, reports via Prisma schema (line 88-89 in schema.prisma) but no validation that related data is orphaned elsewhere
- Files: `src/app/api/projects/[id]/route.ts`, `prisma/schema.prisma`
- Impact: Orphaned data in SavedDestination table or external references may break
- Fix approach: Add explicit queries before delete to check for other references; consider soft-delete with deactivation flag instead

## Known Bugs

**Concurrent AI Processing Not Prevented:**
- Symptoms: Multiple requests to process-transcript for same transcript simultaneously could corrupt aiStatus or create duplicate work
- Files: `src/app/api/ai/process-transcript/route.ts`
- Trigger: User rapidly clicking "Process" button or multiple clients triggering same transcript ID
- Current mitigation: aiStatus check exists (line 212) but is not atomic - race condition window exists between check and status update
- Workaround: Add unique constraint on processing transcript ID at database level; use optimistic locking or distributed mutex

**JSON Parsing Fragility in AI Responses:**
- Symptoms: Markdown code block extraction regex may fail on unusual AI output formatting, truncated responses
- Files: `src/lib/ai.ts` (lines 11-19)
- Trigger: When Claude's output contains edge-case formatting, nested code blocks, or starts/ends unexpectedly
- Current mitigation: Fallback extraction logic exists but is loose and may extract wrong JSON
- Workaround: Use Claude's JSON mode (`response_format: { "type": "json_object" }`) instead of parsing markdown

**Transcript Text Can Be NULL When Processing:**
- Symptoms: AI processing silently skips if transcript.text is empty, leaving transcript in "processing" state indefinitely
- Files: `src/app/api/ai/process-transcript/route.ts` (line 204-209)
- Trigger: Malformed uploads or PDF extraction failures that don't error but return empty text
- Current mitigation: Validation exists but error response doesn't explain the issue clearly
- Workaround: Add explicit validation before file storage; catch and report extraction failures immediately

**Saved Destinations Orphaned and Unused:**
- Symptoms: SavedDestination model exists in schema but no API routes manage lifecycle; no foreign keys tie it to users/projects
- Files: `prisma/schema.prisma` (lines 128-134), `src/app/api/saved-destinations/route.ts`, `src/app/api/saved-destinations/[id]/route.ts`
- Trigger: Database accumulates unused destination records over time
- Workaround: Either implement proper SavedDestination management (add user_id FK, implement GET/DELETE properly) or remove from schema entirely

## Security Considerations

**No Authentication on All Public API Routes:**
- Risk: Routes like `/api/transcripts`, `/api/action-items`, `/api/decisions` have no auth check - anyone can read all data
- Files: `src/app/api/transcripts/route.ts`, `src/app/api/action-items/route.ts`, `src/app/api/decisions/route.ts`, `src/app/api/reports/route.ts`
- Current mitigation: None - routes are completely unauthenticated
- Recommendations: Add `getAuthUser()` check at start of all GET handlers; verify user role/project membership before returning data; implement query-level filtering

**Weak Set-Admin Script Without Verification:**
- Risk: `set-admin.js` creates admin users with random IDs and no email verification; can be used to escalate privileges
- Files: `set-admin.js`
- Current mitigation: Script is filesystem-only, not exposed via API, but requires database write access
- Recommendations: Add email domain whitelist validation; log all admin elevation events; require explicit ADMIN_SECRET env var to execute; track admin creation audit trail

**Project Creation Without Authorization:**
- Risk: Endpoint `/api/projects` POST creates projects but doesn't require project ownership or assign creator as owner
- Files: `src/app/api/projects/route.ts` (lines 87-115)
- Current mitigation: None - any authenticated user can create projects orphaned from all users
- Recommendations: Automatically assign creating user as project OWNER; validate user approval status before allowing project creation

**No Rate Limiting on AI Processing Endpoints:**
- Risk: `/api/ai/process-transcript` and `/api/ai/generate-report` have no rate limits; attacker can trigger expensive Claude API calls repeatedly
- Files: `src/app/api/ai/process-transcript/route.ts`, `src/app/api/ai/generate-report/route.ts`
- Current mitigation: None
- Recommendations: Implement rate limiting per user/IP (use Redis or Upstash); add cost tracking; set daily/monthly spend caps

**PDF Upload File Size Not Enforced at Extract Phase:**
- Risk: `/api/upload-pdf` unpdf.extractText() may OOM on huge PDFs; no size limit enforced before extraction
- Files: `src/app/api/upload-pdf/route.ts`
- Current mitigation: None - only file extension checked
- Recommendations: Add file size limit before extracting (recommend 50MB max); implement streaming extraction if possible; add timeout for PDF processing

**Blob Upload Token Exposed via Route:**
- Risk: `/api/blob-upload` route generates Vercel Blob upload tokens that could be intercepted
- Files: `src/app/api/blob-upload/route.ts`
- Current mitigation: HTTPS in production; token has server-side validation
- Recommendations: Add rate limiting per user; validate file type twice (client + server); implement token expiration if not already present

## Performance Bottlenecks

**Unindexed Queries in Project Listing:**
- Problem: `/api/projects` route queries with `users.some` filter (line 53-57) without indexes on UserProject
- Files: `src/app/api/projects/route.ts`
- Cause: Prisma generates inefficient WHERE clause without explicit index on UserProject(userId, projectId)
- Improvement path: Add `@@index([userId, projectId])` to UserProject model; consider denormalizing user count to Project

**N+1 Query in Action Items Listing:**
- Problem: `sortActionItems()` may load related project/transcript/report separately for each item
- Files: `src/app/api/action-items/route.ts` (line 36), `src/lib/sorting.ts` (if it loads relations)
- Cause: Custom sorting function may not batch-load relations efficiently
- Improvement path: Review `src/lib/sorting.ts` implementation; ensure sorting happens in database or with pre-loaded data

**AI Processing Loads Entire Transcript Text Into Memory:**
- Problem: `processTranscript()` streams response but full transcript text passes into prompt; no chunking for huge transcripts
- Files: `src/lib/ai.ts` (line 136-139)
- Cause: Unstructured transcript without pagination or chunking
- Improvement path: Split large transcripts (>50k tokens) into sections; process separately then merge results; track token counts

**Synchronous Transcription Blocking Request Timeout:**
- Problem: `/api/upload` waits for full AssemblyAI transcription before returning (line 52-55) - can exceed Next.js timeout
- Files: `src/app/api/upload/route.ts`
- Cause: Blocking instead of polling; maxDuration=300s but transcription may take longer
- Improvement path: Return immediately with transcription job ID; implement polling endpoint `/api/transcription-status/[id]`; use AssemblyAI webhook for async completion

**No Pagination on Large Result Sets:**
- Problem: GET endpoints return all records without limit - if project has thousands of transcripts, full list loads into memory
- Files: `src/app/api/projects/[id]/route.ts` (line 19-22), `src/app/api/action-items/route.ts` (line 20-33)
- Cause: Missing `take()` and `skip()` in queries except hardcoded `take: 10` in some routes
- Improvement path: Add `limit` and `offset` query params to all GET endpoints; default limit=50, max=500

## Fragile Areas

**AI JSON Parsing with Loose Regex:**
- Files: `src/lib/ai.ts` (parseAIJsonResponse function, lines 7-39)
- Why fragile: Regex extraction depends on exact markdown formatting; fails silently on edge cases; only logs first 500 chars on error
- Safe modification: Validate parsed JSON against TypeScript interface with Zod/Yup before returning; add debug logging for failed parses; implement retry with explicit JSON mode
- Test coverage: No tests for parseAIJsonResponse edge cases (unclosed braces, nested code blocks, etc.)

**Project Hierarchy Without Depth Limits:**
- Files: `prisma/schema.prisma` (lines 51-56), `src/app/api/projects/route.ts`
- Why fragile: Self-referential parentId allows circular references or infinite nesting; no constraint on depth
- Safe modification: Add recursive depth check before creating/updating projects; validate parentId path has <10 levels; add circular reference detection
- Test coverage: No tests for circular parent references or deep nesting edge cases

**Background Processing Fire-and-Forget:**
- Files: `src/app/api/ai/process-transcript/route.ts` (lines 240-247)
- Why fragile: Client returns immediately without knowing if processing will actually happen; unhandled promise rejection could crash handler
- Safe modification: Add error handler to processInBackground() call with `.catch()` logging; better: use job queue system; implement webhook callback to notify client
- Test coverage: No tests for background processing failures or timeout scenarios

**Manual Set-Admin Script Without Audit Trail:**
- Files: `set-admin.js`
- Why fragile: Creates users outside normal signup flow; no audit logging; random IDs could collide
- Safe modification: Replace with API endpoint guarded by ADMIN_SECRET env var; log all admin creation with timestamp/IP; use UUID v4 instead of random substr
- Test coverage: No integration tests for privilege escalation attempts

## Scaling Limits

**Database Connection Pool Exhaustion:**
- Current capacity: Prisma default pool ~10 connections; multiple PrismaClient instances × ~20 Lambda/serverless functions = 200+ potential connections
- Limit: PostgreSQL default max_connections ~100; hits ceiling under moderate load
- Scaling path: Use Prisma connection pooling; migrate to PgBouncer; consolidate all PrismaClient to singleton; implement connection timeout/retry

**AssemblyAI API Quota Not Tracked:**
- Current capacity: Depends on subscription tier (not specified in code)
- Limit: Unknown - no tracking of API usage or quota exhaustion
- Scaling path: Implement usage tracking in database; add warning when >80% quota used; queue transcription requests if quota low; implement daily budget cap

**Blob Storage Unbounded:**
- Current capacity: Vercel Blob default account limits (typically 1TB)
- Limit: File size limit is 100MB per file but no account-level quota tracking
- Scaling path: Implement storage quota per project/user; auto-delete old transcripts after 90 days; implement storage monitoring; add S3 as fallback when Blob quota nears

**AI Token Spending Unbounded:**
- Current capacity: No daily/monthly spend cap configured
- Limit: Unknown - could reach hundreds of dollars per day on high usage
- Scaling path: Add token counting before each AI call; implement daily spend limit with user notification; track cost per project; implement cheaper model fallback (Claude Haiku for simple summarization)

## Dependencies at Risk

**@anthropic-ai/sdk ^0.72.1:**
- Risk: Pinned with caret (~0.72.x) allows breaking changes in minor versions; Claude model IDs change frequently
- Impact: Model 'claude-sonnet-4-20250514' may become unavailable without code change
- Migration plan: Implement model selection strategy (fallback to Haiku if Sonnet unavailable); add explicit version pins for models in code; monitor Anthropic API deprecation notices

**assemblyai ^4.6.1:**
- Risk: No error handling for rate limits; API deprecation could break transcription pipeline
- Impact: Transcription endpoint may return 429 or 503 without retry logic
- Migration plan: Add exponential backoff retry for AssemblyAI errors; monitor API status page; implement fallback to local speech-to-text if needed; track API cost

**Prisma ^5.17.0:**
- Risk: Auto-generated Prisma Client in postinstall hook can fail silently; schema changes not tested before deployment
- Impact: Deployment breaks if schema.prisma is invalid
- Migration plan: Add schema validation in CI; run `prisma generate` in build step; use `prisma migrate` instead of `prisma db push` for version safety

**next ^16.1.6:**
- Risk: Major version bump; breaking changes in middleware, app router, or edge functions
- Impact: Unknown - middleware.ts uses Supabase updateSession which may not be compatible with newer Next.js
- Migration plan: Lock to ^16.1.6 explicitly; test with ^17.0.0 before upgrading; check Supabase SSR compatibility

## Missing Critical Features

**No Audit Logging for Data Changes:**
- Problem: No record of who created/modified/deleted projects, transcripts, action items
- Blocks: Compliance requirements, forensics, user accountability
- Impact: Cannot investigate data loss or security incidents

**No Data Retention/Deletion Policies:**
- Problem: Transcripts and reports accumulate forever; no GDPR-compliant data deletion
- Blocks: Meeting privacy requirements, compliance audits
- Impact: Legal liability for storing PII indefinitely

**No Conflict Resolution for Concurrent Edits:**
- Problem: If two users edit action item status simultaneously, one change is overwritten
- Blocks: Multi-user collaboration scenarios
- Impact: Data loss, user frustration

**No Full-Text Search:**
- Problem: Searching transcripts by content requires slow ILIKE queries
- Blocks: Scaling to thousands of transcripts
- Impact: Search performance degrades linearly with data size

**No Webhook Retry Strategy:**
- Problem: `/api/webhook` route has no retry or dead-letter queue for failed N8N integrations
- Blocks: Reliable external system integration
- Impact: Events silently lost if N8N is temporarily down

## Test Coverage Gaps

**AI JSON Parsing Edge Cases Not Tested:**
- What's not tested: Markdown formatting variations, truncated responses, nested JSON, invalid UTF-8
- Files: `src/lib/ai.ts` parseAIJsonResponse (lines 7-39)
- Risk: Production failures on Claude output edge cases go undetected
- Priority: High - this function is critical path for all AI processing

**Authorization Checks Not Systematized:**
- What's not tested: Project access control across all 29 API routes, role-based filtering, admin bypass edge cases
- Files: `src/app/api/**/route.ts` (scattered authorization logic)
- Risk: Security vulnerabilities go undetected; privilege escalation bugs slip through
- Priority: High - authorization is security-critical

**Fire-and-Forget Processing Reliability Not Tested:**
- What's not tested: Partial failures in processInBackground(), database update failures, retry behavior
- Files: `src/app/api/ai/process-transcript/route.ts` (lines 12-174)
- Risk: Silent failures when AI processing crashes; client unaware of state
- Priority: High - directly impacts core feature

**Database Transaction Edge Cases Not Tested:**
- What's not tested: Concurrent updates to same transcript, race conditions on status updates, constraint violations
- Files: `src/app/api/ai/process-transcript/route.ts` and AI functions
- Risk: Data corruption under concurrent load
- Priority: High - affects data integrity

**Cascading Deletes Not Tested:**
- What's not tested: Deleting projects with nested children, orphaned references, FK constraint violations
- Files: `src/app/api/projects/[id]/route.ts` DELETE handler
- Risk: Partial deletes leave invalid state; orphaned data accumulates
- Priority: Medium - impacts data cleanup

---

*Concerns audit: 2026-02-12*
