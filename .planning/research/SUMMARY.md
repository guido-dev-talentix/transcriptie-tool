# Project Research Summary

**Project:** Search X -- RAG Chat, Asana Integration, UX Improvements
**Domain:** Meeting Intelligence / Project Management Tool
**Researched:** 2026-02-12
**Confidence:** MEDIUM-HIGH

## Executive Summary

Search X is a meeting-first project management tool for lean teams that transforms meeting transcripts into actionable project intelligence. The research reveals that this domain has split into two distinct categories: recording bots (Otter, Fireflies) that auto-join meetings, and intelligence layers that process transcripts. Search X is correctly positioned as an intelligence layer, where the differentiator is what you DO with meeting data, not how it's captured.

The recommended approach builds on Search X's existing strengths: cumulative project intelligence (Stand van Zaken), project hierarchy, and AI-powered extraction. The three planned features (RAG chat, Asana integration, folder UX) align with competitive gaps and user needs, but implementation order matters critically. The research identifies a foundational problem pattern (fire-and-forget background processing with silent failures) that must be fixed BEFORE adding new async operations. The suggested order is: (1) Foundation fixes, (2) Folder structure + UX polish, (3) RAG/Chat, (4) Asana integration.

The key risks are: unbounded token costs from naive RAG implementation, embedding-source synchronization failures, and OAuth token management for third-party integrations. All three are preventable with upfront architecture decisions. The research provides specific mitigation strategies including chunking strategy (500-token chunks with overlap), pgvector for vector storage (leveraging existing PostgreSQL), and OAuth-based token management with refresh middleware.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, Prisma, Supabase, Anthropic Claude, AssemblyAI) requires minimal additions. For RAG chat: use Supabase pgvector extension (no new infrastructure), OpenAI text-embedding-3-small for embeddings (1536 dims, $0.02/1M tokens), and Vercel AI SDK for streaming chat UI. For Asana integration: use the official Asana npm SDK with OAuth2 (not Personal Access Tokens). For folder structure: no new dependencies needed, just data model and UI changes using existing Tailwind and React patterns.

**Core technologies:**
- **Supabase pgvector**: Vector storage and similarity search — Already using Supabase/PostgreSQL, pgvector is an extension that keeps everything in one database. Handles modest transcript volume efficiently without new infrastructure.
- **OpenAI Embeddings API (text-embedding-3-small)**: Generate text embeddings — Anthropic has no embeddings API as of research date. OpenAI's small model is the standard: 1536 dimensions, excellent quality-to-cost ratio, multilingual support for Dutch content.
- **Vercel AI SDK (ai + @ai-sdk/anthropic)**: Streaming chat UI with useChat hook — Provides battle-tested streaming chat infrastructure (SSE, message history, abort). Works with Anthropic via provider. Avoids reinventing complex streaming patterns.
- **Asana npm SDK**: Official Asana Node.js client — Handles OAuth refresh, pagination, rate limiting automatically. One-way push (create tasks) is straightforward. OAuth2 from day one to avoid token expiry failures.

**What NOT to add:**
- LangChain.js (massive dependency, overkill for simple RAG)
- Pinecone/Weaviate/Qdrant (new infrastructure for small-scale use case)
- Component libraries like Radix/shadcn (mid-project adoption creates inconsistency)
- Real-time collaboration features (CRDT complexity, competes with existing tools)

### Expected Features

Research analyzed 10 competitors (Otter.ai, Fireflies, Grain, tl;dv, Fathom, Fellow, Hugo, Avoma, Gong, Chorus.ai) to identify table stakes vs. differentiators.

**Must have (table stakes):**
- Searchable transcript archive — Every competitor has this; Search X does not. CRITICAL gap. Users accumulate hundreds of transcripts and need fast keyword/semantic search.
- Action item status tracking — Extract action items (built), but need status toggle (open/in-progress/done), user assignment, and overdue alerts.
- Folder organization UX — Users expect drag-and-drop organization. The project hierarchy (parentId) exists in the schema; needs polished UI.
- Export/download polish — Verify exports include summary, action items, decisions. Add PDF export for reports.
- Audio playback with transcript sync — Click transcript line, audio jumps to timestamp. Expected for audio-based tools. Requires storing AssemblyAI word-level timestamps.
- Sharing links — Individual transcripts/reports need shareable links (public or auth-required).

**Should have (competitive advantage):**
- Cumulative project intelligence (Stand van Zaken) — ALREADY BUILT. This is the strongest differentiator. No competitor maintains a live, AI-updated project status that evolves with every meeting. Enhance with status evolution timeline and change highlighting.
- RAG chat per project — Fireflies and Otter have global chat; project-scoped chat is significantly more useful. Combined with cumulative status, provides contextual answers ("What did we decide about pricing in THIS project?").
- Project dashboard with cross-meeting analytics — Fireflies has meeting analytics (talk time), but no general-purpose tool shows decision velocity, action item burn-down, or topic evolution at the project level.
- Task management integration (Asana, Jira) — Fireflies and Fellow push action items to task managers. Two-way sync (pull status back) would be unique. Start with one-way push, design for bidirectional.
- Project hierarchy with rollup intelligence — No meeting intelligence tool has multi-level project hierarchy. Parent project can aggregate status from child projects ("Q1 Launch shows Design on track, Engineering has 3 blockers").

**Defer (v2+):**
- Real-time meeting bot/auto-join — Enormous complexity (WebRTC, bot infrastructure), privacy concerns (AVG/GDPR), and Search X's value is in intelligence, not recording. Users can record locally or use native recording features.
- Video recording and playback — Expensive storage, competes with dedicated tools (Loom, Grain). Intelligence value is in transcripts, not video.
- Sales intelligence features — Different user persona (sales managers vs. project leads). Crowded market with well-funded incumbents (Gong, Chorus.ai).
- Sentiment analysis / emotion detection — Questionable accuracy, privacy concerns, not actionable for project management.
- Collaborative real-time note-taking — CRDT/OT complexity, competes with Notion/Google Docs. AI-generated reports serve the same need.

### Architecture Approach

The architecture research defines clear component boundaries for each feature. RAG chat separates into: ChatPanel component (frontend), API route with checkProjectAccess auth, RAG library (chunking, embedding, retrieval), and pgvector extension for vector storage. Asana integration separates into: Integration Settings UI (OAuth flow), API routes for auth/sync/webhooks, integration library wrapping Asana SDK, and Integration model storing encrypted tokens per-project. Folder structure leverages existing parentId with additions: isFolder boolean, sortOrder for custom ordering, ProjectTree component with drag-and-drop.

**Major components:**
1. **RAG Pipeline (src/lib/rag.ts)** — Chunking strategy (500-token chunks with overlap), OpenAI embedding generation, pgvector similarity search, prompt construction with retrieved context + conversation history. Integrated as final step in processInBackground() pipeline.
2. **Asana Integration (src/lib/integrations/asana.ts)** — OAuth2 flow with token refresh middleware, task creation mapping (ActionItem -> Asana Task), bidirectional sync via webhooks, per-project configuration. Integration model stores encrypted tokens, externalId tracked on ActionItem.
3. **Folder Tree UI (src/components/ProjectTree.tsx)** — Recursive tree rendering with expand/collapse, drag-and-drop using @dnd-kit/core, visual distinction between folders (isFolder: true) and projects. Tree in sidebar for navigation, full tree view on /projects page for management.

**Key architectural patterns:**
- Streaming responses: Extend existing streamMessage() pattern for chat endpoint using Next.js ReadableStream + Server-Sent Events.
- Background processing: Each new async operation (embeddings, Asana sync) gets granular status tracking (embeddingStatus, asanaSyncStatus) with try/catch blocks.
- Project scoping: All vector queries filtered by projectId; checkProjectAccess() guards chat and integration endpoints.
- Data model extensibility: Integration model uses type field ('asana') for future providers; TranscriptChunk stores embeddingModel version for re-indexing.

### Critical Pitfalls

Research identified 14 pitfalls (5 critical, 5 moderate, 4 minor) from direct codebase analysis and competitive patterns.

1. **RAG over full transcript text without chunking** — Naive approach stuffs entire transcripts into prompts, causing unbounded token costs ($2-5/query), context window overflow, hallucinated answers. PREVENTION: Semantic chunking at processing time (500-token chunks with 50-token overlap), pgvector storage, top-K retrieval (K=10-20 chunks), hard token budget per query (8K context max).

2. **Storing embeddings without source sync** — Embeddings become stale when transcripts update/delete. Search returns ghost results. PREVENTION: Embed generation in processInBackground() pipeline, ON DELETE CASCADE on TranscriptChunk table, embeddingStatus field on Transcript, re-indexing endpoint built from day one.

3. **Asana OAuth token management** — Personal Access Token (PAT) breaks when user leaves; OAuth access tokens expire after 1 hour. Integration fails silently. PREVENTION: OAuth2 from start, store access + refresh + expiry in Integration table (encrypted), token refresh middleware, connection status indicator in UI, retry with refresh on 401.

4. **Fire-and-forget pattern extended to RAG and integrations** — Current processInBackground() pattern logs errors to console only. Adding embeddings + Asana sync triples failure surface with no visibility. PREVENTION: Fix the pattern BEFORE adding features. Add granular status fields (embeddingStatus, asanaSyncStatus), implement simple job queue with retry, background job dashboard for failed jobs.

5. **pgvector on Vercel serverless without connection pooling** — Vector queries are compute-intensive, hold connections longer. Current PrismaClient singleton issues (CONCERNS.md) multiply. PREVENTION: Fix PrismaClient singleton FIRST, use Supabase's built-in pgvector + PgBouncer, set explicit connection_limit, consider external vector store (Pinecone) if pooling fails.

6. **RAG ignoring project scoping** — Vector similarity search without projectId filter leaks data across projects or to unauthorized users. PREVENTION: Store projectId on every TranscriptChunk, ALWAYS filter WHERE project_id = $1 in vector queries, apply checkProjectAccess() before retrieval.

7. **Dutch language content degrading RAG quality** — Most embedding models trained primarily on English. Dutch semantic similarity captured poorly ("actiepunten" and "taken" not recognized as similar). PREVENTION: Use multilingual embedding model (text-embedding-3-small handles Dutch reasonably), test with REAL Dutch transcripts, build eval set with known Dutch Q&A pairs, consider hybrid search (vector + PostgreSQL full-text with Dutch dictionary).

## Implications for Roadmap

Based on research, suggested phase structure with clear dependencies:

### Phase 1: Foundation Fixes
**Rationale:** The fire-and-forget background processing pattern (Pitfall 4) and PrismaClient singleton issues (Pitfall 5 prerequisite) are identified as critical blockers. Every new async operation (RAG embeddings, Asana sync) inherits silent failure behavior. Fix the foundation before adding features on top.

**Delivers:**
- Granular status tracking for background operations (separate embeddingStatus, asanaSyncStatus fields)
- PrismaClient singleton consolidation (fix connection pooling issues)
- Simple retry mechanism for failed background jobs
- Admin dashboard showing failed jobs with last error

**Addresses:** CONCERNS.md flags for unbounded AI costs and silent failures
**Avoids:** Pitfall 4 (fire-and-forget expansion), Pitfall 5 (connection pooling)

### Phase 2: Folder Structure + UX Polish
**Rationale:** Lowest risk, immediate user value, no new external dependencies. The project hierarchy (parentId) already exists in the schema. This phase improves the UX foundation that RAG chat and integrations will be built on. Can start in parallel with Phase 1 since it touches different parts of the codebase.

**Delivers:**
- ProjectTree component with drag-and-drop organization
- isFolder field distinguishing folders from projects
- sortOrder for custom ordering within folders
- Polished upload flow, dashboard layout, sidebar navigation
- Action item status tracking (open/in-progress/done toggle)
- User assignment for action items

**Addresses:** Table stakes features (folder organization, action item status)
**Uses:** Existing Tailwind + React + Prisma (no new stack)
**Avoids:** Pitfall 10 (URL breakage — folders are UI-only, URLs unchanged)

### Phase 3: RAG Chat per Project
**Rationale:** Highest-value differentiator after cumulative status. Requires new infrastructure (pgvector, embeddings) but benefits from foundation fixes (Phase 1) being done first. The embeddings pipeline needs reliable background processing and connection pooling.

**Delivers:**
- ChatPanel component with streaming responses
- TranscriptChunk model with embeddings (pgvector)
- Embedding generation pipeline in processInBackground()
- /api/projects/[id]/chat route with retrieval + generation
- Project-scoped semantic search over transcripts
- Source attribution (citations linking to transcripts)

**Uses:**
- Supabase pgvector extension (vector storage)
- OpenAI text-embedding-3-small (embeddings)
- Vercel AI SDK + @ai-sdk/anthropic (streaming chat UI)

**Implements:** RAG Pipeline component (chunking, embedding, retrieval, generation)

**Addresses:** Table stakes (searchable transcript archive) + differentiator (project-scoped chat)

**Avoids:**
- Pitfall 1 (naive RAG): semantic chunking, top-K retrieval, token budget
- Pitfall 2 (embedding sync): integrated in processInBackground(), cascade deletes
- Pitfall 6 (project scoping): projectId filter on all vector queries
- Pitfall 7 (Dutch quality): multilingual embedding model, test with Dutch eval set
- Pitfall 12 (streaming timeout): use existing streaming pattern

### Phase 4: Asana Integration
**Rationale:** Most complex integration surface (OAuth, webhooks, bidirectional sync). Benefits from having folder structure (Phase 2) complete — users can organize projects before connecting external tools. Independent of RAG (Phase 3) — can proceed in parallel if needed.

**Delivers:**
- AsanaIntegration component (OAuth connection flow, mapping config)
- Integration model storing encrypted tokens per-project
- One-way push: ActionItem -> Asana Task
- Webhook receiver for status updates from Asana (foundation for two-way sync)
- Sync status display and manual retry

**Uses:**
- Asana npm SDK (official Node.js client)
- OAuth2 flow with token refresh

**Implements:** Asana Integration component (OAuth, task creation, sync, webhook handling)

**Addresses:** Differentiator (task management integration with two-way potential)

**Avoids:**
- Pitfall 3 (OAuth management): OAuth2 from start, refresh middleware, encrypted storage
- Pitfall 7 (rate limits): sequential task creation with backoff, per-item status
- Pitfall 11 (assignee matching): user mapping table, not fuzzy name matching

### Phase Ordering Rationale

- **Phase 1 must come first**: The fire-and-forget pattern is a shared foundation. Fixing it before adding RAG and Asana prevents inheriting silent failures. Connection pooling fix is prerequisite for pgvector under load.

- **Phase 2 can overlap with Phase 1**: Folder structure and UX polish touch different parts of the codebase (UI components, simple schema changes). No shared infrastructure dependencies. Provides immediate user value while foundation work progresses.

- **Phase 3 depends on Phase 1**: RAG embedding pipeline needs reliable background processing (embeddingStatus tracking, retry on failure). pgvector queries need fixed connection pooling. Cannot ship RAG without foundation fixes or failures will be silent and data will be inconsistent.

- **Phase 4 is independent after Phase 1**: Asana integration needs the foundation fixes (asanaSyncStatus, retry) but not the RAG infrastructure. Can proceed in parallel with Phase 3 if team capacity allows. Benefits from Phase 2 (folder organization) being complete but not blocked by it.

**How this avoids pitfalls:**
- Fixing fire-and-forget (Phase 1) before adding async operations (Phases 3-4) prevents Pitfall 4 cascade
- PrismaClient consolidation (Phase 1) before pgvector (Phase 3) prevents Pitfall 5
- Chunking + embeddings designed upfront (Phase 3) prevents Pitfall 1 naive RAG
- OAuth from start (Phase 4) prevents Pitfall 3 token expiry failures

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (RAG Chat):** Embedding model selection requires validation of Dutch language quality. Test text-embedding-3-small with real Dutch transcripts before committing. pgvector index tuning (HNSW vs IVFFlat, m and ef_construction parameters) may need experimentation based on dataset size.

- **Phase 4 (Asana Integration):** Asana API rate limits and webhook payload formats need verification against current documentation (research based on training data with MEDIUM confidence). OAuth flow details and token expiry timing should be validated.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Foundation):** Background job patterns and connection pooling are well-documented. Prisma singleton pattern is established. No novel research needed.

- **Phase 2 (Folder Structure):** React tree components and drag-and-drop with @dnd-kit are well-documented patterns. No domain-specific research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core recommendations (pgvector, OpenAI embeddings, Vercel AI SDK, Asana npm) are well-established. Package versions marked LOW confidence (based on training data cutoff Jan 2025) — verify with `npm view [package] version` before installation. Anthropic embeddings API availability should be checked (may exist by implementation date). |
| Features | HIGH | Competitive analysis based on publicly available product documentation from 10 competitors. Table stakes vs. differentiators clearly identified. Existing features (cumulative status, hierarchy) confirmed via direct codebase analysis. |
| Architecture | HIGH | Component boundaries defined from direct codebase analysis (current patterns in src/lib/ai.ts, src/app/api/, prisma/schema.prisma). Integration points mapped to existing code. Streaming, auth, and background processing patterns already exist and extend naturally. |
| Pitfalls | HIGH | Critical pitfalls (1-5) identified from direct codebase analysis (fire-and-forget pattern in process-transcript/route.ts, PrismaClient issues in CONCERNS.md, cascade patterns in schema.prisma). Moderate pitfalls (6-10) based on established patterns (vector scoping, OAuth token management, embedding model lock-in). |

**Overall confidence:** MEDIUM-HIGH

The architecture and pitfall analysis benefits from direct codebase access (HIGH confidence). Stack recommendations are sound but package versions need verification (MEDIUM). Features analysis is competitive research without user interviews (HIGH for competitive landscape, no data on actual user needs beyond founders' implicit requirements in PROJECT.md).

### Gaps to Address

**Embedding model Dutch performance:**
- STACK.md recommends text-embedding-3-small but flags multilingual quality as unverified
- PITFALLS.md warns this could degrade RAG retrieval (Pitfall 9)
- ACTION: Test with 5-10 real Dutch transcripts before finalizing model choice. Build eval set with known Dutch Q&A pairs. Consider Cohere embed-multilingual-v3 or Voyage AI as alternatives if quality is poor.

**Asana API current state:**
- STACK.md and PITFALLS.md note OAuth details, rate limits, and webhook formats are from training data (cutoff Jan 2025)
- Actual implementation may differ
- ACTION: Verify against current Asana developer docs during Phase 4 planning. Confirm token expiry timing (assumed 1 hour), rate limits (assumed 150 req/min), and webhook signature verification requirements.

**Package versions:**
- All npm package versions in STACK.md marked LOW confidence
- STACK.md explicitly requests: "Run `npm view ai version && npm view @ai-sdk/anthropic version && npm view openai version && npm view asana version` to verify current package versions"
- ACTION: Verify and update STACK.md with actual versions before installation in Phases 3-4.

**User workflow validation:**
- FEATURES.md identifies table stakes but doesn't include user research (founders are users, but no formal observation)
- PITFALLS.md warns about "UX polish without user feedback loop" (Pitfall 13)
- ACTION: Observe the 3 founders using the current tool before finalizing Phase 2 UX changes. 30-minute sessions to identify most-complained-about workflows.

**Cost monitoring implementation:**
- CONCERNS.md flags unbounded AI token costs
- STACK.md estimates $6-11/month additional for embeddings + RAG chat
- PITFALLS.md warns this could grow unpredictably (Pitfall 14)
- ACTION: Implement cost tracking for embeddings (extend existing streamMessage() pattern) BEFORE embedding pipeline goes live. Set monthly budget alarm ($50/month threshold).

## Sources

### Primary (HIGH confidence)
- **Direct codebase analysis** — src/lib/ai.ts, prisma/schema.prisma, src/app/api/ai/process-transcript/route.ts, src/lib/auth.ts, src/middleware.ts, src/components/*.tsx, CLAUDE.md, PROJECT.md
- **Existing planning documents** — .planning/codebase/CONCERNS.md (2026-02-12), .planning/codebase/INTEGRATIONS.md (2026-02-12), .planning/PROJECT.md (2026-02-12)
- **Supabase pgvector** — Well-established feature documented since 2023, core Supabase offering
- **Vercel AI SDK** — Official Vercel documentation for streaming chat patterns
- **OpenAI embeddings API** — text-embedding-3-small launched Jan 2024, dimensions and pricing well-documented

### Secondary (MEDIUM confidence)
- **Competitive product analysis** — Publicly available feature pages, pricing pages, and documentation from Otter.ai, Fireflies.ai, Grain, tl;dv, Fathom, Fellow, Hugo, Avoma, Gong, Chorus.ai (accessed via training data cutoff Jan 2025)
- **Asana API** — OAuth flow, rate limits, webhook patterns based on Asana developer documentation in training data (Jan 2025 cutoff). Should be verified against current docs.
- **npm package ecosystem** — Asana npm SDK, Vercel AI SDK providers, OpenAI SDK versions based on training data. Package versions require verification via npm registry.

### Tertiary (LOW confidence)
- **Package versions** — All ^x.x versions in STACK.md are based on training data snapshots, not live npm registry queries. STACK.md explicitly flags these as LOW confidence and requests verification.
- **Anthropic embeddings API availability** — STACK.md notes Anthropic had no embeddings API as of training data cutoff. This may have changed by implementation date and should be checked.

---
*Research completed: 2026-02-12*
*Ready for roadmap: yes*
