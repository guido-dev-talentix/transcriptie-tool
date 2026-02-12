# Architecture Research: RAG Chat, Asana Integration, and Folder-based Project Organization

> Research dimension: Architecture
> Date: 2026-02-12
> Codebase: transcriptie-tool (Search X / Talentix)

## 1. Current Architecture Summary

### Tech Stack
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM (singleton in `src/lib/db.ts`)
- **Auth**: Supabase Auth with cookie-based SSR sessions (`@supabase/ssr`)
- **AI**: Anthropic Claude Sonnet via `@anthropic-ai/sdk` (streaming)
- **Transcription**: AssemblyAI for speech-to-text
- **File Storage**: Vercel Blob for uploads
- **Styling**: Tailwind CSS with Search X brand tokens

### Route Layout
```
src/app/
  layout.tsx                  -- Root layout (fonts, metadata)
  (dashboard)/                -- Protected route group using DashboardLayout (Sidebar + main)
    page.tsx                  -- Upload page (home)
    projects/                 -- Project listing, detail, sub-pages
    transcripts/              -- Transcript listing, detail
    admin/                    -- Admin user management
    profile/                  -- User profile
  login/, signup/, auth/      -- Public auth pages
  api/
    auth/                     -- Auth endpoints (me, callback)
    projects/[id]/            -- Project CRUD, dashboard, action-items, decisions, members
    transcripts/              -- Transcript CRUD
    ai/process-transcript/    -- Fire-and-forget AI processing
    action-items/             -- Action item CRUD
    decisions/                -- Decision CRUD
    admin/                    -- Admin endpoints
```

### Data Model (Current)
```
User (id, email, role, approved) ------< UserProject >------ Project
                                          (role)               (name, description, status,
                                                                statusSummary, parentId)
                                                                  |
                                          +---Transcript (text, cleanedText, summary, aiStatus)
                                          +---ActionItem (title, priority, assignee, dueDate)
                                          +---Decision (title, context, madeBy)
                                          +---Report (title, content, type)
                                          +---children: Project[] (self-relation via parentId)
```

Key architectural patterns:
- `checkProjectAccess()` in `src/lib/auth.ts` guards all project-scoped API routes
- AI processing is fire-and-forget: POST returns immediately, background function updates DB
- `streamMessage()` helper in `src/lib/ai.ts` wraps all Anthropic calls with streaming + cost logging
- `parseAIJsonResponse()` handles markdown-wrapped JSON extraction
- Project hierarchy already exists via `parentId` self-relation on the `Project` model

### Existing AI Pipeline
```
Upload -> AssemblyAI transcription -> processTranscript() -> [cleanedText + summary]
                                   -> generateStatusUpdate() -> [cumulative statusSummary]
                                   -> extractActionItems() -> [action items]
                                   -> extractDecisions() -> [decisions]
                                   -> generateReport() -> [meeting report]
```

All steps run sequentially in `processInBackground()` within the `api/ai/process-transcript/route.ts` handler. Each optional step has its own try/catch for resilience.

---

## 2. New Feature Components

### 2.1 RAG Chat (per project)

**Purpose**: Allow users to ask questions about their project's transcripts and get answers grounded in actual meeting content.

#### Component Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: ChatPanel component                              │
│  Location: src/components/ChatPanel.tsx                      │
│  - Chat UI with message history                             │
│  - Streaming response display                               │
│  - Project-scoped (receives projectId)                      │
│  - Mounted on project detail page or slide-out panel        │
└─────────────┬───────────────────────────────────────────────┘
              │ POST /api/projects/[id]/chat
              ▼
┌─────────────────────────────────────────────────────────────┐
│  API Route: src/app/api/projects/[id]/chat/route.ts         │
│  - Auth: checkProjectAccess(projectId)                      │
│  - Accepts: { message: string, conversationId?: string }    │
│  - Returns: streaming text/event-stream response            │
│  - Orchestrates retrieval + generation                      │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  RAG Library: src/lib/rag.ts                                │
│  - retrieveContext(projectId, query) -> relevant chunks     │
│  - generateChatResponse(query, context, history) -> stream  │
│  - Uses existing streamMessage() pattern from ai.ts         │
└─────────────┬───────────────────────────────────────────────┘
              │ queries
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Embedding / Vector Layer                                    │
│  Option A: pgvector extension on existing PostgreSQL         │
│  Option B: Dedicated vector DB (Pinecone, Qdrant)           │
│  RECOMMENDATION: pgvector (keeps infra simple)              │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model Additions

```prisma
model ChatConversation {
  id        String        @id @default(cuid())
  title     String?
  projectId String
  userId    String
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  messages  ChatMessage[]
  project   Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User          @relation(fields: [userId], references: [id])
}

model ChatMessage {
  id             String           @id @default(cuid())
  role           String           // 'user' | 'assistant'
  content        String
  sources        Json?            // Array of { transcriptId, chunkIndex, text } for citations
  conversationId String
  createdAt      DateTime         @default(now())
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

model TranscriptChunk {
  id           String   @id @default(cuid())
  transcriptId String
  projectId    String
  chunkIndex   Int
  text         String
  embedding    Unsupported("vector(1536)")?  // pgvector
  createdAt    DateTime @default(now())
  transcript   Transcript @relation(fields: [transcriptId], references: [id], onDelete: Cascade)
  project      Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}
```

#### Data Flow

```
[Transcript created/updated with cleanedText]
       │
       ▼  (hook in processInBackground or separate endpoint)
[Chunking: split cleanedText into ~500-token overlapping chunks]
       │
       ▼
[Embedding: generate embeddings via Anthropic/OpenAI embedding model]
       │
       ▼
[Store: TranscriptChunk rows with vector in pgvector]


[User sends chat message]
       │
       ▼
[Generate query embedding]
       │
       ▼
[Vector similarity search: SELECT * FROM TranscriptChunk
   WHERE projectId = ? ORDER BY embedding <=> query_embedding LIMIT 5]
       │
       ▼
[Build prompt: system instructions + retrieved chunks + conversation history]
       │
       ▼
[Stream Claude response with citations back to client]
       │
       ▼
[Store ChatMessage with sources JSON for audit trail]
```

#### Key Decisions

1. **Embedding model**: Use Voyager/text-embedding-3-small from OpenAI (1536 dims, cheap, fast) or Anthropic's embedding when available. This requires a new API key but keeps embedding cost minimal.

2. **Chunking strategy**: Split on paragraph boundaries with ~500 token chunks and ~50 token overlap. Preserve transcript metadata (title, date) as chunk prefix for better retrieval.

3. **pgvector vs external**: pgvector keeps the stack simple (single database), works well up to ~1M vectors, and avoids another service dependency. For this use case (project-scoped queries over meeting transcripts), the dataset per project will be small enough that pgvector with an IVFFlat index is more than sufficient.

4. **Streaming**: Use the same `anthropic.messages.stream()` pattern. The API route should use Next.js `ReadableStream` to stream tokens to the client via Server-Sent Events or the Web Streams API.

5. **When to embed**: Embed chunks as the final step in `processInBackground()`, after `cleanedText` is available. Also provide a manual "re-index" action per project for rebuilding.

---

### 2.2 Asana API Integration

**Purpose**: Sync action items bidirectionally between the app and Asana, so tasks extracted from transcripts automatically appear in Asana and status updates flow back.

#### Component Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: Integration Settings UI                          │
│  Location: src/components/AsanaIntegration.tsx               │
│  - OAuth connection flow                                    │
│  - Workspace/project mapping configuration                  │
│  - Sync status display                                      │
│  Mounted on: Project settings page or dedicated /settings   │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  API Routes                                                  │
│  src/app/api/integrations/asana/                            │
│    auth/route.ts        -- OAuth2 initiation + callback     │
│    sync/route.ts        -- Manual sync trigger              │
│    webhook/route.ts     -- Asana webhook receiver           │
│    config/route.ts      -- CRUD integration config          │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Integration Library: src/lib/integrations/asana.ts          │
│  - AsanaClient class (wraps Asana REST API)                 │
│  - createTask(actionItem) -> asanaTask                      │
│  - updateTask(externalId, changes) -> asanaTask             │
│  - syncBack(webhookPayload) -> update local ActionItem      │
│  - mapPriority(internal) <-> asana custom field             │
│  - mapStatus(internal) <-> asana section/status             │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Asana REST API (api.asana.com/api/1.0/)                    │
│  - OAuth2 bearer token (stored encrypted per user/project)  │
│  - Tasks, Projects, Sections, Webhooks                      │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model Additions

```prisma
model Integration {
  id           String   @id @default(cuid())
  type         String   // 'asana' (extensible for future: 'jira', 'monday', etc.)
  projectId    String
  userId       String   // Who connected it
  accessToken  String   // Encrypted OAuth token
  refreshToken String?  // Encrypted refresh token
  externalProjectId String?  // Asana project GID
  externalWorkspaceId String?  // Asana workspace GID
  config       Json?    // Flexible config (field mappings, section mappings, etc.)
  status       String   @default("active") // 'active' | 'disconnected' | 'error'
  lastSyncAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user         User     @relation(fields: [userId], references: [id])

  @@unique([projectId, type])
}

// Add to ActionItem model:
// externalId    String?   -- Asana task GID
// externalUrl   String?   -- Link to Asana task
// lastSyncedAt  DateTime? -- When last synced
```

#### Data Flow

```
[Action item created by AI extraction]
       │
       ├──> IF Asana integration active for project:
       │       │
       │       ▼
       │    [asana.createTask(actionItem)] ──> Asana API
       │       │
       │       ▼
       │    [Store externalId on ActionItem]
       │
       ▼
[Action item updated in app UI (status/assignee)]
       │
       ├──> IF has externalId:
       │       │
       │       ▼
       │    [asana.updateTask(externalId, changes)] ──> Asana API
       │
       ▼
[Asana webhook fires on task change]
       │
       ▼
[POST /api/integrations/asana/webhook]
       │
       ▼
[Find ActionItem by externalId, update status/assignee]
```

#### Key Decisions

1. **OAuth2 flow**: Asana uses standard OAuth2. Store tokens encrypted in the `Integration` table. Use Asana's refresh token flow to maintain access.

2. **Sync direction**: Start with push-only (app -> Asana). Add pull (Asana -> app via webhooks) as a second iteration. Webhooks require a publicly accessible URL (Vercel deployment handles this).

3. **Granularity**: Integration is configured per-project, not globally. Each project can be linked to a different Asana project/workspace.

4. **When to sync**: Trigger sync in `processInBackground()` after action items are created. Also sync on manual action item status changes in the PATCH endpoint.

5. **Extensibility**: The `Integration` model uses a `type` field so the same pattern works for Jira, Monday.com, etc. in the future. The library pattern (`src/lib/integrations/asana.ts`) can be replicated for other providers.

6. **Environment variables needed**:
   - `ASANA_CLIENT_ID` -- Asana OAuth app client ID
   - `ASANA_CLIENT_SECRET` -- Asana OAuth app client secret
   - `ASANA_REDIRECT_URI` -- Callback URL

---

### 2.3 Folder-based Project Organization

**Purpose**: Improve project navigation with a tree-based folder structure, leveraging the existing `parentId` self-relation on the `Project` model.

#### Component Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: ProjectTree component                            │
│  Location: src/components/ProjectTree.tsx                    │
│  - Recursive tree rendering with expand/collapse            │
│  - Drag-and-drop for moving projects between folders        │
│  - "New folder" and "New project" actions at any level      │
│  - Inline rename                                            │
│  - Visual distinction between folder and project types      │
│  Mounted in: Sidebar.tsx (replaces flat project link)       │
│              and/or projects listing page                    │
└─────────────┬───────────────────────────────────────────────┘
              │ GET /api/projects?parentId=... (recursive fetch)
              │ PATCH /api/projects/[id] (move: update parentId)
              ▼
┌─────────────────────────────────────────────────────────────┐
│  API Changes                                                 │
│  src/app/api/projects/route.ts                              │
│  - GET: Already supports parentId filter (existing code)    │
│  - GET: Add ?tree=true to return full nested tree           │
│  - POST: Already supports parentId (existing code)          │
│                                                              │
│  src/app/api/projects/[id]/route.ts                         │
│  - PATCH: Add parentId to updateData (move to folder)       │
│  - Add isFolder field support                               │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model Additions

```prisma
// Extend existing Project model:
model Project {
  // ... existing fields ...
  isFolder    Boolean   @default(false)  // Distinguish folders from projects
  sortOrder   Int       @default(0)      // Custom sort within parent
}
```

The `parentId` self-relation and `children` relation already exist in the schema. The main additions are:
- `isFolder` to visually distinguish organizational folders from actual projects
- `sortOrder` for user-customizable ordering within a folder level

#### Data Flow

```
[Sidebar loads]
       │
       ▼
[GET /api/projects?tree=true]
       │
       ▼
[API recursively builds tree structure from flat DB rows]
       │  (or client fetches level-by-level on expand)
       ▼
[ProjectTree renders with expand/collapse state]


[User drags project into folder]
       │
       ▼
[PATCH /api/projects/[id] { parentId: newFolderId, sortOrder: newIndex }]
       │
       ▼
[DB update, re-fetch tree]
```

#### Key Decisions

1. **Loading strategy**: For small datasets (< 200 projects), fetch the full tree in one API call and render client-side. For larger datasets, lazy-load children on expand. Given the expected scale (tens of projects per org), full-tree fetch is simpler and sufficient.

2. **Tree in sidebar vs. page**: Put a compact tree in the Sidebar for navigation, and a full tree view on the `/projects` page for management (drag-and-drop, create folders, etc.).

3. **Folder semantics**: Folders are projects with `isFolder: true`. They can have their own `statusSummary` that aggregates children, or they can be purely organizational. Start with purely organizational.

4. **Access control**: Folder access is determined by child project memberships. If a user has access to any child project, they can see the parent folder. This requires a recursive access check or denormalized access data. Start simple: admins see all; regular users see folders that contain projects they have access to.

5. **Drag-and-drop library**: Use `@dnd-kit/core` for accessible, performant tree DnD. This is the standard React DnD library for tree structures.

---

## 3. Component Interaction Map

```
                                    ┌──────────────────┐
                                    │   Sidebar.tsx     │
                                    │  + ProjectTree    │
                                    └────────┬─────────┘
                                             │ navigates to
                                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Project Detail Page                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ ProjectDashboard │  │  ChatPanel   │  │ AsanaIntegration    │  │
│  │ (existing)       │  │  (new: RAG)  │  │ (new: settings)     │  │
│  │                  │  │              │  │                     │  │
│  │ - Stats          │  │ - Messages   │  │ - OAuth connect     │  │
│  │ - SVZ            │  │ - Input      │  │ - Mapping config    │  │
│  │ - Action Items ──┼──┼──────────────┼──┼─> syncs to Asana    │  │
│  │ - Decisions      │  │ - Citations  │  │ - Sync status       │  │
│  │ - Transcripts    │  │              │  │                     │  │
│  │ - Reports        │  │              │  │                     │  │
│  └────────┬─────────┘  └──────┬───────┘  └──────────┬──────────┘  │
│           │                   │                      │             │
└───────────┼───────────────────┼──────────────────────┼─────────────┘
            │                   │                      │
            ▼                   ▼                      ▼
  /api/projects/[id]/*    /api/projects/[id]/chat   /api/integrations/asana/*
            │                   │                      │
            ▼                   ▼                      ▼
      ┌─────────┐        ┌──────────┐           ┌──────────┐
      │ Prisma  │        │ src/lib/ │           │ src/lib/ │
      │ (DB)    │        │ rag.ts   │           │ integrations/ │
      └─────────┘        └────┬─────┘           │ asana.ts │
                               │                └─────┬────┘
                               ▼                      │
                         ┌──────────┐                 ▼
                         │ pgvector │           ┌──────────┐
                         │ (chunks) │           │ Asana API│
                         └──────────┘           └──────────┘
```

---

## 4. Shared Infrastructure Concerns

### 4.1 Background Processing

The current fire-and-forget pattern in `processInBackground()` works but has limitations:
- No retry mechanism on failure
- No visibility into processing queue
- Vercel serverless functions have execution time limits

**Recommendation for new features**: Continue the fire-and-forget pattern for now (it works on Vercel with long-running functions), but wrap each new background step (embedding, Asana sync) in its own try/catch block, consistent with the existing pattern. If reliability becomes an issue, migrate to a proper job queue (Inngest, Trigger.dev, or Vercel Cron + queue table).

### 4.2 Streaming Responses

RAG chat requires streaming responses to the client. The existing `streamMessage()` helper handles server-side streaming from Anthropic. The new piece is piping this stream through a Next.js API route to the browser.

**Pattern**:
```typescript
// In /api/projects/[id]/chat/route.ts
export async function POST(request: NextRequest) {
  // ... auth, retrieve context ...
  const stream = anthropic.messages.stream({ ... })

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(event.delta)}\n\n`)
            )
          }
        }
        controller.close()
      }
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  )
}
```

### 4.3 Auth Integration Points

All new API routes must follow the existing auth pattern:
- `getAuthUser()` for general auth checks
- `checkProjectAccess(projectId)` for project-scoped routes
- `requireAdmin()` for admin-only routes

The Asana OAuth flow adds a new auth surface: OAuth tokens stored per user per project in the `Integration` table, separate from Supabase auth.

### 4.4 Environment Variables (New)

```
# RAG / Embeddings
OPENAI_API_KEY=...                    # For embedding model (text-embedding-3-small)
                                      # OR use Anthropic embeddings when available

# Asana Integration
ASANA_CLIENT_ID=...                   # Asana OAuth app
ASANA_CLIENT_SECRET=...               # Asana OAuth app
ASANA_REDIRECT_URI=...                # e.g. https://app.example.com/api/integrations/asana/auth/callback

# Optional: Encryption key for storing OAuth tokens
INTEGRATION_ENCRYPTION_KEY=...        # AES-256 key for encrypting stored tokens
```

---

## 5. Build Order and Dependencies

The three features have the following dependency relationships:

```
Phase 1: Folder Organization (no dependencies, improves existing UX)
   │
   ├── Schema: Add isFolder, sortOrder to Project
   ├── API: Extend GET /api/projects with tree support, PATCH with parentId
   ├── Component: ProjectTree.tsx
   ├── Integration: Update Sidebar.tsx, projects page
   │
   ▼
Phase 2: RAG Chat (depends on transcript data, independent of folders)
   │
   ├── Infrastructure: pgvector extension on PostgreSQL
   ├── Schema: ChatConversation, ChatMessage, TranscriptChunk
   ├── Library: src/lib/rag.ts (chunking, embedding, retrieval, generation)
   ├── API: /api/projects/[id]/chat/route.ts
   ├── Background: Add embedding step to processInBackground()
   ├── Component: ChatPanel.tsx
   ├── Integration: Mount on project detail page
   │
   ▼
Phase 3: Asana Integration (depends on action items, ideally after folder org)
   │
   ├── Schema: Integration model, extend ActionItem with external fields
   ├── Library: src/lib/integrations/asana.ts
   ├── API: /api/integrations/asana/* (OAuth, sync, webhook, config)
   ├── Background: Add sync step to processInBackground()
   ├── Component: AsanaIntegration.tsx
   ├── Integration: Mount on project settings, hook into ActionItem PATCH
```

### Rationale for this order

1. **Folder Organization first**: It is the simplest change, requires no new external services, and the schema already supports hierarchy via `parentId`. It improves the UX foundation that RAG chat and integrations will be built on top of. No new dependencies.

2. **RAG Chat second**: It is the highest-value feature for the product (querying meeting transcripts is the core use case). It requires pgvector setup and an embedding API key, but no external service OAuth. It builds on the existing transcript processing pipeline.

3. **Asana Integration third**: It requires external service OAuth, webhook infrastructure, and bidirectional sync logic (the most complex integration surface). It benefits from having the folder structure and project organization in place first, so users can organize their projects before connecting external tools.

### Dependencies between phases

- Phases are **sequential but not blocking**: development on Phase 2 can start before Phase 1 is complete, as they touch different parts of the codebase. Phase 3 truly benefits from Phase 1 being done (project org provides context for which Asana project to link).
- **Within each phase**, the order is: Schema -> Library -> API -> Component -> Integration point.
- All phases share the same auth infrastructure and can reuse the existing `processInBackground()` pattern for their async work.

---

## 6. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| pgvector setup complexity on managed PostgreSQL | Medium | Verify Supabase/provider supports pgvector before starting. Supabase has built-in pgvector support. Fallback: use Supabase's own vector store features. |
| Embedding cost at scale | Low | text-embedding-3-small is $0.02/1M tokens. Even 1000 transcripts at 5000 tokens each = $0.10. Negligible. |
| Vercel serverless timeout for embedding large transcripts | Medium | Chunk embedding can be done in batches. Use the same fire-and-forget pattern with chunked processing. Alternatively, use Vercel Functions with extended timeout (maxDuration). |
| Asana OAuth token management | Medium | Use encrypted storage, implement refresh token rotation, handle token expiration gracefully with user notification. |
| Asana webhook reliability | Low | Implement webhook signature verification. Add a manual "sync now" button as fallback. Store last sync timestamp for debugging. |
| Tree performance with many projects | Low | Expected dataset is small (tens of projects). If needed, add lazy loading. The current `parentId` query pattern is efficient with an index. |

---

## 7. File Map (New Files)

```
src/
  lib/
    rag.ts                              # RAG pipeline (chunk, embed, retrieve, generate)
    integrations/
      asana.ts                          # Asana API client wrapper
      encryption.ts                     # Token encryption utilities
  app/
    api/
      projects/[id]/
        chat/route.ts                   # RAG chat endpoint (streaming)
      integrations/
        asana/
          auth/route.ts                 # OAuth initiation + callback
          sync/route.ts                 # Manual sync trigger
          webhook/route.ts              # Asana webhook receiver
          config/route.ts               # Integration config CRUD
  components/
    ChatPanel.tsx                        # Chat UI component
    ProjectTree.tsx                      # Folder tree component
    AsanaIntegration.tsx                 # Integration settings component
prisma/
  schema.prisma                         # Updated with new models
  migrations/                           # pgvector extension + new tables
```

---

## 8. Quality Gate Checklist

- [x] Components clearly defined with boundaries (Section 2: each feature has frontend component, API route, and library layer)
- [x] Data flow direction explicit (Section 2: each feature has data flow diagrams showing direction of information)
- [x] Build order implications noted (Section 5: three phases with rationale and inter-phase dependencies)
