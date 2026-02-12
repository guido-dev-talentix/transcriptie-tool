# Feature Research: Meeting Intelligence / Project Management

> **Research date**: 2026-02-12
> **Context**: Meeting-first project management tool for lean teams (Search X / Talentix)
> **Competitors analyzed**: Otter.ai, Fireflies.ai, Grain, tl;dv, Fathom, Fellow, Hugo, Avoma, Chorus.ai, Gong
> **Dimension**: Features

---

## Current State (what we already have)

| Feature | Status | Notes |
|---------|--------|-------|
| Audio transcription (AssemblyAI) | Built | Speech-to-text with speaker diarization |
| PDF upload + extraction | Built | Via unpdf library |
| AI transcript processing (Claude) | Built | Summary, cleaned text |
| Action item extraction | Built | Per-transcript, linked to source |
| Decision extraction | Built | Per-transcript, linked to source |
| Report generation | Built | Meeting reports, weekly summaries, general summaries |
| Cumulative project status | Built | "Stand van Zaken" - AI merges new transcript info with existing status |
| Project hierarchy | Built | Parent/child via parentId |
| User auth + roles | Built | System roles (ADMIN/USER), project roles (OWNER/ADMIN/MEMBER/VIEWER) |
| User approval flow | Built | Admin approves new signups |
| N8N webhook integration | Built | Fire-and-forget webhook |
| Dashboard layout + sidebar | Built | Protected routes with DashboardLayout |
| Project members management | Built | Invite, role assignment |

---

## 1. TABLE STAKES (must have or users leave)

These are features every serious meeting intelligence tool provides. Users will evaluate Search X against these expectations.

### 1.1 Reliable Transcription + Speaker Identification

**What competitors do**: Otter, Fireflies, and Fathom all provide real-time transcription with speaker labels. Otter identifies speakers by voice profile. Fireflies assigns speaker names post-meeting. All support 30+ languages.

**Our status**: BUILT (via AssemblyAI). Speaker diarization is available.

**Gap**: Verify speaker label assignment is surfaced in UI. Users expect to rename "Speaker 1" to actual names.

- **Complexity**: Low (UI polish)
- **Dependencies**: None

---

### 1.2 AI-Generated Meeting Summary

**What competitors do**: Every product generates a summary immediately after meeting ends. Otter does "OtterPilot Summary" with key topics, action items, and decisions inline. Fireflies generates "Super Summaries" with overview, action items, keywords. Fathom gives a structured summary broken into agenda topics.

**Our status**: BUILT (via processTranscript in ai.ts).

**Gap**: None critical. Consider adding structured sections (topics discussed, key quotes) rather than a single summary blob.

- **Complexity**: Low (prompt engineering)
- **Dependencies**: None

---

### 1.3 Searchable Transcript Archive

**What competitors do**: Full-text search across all transcripts is universal. Otter has keyword search with timestamp jumping. Fireflies has "Smart Search" with filters (date, speaker, topic, sentiment). Grain lets you search and jump to the exact moment. Users expect to type a keyword and find every meeting where it was discussed.

**Our status**: NOT BUILT. We store transcripts but have no search endpoint or UI.

**Gap**: CRITICAL. This is the most-used feature after transcription itself. Users accumulate hundreds of transcripts and need to find information fast.

- **Complexity**: Medium
  - Basic: Full-text search via Prisma/PostgreSQL `search` or `contains` across transcript text + summaries
  - Advanced: Vector embeddings for semantic search (needed for RAG chat anyway)
- **Dependencies**: Database indexing; overlaps with RAG chat infrastructure

---

### 1.4 Action Item Tracking with Status

**What competitors do**: Fireflies extracts action items and lets you mark them complete. Otter assigns action items to specific people. Fellow tracks action items across meetings and shows overdue items. All allow manual editing and status toggling (open/done).

**Our status**: PARTIALLY BUILT. We extract action items and link to transcripts. Schema has `status` field.

**Gap**: Need UI for changing status (open/in-progress/done), filtering by status, and showing overdue items. Need assignment to specific users.

- **Complexity**: Low-Medium
  - Status toggle: Low
  - User assignment: Medium (need user picker, notification)
  - Cross-meeting tracking: Medium (dashboard showing all open items across projects)
- **Dependencies**: User management (already built)

---

### 1.5 Meeting Playback with Transcript Sync

**What competitors do**: Otter, Fireflies, Grain, and tl;dv all sync the audio/video with the transcript. Click a line in the transcript, audio jumps to that timestamp. Play audio, transcript highlights the current line. This is expected behavior for any tool that records meetings.

**Our status**: NOT BUILT. We store audio in Vercel Blob and transcripts in DB, but no playback UI with sync.

**Gap**: Significant for audio uploads. Users expect to click a transcript line and hear the original audio. Requires timestamp data from AssemblyAI (which provides word-level timestamps).

- **Complexity**: Medium-High
  - Audio player component with time sync
  - Store word/utterance timestamps from AssemblyAI
  - UI for click-to-seek and auto-scroll
- **Dependencies**: AssemblyAI timestamp data (available in API), audio file storage (already in Vercel Blob)

---

### 1.6 Export / Download

**What competitors do**: All products offer export to PDF, DOCX, TXT, and SRT/VTT. Fireflies also exports to CSV for action items. This is a basic expectation - users need to get their data out.

**Our status**: PARTIALLY BUILT. We have a download endpoint for transcripts (`/api/transcripts/[id]/download`).

**Gap**: Verify export includes summary, action items, decisions. Add PDF export for reports. Add bulk export.

- **Complexity**: Low-Medium
- **Dependencies**: None

---

### 1.7 Basic Integrations (Calendar + Storage)

**What competitors do**: Every meeting intelligence tool integrates with Google Calendar and Outlook to auto-associate meetings with calendar events. Most also integrate with Google Drive, Notion, or Slack for sharing transcripts/summaries.

**Our status**: NOT BUILT (only N8N webhook). No calendar or storage integrations.

**Gap**: Calendar integration adds context (meeting title, attendees, agenda) that dramatically improves the usefulness of transcripts. Without it, users must manually organize meetings.

- **Complexity**: Medium-High
  - Google Calendar API: OAuth flow, event matching
  - Slack integration: Webhook for auto-posting summaries
  - N8N can bridge some of this (already built)
- **Dependencies**: OAuth infrastructure for third-party services

---

### 1.8 Folder / Organization Structure

**What competitors do**: Fireflies has "Channels" for organizing meetings by team/topic. Otter has folders. Grain has "Spaces." All let users drag-and-drop meetings into organizational buckets. Some auto-organize by calendar (team meetings go to team folder).

**Our status**: PARTIALLY BUILT. We have project hierarchy (parent/child) but no folder/tag metaphor for quick organization.

**Gap**: The project hierarchy is more powerful than simple folders, but the UX needs to feel as easy as folder organization. Consider tags or smart filters alongside the hierarchy.

- **Complexity**: Low (UX polish on existing hierarchy)
- **Dependencies**: None (parentId already in schema)

---

### 1.9 Sharing and Collaboration

**What competitors do**: Otter lets you share transcripts with a link (view-only or edit). Grain creates shareable "highlight clips." Fireflies has team workspaces with granular permissions. tl;dv generates shareable links with specific timestamp bookmarks. Fellow has collaborative meeting notes.

**Our status**: PARTIALLY BUILT. We have project membership with roles (OWNER/ADMIN/MEMBER/VIEWER) and user management.

**Gap**: Need shareable links for individual transcripts/reports (public or auth-required). Need notification when items are shared with you.

- **Complexity**: Medium
  - Public share links with tokens: Medium
  - Email notifications: Medium
- **Dependencies**: None critical

---

## 2. DIFFERENTIATORS (competitive advantage)

These features are where Search X can stand out from the crowd. Not every competitor has them, and our architecture uniquely enables some of them.

### 2.1 Cumulative Project Intelligence ("Stand van Zaken")

**What competitors do**: Most tools treat each meeting as an isolated artifact. Otter has "Meeting Gems" but no cross-meeting synthesis. Fireflies has "Topic Tracker" for keyword frequency over time, but no actual intelligence synthesis. Fellow has "meeting streams" that group meetings but does not merge insights. Avoma and Gong track deal/account progress over time for sales use cases.

**Our status**: BUILT. This is our strongest differentiator. The `generateStatusUpdate()` function maintains a cumulative project status that AI merges with each new transcript.

**Why it differentiates**: No other meeting intelligence tool maintains a live, AI-updated "state of the project" that evolves with every meeting. This transforms meetings from isolated records into continuous project intelligence.

**Enhancement opportunities**:
- Show status evolution over time (timeline/changelog of how status changed)
- Highlight what changed since last meeting
- Detect stalled topics (mentioned 3 meetings ago, no progress since)
- Cross-project status rollup for portfolio views

- **Complexity**: Medium (mostly prompt engineering + UI)
- **Dependencies**: Existing AI pipeline

---

### 2.2 RAG Chat per Project (Conversational Project Memory)

**What competitors do**: Fireflies launched "AskFred" - an AI chatbot you can ask questions about your meetings. Otter has "Otter Chat" for asking questions about transcripts. Both work across all meetings, not project-scoped. Grain has no chat feature. Fathom has no chat feature.

**Our status**: PLANNED. Listed as upcoming feature.

**Why it differentiates**: Project-scoped RAG chat is significantly more useful than global chat. When a user asks "What did we decide about the pricing model?", they want the answer from THIS project's meetings, not all meetings ever. Combined with our cumulative status, the RAG system can give contextual, project-aware answers.

**Implementation approach**:
- Vector store: pgvector extension in PostgreSQL (keeps everything in one DB)
- Embedding: OpenAI text-embedding-3-small or Anthropic's embedding (when available)
- Chunking: Per-utterance or per-paragraph from cleaned transcripts
- Retrieval: Project-scoped similarity search + cumulative status as context
- Chat UI: Sliding panel or dedicated page per project

- **Complexity**: High
  - Vector store setup: Medium
  - Embedding pipeline: Medium
  - Chat UI: Medium
  - Quality tuning (chunking, retrieval, prompts): High
- **Dependencies**: PostgreSQL with pgvector; embedding API; transcript text (already stored)

---

### 2.3 Project Dashboard with Cross-Meeting Analytics

**What competitors do**: Fireflies has "Meeting Analytics" (talk time, silence, sentiment). Gong and Chorus focus on sales analytics (talk ratios, competitor mentions, next steps). No general-purpose meeting tool provides a project-level dashboard that shows decision velocity, action item completion rates, or topic evolution.

**Our status**: PARTIALLY BUILT. We have a project dashboard endpoint (`/api/projects/[id]/dashboard`) and a `ProjectDashboard` component.

**Why it differentiates**: A dashboard that shows "this project has 12 open action items, made 8 decisions this month, and the status has been stalled on budget approval for 2 weeks" is genuinely useful for project managers. No competitor does this for non-sales use cases.

**Enhancement opportunities**:
- Action item burn-down (opened vs. closed over time)
- Decision frequency and recency
- Meeting cadence and attendance patterns
- Topic heatmap (what topics dominate meetings)
- Stale item alerts

- **Complexity**: Medium
  - Data aggregation queries: Low-Medium
  - Chart/visualization components: Medium
  - Stale detection logic: Low
- **Dependencies**: Existing data model (action items, decisions, transcripts)

---

### 2.4 Task Management Integration (Asana, Jira, Linear)

**What competitors do**: Fireflies integrates with Asana, Trello, Monday.com, and Jira - pushing action items as tasks. Otter has limited CRM integrations. Fellow has deep Asana and Jira integration for syncing action items bidirectionally. Hugo pushes meeting notes and action items to project management tools.

**Our status**: PLANNED (Asana integration listed as upcoming).

**Why it differentiates**: Two-way sync is the differentiator here. Pushing tasks to Asana is table stakes for Fellow users. But pulling task status BACK and reflecting it in the project dashboard / status update would be unique. "The AI knows that the Asana task for redesigning the landing page is 60% complete because it synced the status."

**Implementation approach**:
- Asana API: OAuth2 flow, create tasks from action items, read task status
- Mapping: ActionItem <-> Asana Task (store external ID)
- Sync: Webhook or polling for status updates from Asana
- UI: "Push to Asana" button on action items, status badge showing Asana state

- **Complexity**: High
  - OAuth flow: Medium
  - One-way push: Medium
  - Two-way sync: High
  - UI for mapping/configuration: Medium
- **Dependencies**: OAuth infrastructure, Asana API credentials per user/workspace

---

### 2.5 Project Hierarchy with Rollup Intelligence

**What competitors do**: No meeting intelligence tool has project hierarchy. Fireflies has flat "Channels." Otter has flat folders. This is unique to Search X.

**Our status**: BUILT (parentId in schema, ProjectHierarchy relation).

**Why it differentiates**: A parent project can aggregate status from child projects. "The Q1 Launch parent project shows that 'Design' is on track, 'Engineering' has 3 blockers, and 'Marketing' is waiting on Engineering." This is genuine project portfolio intelligence built from meeting data.

**Enhancement opportunities**:
- Rollup views: aggregate action items, decisions, status across children
- Parent dashboard that visualizes child project health
- Inheritance of team members from parent to child

- **Complexity**: Medium
  - Rollup queries: Medium
  - UI for hierarchy navigation: Medium
  - Status aggregation prompt: Low (prompt engineering)
- **Dependencies**: Existing hierarchy model

---

### 2.6 Smart Meeting Templates and Recurring Patterns

**What competitors do**: Fellow has extensive meeting templates (1:1s, standups, retrospectives). Hugo has meeting type presets. Most transcription tools are template-agnostic.

**Why it could differentiate**: If the AI knows a meeting is a "standup," it can extract structured data (blockers, yesterday, today). If it is a "retrospective," it captures what went well / what to improve. This shapes the extraction pipeline per meeting type.

- **Complexity**: Medium
  - Template model in schema: Low
  - Per-template AI prompts: Medium
  - Template selection UX: Low
- **Dependencies**: AI pipeline (already built, needs parameterization)

---

## 3. ANTI-FEATURES (deliberately NOT build)

These are features competitors have that would be wrong for Search X to build, either because they conflict with the product vision, add complexity without proportional value, or serve a different audience.

### 3.1 Real-Time Meeting Bot / Auto-Join

**What it is**: Otter, Fireflies, Fathom, and tl;dv all provide a meeting bot that auto-joins Zoom/Google Meet/Teams calls, records, and transcribes in real time.

**Why NOT to build**:
- Enormous engineering complexity (WebRTC, bot infrastructure, per-platform APIs)
- Requires always-on infrastructure with significant cost
- Privacy and consent concerns in EU/Dutch context (AVG/GDPR)
- Search X's value is in the intelligence layer, not the recording layer
- Users can record locally and upload, or use native recording features
- N8N integration can bridge recording tools to Search X

**Alternative**: Support more upload formats and provide a clean "record and upload" mobile flow. Integrate with existing recording tools via webhooks.

---

### 3.2 Video Recording and Playback

**What it is**: Grain and tl;dv record video and let you create video clips ("highlights") from meetings.

**Why NOT to build**:
- Video storage is extremely expensive at scale
- Video processing requires specialized infrastructure
- The intelligence value is in the transcript, not the video
- Competes with dedicated tools (Loom, Grain) that do this better
- Our target users (lean teams, project management focus) care about decisions and actions, not video clips

**Alternative**: Link to external video recordings if available. Focus on text-based highlights and quotes from transcripts.

---

### 3.3 Sales Intelligence / Revenue Intelligence

**What it is**: Gong, Chorus.ai, and Avoma analyze sales calls for deal intelligence, competitor mentions, objection handling, and pipeline health.

**Why NOT to build**:
- Completely different user persona (sales managers vs. project leads)
- Requires CRM integration (Salesforce, HubSpot) as core infrastructure
- Sales-specific AI models and training data
- Crowded market with well-funded incumbents
- Distracts from project management focus

**Alternative**: If sales teams want to use Search X, the project-scoped intelligence works naturally for deal tracking without building sales-specific features.

---

### 3.4 Sentiment Analysis / Emotion Detection

**What it is**: Fireflies and some others analyze tone, sentiment, and emotional patterns in meetings.

**Why NOT to build**:
- Questionable accuracy and value for project management
- Privacy concerns, especially in Dutch/EU work culture
- Can feel surveillance-like and damage trust
- Not actionable for project managers (knowing someone sounded frustrated does not help ship the project)

**Alternative**: If there is demand, the cumulative status can note "team expressed concerns about timeline" as a natural language observation rather than a sentiment score.

---

### 3.5 Meeting Scheduling / Calendar Management

**What it is**: Some tools expand into scheduling (Calendly-like features, smart scheduling suggestions).

**Why NOT to build**:
- Completely different product category
- Well-served by existing tools (Calendly, Cal.com, native calendar)
- Engineering effort with zero differentiation
- Distracts from core value proposition

**Alternative**: READ from calendars for meeting context, but never WRITE to calendars.

---

### 3.6 Collaborative Real-Time Note-Taking

**What it is**: Fellow and Hugo provide a Google Docs-like collaborative editor for live meeting notes alongside the transcript.

**Why NOT to build (for now)**:
- Real-time collaboration (CRDT/OT) is extremely complex
- Competes with tools teams already use (Notion, Google Docs)
- Our AI-generated content is better than manual notes
- Risk of building a mediocre editor that frustrates users

**Alternative**: AI-generated reports and summaries serve the same need. Allow manual annotations/comments on transcripts rather than a full editor.

---

## 4. FEATURE PRIORITY MATRIX

| Feature | Category | Complexity | Depends On | Priority |
|---------|----------|------------|------------|----------|
| Searchable transcript archive | Table stakes | Medium | DB indexing | P0 |
| Action item status + assignment | Table stakes | Low-Medium | User mgmt (built) | P0 |
| Folder organization UX | Table stakes | Low | Hierarchy (built) | P0 |
| Export polish (PDF, summary included) | Table stakes | Low | None | P1 |
| Audio playback with transcript sync | Table stakes | Medium-High | AssemblyAI timestamps | P1 |
| Sharing links for transcripts/reports | Table stakes | Medium | None | P1 |
| Project dashboard enhancements | Differentiator | Medium | Data model (built) | P0 |
| RAG chat per project | Differentiator | High | pgvector, embeddings | P1 |
| Asana integration | Differentiator | High | OAuth infra | P1 |
| Cumulative status enhancements | Differentiator | Medium | AI pipeline (built) | P1 |
| Project hierarchy rollups | Differentiator | Medium | Hierarchy (built) | P2 |
| Calendar integration (read-only) | Table stakes | Medium-High | OAuth infra | P2 |
| Smart meeting templates | Differentiator | Medium | AI pipeline (built) | P2 |
| Slack integration (post summaries) | Table stakes | Medium | Slack API | P2 |

---

## 5. DEPENDENCY MAP

```
OAuth Infrastructure ──────┬── Asana Integration
                           ├── Calendar Integration (Google/Outlook)
                           └── Slack Integration

pgvector + Embeddings ─────┬── RAG Chat per Project
                           └── Semantic Search (advanced)

PostgreSQL Full-Text Index ─── Basic Transcript Search (can ship first, before vector)

Existing AI Pipeline ──────┬── Cumulative Status Enhancements
                           ├── Smart Meeting Templates
                           └── Project Hierarchy Rollups

Existing Data Model ───────┬── Action Item Status + Assignment
                           ├── Dashboard Enhancements
                           └── Export Polish

AssemblyAI Timestamps ─────── Audio Playback Sync

None (independent) ────────┬── Folder Organization UX
                           └── Sharing Links
```

---

## 6. COMPETITIVE POSITIONING SUMMARY

**Where Search X wins**:
- Project-scoped intelligence (cumulative status) - no competitor does this
- Project hierarchy with rollup potential - unique in the category
- Meeting data as project management fuel, not just archives
- Built for lean teams who need decisions and actions, not sales analytics

**Where Search X is behind (fix first)**:
- No transcript search (every competitor has this)
- No audio playback sync (expected for audio-based tools)
- No calendar integration (every competitor has this)
- Action items need status tracking and assignment

**Strategic insight**: The meeting intelligence market has bifurcated into (a) recording bots that auto-join calls and (b) intelligence layers that process meeting content. Search X is firmly in category (b), which is the right positioning. The value is not in how the audio gets recorded but in what you DO with the transcript. Double down on project intelligence, not recording infrastructure.

---

## 7. SOURCES AND REFERENCES

Analysis based on publicly available product documentation, feature pages, and pricing pages of:
- Otter.ai (otter.ai/features, otter.ai/pricing)
- Fireflies.ai (fireflies.ai/features, fireflies.ai/integrations)
- Grain (grain.com/features)
- tl;dv (tldv.io/features)
- Fathom (fathom.video/features)
- Fellow (fellow.app/features, fellow.app/integrations)
- Hugo (hugo.team)
- Avoma (avoma.com/features)
- Gong (gong.io/platform)
- Chorus.ai (chorus.ai) - now part of ZoomInfo
