---
phase: 01-projectervaring
plan: 01
subsystem: ui, api, database
tags: [prisma, dnd-kit, drag-and-drop, folders, context-menu, next.js]

# Dependency graph
requires: []
provides:
  - Folder data model with CRUD API endpoints
  - Project-to-folder assignment via folderId with drag-and-drop
  - Restructured projects list page with collapsible folders and context menu
affects: [02-projectervaring]

# Tech tracking
tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/utilities"]
  patterns: ["useDroppable/useDraggable for drag-and-drop", "useContextMenu hook for right-click menus", "optimistic state updates with API rollback"]

key-files:
  created:
    - src/app/api/folders/route.ts
    - src/app/api/folders/[id]/route.ts
    - src/components/FolderItem.tsx
    - src/components/ProjectCard.tsx
    - src/components/ContextMenu.tsx
    - src/hooks/useContextMenu.ts
  modified:
    - prisma/schema.prisma
    - src/app/api/projects/route.ts
    - src/app/api/projects/[id]/route.ts
    - src/app/(dashboard)/projects/page.tsx
    - src/app/(dashboard)/projects/[id]/page.tsx
    - src/app/(dashboard)/projects/new/page.tsx

key-decisions:
  - "Replaced parentId/ProjectHierarchy self-relation with folderId/Folder model for flat folder organization"
  - "Used @dnd-kit with PointerSensor distance:8 constraint to prevent click-vs-drag conflicts"
  - "Root drop zone wraps entire projects area to allow dragging projects out of folders"

patterns-established:
  - "useContextMenu hook: reusable right-click context menu with boundary detection"
  - "Optimistic drag-and-drop: update local state immediately, revert on API failure"
  - "Folder API pattern: getAuthUser() + ownership check for folder CRUD operations"

requirements-completed: [ORG-01, ORG-02, ORG-03]

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 1 Plan 1: Folder Organization Summary

**Folder CRUD with @dnd-kit drag-and-drop, collapsible folder UI, and context menu on restructured projects page**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T08:04:09Z
- **Completed:** 2026-02-20T08:08:30Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Folder data model in Prisma with onDelete:SetNull, replacing the broken parentId/ProjectHierarchy concept
- Full folder CRUD API (create, list, rename, delete) with auth and Dutch error messages
- Projects list page restructured with collapsible folders, drag-and-drop between folders/root, and right-click context menu

## Task Commits

Each task was committed atomically:

1. **Task 1: Folder data model, API endpoints, and project API modifications** - `c9f1844` (feat)
2. **Task 2: Projects list page with folders, drag-and-drop, and context menu** - `9969b7a` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Folder model, replaced parentId with folderId on Project
- `src/app/api/folders/route.ts` - GET list and POST create folder endpoints
- `src/app/api/folders/[id]/route.ts` - PATCH rename and DELETE folder endpoints
- `src/app/api/projects/route.ts` - Rewritten GET to return { folders, projects } structure, POST accepts folderId
- `src/app/api/projects/[id]/route.ts` - PATCH now accepts folderId for moving projects
- `src/app/(dashboard)/projects/page.tsx` - Complete rewrite with DndContext, FolderItem, ProjectCard
- `src/components/FolderItem.tsx` - Collapsible folder with droppable zone, inline rename, context menu
- `src/components/ProjectCard.tsx` - Draggable project card with grip handle, status badge, date
- `src/components/ContextMenu.tsx` - Generic positioned context menu component
- `src/hooks/useContextMenu.ts` - Reusable right-click context menu hook with boundary detection
- `src/app/(dashboard)/projects/[id]/page.tsx` - Removed sub-projects section (parentId references)
- `src/app/(dashboard)/projects/new/page.tsx` - Removed parentId from project creation

## Decisions Made
- Replaced `parentId`/`ProjectHierarchy` self-relation with `folderId`/`Folder` model -- the old subproject concept was unused and broken, flat folders are simpler and match the plan
- Used `@dnd-kit` with `PointerSensor` distance constraint of 8px to prevent accidental drags when clicking project links
- Drag handle listeners applied only to GripVertical icon, not the whole card, so Link clicks navigate correctly
- Root drop zone wraps the entire content area so projects can be dragged out of folders back to root

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed parentId references from project detail and new project pages**
- **Found during:** Task 1 (schema migration removed parentId column)
- **Issue:** `src/app/(dashboard)/projects/[id]/page.tsx` fetched sub-projects via `parentId` query param and `src/app/(dashboard)/projects/new/page.tsx` passed `parentId` in creation request -- both would cause runtime errors
- **Fix:** Removed sub-projects section and `fetchSubProjects()` from project detail page. Removed `parentId` usage and `useSearchParams` import from new project page.
- **Files modified:** `src/app/(dashboard)/projects/[id]/page.tsx`, `src/app/(dashboard)/projects/new/page.tsx`
- **Verification:** `npm run build` passes without errors
- **Committed in:** c9f1844 (Task 1 commit)

**2. [Rule 3 - Blocking] Accepted data loss for parentId column removal**
- **Found during:** Task 1 (Prisma db push)
- **Issue:** Database had 1 non-null parentId value, Prisma refused to push without `--accept-data-loss` flag
- **Fix:** Ran `npx prisma db push --accept-data-loss` -- the parentId data was from the old broken subproject concept being replaced by folders
- **Files modified:** None (database operation)
- **Verification:** Schema pushed successfully, Prisma client regenerated

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary consequences of removing parentId. No scope creep.

## Issues Encountered
None -- all issues were anticipated consequences of the schema migration.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Folder organization is fully functional for plan 01-02
- Project cards use simplified display (name, status badge, date) as specified
- Context menu pattern established and reusable for future right-click interactions
