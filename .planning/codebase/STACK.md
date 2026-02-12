# Technology Stack

**Analysis Date:** 2026-02-12

## Languages

**Primary:**
- TypeScript 5.5.4 - Full codebase including API routes, components, and utilities
- JSX/TSX - React component definitions in `src/components/` and `src/app/`

**Secondary:**
- JavaScript - Configuration files (Tailwind, PostCSS, Next.js config)
- SQL - Prisma migrations and schema in `prisma/schema.prisma`

## Runtime

**Environment:**
- Node.js (version not explicitly specified in package.json, inferred from Next.js 16 requirements)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
  - Server and client components in `src/app/` directory
  - API routes in `src/app/api/` for backend endpoints
  - Middleware in `src/middleware.ts` for session management

**UI & Styling:**
- React 18.3.1 - Component library for frontend
- react-dom 18.3.1 - DOM rendering for React
- Tailwind CSS 3.4.7 - Utility-first CSS framework with custom brand theme
  - Config: `tailwind.config.js` with Search X brand colors and typography
  - Custom font variables: `--font-display` (Fractul), `--font-body` (Roboto)

**Markdown & Content:**
- react-markdown 10.1.0 - Render markdown content in components

**Icons & UI Components:**
- lucide-react 0.563.0 - Icon library for consistent UI elements

**PDF Processing:**
- unpdf 1.4.0 - PDF text extraction for document uploads

## Testing & Build Tools

**Database ORM:**
- Prisma 5.17.0 - Database schema management and query builder
  - Config: `prisma/schema.prisma`
  - Client: `src/lib/db.ts` with singleton pattern for connection pooling

**CSS Processing:**
- Tailwind CSS 3.4.7 - Compiled with PostCSS
- PostCSS 8.4.40 - CSS transformation
- Autoprefixer 10.4.19 - Vendor prefix automation

**Type Checking:**
- TypeScript - Strict mode enabled in `tsconfig.json`

## Key Dependencies

**Critical:**

- @anthropic-ai/sdk 0.72.1 - Claude API for transcript processing, status updates, and report generation
  - Used in `src/lib/ai.ts` for streaming messages with claude-sonnet-4-20250514 model
  - Handles action items, decisions, and report generation in JSON format

- @prisma/client 5.17.0 - PostgreSQL ORM for database operations
  - Models: User, Project, Transcript, ActionItem, Decision, Report, UserProject, SavedDestination
  - Connection: `src/lib/db.ts`

- @supabase/ssr 0.8.0 - Server-side rendering support for Supabase Auth
  - Server client: `src/lib/supabase/server.ts` (cookie-based sessions)
  - Browser client: `src/lib/supabase/client.ts` (frontend authentication)
  - Middleware integration: `src/lib/supabase/middleware.ts`

- @supabase/supabase-js 2.95.3 - JavaScript client for Supabase services
  - Authentication and session management

**Infrastructure:**

- assemblyai 4.6.1 - Speech-to-text transcription API client
  - Implemented in `src/lib/assemblyai.ts`
  - Functions: `uploadAndTranscribe()`, `getTranscriptionStatus()`, `getSubtitles()`
  - Supports webhook callbacks and language detection

- @vercel/blob 2.0.1 - File upload storage service
  - Audio and document file uploads via Vercel Blob API

## Configuration

**Environment:**

- `.env` - Base environment variables (existence noted, secrets not read per policy)
- `.env.local` - Local development configuration
- `.env.production.local` - Production environment secrets
- `.env.local.example` - Example environment template

**Required environment variables:**
- `ANTHROPIC_API_KEY` - Claude API access
- `ASSEMBLYAI_API_KEY` - AssemblyAI transcription service
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_BASE_URL` - Application base URL (for webhooks and callbacks)

**Optional environment variables:**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob write token for file uploads
- `N8N_WEBHOOK_URL` - N8N integration webhook for notifications

**Build Configuration:**

- `next.config.js` - Next.js configuration
  - Server action body size limit: 100mb (for large file uploads)

- `tsconfig.json` - TypeScript compiler settings
  - Path alias: `@/*` maps to `./src/*`
  - Target: ES2017
  - Module: esnext
  - Strict: true

- `postcss.config.js` - PostCSS configuration (autoprefixer + Tailwind)

- `tailwind.config.js` - Tailwind CSS theme configuration
  - Search X brand colors: brand-blue, brand-yellow, brand-red, light-blue
  - Custom typography scale for headings and body text
  - Custom animations: fade-in, slide-up, pulse-soft
  - Custom shadows: card, card-hover, glow effects

## Platform Requirements

**Development:**
- Node.js (npm-based package management)
- PostgreSQL database
- Supabase project (for authentication)
- AssemblyAI API key for transcription
- Anthropic API key for Claude AI

**Production:**
- Next.js deployment platform (Vercel recommended for blob storage integration)
- PostgreSQL database (cloud-hosted)
- Supabase authentication service
- External API services (AssemblyAI, Anthropic)

**Build Command:**
```bash
npm run build       # Compile Next.js and generate Prisma client
npm run db:push    # Apply database schema changes
```

**Development Command:**
```bash
npm run dev         # Start Next.js dev server on port 3000
npm run db:generate # Regenerate Prisma client after schema changes
npm run db:studio  # Open Prisma Studio database GUI
```

---

*Stack analysis: 2026-02-12*
