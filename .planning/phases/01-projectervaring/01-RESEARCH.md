# Phase 1: Projectervaring - Research

**Researched:** 2026-02-20
**Domain:** UI/UX restructuring -- folder organization, project dashboard, upload flow
**Confidence:** HIGH

## Summary

Phase 1 transforms the project experience by replacing the current subproject concept with folders, rebuilding the project dashboard with "Stand van Zaken" as the hero element, and polishing the upload flow. The technical scope is primarily frontend-oriented with a small data model change: introducing a `Folder` model (or repurposing the existing `parentId` on `Project`) to create a flat folder-project hierarchy.

The current codebase already has a `parentId` self-relation on `Project` that was being used for subprojects. The user has explicitly decided to remove the subproject concept and replace it with folders as a pure organizational layer. The key architectural decision is whether to create a new `Folder` model or repurpose the existing `Project.parentId` field with a `type` discriminator. A new `Folder` model is recommended because folders have fundamentally different behavior than projects (no transcripts, no dashboard, no action items -- just a container for projects).

The drag-and-drop requirement for moving projects into folders needs `@dnd-kit/core` with basic `useDraggable` and `useDroppable` hooks -- NOT the full sortable tree preset, since this is a flat 1-level structure (folders at root, projects inside folders). The context menu (right-click to rename/delete folders) can be built with a lightweight custom hook using native `onContextMenu` events -- no library needed.

**Primary recommendation:** Create a new `Folder` model in Prisma, use `@dnd-kit/core` for drag-and-drop, build a custom context menu hook, and restructure the dashboard to feature Stand van Zaken prominently.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Mappenweergave
- Uitklapbare boom in de projectenlijst: mappen als uitklapbare items met projecten eronder
- Huidige subprojecten-concept wordt verwijderd -- mappen vervangen dit als organisatielaag
- Drag-and-drop om projecten naar mappen te verplaatsen
- "+ Nieuwe map" knop naast de bestaande "+ Nieuw project" knop
- Contextmenu (rechtermuisklik) voor hernoemen en verwijderen van mappen
- Bij verwijderen van een map met projecten: projecten worden losse projecten (terug naar root)

#### Dashboard indeling
- Stand van Zaken als hero sectie bovenaan -- groot en prominent, het eerste dat je ziet
- Top 10 open actiepunten en recente besluiten, met "Bekijk alle" link
- Recente vergaderingen als compacte lijst: titel, datum en korte samenvatting -- klik voor detail

#### Upload flow
- Verwerkingsopties als checkboxes direct op het upload scherm (geen wizard)
- Standaard alleen "Transcript opschonen" aangevinkt, overige opties (besluiten, actiepunten, verslag) uit
- Eén bestand per keer uploaden

#### Projectenlijst
- Mappen bovenaan, losse projecten eronder
- Projecten tonen: naam, status badge en datum (vereenvoudigd -- geen aantallen meer)
- Mappen tonen: map-icoon + naam + aantal projecten erin
- Geen zoek/filterfunctie nodig in deze fase

### Claude's Discretion
- Dashboard layout keuze (grid vs kolommen vs mix)
- Voortgangsfeedback na uploaden (inline vs redirect)
- Exacte styling en spacing van mappen en dashboard componenten

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORG-01 | Gebruiker kan mappen aanmaken om projecten te groeperen (1 laag diep) | New `Folder` model in Prisma, API endpoints for CRUD, collapsible tree UI component |
| ORG-02 | Gebruiker kan projecten verplaatsen naar een map | `@dnd-kit/core` with `useDraggable` + `useDroppable`, PATCH endpoint to update `Project.folderId` |
| ORG-03 | Gebruiker kan mappen hernoemen en verwijderen | Custom context menu hook (onContextMenu), API endpoints for rename/delete, orphan-to-root on delete |
| DASH-01 | Gebruiker ziet bij openen project direct de cumulatieve "Stand van Zaken" | Restructure `ProjectDashboard.tsx` to feature `statusSummary` as hero section at top |
| DASH-02 | Dashboard toont aantal en lijst van open actiepunten | Already implemented in dashboard API + component; adjust to show Top 10 with "Bekijk alle" link |
| DASH-03 | Dashboard toont recente besluiten (laatste 5-10) | Already implemented; adjust layout to match new dashboard design |
| DASH-04 | Dashboard toont overzicht van recente transcripties/vergaderingen | Already implemented; simplify to compact list: title, date, short summary |
| VERW-01 | Upload flow toont duidelijke verwerkingsopties met verbeterde UX | Move processing checkboxes to pre-upload screen, change defaults (only "Transcript opschonen" checked) |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Framework (App Router) | Already in project |
| React | 18.3.1 | UI library | Already in project |
| Prisma | 5.17.0 | Database ORM | Already in project |
| Tailwind CSS | 3.4.7 | Styling | Already in project |
| lucide-react | 0.563.0 | Icons | Already in project, has Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical, GripVertical icons |
| react-markdown | 10.1.0 | Render Stand van Zaken markdown | Already used in ProjectDashboard.tsx |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | ^6.x | Drag-and-drop primitives | Dragging projects into/out of folders |
| @dnd-kit/utilities | ^3.x | CSS transform utilities | Visual feedback during drag operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | react-dnd | react-dnd is older, heavier, and requires HTML5 backend setup; @dnd-kit is the modern standard |
| @dnd-kit/core | dnd-kit-sortable-tree | Overkill -- that library is for deep nested sortable trees; we only need 1-level folder drops |
| @dnd-kit/sortable | (not needed) | SortableContext is for reordering lists; we need drag-into-container, not sort-within-list |
| Custom context menu | react-contexify | Unnecessary dependency; onContextMenu + absolute-positioned div is ~30 lines of code |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

## Architecture Patterns

### Data Model Change: Folder Entity

The current codebase uses `Project.parentId` for subprojects. This must change to a separate `Folder` model because:
1. Folders have no transcripts, action items, decisions, reports, or status
2. Folders have no UserProject membership (they inherit from projects inside them)
3. Folders are purely organizational -- they only have a name and contain projects
4. Deleting a folder does NOT cascade-delete its projects (they move to root)

```prisma
model Folder {
  id        String    @id @default(cuid())
  name      String
  userId    String    // Owner of this folder (the user who created it)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  projects  Project[]
}

// On Project model: replace parentId with folderId
model Project {
  // ... existing fields ...
  folderId  String?
  folder    Folder?   @relation(fields: [folderId], references: [id], onDelete: SetNull)
  // REMOVE: parentId, parent, children (ProjectHierarchy relation)
}

// On User model: add folders relation
model User {
  // ... existing fields ...
  folders   Folder[]
}
```

**Key design choice: `onDelete: SetNull`** -- when a folder is deleted, `folderId` on contained projects is set to `null`, making them root-level projects. This matches the locked decision.

### Recommended Component Structure
```
src/
├── components/
│   ├── ProjectList.tsx          # NEW: Full project list with folders + drag-and-drop
│   ├── FolderItem.tsx           # NEW: Collapsible folder with projects inside
│   ├── ProjectCard.tsx          # NEW: Simplified project card (name, badge, date)
│   ├── ContextMenu.tsx          # NEW: Generic context menu component
│   ├── ProjectDashboard.tsx     # MODIFIED: Restructured with Stand van Zaken hero
│   ├── UploadForm.tsx           # MODIFIED: Processing options moved to pre-upload
│   ├── Sidebar.tsx              # Minimal changes (if any)
│   └── ... (existing unchanged)
```

### Pattern 1: Collapsible Folder Tree (1-level)

**What:** Folders render as collapsible containers that show/hide their projects when clicked.
**When to use:** The main projects list page.

```typescript
// FolderItem.tsx - Collapsible folder with context menu
'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'

interface FolderItemProps {
  folder: { id: string; name: string; _count: { projects: number } }
  children: React.ReactNode  // ProjectCard items
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export default function FolderItem({ folder, children, onRename, onDelete }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const { isOver, setNodeRef } = useDroppable({ id: `folder-${folder.id}` })

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <div ref={setNodeRef} className={isOver ? 'bg-sky-50 rounded-lg' : ''}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onContextMenu={handleContextMenu}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-50 rounded-lg"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {isOpen ? <FolderOpen className="w-5 h-5 text-amber-500" /> : <Folder className="w-5 h-5 text-amber-500" />}
        <span className="text-sm font-medium">{folder.name}</span>
        <span className="text-xs text-slate-400 ml-auto">{folder._count.projects}</span>
      </button>
      {isOpen && <div className="ml-6 space-y-1">{children}</div>}
      {/* Context menu rendered here */}
    </div>
  )
}
```

### Pattern 2: Drag-and-Drop with DndContext

**What:** Wrap the project list in DndContext; projects are draggable, folders are droppable.
**When to use:** The projects list page for moving projects into/out of folders.

```typescript
// Simplified drag-and-drop setup
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'

function ProjectList() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const projectId = active.id as string
    // Extract folder ID from droppable id (e.g., "folder-abc123" or "root")
    const folderId = over.id === 'root' ? null : (over.id as string).replace('folder-', '')

    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    })
    // Refresh project list
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* folders and projects */}
    </DndContext>
  )
}
```

### Pattern 3: Custom Context Menu Hook

**What:** A reusable hook for right-click context menus with click-outside dismissal.
**When to use:** Folder rename and delete actions.

```typescript
// useContextMenu.ts
import { useState, useEffect, useCallback } from 'react'

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const close = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (contextMenu) {
      const handler = () => close()
      document.addEventListener('click', handler)
      return () => document.removeEventListener('click', handler)
    }
  }, [contextMenu, close])

  return { contextMenu, handleContextMenu, close }
}
```

### Pattern 4: Dashboard Hero Layout (Stand van Zaken)

**What:** Restructured dashboard with Stand van Zaken as full-width hero section.
**When to use:** Project detail page (`/projects/[id]`).

**Recommended layout (Claude's Discretion -- mixed grid + stacked):**
```
+--------------------------------------------------+
|  STAND VAN ZAKEN (hero, full width)              |
|  Prominent markdown rendering                     |
|  Updated: [date]                                  |
+--------------------------------------------------+
|  OPEN ACTIEPUNTEN (top 10) | RECENTE BESLUITEN  |
|  [list with status icons]  | [list with dates]   |
|  "Bekijk alle" link        | "Bekijk alle" link  |
+--------------------------------------------------+
|  RECENTE VERGADERINGEN (full width compact list) |
|  Title  |  Date  |  Summary snippet             |
+--------------------------------------------------+
```

Remove the stats grid (5 cards with counts) from the top -- the Stand van Zaken replaces it as the primary orientation element. Stats can optionally be shown as small inline metrics within the hero section.

### Pattern 5: Upload Flow with Pre-Upload Processing Options

**What:** Processing checkboxes shown BEFORE the file upload, not after.
**When to use:** The upload page (`/`).

Current flow: Upload file -> Show result -> Show AI processing options
New flow: Choose options -> Upload file -> Processing starts automatically

```
+--------------------------------------------------+
|  Upload type toggle: [Audio/Video] [PDF]         |
+--------------------------------------------------+
|  Titel (optioneel)                               |
|  Project (optioneel)                             |
+--------------------------------------------------+
|  Verwerkingsopties:                              |
|  [x] Transcript opschonen        (default ON)    |
|  [ ] Actiepunten extraheren      (default OFF)   |
|  [ ] Besluiten extraheren        (default OFF)   |
|  [ ] Verslag genereren           (default OFF)   |
+--------------------------------------------------+
|  [Drop zone / file selector]                     |
+--------------------------------------------------+
```

Key change: "Transcript opschonen" is always checked by default (currently the AI processing options show action items + decisions checked by default, report unchecked). This aligns with the locked decision.

Note: The processing options should only be enabled when a project is selected, since AI processing (beyond basic transcript cleanup) requires a project context.

### Anti-Patterns to Avoid
- **Deep nesting with recursion:** Don't build a recursive tree renderer. Folders are 1-level only. A simple `folders.map()` with `projects.filter()` is sufficient.
- **Over-engineering the drag-and-drop:** Don't use `@dnd-kit/sortable` or `dnd-kit-sortable-tree` -- this isn't a sortable list, it's a drag-into-container interaction. Use `useDraggable` + `useDroppable` directly.
- **Separate Folder page:** Don't create a `/folders/[id]` route. Folders are only visible in the project list -- clicking a folder expands/collapses it, not navigates to it.
- **Folder access control:** Don't implement UserFolder membership. Folders are per-user organizational tools. The access control stays on projects.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mouse/touch event tracking | `@dnd-kit/core` | Touch support, accessibility (keyboard DnD), collision detection, drag overlay -- all non-trivial |
| Markdown rendering | Custom parser for Stand van Zaken | `react-markdown` (already installed) | Edge cases in markdown parsing are endless |
| Icons | Custom SVG icons for folders | `lucide-react` (already installed) | Consistent icon set already used throughout the app |
| CSS transforms during drag | Manual translate3d calculations | `@dnd-kit/utilities` CSS helper | Handles browser inconsistencies, touch offsets |

**Key insight:** The only new dependency needed is `@dnd-kit/core` + `@dnd-kit/utilities`. Everything else uses existing libraries or custom React patterns (context menu, collapsible folders).

## Common Pitfalls

### Pitfall 1: Losing the "root droppable" area
**What goes wrong:** Projects can be dragged INTO folders but can never be dragged OUT (back to root) because there is no droppable area representing "no folder."
**Why it happens:** Developers focus on folder droppables but forget to make the empty space/root area droppable too.
**How to avoid:** Create a root-level `useDroppable({ id: 'root' })` that covers the entire project list area (underneath the folders). When a project is dropped on `root`, set `folderId` to `null`.
**Warning signs:** User drags a project out of a folder and nothing happens / it snaps back.

### Pitfall 2: Context menu positioning off-screen
**What goes wrong:** Right-click near the bottom or right edge of the viewport positions the context menu outside the visible area.
**Why it happens:** Using raw `clientX`/`clientY` without boundary checks.
**How to avoid:** After calculating position, check if `x + menuWidth > window.innerWidth` and `y + menuHeight > window.innerHeight`, then adjust. Use a ref on the menu to measure its dimensions.
**Warning signs:** Context menu appears but is partially or fully invisible.

### Pitfall 3: Stale data after drag-and-drop
**What goes wrong:** After moving a project to a folder, the UI shows the project in both the old and new location until page refresh.
**Why it happens:** Optimistic updates not properly removing from source and adding to destination.
**How to avoid:** Use optimistic state updates: immediately update the local state (move project to target folder in the state tree), then fire the API call. If the API fails, revert the state.
**Warning signs:** Duplicate project cards or "ghost" items after drag operations.

### Pitfall 4: Upload processing options desynced between UploadForm and TranscriptView
**What goes wrong:** Processing option defaults or available options differ between the upload page and the transcript detail view.
**Why it happens:** Both `UploadForm.tsx` and `TranscriptView.tsx` independently manage AI processing options with different defaults. The MEMORY.md specifically warns about this.
**How to avoid:** Extract processing options into a shared component or configuration constant. When changing defaults in one place, the shared source ensures consistency.
**Warning signs:** Different checkboxes checked by default on upload page vs. transcript detail.

### Pitfall 5: Prisma migration breaking existing data
**What goes wrong:** Removing `parentId` from Project and adding `folderId` loses the relationship between parent and child projects in existing data.
**Why it happens:** Destructive schema change without data migration step.
**How to avoid:** Write a migration script that: (1) creates the Folder model, (2) for each Project with `parentId`, creates a Folder from the parent project name and sets `folderId`, (3) only then removes `parentId`. Since the user said "subprojecten werken niet" (can't upload to them), it may be acceptable to simply set all `parentId` to null and delete orphan parent-only projects.
**Warning signs:** Projects disappearing after migration, or foreign key constraint errors.

### Pitfall 6: DndContext conflicts with click events
**What goes wrong:** Clicking on a project to navigate to it also triggers a drag start, causing navigation to fail or unwanted drag behavior.
**Why it happens:** PointerSensor captures mousedown/touchstart by default with zero distance threshold.
**How to avoid:** Set `activationConstraint: { distance: 8 }` on the PointerSensor. This requires the user to move the mouse at least 8px before a drag starts, allowing normal clicks to work.
**Warning signs:** Clicking a project doesn't navigate; instead, it briefly shows drag state.

## Code Examples

### API Endpoint: Create Folder
```typescript
// src/app/api/folders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/folders - List user's folders with project counts
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { projects: true } },
      },
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Kon mappen niet ophalen' }, { status: 500 })
  }
}

// POST /api/folders - Create folder
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Mapnaam is verplicht' }, { status: 400 })
    }

    const folder = await prisma.folder.create({
      data: { name: name.trim(), userId: user.id },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Kon map niet aanmaken' }, { status: 500 })
  }
}
```

### API Endpoint: Rename/Delete Folder
```typescript
// src/app/api/folders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// PATCH /api/folders/[id] - Rename folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })

    const folder = await prisma.folder.findUnique({ where: { id } })
    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: 'Map niet gevonden' }, { status: 404 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Mapnaam is verplicht' }, { status: 400 })
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: { name: name.trim() },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error renaming folder:', error)
    return NextResponse.json({ error: 'Kon map niet hernoemen' }, { status: 500 })
  }
}

// DELETE /api/folders/[id] - Delete folder (projects go to root)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })

    const folder = await prisma.folder.findUnique({ where: { id } })
    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: 'Map niet gevonden' }, { status: 404 })
    }

    // onDelete: SetNull in schema handles moving projects to root
    await prisma.folder.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json({ error: 'Kon map niet verwijderen' }, { status: 500 })
  }
}
```

### Moving a Project to a Folder (PATCH)
```typescript
// In src/app/api/projects/[id]/route.ts -- extend existing PATCH handler
// Add folderId to the updateData handling:

if (body.folderId !== undefined) {
  if (body.folderId === null) {
    updateData.folderId = null  // Move to root
  } else {
    // Verify folder exists and belongs to user
    const folder = await prisma.folder.findUnique({ where: { id: body.folderId } })
    if (!folder) {
      return NextResponse.json({ error: 'Map niet gevonden' }, { status: 404 })
    }
    updateData.folderId = body.folderId
  }
}
```

### Projects List API: Fetch folders + projects together
```typescript
// In src/app/api/projects/route.ts -- modify GET handler
// Fetch folders and projects in parallel for efficient rendering

const [folders, rootProjects] = await Promise.all([
  prisma.folder.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
    include: {
      projects: {
        where: roleFilter,  // apply role-based filtering
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, status: true, updatedAt: true },
      },
      _count: { select: { projects: true } },
    },
  }),
  prisma.project.findMany({
    where: { ...roleFilter, folderId: null },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, status: true, updatedAt: true },
  }),
])

return NextResponse.json({ folders, projects: rootProjects })
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core | 2021+ | react-beautiful-dnd is in maintenance mode; @dnd-kit is the active standard |
| HTML5 Drag API | @dnd-kit sensors | 2021+ | @dnd-kit abstracts away browser inconsistencies with touch/pointer sensors |
| Custom context menu libraries | Native onContextMenu + portals | 2023+ | Libraries are overkill for simple menus; React portals solve positioning |
| Self-referential Project hierarchy | Separate Folder model | This phase | Clean separation of concerns; folders don't need project behavior |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Maintenance mode since Atlassian stopped development. Use `@dnd-kit/core` instead.
- `react-dnd`: Still maintained but heavier and more complex. `@dnd-kit` is preferred for new projects.
- Subproject concept via `Project.parentId`: Being removed in this phase per user decision.

## Discretion Recommendations

### Dashboard Layout: Mixed Grid + Stacked
**Recommendation:** Use the layout described in Pattern 4 above.
- Stand van Zaken: full-width hero card with prominent typography and markdown
- Action items + Decisions: side-by-side in a 2-column grid (md:grid-cols-2)
- Recent meetings: full-width compact table/list below

**Rationale:** The hero section ensures Stand van Zaken dominates visual hierarchy. Side-by-side for action items and decisions maximizes information density without scrolling. Full-width meetings list works well for the compact title-date-summary format.

### Upload Progress Feedback: Inline
**Recommendation:** Keep progress feedback inline on the upload page (current approach) rather than redirecting to transcript detail.
- After upload completes: show a success card with the transcript title, a "Bekijk transcript" link, and a "Nieuwe upload" button
- If AI processing was requested: show inline progress indicator
- Don't redirect automatically -- let the user decide when to navigate

**Rationale:** Inline feedback is faster (no page navigation), keeps context (user sees their upload settings), and allows quick successive uploads.

### Styling: Folders and Dashboard
**Recommendation for folders:**
- Folder items: Light amber/yellow folder icon (lucide-react `Folder`/`FolderOpen`), subtle left-indent for projects inside
- Droppable hover state: `bg-sky-50` with a subtle border transition
- Context menu: Clean white card with subtle shadow, positioned at cursor

**Recommendation for dashboard hero:**
- Stand van Zaken card: Slightly differentiated from regular cards -- consider using `bg-gradient-to-r from-primary/5 to-transparent` or a subtle left-border accent (`border-l-4 border-brand-light-blue`)
- Typography: Use `text-heading-s` for the "Stand van Zaken" title, `prose prose-sm` for the markdown content (already used)

## Open Questions

1. **Folder ownership: per-user or global?**
   - What we know: Folders are organizational. The user creates them.
   - What's unclear: Should admin users see all folders from all users, or only their own? Currently, admin sees all projects. If folders are per-user, an admin might not see folders created by other users.
   - Recommendation: Make folders per-user (userId on Folder model). Admin users bypass project access checks anyway and see all projects regardless. Folders are a personal organizational tool -- each user sees their own folder structure.

2. **Data migration for existing parentId relationships**
   - What we know: Some projects may have `parentId` values from the current subproject system.
   - What's unclear: Are there actual subprojects in production data?
   - Recommendation: Write a defensive migration: (1) Check if any projects have parentId set. (2) If so, optionally create folders from parent project names and migrate children. (3) Set all parentId to null. (4) Remove parentId column. If the DB is empty or has no subprojects, the migration is trivial.

3. **Admin handling for folders in role-based project filtering**
   - What we know: Non-admin users only see projects they're members of. Admin users see all projects.
   - What's unclear: When fetching the folder + project list, should folder.projects be filtered by role?
   - Recommendation: Yes. A folder should only show projects the user has access to. Empty folders (no accessible projects) should still show. Admin users see all projects in all folders.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct reading of all relevant source files in `src/app/`, `src/components/`, `src/lib/`, `prisma/schema.prisma`
- Context7 `/websites/dndkit` (315 snippets) -- dnd-kit core API, DndContext, useDraggable, useDroppable, SortableContext patterns
- Context7 `/shaddix/dnd-kit-sortable-tree` (6 snippets) -- Evaluated and rejected as overkill for 1-level folders

### Secondary (MEDIUM confidence)
- [dnd-kit official docs](https://docs.dndkit.com/) -- Getting started, sortable preset, sensors
- [dnd-kit-sortable-tree GitHub](https://github.com/Shaddix/dnd-kit-sortable-tree) -- Evaluated for tree DnD approach
- [npm: dnd-kit-sortable-tree](https://www.npmjs.com/package/dnd-kit-sortable-tree) -- Version 0.1.73, last published 2+ years ago
- [React context menu approaches](https://www.perpetualny.com/blog/create-a-custom-context-menu-hook-in-react/) -- Custom hook pattern

### Tertiary (LOW confidence)
- WebSearch for "React custom context menu onContextMenu" -- Multiple blog posts confirm the native event approach is standard practice

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Uses existing dependencies plus well-documented @dnd-kit
- Architecture: HIGH -- Clear data model change (Folder entity), well-defined component structure
- Pitfalls: HIGH -- Identified from direct codebase analysis and established DnD patterns
- Data migration: MEDIUM -- Depends on actual production data state

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no fast-moving dependencies)
