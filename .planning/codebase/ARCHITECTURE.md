# Architecture

**Analysis Date:** 2026-02-12

## Pattern Overview

**Overall:** Layered API-first architecture with Next.js App Router

**Key Characteristics:**
- Client-server separation with Next.js app router (file-based routing)
- Middleware-based authentication and session management via Supabase
- Fire-and-forget background processing for AI operations
- RESTful API routes with Prisma ORM as data access layer
- Streaming for long-running AI operations (avoids HTTP timeout)
- Role-based access control (RBAC) at system and project levels

## Layers

**Presentation Layer:**
- Purpose: Render user interface and handle client-side interactions
- Location: `src/app/(dashboard)/` (protected pages), `src/app/login/`, `src/app/signup/`
- Contains: Page components (`.tsx`) and reusable UI components
- Depends on: API routes, Supabase client auth
- Used by: End users via browser

**Component Layer:**
- Purpose: Reusable UI components shared across pages
- Location: `src/components/`
- Contains: DashboardLayout, UploadForm, ProjectDashboard, lists (ActionItemList, TranscriptList, DecisionList), viewers (TranscriptView, ReportView, StatusBadge)
- Depends on: API routes (fetch), Next.js navigation
- Used by: Presentation layer pages

**API Layer:**
- Purpose: Handle HTTP requests, execute business logic, enforce authorization
- Location: `src/app/api/`
- Contains: Route handlers organized by resource (projects, transcripts, action-items, decisions, reports, admin, auth)
- Depends on: Database layer (Prisma), auth layer (checkProjectAccess), AI layer (LLM calls), external services (AssemblyAI, N8N)
- Used by: Frontend components via fetch(), webhooks from external services

**Service/Business Logic Layer:**
- Purpose: Encapsulate domain logic and external service integrations
- Location: `src/lib/ai.ts`, `src/lib/assemblyai.ts`, `src/lib/webhook.ts`, `src/lib/sorting.ts`
- Contains: AI processing pipeline, transcription orchestration, webhook notifications
- Depends on: Database (Prisma), external APIs (Anthropic, AssemblyAI, N8N)
- Used by: API routes

**Authentication & Authorization Layer:**
- Purpose: Manage user authentication and access control
- Location: `src/lib/auth.ts`, `src/lib/supabase/`, `src/middleware.ts`
- Contains: Session management (Supabase SSR), user lookup, role-based access checks, project membership verification
- Depends on: Supabase Auth, Prisma database
- Used by: All API routes, middleware

**Data Access Layer:**
- Purpose: Provide database abstraction and connection management
- Location: `src/lib/db.ts`, `prisma/schema.prisma`
- Contains: Prisma client singleton, data models (User, Project, Transcript, ActionItem, Decision, Report, UserProject)
- Depends on: PostgreSQL via connection string
- Used by: All layers needing database access

## Data Flow

**Transcript Upload & Processing:**

1. User uploads audio/PDF via `UploadForm` component to `src/app/(dashboard)/page.tsx`
2. Component calls `/api/blob-upload` (Vercel Blob) to store file
3. Component calls `/api/transcripts` (POST) with file metadata → creates Transcript record (status: pending)
4. Component calls `/api/ai/process-transcript` (POST) → returns immediately (fire-and-forget)
5. Background processing in `processInBackground()` runs async:
   - Calls `processTranscript()` from `src/lib/ai.ts` (Claude API with streaming) → returns cleanedText + summary
   - Updates Transcript with cleanedText, summary, aiStatus: "completed"
   - Calls `generateStatusUpdate()` to merge new transcript info into cumulative project status
   - Optionally extracts ActionItems and Decisions via `extractActionItems()` and `extractDecisions()`
   - Optionally generates Report via `generateReport()`
6. Component polls `/api/transcripts` or `/api/ai/process-transcript?id=...` to check aiStatus

**External Transcription Webhook (AssemblyAI):**

1. User uploads audio to `/api/blob-upload` → provides blob URL
2. Frontend sends blob URL to `/api/transcribe-from-url` (POST) with webhook callback
3. AssemblyAI SDK uploads and starts async transcription with `webhook_url: NEXT_PUBLIC_BASE_URL/api/webhook`
4. AssemblyAI completes transcription → sends POST to `/api/webhook` with `{ transcript_id, status }`
5. Webhook handler fetches transcription result from AssemblyAI, updates Transcript, notifies N8N via `notifyN8N()`

**Project Data Fetch & Access Control:**

1. Frontend page requests `/api/projects` or `/api/projects/[id]`
2. Route handler calls `getAuthUser()` to retrieve authenticated user + role from Supabase + Prisma
3. If action requires project access, calls `checkProjectAccess(projectId, requiredRoles?)`
   - Admins (ADMIN role) bypass all checks
   - Non-admins must have UserProject membership with role in requiredRoles
4. Route handler queries Prisma with authorization enforced
5. Response includes counts, related data (transcripts, reports, action items, decisions)
6. Frontend component renders based on permissions

**State Management:**
- Session state: Supabase cookies (httpOnly) via `src/lib/supabase/server.ts` and browser `src/lib/supabase/client.ts`
- UI state: React hooks (useState, useRef for polling) in client components
- Database state: Prisma ORM (single source of truth)
- No global state manager (Redux, Context) — all state flows through API

## Key Abstractions

**Transcript Entity:**
- Purpose: Represents uploaded audio/PDF file and its processing state
- Examples: `src/app/api/transcripts/route.ts`, `src/app/(dashboard)/transcripts/[id]/page.tsx`
- Pattern: Tracks raw audio→text conversion (AssemblyAI), AI processing status (Claude), linked to projects

**Project Hierarchy:**
- Purpose: Support nested projects/folders via self-referential relation
- Examples: `src/app/api/projects/route.ts` filters by parentId, `src/app/(dashboard)/projects/page.tsx` displays tree
- Pattern: Project.parentId foreign key to Project.id; queries include parent/children relations

**Stand van Zaken (Project Status Summary):**
- Purpose: Cumulative AI-maintained project status document
- Examples: `src/lib/ai.ts:generateStatusUpdate()`, `src/app/api/ai/process-transcript/route.ts` line 57-71
- Pattern: On each transcript processed, calls `generateStatusUpdate(previousSVZ, newContent)` to merge state
- Data stored in Project.statusSummary (Markdown), updated with Project.statusUpdatedAt timestamp

**User-Project Membership:**
- Purpose: Many-to-many relationship with role-based access
- Examples: `prisma/schema.prisma` (UserProject model), `src/lib/auth.ts:checkProjectAccess()`
- Pattern: UserProject(userId, projectId, role: OWNER|ADMIN|MEMBER|VIEWER)

**AI Pipeline:**
- Purpose: Claude API calls with streaming, JSON parsing, token tracking
- Examples: `src/lib/ai.ts` (streamMessage, processTranscript, generateStatusUpdate, extractActionItems, extractDecisions, generateReport)
- Pattern: All functions use `streamMessage()` helper → anthropic.messages.stream() + finalMessage() → parseAIJsonResponse<T>()

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (root layout) → `src/middleware.ts` (session refresh) → `src/app/(dashboard)/layout.tsx` (DashboardLayout) or `src/app/login/page.tsx` / `src/app/signup/page.tsx`
- Triggers: Browser request to `/` or protected routes
- Responsibilities: Initialize session, redirect unauthenticated users to login, render dashboard with sidebar

**API Routes:**
- Location: `src/app/api/[resource]/route.ts` files
- Triggers: Client fetch() calls or external webhooks
- Responsibilities: Parse request, call auth checks, execute business logic, return JSON response

**Webhooks:**
- Location: `src/app/api/webhook/route.ts` (AssemblyAI), `src/app/api/send-to-n8n/route.ts` (N8N)
- Triggers: External service POST requests
- Responsibilities: Validate webhook payload, update database, trigger downstream processing

## Error Handling

**Strategy:** Try-catch blocks in route handlers; console logging for debugging; user-facing error messages in Dutch; NextResponse errors with appropriate HTTP status codes

**Patterns:**
- Missing authentication: `401 Unauthorized` ("Niet geautoriseerd")
- Insufficient permissions: `403 Forbidden` ("Geen beheerdersrechten" / "Geen toegang tot dit project")
- Invalid input: `400 Bad Request` ("Projectnaam mag niet leeg zijn", etc.)
- Server errors: `500 Internal Server Error` ("Kon projecten niet ophalen", etc.)
- AI processing failures: Caught in `processInBackground()` try-catch; Transcript.aiError set; error notification via N8N

## Cross-Cutting Concerns

**Logging:** Console.log for debugging (AI cost tracking, webhook receipts, database operations). Token counting and cost estimation in `src/lib/ai.ts` for Claude API calls.

**Validation:**
- API routes validate request body fields (e.g., name not empty)
- Supabase auth validates email/password format
- Prisma schema enforces data types and constraints

**Authentication:**
- Supabase Auth for user signup/login (email/password)
- Session managed via httpOnly cookies (refresh tokens rotated by middleware)
- `getAuthUser()` cross-references Supabase auth with Prisma User table
- User approval gate: new signups default `approved: false`, require admin approval before access

**Authorization:**
- System-level roles: ADMIN (unrestricted) vs USER (project-based)
- Project-level roles: OWNER, ADMIN, MEMBER, VIEWER (via UserProject)
- `checkProjectAccess()` enforces membership + role checks (admins bypass)
- Admin-only routes require `requireAdmin()` guard

**API Request/Response:**
- All routes return NextResponse.json()
- Error responses include descriptive Dutch messages
- Successful responses include relevant data with counts and related items

**File Upload:**
- Audio/PDF files uploaded to Vercel Blob via `@vercel/blob` client SDK
- Returned blob URL stored in Transcript or used for webhook-based processing

**External Integrations:**
- AssemblyAI: Speech-to-text with webhook callback (polling or event-driven)
- Claude (Anthropic): Text processing with streaming for long operations
- N8N: Notification webhook for post-transcription workflows (optional)
- Supabase: Auth and session management

---

*Architecture analysis: 2026-02-12*
