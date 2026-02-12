# Codebase Structure

**Analysis Date:** 2026-02-12

## Directory Layout

```
transcriptie-tool/
├── .planning/                          # GSD planning documents
│   └── codebase/                       # Auto-generated architecture docs
├── prisma/                             # Database schema & migrations
│   └── schema.prisma                   # Prisma data model
├── public/                             # Static assets
│   ├── fonts/                          # Talentix brand fonts
│   └── images/                         # Logo and brand images
├── src/
│   ├── app/                            # Next.js App Router structure
│   │   ├── (dashboard)/                # Protected route group with DashboardLayout
│   │   │   ├── layout.tsx              # Layout wrapper (applies DashboardLayout)
│   │   │   ├── page.tsx                # Home/upload page (/)
│   │   │   ├── projects/               # Project listing and management
│   │   │   │   ├── page.tsx            # Projects list
│   │   │   │   ├── new/                # Create new project
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/               # Individual project details
│   │   │   │       ├── page.tsx        # Project dashboard
│   │   │   │       ├── action-items/   # Project action items
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── decisions/      # Project decisions
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── members/        # Project members management
│   │   │   │       │   └── page.tsx
│   │   │   │       └── reports/        # Project reports
│   │   │   │           ├── page.tsx    # Reports list
│   │   │   │           └── [reportId]/
│   │   │   │               └── page.tsx # Individual report view
│   │   │   ├── transcripts/            # Transcript listing
│   │   │   │   ├── page.tsx            # Transcripts list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx        # Individual transcript view
│   │   │   ├── profile/                # User profile
│   │   │   │   └── page.tsx
│   │   │   └── admin/                  # Admin section
│   │   │       └── users/
│   │   │           └── page.tsx        # User approval/management
│   ├── api/                            # API route handlers
│   │   ├── auth/                       # Authentication endpoints
│   │   │   ├── me/
│   │   │   │   └── route.ts            # GET current user info
│   │   │   └── ...                     # Supabase auth routes
│   │   ├── admin/                      # Admin endpoints
│   │   │   └── users/
│   │   │       └── route.ts            # GET/PATCH users for approval
│   │   ├── projects/                   # Project endpoints
│   │   │   ├── route.ts                # GET list / POST create projects
│   │   │   └── [id]/                   # Individual project endpoints
│   │   │       ├── route.ts            # GET / PATCH / DELETE project
│   │   │       ├── dashboard/
│   │   │       │   └── route.ts        # GET project stats & recent items
│   │   │       ├── action-items/
│   │   │       │   └── route.ts        # GET / POST action items
│   │   │       ├── decisions/
│   │   │       │   └── route.ts        # GET / POST decisions
│   │   │       ├── members/
│   │   │       │   ├── route.ts        # GET / POST project members
│   │   │       │   └── [userId]/
│   │   │       │       └── route.ts    # PATCH / DELETE member role
│   │   │       └── reports/
│   │   │           └── route.ts        # GET / POST reports
│   │   ├── transcripts/                # Transcript endpoints
│   │   │   ├── route.ts                # GET list / DELETE transcript
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts            # GET / DELETE individual transcript
│   │   │   │   └── download/
│   │   │   │       └── route.ts        # GET download transcript as SRT
│   │   │   └── ...
│   │   ├── action-items/               # Global action item endpoints
│   │   │   ├── route.ts                # GET / POST action items
│   │   │   └── [id]/
│   │   │       └── route.ts            # GET / PATCH / DELETE action item
│   │   ├── ai/                         # AI processing endpoints
│   │   │   └── process-transcript/
│   │   │       └── route.ts            # POST fire-and-forget transcript processing
│   │   ├── blob-upload/
│   │   │   └── route.ts                # POST Vercel Blob upload endpoint
│   │   ├── upload-pdf/
│   │   │   └── route.ts                # POST PDF upload & extract text
│   │   ├── webhook/
│   │   │   └── route.ts                # POST AssemblyAI webhook handler
│   │   ├── transcribe-from-url/
│   │   │   └── route.ts                # POST start transcription from URL
│   │   ├── send-to-n8n/
│   │   │   └── route.ts                # POST send transcript to N8N workflow
│   │   └── ...
│   ├── auth/                           # Auth pages (public routes)
│   │   ├── callback/
│   │   │   └── route.ts                # Supabase auth callback handler
│   │   └── ...
│   ├── login/                          # Login page
│   │   └── page.tsx
│   ├── signup/                         # Signup page
│   │   └── page.tsx
│   ├── layout.tsx                      # Root layout
│   └── middleware.ts                   # Session refresh middleware
├── lib/                                # Shared utility/service code
│   ├── db.ts                           # Prisma client singleton
│   ├── auth.ts                         # Auth helpers (getAuthUser, requireAdmin, checkProjectAccess)
│   ├── ai.ts                           # AI processing pipeline (Claude API)
│   ├── assemblyai.ts                   # AssemblyAI speech-to-text integration
│   ├── webhook.ts                      # N8N webhook notification
│   ├── sorting.ts                      # Sorting utilities
│   └── supabase/
│       ├── client.ts                   # Supabase browser client
│       ├── server.ts                   # Supabase server client
│       └── middleware.ts               # Session refresh middleware logic
├── components/                         # Reusable UI components
│   ├── DashboardLayout.tsx             # Sidebar + main layout wrapper
│   ├── Sidebar.tsx                     # Navigation sidebar
│   ├── UploadForm.tsx                  # Audio/PDF upload interface
│   ├── TranscriptView.tsx              # Transcript display with AI processing
│   ├── TranscriptList.tsx              # Transcript list table
│   ├── ProjectDashboard.tsx            # Project overview dashboard
│   ├── ActionItemList.tsx              # Action items table/list
│   ├── DecisionList.tsx                # Decisions list
│   ├── ReportView.tsx                  # Report display
│   └── StatusBadge.tsx                 # Status indicator component
├── .env                                # Environment variables (NOT committed)
├── .env.example                        # Environment template (committed)
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript configuration with @ alias
├── next.config.js                      # Next.js configuration
├── tailwind.config.js                  # Tailwind CSS branding tokens
├── postcss.config.js                   # PostCSS configuration
├── CLAUDE.md                           # Project instructions for Claude Code
└── README.md                           # Project documentation
```

## Directory Purposes

**`src/app/(dashboard)/`**
- Purpose: Protected routes within the dashboard (require authentication)
- Contains: Page components for projects, transcripts, reports, action items, decisions, admin
- Key files: `layout.tsx` wraps pages with `<DashboardLayout>` component (sidebar + main content)
- Routing: Group syntax `(dashboard)` applies layout without affecting URL

**`src/app/api/`**
- Purpose: RESTful API endpoints accessed by frontend and external webhooks
- Contains: Route handlers organized by resource (projects, transcripts, action-items, decisions, reports, admin, auth)
- Key pattern: `route.ts` files export `GET()`, `POST()`, `PATCH()`, `DELETE()` functions
- Authorization: Each route calls `checkProjectAccess()` or `requireAdmin()` before database access

**`src/lib/`**
- Purpose: Shared business logic and service integrations
- Contains: Database client (`db.ts`), auth helpers (`auth.ts`), AI pipeline (`ai.ts`), external API wrappers (`assemblyai.ts`, `webhook.ts`)
- Key pattern: Service-oriented modules export pure functions or singletons (Prisma client)

**`src/components/`**
- Purpose: Reusable React components shared across multiple pages
- Contains: Layout components (DashboardLayout, Sidebar), data display (lists, viewers), forms (UploadForm)
- Key pattern: Client components (`'use client'`) with React hooks for state management, fetch calls for data

**`src/lib/supabase/`**
- Purpose: Supabase integration (auth, session management)
- Contains: Server-side client (`server.ts` with SSR cookie handling), browser client (`client.ts`), middleware integration
- Key pattern: Separate clients for server (SSR cookies) vs browser (localStorage) contexts

**`prisma/`**
- Purpose: Database schema definition and migrations
- Contains: `schema.prisma` with all data models, relations, and constraints
- Key models: User, Project, Transcript, ActionItem, Decision, Report, UserProject

**`public/`**
- Purpose: Static assets served directly by Next.js
- Contains: Brand fonts, logo images
- No subdirectories for user uploads (use Vercel Blob instead)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout, initializes global styles and fonts
- `src/middleware.ts`: Session refresh middleware, runs on every request
- `src/app/(dashboard)/layout.tsx`: Dashboard layout wrapper, applies DashboardLayout component
- `src/app/login/page.tsx`: Public login page
- `src/app/signup/page.tsx`: Public signup page

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path alias `@/* → src/*`
- `tailwind.config.js`: Tailwind CSS theme, Talentix brand colors
- `next.config.js`: Next.js settings (image optimization, redirects, etc.)
- `postcss.config.js`: PostCSS plugins (Tailwind, autoprefixer)
- `package.json`: Dependencies, scripts, metadata

**Core Logic:**
- `src/lib/db.ts`: Prisma client singleton (connection reuse)
- `src/lib/auth.ts`: Auth utilities (getAuthUser, requireAdmin, checkProjectAccess)
- `src/lib/ai.ts`: AI processing (streamMessage, processTranscript, generateStatusUpdate, extractActionItems, extractDecisions, generateReport)
- `src/lib/assemblyai.ts`: AssemblyAI speech-to-text (uploadAndTranscribe, getTranscriptionStatus, getSubtitles)

**Testing:**
- No test files in current codebase (testing infrastructure not yet set up)

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Reusable components: PascalCase + `.tsx` (e.g., `DashboardLayout.tsx`, `UploadForm.tsx`)
- Utilities/services: camelCase + `.ts` (e.g., `db.ts`, `auth.ts`, `ai.ts`)
- Library directories: lowercase + subdir (e.g., `src/lib/supabase/`)

**Directories:**
- Route groups: Parentheses syntax (e.g., `(dashboard)`, `(auth)`)
- Dynamic routes: Square brackets (e.g., `[id]`, `[userId]`, `[projectId]`)
- Feature directories: Lowercase plural (e.g., `projects`, `transcripts`, `components`)
- API resource routes: Lowercase plural (e.g., `/api/projects`, `/api/transcripts`)

**Functions:**
- Event handlers: `handleX` or `onX` (e.g., `handleLogin`, `onUpload`)
- Async operations: `fetchX`, `getX`, `createX`, `updateX`, `deleteX` (e.g., `fetchProjects`, `getAuthUser`)
- API calls: `POST /api/...`, `GET /api/...` (REST conventions)
- Utility functions: Descriptive names (e.g., `parseAIJsonResponse`, `checkProjectAccess`, `streamMessage`)

**Variables:**
- React state: `const [state, setState]` (camelCase)
- Constants: `UPPERCASE` (e.g., `PRICING`, `max_tokens`)
- Types/Interfaces: PascalCase (e.g., `AuthUser`, `ProcessedTranscript`, `ProjectDashboard`)
- Database IDs: `projectId`, `userId`, `transcriptId` (suffixed with Id)

## Where to Add New Code

**New Feature (End-to-End):**
1. Add data model to `prisma/schema.prisma`
2. Run `npm run db:generate` and `npm run db:push`
3. API endpoint: Create `src/app/api/[resource]/route.ts` with auth checks
4. UI page: Create `src/app/(dashboard)/[resource]/page.tsx` with 'use client' hook
5. Component: Create `src/components/[ResourceName].tsx` if reusable
6. Tests: Create `src/app/api/[resource]/route.test.ts` (when testing added)

**New API Endpoint:**
- Location: `src/app/api/[resource]/route.ts` or `src/app/api/[resource]/[id]/route.ts`
- Pattern: Export `GET`, `POST`, `PATCH`, or `DELETE` async function
- Template:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server'
  import { prisma } from '@/lib/db'
  import { checkProjectAccess } from '@/lib/auth'

  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await params
      const access = await checkProjectAccess(id)
      if (access instanceof NextResponse) return access

      // Fetch and return data
      const data = await prisma.resource.findUnique({ where: { id } })
      return NextResponse.json(data)
    } catch (error) {
      console.error('Error:', error)
      return NextResponse.json({ error: 'Dutch error message' }, { status: 500 })
    }
  }
  ```

**New Component:**
- Location: `src/components/[ComponentName].tsx`
- Pattern: Client component if using hooks, export as default
- Template:
  ```typescript
  'use client'

  import { useState, useEffect } from 'react'

  export default function ComponentName({ prop }: { prop: string }) {
    const [data, setData] = useState(null)

    useEffect(() => {
      fetch('/api/resource')
        .then(res => res.json())
        .then(setData)
        .catch(err => console.error(err))
    }, [])

    return <div>Component content</div>
  }
  ```

**New Page:**
- Location: `src/app/(dashboard)/[feature]/page.tsx` for protected, `src/app/[feature]/page.tsx` for public
- Pattern: Export default component, use 'use client' if interactive
- Automatically wrapped by `src/app/(dashboard)/layout.tsx` if in that group

**Utilities/Services:**
- Location: `src/lib/[utility].ts`
- Pattern: Export pure functions or singletons
- Example: New AI function goes in `src/lib/ai.ts`, new auth check in `src/lib/auth.ts`

## Special Directories

**`src/lib/supabase/`**
- Purpose: Supabase integration layer (auth, session management)
- Generated: No (hand-written)
- Committed: Yes
- Contains: `client.ts` (browser), `server.ts` (server), `middleware.ts` (session refresh logic)

**`.env`**
- Purpose: Environment variables (secrets, API keys, database URL)
- Generated: No
- Committed: No (add to `.gitignore`)
- Required vars: `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BASE_URL`
- Optional: `BLOB_READ_WRITE_TOKEN`, `N8N_WEBHOOK_URL`

**`.next/`**
- Purpose: Next.js build output
- Generated: Yes (by `npm run build`)
- Committed: No
- Clean with: `rm -rf .next` before rebuild

**`node_modules/`**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No
- Clean with: `rm -rf node_modules && npm install`

**`.planning/codebase/`**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by GSD tools)
- Committed: Yes (read-only reference)
- Contents: ARCHITECTURE.md, STRUCTURE.md, STACK.md, INTEGRATIONS.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

---

*Structure analysis: 2026-02-12*
