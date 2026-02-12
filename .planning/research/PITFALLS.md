# Domain Pitfalls

**Domain:** Meeting intelligence tool adding RAG chat, Asana integration, and UX improvements
**Researched:** 2026-02-12
**Confidence:** MEDIUM (codebase analysis HIGH, external API details based on training data LOW-MEDIUM)

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major user trust issues.

### Pitfall 1: RAG Over Full Transcript Text Without Chunking Strategy

**What goes wrong:** You stuff entire transcript `cleanedText` fields (which can be 10,000+ words each) into a single Claude prompt for RAG. With 5-10 transcripts per project, you exceed the context window, get truncated results, or spend $2-5 per query. Users ask "what did we decide about X?" and get hallucinated answers because the model couldn't fit all relevant context.

**Why it happens:** The current codebase already passes full transcript text into Claude prompts (see `processTranscript()` in `src/lib/ai.ts` which uses `max_tokens: 32768`). It feels natural to extend this pattern: "just concatenate all transcripts and ask Claude." For a project with 3 transcripts this works. For a project with 30, it fails silently -- the model summarizes what fits and fabricates the rest.

**Consequences:**
- Token costs scale linearly with transcript count per project (unbounded, no cap exists per CONCERNS.md)
- Hallucinated answers erode trust in the entire tool -- users stop believing the AI features
- Latency becomes unusable (30+ seconds per query)
- Claude's context window has hard limits; even with 200K tokens, 50 meeting transcripts won't fit

**Prevention:**
1. Implement semantic chunking at transcript processing time (split `cleanedText` into ~500-token chunks with overlap)
2. Store chunk embeddings in pgvector (PostgreSQL extension, compatible with existing Prisma/PostgreSQL stack)
3. At query time, retrieve top-K relevant chunks (K=10-20), not entire transcripts
4. Include source attribution in responses (transcript title + date for each chunk used)
5. Set a hard token budget per RAG query (e.g., 8K tokens of context max)

**Detection (warning signs):**
- AI responses take >10 seconds for chat queries
- Token cost per chat query exceeds $0.05
- Users report AI "making things up" or missing information they know was discussed
- Chat works great with 2 transcripts, breaks at 10

**Phase relevance:** Must be addressed in the RAG/Chat phase. Cannot be bolted on later without re-processing all existing transcripts to generate embeddings.

**Confidence:** HIGH (based on direct codebase analysis showing existing unbounded token patterns)

---

### Pitfall 2: Storing Embeddings Separately from Source Text Without Sync

**What goes wrong:** You create an embedding store (pgvector table or external service) for RAG chunks, but when transcripts are updated, re-processed, or deleted, the embeddings become stale. Users search for something and get results from transcripts that no longer exist, or miss results from re-processed transcripts.

**Why it happens:** The current Prisma schema has cascading deletes for transcripts (`onDelete: Cascade` on ActionItem, Decision, Report relations). But a separate embeddings table/index won't be part of this cascade unless explicitly designed. The `processInBackground()` function updates `cleanedText` without any hook to update embeddings.

**Consequences:**
- Search returns ghost results from deleted transcripts
- Re-processed transcripts lose their old embeddings but new ones aren't generated
- Data inconsistency accumulates silently over time
- Users lose trust when chat references non-existent or outdated content

**Prevention:**
1. Make embedding generation part of the `processInBackground()` pipeline (step 6, after all other processing)
2. Use `ON DELETE CASCADE` for the embedding chunks table, keyed to `transcriptId`
3. When `cleanedText` is updated, delete old embeddings and regenerate (not merge)
4. Add a `embeddingStatus` field to Transcript (like the existing `aiStatus`) to track sync state
5. Build an admin re-indexing endpoint for bulk re-embedding (migration tool)

**Detection:**
- Chat returns results mentioning deleted projects/transcripts
- Users report "I uploaded a new version but chat still shows old content"
- Embedding count doesn't match transcript count in database

**Phase relevance:** Must be designed into the RAG phase from day one. Retrofitting sync is a partial rewrite.

**Confidence:** HIGH (based on direct analysis of cascade patterns in `prisma/schema.prisma`)

---

### Pitfall 3: Asana OAuth Token Management for Multi-User Teams

**What goes wrong:** You use a single Personal Access Token (PAT) for Asana integration, tied to one team member's account. When that person leaves the company, changes their Asana password, or the token expires, all integrations break. Alternatively, you implement OAuth per-user but don't handle token refresh, and integrations silently stop working after the access token expires (typically 1 hour).

**Why it happens:** PATs are the fastest way to get Asana integration working. The PROJECT.md specifies "eenrichting push" (one-way push) which seems simple. But Asana's OAuth access tokens expire after ~60 minutes. Refresh tokens must be used proactively. The current codebase has no token storage infrastructure beyond environment variables.

**Consequences:**
- Integration appears to work in development, fails silently in production after 1 hour
- Action items show "synced to Asana" status but the task was never actually created
- If using PAT: complete integration failure when the token owner's account changes
- Support burden: "why aren't my tasks showing up in Asana?"

**Prevention:**
1. Use OAuth 2.0 flow, not PATs, even for v1 -- the token refresh infrastructure is needed regardless
2. Store OAuth tokens (access + refresh + expiry) in the database, per-user or per-workspace
3. Implement token refresh middleware that checks expiry before each API call
4. Add Asana connection status indicator in the UI (green/red dot showing "connected" / "niet verbonden")
5. Implement retry with token refresh: if a 401 comes back, refresh and retry once before failing
6. For the "team-wide" model (everyone's action items go to one Asana workspace): use a service account OAuth, store at project level

**Detection:**
- Asana push works in dev but fails after 1 hour in production
- No error messages to user when Asana push fails (fire-and-forget pattern)
- Token refresh endpoint returns errors in logs but UI shows success

**Phase relevance:** Must be designed at the start of the Asana integration phase. Cannot use PAT "for now" and switch to OAuth later without user-facing changes.

**Confidence:** MEDIUM (Asana OAuth details from training data, token expiry timing may have changed)

---

### Pitfall 4: Fire-and-Forget Pattern Extended to RAG and Integrations

**What goes wrong:** The current `processInBackground()` pattern (fire-and-forget, errors logged to console only) gets extended to RAG embedding generation and Asana sync. Embedding generation fails silently. Asana push fails silently. Users see "processing" states that never resolve. The existing concerns document already flags this as a problem -- extending it to more features makes it worse.

**Why it happens:** It's the established pattern in the codebase. `processInBackground()` at line 241 of `process-transcript/route.ts` fires without awaiting. Each step has try-catch that logs and continues. Developers follow existing patterns. Adding "also generate embeddings" and "also push to Asana" as steps 6 and 7 in this function feels natural.

**Consequences:**
- Embedding generation fails on some transcripts; RAG search misses them; no one notices
- Asana push fails; action item shows as "synced" locally but task doesn't exist in Asana
- aiStatus shows "completed" but embedding or Asana step actually failed
- No retry mechanism means transient failures (network blip, rate limit) become permanent failures
- With 3 new async operations (embeddings, Asana, potentially re-embedding), failure surface area triples

**Prevention:**
1. Add granular status tracking: separate `embeddingStatus` and `asanaSyncStatus` fields (don't overload `aiStatus`)
2. Implement a simple job queue pattern even without a dedicated queue service -- use a `ProcessingJob` table with status, retryCount, lastError, and a cron/polling endpoint
3. For Asana specifically: track `asanaTaskId` on ActionItem model; implement a "verify sync" check
4. Add a background job dashboard (admin only) showing failed jobs, retry counts, last errors
5. At minimum: add `.catch()` handlers that update specific status fields, not just console.log

**Detection:**
- Console logs show errors but no one reads them (CONCERNS.md already flags this)
- Embedding count < transcript count and no alert fires
- Users report "ik heb 10 vergaderingen maar chat vindt er maar 6"

**Phase relevance:** Should be addressed as a foundational improvement BEFORE adding RAG and Asana. Fix the pattern, then add features on top.

**Confidence:** HIGH (based on direct code analysis of `processInBackground()` pattern)

---

### Pitfall 5: pgvector on Vercel Serverless Without Connection Pooling

**What goes wrong:** You add pgvector to your PostgreSQL database for RAG embeddings, but Vercel serverless functions open new connections per invocation. Each RAG query needs a vector similarity search, which is heavier than a simple SELECT. Connection pool exhaustion happens under moderate load (CONCERNS.md already flags this for regular queries). Vector queries that take 500ms+ hold connections longer, making the problem worse.

**Why it happens:** The codebase already has connection pool issues (CONCERNS.md: "multiple PrismaClient instances", "default pool ~10 connections"). Adding vector operations that are compute-intensive at the database level multiplies this problem. Vercel serverless cold starts create new connections that aren't returned to the pool promptly.

**Consequences:**
- RAG queries intermittently fail with "too many connections" errors
- Other features (loading projects, viewing transcripts) degrade when RAG queries consume pool
- Under concurrent usage by the team (3 founders + 1 dev = 4 users, each doing chat), 4 simultaneous vector searches can exhaust a 10-connection pool

**Prevention:**
1. Fix the existing PrismaClient singleton issue FIRST (consolidate all `new PrismaClient()` to singleton)
2. Use Supabase's built-in pgvector support if available (they handle connection pooling via PgBouncer)
3. Alternatively, use an external vector store (Pinecone, Qdrant) to offload vector queries from PostgreSQL entirely
4. Set explicit connection pool limits: `connection_limit` in Prisma datasource URL
5. Consider Prisma Accelerate or Neon's connection pooler for serverless environments

**Detection:**
- Intermittent "Connection refused" or "too many clients" errors in production
- RAG queries work in dev (single user) but fail in production (concurrent users)
- Dashboard pages load slowly when someone is using the chat feature

**Phase relevance:** Must be decided during RAG architecture design. The vector store choice (pgvector vs external) is a foundational decision.

**Confidence:** MEDIUM (connection pooling details from training data, Vercel serverless behavior well-known)

## Moderate Pitfalls

### Pitfall 6: RAG Chat Ignoring Project Scoping and Authorization

**What goes wrong:** RAG search retrieves chunks from transcripts across all projects, not scoped to the current project. User in Project A sees answers derived from Project B transcripts. Or worse: a VIEWER-role user queries chat and gets context from transcripts they shouldn't have access to.

**Why it happens:** Vector similarity search operates on embeddings, not on relational data. A naive `SELECT * FROM chunks ORDER BY embedding <-> query_embedding LIMIT 10` ignores `projectId`. The current auth model (`checkProjectAccess` in `src/lib/auth.ts`) works at the API route level but doesn't propagate to vector queries.

**Prevention:**
1. Store `projectId` on every embedding chunk record
2. ALWAYS filter by `projectId` in vector queries: `WHERE project_id = $1 ORDER BY embedding <-> $2 LIMIT 10`
3. Add `transcriptId` to chunks as well, for source attribution
4. Apply `checkProjectAccess()` in the chat API route BEFORE running the vector query
5. Write integration tests that verify cross-project isolation

**Detection:**
- Chat answers reference meetings the user hasn't attended
- Admin testing shows data leaking between projects

**Phase relevance:** RAG phase, architecture decision. Must be in the schema design from the start.

**Confidence:** HIGH (based on current auth model analysis)

---

### Pitfall 7: Asana API Rate Limits Breaking Batch Action Item Sync

**What goes wrong:** User processes a transcript that extracts 15 action items and checks "sync to Asana." The code fires 15 parallel `POST /tasks` requests to Asana. Asana's rate limit (approximately 150 requests per minute per user) isn't hit for 15 items, but the issue is that each task creation requires 2-3 API calls (create task, add to project/section, add assignee). That's 45 API calls. If a second transcript is being processed simultaneously, you hit rate limits and some tasks silently fail.

**Why it happens:** The existing codebase uses `Promise.all()` for batch operations (see `handleAddTranscripts` in `ProjectDashboard.tsx` line 129). Developers extend this pattern to Asana: "just Promise.all the task creates." Asana returns 429 Too Many Requests, and without retry logic, those tasks are lost.

**Prevention:**
1. Implement sequential Asana task creation with a small delay (200ms between calls)
2. Better: use a queue that processes Asana pushes one at a time with exponential backoff on 429s
3. Track each action item's Asana sync status individually (`asanaTaskId`, `asanaSyncStatus`, `asanaSyncError`)
4. Provide a "retry failed syncs" button in the UI
5. Consider Asana batch API if available for bulk task creation (reduces call count)

**Prevention:**
- Multiple action items stuck in "syncing" state
- Asana task count doesn't match action item count
- 429 errors in console logs during transcript processing

**Phase relevance:** Asana integration phase. Must be designed into the sync architecture.

**Confidence:** MEDIUM (Asana rate limits from training data, exact limits may differ)

---

### Pitfall 8: Embedding Model Choice Locking You Into Expensive Re-indexing

**What goes wrong:** You use OpenAI's `text-embedding-3-small` (or Claude's embeddings if they exist by then) for generating embeddings. Later, you want to switch to a cheaper or better model. All existing embeddings are incompatible with the new model. You must re-embed every transcript chunk -- which for a growing database means hours of processing and significant API cost.

**Why it happens:** Embedding models produce vectors of specific dimensions. Model A's 1536-dimensional vectors are meaningless when compared to Model B's 768-dimensional vectors. There's no "migration" -- it's a full re-index.

**Prevention:**
1. Store the embedding model name and version alongside each chunk (`embeddingModel: 'text-embedding-3-small'`)
2. Build the re-indexing endpoint from day one (you need it for transcript updates anyway, per Pitfall 2)
3. Start with a model that's cost-effective at scale, not the most powerful one
4. Consider local embedding models (e.g., via Supabase Edge Functions with a WASM model) to avoid per-call API costs entirely
5. Design the embedding pipeline to be model-agnostic: pass model name as config, not hardcode

**Detection:**
- Embedding costs growing faster than transcript count (model is too expensive)
- New embedding model released that's 10x cheaper but migration cost is prohibitive

**Phase relevance:** RAG phase, initial architecture decision.

**Confidence:** HIGH (embedding incompatibility is a well-established fact)

---

### Pitfall 9: Dutch Language Content Degrading RAG Retrieval Quality

**What goes wrong:** All transcripts and queries are in Dutch. Most embedding models are trained primarily on English text. Dutch semantic similarity is captured poorly -- "actiepunten" and "taken" (both mean tasks/action items) may not be recognized as semantically similar. RAG retrieval returns irrelevant chunks, and the chat feature feels broken despite the system working correctly for English test data.

**Why it happens:** Developers test with English queries during development. The tool's UI and all content is Dutch (as specified in CLAUDE.md and PROJECT.md). The embedding model's Dutch performance is never specifically validated.

**Prevention:**
1. Use a multilingual embedding model (e.g., `multilingual-e5-large`, Cohere's `embed-multilingual-v3.0`, or OpenAI's models which handle Dutch reasonably well)
2. Test embedding quality with REAL Dutch meeting transcripts, not English test data
3. Build a small eval set: 10 known questions with known answers from actual project transcripts
4. Consider hybrid search: combine vector similarity with Dutch full-text search (PostgreSQL `tsvector` with Dutch dictionary)
5. Add query expansion: when user asks "actiepunten," also search for "taken," "to-do," "afspraken"

**Detection:**
- Chat works well in English testing but poorly when used with actual Dutch content
- Users say "de chat vindt niks" (chat finds nothing) even when relevant transcripts exist
- Retrieval quality varies wildly between queries

**Phase relevance:** RAG phase, must be validated before shipping. Cannot be fixed by tweaking prompts -- requires model/approach change.

**Confidence:** MEDIUM (multilingual embedding performance varies, specific model capabilities from training data)

---

### Pitfall 10: Folder Structure Breaking Existing Project URLs and Navigation

**What goes wrong:** Adding a folder layer (map > projecten) changes the URL structure. Existing bookmarks, shared links, and sidebar navigation break. The current URL pattern `/projects/[id]` needs to accommodate `/projects/[folderId]/[projectId]` or similar. Users can't find their projects. Deep links from N8N webhooks or external references stop working.

**Why it happens:** The current routing is flat: `/projects/[id]` for all projects. The hierarchy exists in the database (`parentId` on Project) but isn't reflected in URLs. Adding visual folder structure without changing URLs is fine; changing URLs without redirects is destructive.

**Prevention:**
1. Keep the existing `/projects/[id]` URL pattern -- folders are a UI concept, not a routing concept
2. A project's URL stays the same regardless of which folder it's in
3. Folder navigation happens in the sidebar/project list, not in the URL
4. If folder URLs are needed, add `/folders/[id]` as a separate route that lists projects within it
5. The existing `parentId` field in the schema already supports this -- just add UI, not new routes

**Detection:**
- QA finds broken links after folder feature is deployed
- Users report "ik kan mijn project niet meer vinden" after reorganizing into folders
- N8N webhook links stop working

**Phase relevance:** Folder structure / UX improvement phase. Design decision must be made upfront.

**Confidence:** HIGH (based on direct analysis of current routing structure)

## Minor Pitfalls

### Pitfall 11: Asana Assignee Matching Fails on Name Strings

**What goes wrong:** The existing `ActionItem.assignee` field stores a free-text name string (e.g., "Jan" or "Jan de Vries"). When pushing to Asana, you need an Asana user GID (a numeric ID). Matching "Jan" to the correct Asana user requires fuzzy name matching, which is unreliable -- especially with common Dutch names.

**Prevention:**
1. Add an Asana user mapping table: `AsanaUserMapping(userId, asanaUserGid, asanaUserName)`
2. During Asana setup, fetch workspace members and let the admin map them to internal users
3. When pushing action items, use the mapping table, not name matching
4. For unmapped assignees, create the task without assignee and note it in the description

**Phase relevance:** Asana integration phase.

**Confidence:** HIGH (based on `ActionItem.assignee` being a free-text `String?` in schema)

---

### Pitfall 12: Chat Streaming Not Implemented, Leading to Timeout on Vercel

**What goes wrong:** RAG chat queries take 5-15 seconds (retrieve chunks + generate answer). Without streaming, Vercel's default function timeout (10 seconds on Hobby, 60 on Pro) kills the request. Users see a blank error or timeout message.

**Prevention:**
1. Use streaming for RAG chat responses (the codebase already uses `anthropic.messages.stream()` -- extend this pattern)
2. Stream the response to the client using `ReadableStream` in the Next.js route handler
3. Show the answer appearing word-by-word in the UI (better UX anyway)
4. Set `maxDuration` on the chat API route if on Vercel Pro

**Phase relevance:** RAG phase, API implementation.

**Confidence:** HIGH (Vercel timeout behavior is well-documented, streaming pattern already exists in codebase)

---

### Pitfall 13: UX Polish Without User Feedback Loop

**What goes wrong:** The team spends weeks polishing the upload flow, dashboard layout, and sidebar navigation based on assumptions about what users need. After deployment, the 3 founders use the tool differently than expected. The "improved" UX is actually worse for their workflow.

**Prevention:**
1. Before each UX change, observe the founders using the current tool for 30 minutes
2. Prioritize the most-complained-about workflow, not the most aesthetically outdated screen
3. Ship small UX changes incrementally, not a big redesign
4. The founders ARE the users -- have weekly 15-min feedback sessions during the UX phase

**Phase relevance:** UX improvement phase. Ongoing concern.

**Confidence:** HIGH (team context from PROJECT.md: 3 founders + 1 developer)

---

### Pitfall 14: Adding RAG Dependency Without Embedding API Cost Monitoring

**What goes wrong:** Every transcript generates embeddings (cost per chunk). Every chat query generates a query embedding + LLM response (cost per query). With 4 users chatting regularly, costs grow unpredictably. The existing CONCERNS.md already flags "AI Token Spending Unbounded." Adding embeddings + RAG queries doubles or triples the AI cost surface.

**Prevention:**
1. Track embedding costs separately from LLM costs in the cost logging (extend the existing `streamMessage()` cost tracking pattern)
2. Set a monthly embedding budget alarm (e.g., alert at $50/month)
3. Cache frequent queries (same question within a project in last 24 hours = return cached answer)
4. Use the cheapest embedding model that works for Dutch (see Pitfall 9)
5. Consider batch embedding (process all chunks at once) instead of per-chunk API calls

**Phase relevance:** RAG phase, must be built into the architecture.

**Confidence:** HIGH (based on CONCERNS.md already flagging unbounded AI costs)

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| RAG/Chat Architecture | Pitfall 1: No chunking strategy | Design chunking + embedding pipeline before writing chat UI | Critical |
| RAG/Chat Architecture | Pitfall 2: Embedding-source sync | Embed generation as pipeline step with cascade deletes | Critical |
| RAG/Chat Architecture | Pitfall 5: Connection pool exhaustion | Decide pgvector vs external store, fix singleton first | Critical |
| RAG/Chat Architecture | Pitfall 6: Project scope leaking | Filter embeddings by projectId in every query | Moderate |
| RAG/Chat Architecture | Pitfall 8: Embedding model lock-in | Store model version, build re-index from day one | Moderate |
| RAG/Chat Architecture | Pitfall 9: Dutch language quality | Test with real Dutch transcripts, use multilingual model | Moderate |
| RAG/Chat Implementation | Pitfall 12: Streaming timeout | Use existing streaming pattern for chat endpoint | Minor |
| RAG/Chat Implementation | Pitfall 14: Cost monitoring | Extend existing cost tracking to embeddings | Minor |
| Asana Integration | Pitfall 3: OAuth token management | OAuth from day one, store tokens in DB, refresh middleware | Critical |
| Asana Integration | Pitfall 7: Rate limit on batch sync | Sequential processing with backoff, per-item status | Moderate |
| Asana Integration | Pitfall 11: Assignee name matching | User mapping table, not fuzzy name match | Minor |
| Background Processing (Foundation) | Pitfall 4: Fire-and-forget expansion | Fix before adding RAG/Asana -- add granular status, retry | Critical |
| Folder Structure / UX | Pitfall 10: URL breakage | Folders are UI-only, keep existing URL patterns | Moderate |
| UX Polish | Pitfall 13: Polish without feedback | Observe real usage before redesigning | Minor |

## Recommended Phase Ordering (Based on Pitfalls)

Based on the pitfall analysis, the recommended order is:

1. **Foundation fixes** -- Fix fire-and-forget pattern (Pitfall 4) and PrismaClient singleton (Pitfall 5 prerequisite). These are prerequisites for everything else.
2. **Folder structure + UX polish** -- Low risk, immediate user value, no new infrastructure needed.
3. **RAG/Chat** -- Requires the most new infrastructure (embeddings, vector search). Benefits from foundation fixes being done first.
4. **Asana integration** -- Can be done in parallel with or after RAG. OAuth infrastructure is isolated.

Doing RAG before fixing the background processing pattern means every RAG bug inherits the silent-failure problem.

## Sources

- Direct codebase analysis: `src/lib/ai.ts`, `prisma/schema.prisma`, `src/app/api/ai/process-transcript/route.ts`, `src/lib/auth.ts`
- Existing concerns audit: `.planning/codebase/CONCERNS.md` (2026-02-12)
- Existing integrations audit: `.planning/codebase/INTEGRATIONS.md` (2026-02-12)
- Project requirements: `.planning/PROJECT.md` (2026-02-12)
- Asana API rate limits and OAuth details: Training data (MEDIUM confidence -- verify against current Asana developer docs before implementation)
- pgvector and embedding model behavior: Training data (MEDIUM confidence for specific version capabilities)
- Vercel serverless behavior: Training data (HIGH confidence, well-established patterns)

---

*Pitfalls research: 2026-02-12*
