# Coding Conventions

**Analysis Date:** 2026-02-12

## Naming Patterns

**Files:**
- TypeScript/TSX files use camelCase: `ai.ts`, `db.ts`, `auth.ts`
- Component files use PascalCase: `ProjectDashboard.tsx`, `ActionItemList.tsx`, `StatusBadge.tsx`
- API route files use lowercase with hyphens for compound words: `process-transcript/route.ts`, `action-items/[id]/route.ts`
- Utility/library files use camelCase: `assemblyai.ts`, `sorting.ts`, `webhook.ts`

**Functions:**
- All functions use camelCase: `getAuthUser()`, `processTranscript()`, `checkProjectAccess()`, `sortActionItems()`
- Async functions commonly have `async` prefix keyword: `async function processInBackground()`
- Exported functions from libraries are named descriptively: `parseAIJsonResponse<T>()`, `streamMessage()`

**Variables:**
- Use camelCase for all variables: `responseText`, `updateData`, `isFirst`, `effectiveProjectId`
- Boolean variables often prefixed with `is` or `has`: `isFirst`, `unlinked`, `success`
- Request parameters extracted early: `searchParams.get()`, `body = await request.json()`, then immediately destructured

**Constants:**
- UPPERCASE for truly constant values: `PRICING = { input: 3.0, output: 15.0 }`
- camelCase for object constants and type definitions: `priorityOrder`, `statusOrder`, `decisionStatusOrder`

**Types & Interfaces:**
- PascalCase for all types and interfaces: `ProcessedTranscript`, `StatusUpdate`, `GeneratedReport`, `ExtractedActionItems`, `AuthUser`
- Interfaces prefixed with component/context name in props: `ActionItemListProps`, `StatusBadgeProps`, `DashboardData`, `ProcessOptions`
- Generic types use standard conventions: `<T>` for generic type parameter in `parseAIJsonResponse<T>()`

## Code Style

**Formatting:**
- No explicit formatter configured (no .prettierrc or eslintrc in root)
- Next.js default linting via `npm run lint` (ESLint)
- Standard 2-space indentation observed throughout codebase
- Consistent quote usage: double quotes for strings (`"error"`, `"Kon AI response niet parsen"`)

**Linting:**
- Tool: Next.js built-in ESLint (via `npm run lint`)
- Runs automatically on `next build` and `next lint` command
- Strict TypeScript mode enabled (`"strict": true` in tsconfig.json)

**Import Organization:**

Order observed:
1. External packages (Next.js, React): `import { NextRequest, NextResponse }`, `import { useState }`
2. Prisma/Database: `import { prisma }`, `import { PrismaClient }`
3. Supabase/Auth: `import { createClient }`, `import { updateSession }`
4. Internal utilities: `import { parseAIJsonResponse, streamMessage }` from `@/lib/ai`
5. Internal components: `import ActionItemList from '@/components/ActionItemList'`
6. Direct imports by type: Types/interfaces listed separately

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- All imports use the `@/` alias pattern: `@/lib/db`, `@/lib/auth`, `@/lib/supabase/server`, `@/components/...`
- Never use relative imports; always use `@/` alias for clarity and maintainability

## Error Handling

**Patterns:**
- All API routes wrap logic in try/catch blocks
- Console errors logged before response: `console.error('Error fetching projects:', error)`
- Generic error messages returned to client in Dutch (user-facing): `{ error: 'Kon projecten niet ophalen' }`
- HTTP status codes used consistently:
  - 400: Validation errors (missing params, invalid input)
  - 401: Not authenticated
  - 403: Not authorized
  - 404: Resource not found
  - 500: Server error
- Throw errors from utility functions with descriptive Dutch messages: `throw new Error('Kon AI response niet parsen')`
- Early validation returns in API routes: Check `!id` or invalid enum values before proceeding

**Example pattern:**
```typescript
try {
  const body = await request.json()
  const { name } = body
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Projectnaam is verplicht' }, { status: 400 })
  }
  // ... process ...
  return NextResponse.json(result, { status: 201 })
} catch (error) {
  console.error('Error creating project:', error)
  return NextResponse.json({ error: 'Kon project niet aanmaken' }, { status: 500 })
}
```

## Logging

**Framework:** `console` (console.log, console.error)

**Patterns:**
- Errors logged with context: `console.error('Error fetching projects:', error)`
- AI function calls logged with detailed metrics:
  ```typescript
  console.log(
    `[AI ${params.label || 'call'}] ${durationSec}s | ` +
    `input: ${inputTokens} tokens ($${costInput.toFixed(4)}) | ` +
    `output: ${outputTokens} tokens ($${costOutput.toFixed(4)}) | ` +
    `totaal: $${costTotal.toFixed(4)}`
  )
  ```
- Status updates logged: `console.log('Stand van Zaken updated for project...')`
- Warnings for edge cases: `console.error('processTranscript response was truncated (max_tokens reached)')`
- No debug logging in production; informational logs for important operations

## Comments

**When to Comment:**
- Comments explain the "why", not the "what"
- Complex logic in AI processing receives detailed comments explaining business rules
- Enum/status value meanings are commented: `// null = not started, "processing" = in progress, etc.`
- Route-level comments document the HTTP method and path: `// GET /api/projects - List all projects`
- Comments in Dutch when documenting Dutch business logic (e.g., "Stand van Zaken")

**JSDoc/TSDoc:**
- Minimal JSDoc usage observed
- Function documentation is inline when complex
- Type definitions in interfaces serve as documentation
- Parameter documentation in complex function signatures:
  ```typescript
  async function streamMessage(params: {
    system: string
    userPrompt: string
    max_tokens: number
    label?: string
  }): Promise<{ text: string; stopReason: string | null }>
  ```

## Function Design

**Size:**
- Utility functions kept compact (parseAIJsonResponse ~40 lines)
- API route handlers typically 40-80 lines
- Complex logic extracted into separate functions (e.g., `processInBackground`, `streamMessage`)

**Parameters:**
- Simple functions use individual parameters: `(id: string, newStatus: string)`
- Complex functions use object/interface parameter pattern:
  ```typescript
  async function streamMessage(params: {
    system: string
    userPrompt: string
    max_tokens: number
    label?: string
  }): Promise<...>
  ```
- Optional parameters marked with `?` in both function signatures and object destructuring

**Return Values:**
- Functions return typed values or Promises: `Promise<ProcessedTranscript>`, `Promise<{ text: string; stopReason: string | null }>`
- Utility functions return interfaces with all needed data: `ProcessedTranscript`, `StatusUpdate`, `GeneratedReport`
- API routes return `NextResponse.json(data, { status: code })` or `NextResponse.json({ error: msg }, { status: code })`
- Early returns for validation/guards: `if (!user) return NextResponse.json(..., { status: 401 })`

## Module Design

**Exports:**
- Library files export specific functions or constants: `export async function processTranscript()`, `export const priorityOrder = {...}`
- Components use default export: `export default function ActionItemList()`
- Multiple named exports in utility files: `export const prisma`, `export interface AuthUser`, `export async function getAuthUser()`
- No barrel files (index.ts with re-exports) currently used

**Barrel Files:**
- Not used in this codebase; imports reference specific files directly

## Dutch Language Convention

**All user-facing strings use Dutch:**
- Error messages: `'Kon projecten niet ophalen'`, `'Ongeldige prioriteit'`
- Status text in components: `'Voltooid'`, `'Bezig...'`, `'Wachten'`
- API prompts to Claude: Full system prompts and user prompts in Dutch
- Field labels in forms: Expect Dutch UI text

## Async/Await

**Pattern:**
- All async operations use `async/await` syntax exclusively
- No `.then()` chains observed
- Streaming calls use special pattern: `const stream = anthropic.messages.stream(...); const message = await stream.finalMessage()`
- Background processing uses fire-and-forget with try/catch: `processInBackground().catch(err => console.error())`

## Type Strictness

**Enforcement:**
- TypeScript strict mode enabled (`"strict": true`)
- Type annotations required for function parameters and return types
- Use of `any` avoided where possible (one instance: `where: any = {}` in dynamic where clause)
- Generic types used for reusable functions: `parseAIJsonResponse<T>()`, `sortActionItems<T extends SortableByPriority>()`
- Union types for status values: Validated against arrays like `['open', 'in_progress', 'done'].includes(status)`

---

*Convention analysis: 2026-02-12*
