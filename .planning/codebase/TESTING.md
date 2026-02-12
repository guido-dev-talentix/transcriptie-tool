# Testing Patterns

**Analysis Date:** 2026-02-12

## Test Framework

**Status:** No testing framework configured or tests present in codebase.

**Current State:**
- No test runner installed (Jest, Vitest, or other)
- No test files found in project (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)
- No testing libraries in devDependencies (`@testing-library/react`, `@testing-library/jest-dom`, etc.)
- No test configuration files (`jest.config.js`, `vitest.config.ts`, etc.)
- `npm run lint` command exists but no test command in package.json

**Implications:**
- Application is tested manually or via E2E/integration tests only
- No unit test coverage enforcement
- No automated regression testing framework in place

## Manual Testing Approach

**Current patterns observed:**
- API routes are tested via manual HTTP requests
- Component behavior tested via browser interaction (no automated assertions)
- AI processing verified by checking database updates and logs
- Supabase auth flows tested manually via signup/login

## If Tests Were to Be Implemented

Based on codebase structure, recommended patterns would be:

### Test File Organization

**Suggested location structure:**
```
src/
├── lib/
│   ├── ai.ts
│   ├── __tests__/
│   │   └── ai.test.ts
│   ├── db.ts
│   ├── __tests__/
│   │   └── db.test.ts
│   ├── auth.ts
│   └── __tests__/
│       └── auth.test.ts
├── components/
│   ├── ActionItemList.tsx
│   └── __tests__/
│       └── ActionItemList.test.tsx
├── app/api/
│   ├── projects/
│   │   ├── route.ts
│   │   └── __tests__/
│   │       └── route.test.ts
```

**Naming convention:**
- Co-located alongside source files in `__tests__/` subdirectories
- Test file name matches source file: `ai.test.ts` for `ai.ts`

### Test Runner Recommendation

**Suggested choice: Vitest**
- Better TypeScript support and IDE integration than Jest
- Faster than Jest for Next.js projects
- Simpler configuration than Jest
- Native ESM support without extra configuration

**Setup would be:**
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

**Example vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Testing Patterns by Component Type

#### Library Functions (ai.ts, db.ts, sorting.ts)

**Pattern - Pure function testing:**
```typescript
// Example: src/lib/__tests__/ai.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseAIJsonResponse } from '@/lib/ai'

describe('parseAIJsonResponse', () => {
  it('should parse JSON from markdown code blocks', () => {
    const response = '```json\n{"key": "value"}\n```'
    const result = parseAIJsonResponse(response)
    expect(result).toEqual({ key: 'value' })
  })

  it('should extract JSON from partial markdown', () => {
    const response = '```\n{"key": "value"}'
    const result = parseAIJsonResponse(response)
    expect(result).toEqual({ key: 'value' })
  })

  it('should throw error if JSON is invalid', () => {
    const response = '```\n{invalid json}\n```'
    expect(() => parseAIJsonResponse(response)).toThrow('Kon AI response JSON niet parsen')
  })
})
```

**Pattern - Sorting utility testing:**
```typescript
// Example: src/lib/__tests__/sorting.test.ts
import { describe, it, expect } from 'vitest'
import { sortActionItems, sortDecisions } from '@/lib/sorting'

describe('sortActionItems', () => {
  it('should sort by status first (open items first)', () => {
    const items = [
      { status: 'done', priority: 'high', createdAt: new Date() },
      { status: 'open', priority: 'low', createdAt: new Date() },
    ]
    const sorted = sortActionItems(items)
    expect(sorted[0].status).toBe('open')
    expect(sorted[1].status).toBe('done')
  })

  it('should sort by priority within same status', () => {
    const items = [
      { status: 'open', priority: 'low', createdAt: new Date() },
      { status: 'open', priority: 'high', createdAt: new Date() },
    ]
    const sorted = sortActionItems(items)
    expect(sorted[0].priority).toBe('high')
  })
})
```

#### API Route Handlers

**Pattern - GET/POST endpoint testing with mocking:**
```typescript
// Example: src/app/api/projects/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/projects/route'
import { prisma } from '@/lib/db'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/db')
vi.mock('@/lib/supabase/server')

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    const mockCreateClient = vi.mocked(supabaseServer.createClient)
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const request = new Request('http://localhost:3000/api/projects')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should return projects for authenticated admin user', async () => {
    const mockProject = { id: '1', name: 'Test Project' }
    vi.mocked(prisma.project.findMany).mockResolvedValue([mockProject] as any)
    // ... mock auth ...

    const request = new Request('http://localhost:3000/api/projects')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toContainEqual(mockProject)
  })
})

describe('POST /api/projects', () => {
  it('should return 400 if name is missing', async () => {
    const request = new Request('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({ description: 'Test' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('verplicht')
  })

  it('should create and return project', async () => {
    const mockProject = { id: '1', name: 'New Project', description: null }
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject as any)

    const request = new Request('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Project' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.name).toBe('New Project')
  })
})
```

#### React Components

**Pattern - Component testing with mocks:**
```typescript
// Example: src/components/__tests__/ActionItemList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ActionItemList from '@/components/ActionItemList'

describe('ActionItemList', () => {
  const mockActionItems = [
    {
      id: '1',
      title: 'Test Item',
      description: 'Test description',
      status: 'open',
      priority: 'high',
      assignee: 'John',
      dueDate: null,
      createdAt: '2026-02-12T00:00:00Z',
    },
  ]

  it('should render action items', () => {
    render(<ActionItemList actionItems={mockActionItems} />)
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('should call onStatusChange when status button is clicked', async () => {
    const onStatusChange = vi.fn()
    render(
      <ActionItemList
        actionItems={mockActionItems}
        onStatusChange={onStatusChange}
      />
    )

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    })

    const statusButton = screen.getByRole('button', { name: /in_progress/i })
    fireEvent.click(statusButton)

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('1', 'in_progress')
    })
  })

  it('should display edit form when edit is clicked', () => {
    render(<ActionItemList actionItems={mockActionItems} />)
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument()
  })
})
```

**Pattern - Component with user interactions:**
```typescript
// Example: src/components/__tests__/StatusBadge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '@/components/StatusBadge'

describe('StatusBadge', () => {
  it('should display "Voltooid" for completed status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Voltooid')).toBeInTheDocument()
  })

  it('should display spinning animation for processing status', () => {
    const { container } = render(<StatusBadge status="processing" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should show correct badge styles', () => {
    const { container } = render(<StatusBadge status="completed" />)
    const badge = container.querySelector('.badge-success')
    expect(badge).toBeInTheDocument()
  })
})
```

#### Auth Functions

**Pattern - Auth utility testing:**
```typescript
// Example: src/lib/__tests__/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAuthUser, checkProjectAccess } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/db')
vi.mock('@/lib/supabase/server')

describe('getAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null if user is not authenticated', async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const user = await getAuthUser()
    expect(user).toBeNull()
  })

  it('should return user with role and approval status', async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user123', email: 'test@example.com' } },
        }),
      },
    } as any)

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      role: 'USER',
      approved: true,
    } as any)

    const user = await getAuthUser()
    expect(user).toEqual({
      id: 'user123',
      email: 'test@example.com',
      role: 'USER',
      approved: true,
    })
  })
})

describe('checkProjectAccess', () => {
  it('should return 401 if user not authenticated', async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)

    const result = await checkProjectAccess('project123')
    expect(result.status).toBe(401)
  })

  it('should grant admin access regardless of membership', async () => {
    // Mock admin user
    const result = await checkProjectAccess('project123')
    expect(result.projectRole).toBe('ADMIN')
  })
})
```

### Mocking Patterns

**What to Mock:**
- Prisma queries: `vi.mock('@/lib/db')`
- Supabase auth: `vi.mock('@/lib/supabase/server')`
- Anthropic API calls: Mock `streamMessage()` to avoid API costs during testing
- Fetch API for component tests: `global.fetch = vi.fn()`
- External services: AssemblyAI, Vercel Blob (if calling directly)

**What NOT to Mock:**
- Pure utility functions like `parseAIJsonResponse()`, `sortActionItems()` - test the actual implementation
- Tailwind CSS classes - don't assert on styling, use data-testid attributes
- React hooks behavior - test component output, not internal state
- TypeScript type validation - rely on compile-time checks

**Example mock setup:**
```typescript
// src/vitest.setup.ts
import { vi } from 'vitest'

// Mock Prisma Client
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    project: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    transcript: { findMany: vi.fn(), update: vi.fn() },
  },
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
```

## Coverage

**Recommended targets:**
- Statements: 70%+
- Branches: 65%+
- Functions: 70%+
- Lines: 70%+

**View coverage (if implemented):**
```bash
vitest run --coverage
```

## Critical Paths to Test First

If testing implementation begins, prioritize in this order:

1. **AI Processing Functions** (`src/lib/ai.ts`):
   - `parseAIJsonResponse()` - JSON parsing from various formats
   - `processTranscript()` - Full AI processing pipeline
   - Error handling for truncated responses (max_tokens)

2. **Auth & Authorization** (`src/lib/auth.ts`):
   - `getAuthUser()` - User lookup with fallback
   - `checkProjectAccess()` - Role-based access control
   - Admin bypass logic

3. **API Route Validation** (`src/app/api/*/route.ts`):
   - Input validation (missing params, invalid enums)
   - Status code returns (401, 403, 404, 500)
   - Error message translation

4. **Sorting Utilities** (`src/lib/sorting.ts`):
   - `sortActionItems()` - Multi-level sorting (status → priority → date)
   - `sortDecisions()` - Status and date sorting
   - Edge cases (empty arrays, null dates)

5. **Component User Interactions** (`src/components/*.tsx`):
   - Status change callbacks
   - Edit form submissions
   - Loading states during API calls

## Test Command Setup

**When framework is added, package.json should include:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

*Testing analysis: 2026-02-12*

**Note:** This codebase currently has no automated tests. The patterns and recommendations above are based on observed code structure and Next.js best practices. Implementation should follow these conventions to maintain consistency with the project's architectural patterns.
