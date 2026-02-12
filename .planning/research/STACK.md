# Technology Stack

**Project:** Search X -- RAG Chat, Asana Integration, UX Improvements
**Researched:** 2026-02-12
**Note:** WebSearch and WebFetch were unavailable during research. Versions are based on training data (cutoff May 2025) and npm registry snapshots. All versions marked LOW confidence should be verified with `npm view [package] version` before installation.

---

## Recommended Stack Additions

The existing stack (Next.js 16, Prisma 5, Supabase, Vercel, Anthropic, AssemblyAI) is not changing. Below are additions organized by feature area.

### 1. RAG / Chat over Transcripts

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase pgvector | (Supabase-managed) | Vector storage + similarity search | Already using Supabase/PostgreSQL. pgvector is a Postgres extension enabled in Supabase dashboard -- no new infra. Keeps everything in one database. | HIGH |
| OpenAI Embeddings API | `text-embedding-3-small` | Generate text embeddings | Anthropic does not offer an embeddings API. OpenAI's `text-embedding-3-small` is the standard choice: 1536 dimensions, $0.02/1M tokens, excellent quality-to-cost ratio. Voyage AI is an alternative but adds another vendor for minimal benefit. | HIGH |
| `openai` (npm) | ^4.x | OpenAI SDK for embeddings only | Official SDK, well-maintained. Only used for embeddings -- all LLM calls stay on Anthropic. | MEDIUM (verify latest 4.x) |
| `ai` (Vercel AI SDK) | ^4.x | Streaming chat UI, `useChat` hook | Provides `useChat()` React hook for streaming chat, handles SSE, message history, abort. Works with any LLM provider via adapters. De facto standard for AI chat in Next.js apps. | MEDIUM (verify latest 4.x) |
| `@ai-sdk/anthropic` | ^1.x | Anthropic provider for Vercel AI SDK | Connects Vercel AI SDK's `streamText()` to Claude. Replaces raw `@anthropic-ai/sdk` streaming for the chat feature only. | MEDIUM (verify latest) |

**Architecture decision:** Use Supabase pgvector over a dedicated vector DB (Pinecone, Weaviate, Qdrant).

Rationale:
- The app already has PostgreSQL via Supabase. pgvector is a Postgres extension -- enable it, add a vector column, done.
- Transcript volume is modest (a lean team generates maybe 10-50 transcripts/month). At this scale, pgvector with IVFFlat or HNSW index is more than sufficient.
- No new infrastructure, no new billing, no new SDK to learn.
- If you outgrow pgvector (millions of vectors), migrate to a dedicated vector DB later. That threshold is far away for a 4-person team.

**Embedding model decision:** Use `text-embedding-3-small` over `text-embedding-3-large`.

Rationale:
- 1536 dimensions vs 3072 -- half the storage, faster similarity search.
- Quality difference is negligible for document-level semantic search over meeting transcripts.
- 10x cheaper than `text-embedding-3-large`.
- The `small` model is the community standard for RAG in production.

**Chat SDK decision:** Use Vercel AI SDK over raw Anthropic streaming.

Rationale:
- The existing `streamMessage()` helper in `src/lib/ai.ts` works for fire-and-forget processing. But chat needs real-time token streaming to the browser, message history management, and abort capability.
- Vercel AI SDK's `useChat()` hook handles all of this out of the box. It provides a React hook that manages messages, sends them to an API route, and streams responses back.
- The `@ai-sdk/anthropic` provider wraps Claude -- same model, better DX for chat UIs.
- Keep the existing `streamMessage()` helper for non-chat AI processing (transcript cleaning, action items, etc.). Only use Vercel AI SDK for the chat feature.

### 2. Asana Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `asana` (npm) | ^3.x | Official Asana Node.js SDK | Official client library. Handles auth, pagination, rate limiting. One-way push (create tasks) is simple. | MEDIUM (verify latest 3.x) |

**Architecture decision:** Use the official `asana` npm package over raw REST calls.

Rationale:
- Asana's REST API is straightforward, but the official SDK handles token refresh (for OAuth), pagination, and rate limit retry automatically.
- The integration scope is narrow: push action items as tasks. The SDK's `tasks.create()` is a single function call.
- Authentication: Use Personal Access Token (PAT) for the initial implementation. OAuth2 can be added later if multiple Asana accounts are needed.

**What NOT to use:**
- `node-asana` (deprecated, old package name -- the current one is just `asana`)
- Zapier/Make -- unnecessary middleware for a single API call
- n8n for Asana (already have n8n webhook, but a direct SDK call is simpler and more reliable for this use case)

### 3. UX Improvements

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| (no new packages) | -- | Folder structure, dashboard polish | These are code-level changes using existing Tailwind + React + Prisma. No new dependencies needed. | HIGH |

**Rationale:** The folder structure is a data model change (Project.type field or a `Folder` model) + UI changes. The dashboard polish is Tailwind styling + component restructuring. Neither requires new libraries.

**What NOT to add for UX:**
- `@headlessui/react` or `@radix-ui/react-*` -- The app uses simple custom components with Tailwind. Adding a component library now would mean rewriting existing UI for consistency. Not worth it for the scope of changes planned.
- `react-beautiful-dnd` or `@dnd-kit/core` -- Drag-and-drop for folders/projects is a "nice to have" that adds significant complexity. Defer to v2+.
- `framer-motion` -- Animation library. The app already has CSS animations in Tailwind config (fade-in, slide-up). Keep it simple.
- `zustand` or `jotai` -- Client-side state management. The app uses API-driven state (fetch + useState). This pattern works fine and adding a state library is over-engineering for the current scope.

---

## Alternatives Considered

### Vector Storage

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Vector DB | Supabase pgvector | Pinecone | New vendor, new billing, new SDK, overkill for <10K vectors. Pinecone's free tier may suffice but adds operational complexity. |
| Vector DB | Supabase pgvector | Weaviate/Qdrant | Self-hosted options add infra burden. Cloud versions add cost and complexity. |
| Vector DB | Supabase pgvector | ChromaDB | In-memory/local-first, no persistence model that fits Vercel serverless. |

### Embeddings

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Embeddings | OpenAI `text-embedding-3-small` | Voyage AI `voyage-3` | Slightly better benchmarks for retrieval, but adds another API vendor. OpenAI is the ecosystem standard with better tooling support. |
| Embeddings | OpenAI `text-embedding-3-small` | Cohere `embed-v3` | Good model, but OpenAI has broader ecosystem support and the Supabase pgvector docs/examples all use OpenAI embeddings. Path of least resistance. |
| Embeddings | OpenAI `text-embedding-3-small` | Local models (Ollama) | Cannot run on Vercel serverless. Would need separate infrastructure. |

### Chat SDK

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Chat UI | Vercel AI SDK `useChat` | Raw SSE with EventSource | Reinventing the wheel. `useChat` handles streaming, message state, abort, loading states, error handling. Would take days to build manually what the SDK provides. |
| Chat UI | Vercel AI SDK `useChat` | LangChain.js | LangChain adds massive dependency weight and abstraction layers for something that Vercel AI SDK does natively. LangChain is better for complex agent pipelines; for simple RAG chat, it's overkill. |
| Chat UI | Vercel AI SDK `useChat` | Direct `@anthropic-ai/sdk` streaming | Already using this for processing, but it lacks React integration. Would need to build custom hooks for message management, streaming display, abort. |

### Task Management Integration

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Asana SDK | `asana` npm package | Raw `fetch()` to Asana REST API | SDK handles auth token refresh, rate limiting, pagination. Raw fetch is viable but more error-prone for edge cases. |
| Asana SDK | `asana` npm package | n8n webhook | Already have n8n integration, but it adds a hop. Direct SDK call is faster, more reliable, and gives better error handling in the UI. |

---

## Database Schema Additions

The RAG feature requires vector storage. Here is what changes in the Prisma schema:

**Note:** Prisma has limited native pgvector support. The recommended approach is:

1. Enable pgvector extension via Supabase dashboard (or SQL: `CREATE EXTENSION IF NOT EXISTS vector;`)
2. Create the embeddings table via raw SQL migration (Prisma cannot define vector columns natively)
3. Use Supabase client (`@supabase/supabase-js`) for vector operations (insert, similarity search) -- it supports pgvector natively via `.rpc()` calls to Postgres functions
4. Continue using Prisma for all other CRUD operations

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Transcript chunks with embeddings
CREATE TABLE transcript_chunk (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transcript_id TEXT NOT NULL REFERENCES "Transcript"(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_chunk UNIQUE (transcript_id, chunk_index)
);

-- HNSW index for fast similarity search
CREATE INDEX ON transcript_chunk
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_transcript_chunks(
  query_embedding vector(1536),
  match_project_id TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  transcript_id TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tc.id,
    tc.transcript_id,
    tc.content,
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM transcript_chunk tc
  WHERE tc.project_id = match_project_id
    AND 1 - (tc.embedding <=> query_embedding) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Prisma schema addition** (for non-vector fields, allowing Prisma to query metadata):

```prisma
// Add to schema.prisma -- note: embedding field managed via raw SQL
model TranscriptChunk {
  id           String     @id @default(cuid())
  transcriptId String
  projectId    String
  chunkIndex   Int
  content      String
  createdAt    DateTime   @default(now())

  transcript   Transcript @relation(fields: [transcriptId], references: [id], onDelete: Cascade)
  project      Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([transcriptId, chunkIndex])
}
```

For the Asana integration, add to Prisma schema:

```prisma
model AsanaConfig {
  id          String   @id @default(cuid())
  projectId   String   @unique
  workspaceId String   // Asana workspace GID
  projectGid  String?  // Asana project GID (target for tasks)
  accessToken String   // PAT or OAuth token (encrypted in production)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// Add to ActionItem model:
// asanaTaskGid  String?  // Asana task GID after push
```

---

## Environment Variables (New)

```bash
# OpenAI -- embeddings only (not for LLM)
OPENAI_API_KEY=sk-...

# Asana -- Personal Access Token (initial implementation)
ASANA_ACCESS_TOKEN=1/...
```

**Note on OPENAI_API_KEY:** This is only used for embeddings generation. All LLM inference stays on Anthropic Claude. The key should be scoped to the embeddings endpoint if OpenAI supports API key permissions.

---

## Installation

```bash
# RAG / Chat
npm install ai @ai-sdk/anthropic openai

# Asana integration
npm install asana

# No new dev dependencies needed
```

**Total new dependencies:** 4 packages. Minimal footprint.

---

## Chunking Strategy

Transcripts need to be split into chunks before embedding. Recommended approach:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Chunk size | ~800 tokens (~3200 chars) | Balance between context and specificity. Meeting transcripts have natural topic boundaries. |
| Overlap | 200 tokens (~800 chars) | Ensures context isn't lost at chunk boundaries. |
| Strategy | Paragraph-based with token limit | Split on double newlines first, then merge/split to target size. Better than fixed-size for meeting transcripts. |

**What NOT to use:**
- LangChain text splitters -- adds a massive dependency for something achievable with 30 lines of code
- `tiktoken` (OpenAI tokenizer) -- useful for exact token counting but `content.length / 4` is a sufficient approximation for chunking

**Implementation:** Write a simple `chunkTranscript(text: string): string[]` function in `src/lib/embeddings.ts`. Split on paragraphs, merge small chunks, split large ones. No library needed.

---

## Integration Points with Existing Code

### RAG Chat

| Existing Code | Integration Point | Change |
|---------------|-------------------|--------|
| `src/lib/ai.ts` | New `src/lib/embeddings.ts` | Add embedding generation + chunking as a new module. Keep separate from existing AI functions. |
| `src/app/api/ai/process-transcript/route.ts` | Background processing | After transcript is processed, chunk and embed it. Add to `processInBackground()` pipeline. |
| `src/lib/supabase/server.ts` | Vector search | Use Supabase client's `.rpc('match_transcript_chunks', ...)` for similarity search. |
| New: `src/app/api/chat/route.ts` | Chat endpoint | New API route using Vercel AI SDK's `streamText()` with retrieved context. |
| New: Chat component | UI | New component using `useChat()` hook, rendered in project pages. |

### Asana Integration

| Existing Code | Integration Point | Change |
|---------------|-------------------|--------|
| `src/app/api/projects/[id]/action-items/route.ts` | Push to Asana | Add optional Asana push when creating/updating action items. |
| `src/components/ActionItemList.tsx` (if exists) | UI button | Add "Push naar Asana" button per action item or bulk push. |
| New: `src/lib/asana.ts` | Service module | Asana SDK wrapper: `pushActionItem()`, `getWorkspaces()`, `getProjects()`. |
| New: `src/app/api/asana/` | API routes | Config endpoint (set workspace/project), push endpoint. |

### Folder Structure

| Existing Code | Integration Point | Change |
|---------------|-------------------|--------|
| `prisma/schema.prisma` | Project model | Add `type` field: `'folder' \| 'project'` (or use existing `parentId` with convention). |
| `src/app/(dashboard)/projects/page.tsx` | Projects list | Render folders as expandable groups, projects inside folders. |
| `src/app/api/projects/route.ts` | API | Filter/group by parent, support folder creation. |

---

## What NOT to Add

| Technology | Reason |
|------------|--------|
| LangChain.js | Massive dependency, abstracts too much for simple RAG. Direct OpenAI embeddings + Supabase pgvector + Vercel AI SDK is cleaner and more maintainable. |
| Pinecone / Weaviate / Qdrant | New infrastructure for a small-scale app. pgvector handles this volume trivially. |
| Redis / Upstash | No caching layer needed yet. Supabase handles sessions, Prisma handles data, vector search is fast enough at this scale. |
| `@tanstack/react-query` | Tempting for chat state management, but `useChat()` from Vercel AI SDK already manages this. Adding React Query would create competing state patterns. |
| Zod | Good library, but the app doesn't use schema validation currently. Adding it for just the chat API would be inconsistent. If adopted, should be project-wide (separate effort). |
| tRPC | The app uses REST API routes. Switching to tRPC is a rewrite, not an addition. |
| Component library (shadcn/ui, Radix) | The app has custom Tailwind components. Adopting a component library mid-project creates inconsistency. Either commit to a full migration (separate milestone) or keep custom components. |

---

## Cost Estimation

| Service | Usage Pattern | Estimated Monthly Cost |
|---------|--------------|----------------------|
| OpenAI Embeddings | ~50 transcripts/month, ~10 chunks each, 500 embeddings + queries | < $1/month |
| Anthropic Claude (chat) | ~200 chat queries/month, ~4K tokens each (context + response) | ~$5-10/month |
| Supabase pgvector | Included in existing Supabase plan (vector storage uses regular Postgres storage) | $0 additional |
| Asana API | Free for API usage with PAT | $0 |

**Total additional cost:** ~$6-11/month. Negligible.

---

## Migration Path

The recommended order of implementation:

1. **pgvector setup** -- Enable extension, create table, create search function. No app changes yet.
2. **Embeddings pipeline** -- `src/lib/embeddings.ts` with chunking + OpenAI embedding generation. Wire into `processInBackground()`.
3. **Backfill existing transcripts** -- One-time script to chunk and embed all existing processed transcripts.
4. **Chat API route** -- `src/app/api/chat/route.ts` using Vercel AI SDK + Supabase pgvector search.
5. **Chat UI** -- Component using `useChat()` hook, integrated into project pages.
6. **Asana integration** -- `src/lib/asana.ts` + API routes + UI buttons. Independent of RAG.
7. **Folder structure** -- Schema change + UI update. Independent of RAG and Asana.

This order ensures each step is independently testable and deployable.

---

## Sources and Confidence Notes

| Claim | Confidence | Basis |
|-------|-----------|-------|
| Supabase supports pgvector | HIGH | Well-established feature, documented since 2023, core Supabase offering |
| Anthropic has no embeddings API | HIGH | As of training data cutoff (May 2025), confirmed. Verify this has not changed. |
| OpenAI `text-embedding-3-small` is 1536 dimensions | HIGH | Launched Jan 2024, well-documented |
| Vercel AI SDK has `useChat()` hook | HIGH | Core feature since v3, continued in v4 |
| `@ai-sdk/anthropic` provider exists | HIGH | Official Vercel AI SDK provider package |
| Asana npm package is `asana` v3.x | MEDIUM | Was v3 as of training data. Verify current version. |
| Prisma lacks native pgvector support | MEDIUM | Was true as of Prisma 5.x. Check if Prisma 6.x (if released) adds vector column support. |
| Package versions (all ^x.x) | LOW | Based on training data. Run `npm view [package] version` to verify before installing. |

**Action required before implementation:** Run `npm view ai version && npm view @ai-sdk/anthropic version && npm view openai version && npm view asana version` to verify current package versions. Update this document with actual versions.

---

*Stack research: 2026-02-12*
*Tool limitations: WebSearch and WebFetch unavailable. Versions unverified against live sources.*
