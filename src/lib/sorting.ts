// Priority order: high (1) -> medium (2) -> low (3)
export const priorityOrder: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
}

// Status order: open (1) -> in_progress (2) -> done (3)
export const statusOrder: Record<string, number> = {
  open: 1,
  in_progress: 2,
  done: 3,
}

// Decision status order: active (1) -> superseded (2) -> revoked (3)
export const decisionStatusOrder: Record<string, number> = {
  active: 1,
  superseded: 2,
  revoked: 3,
}

interface SortableByPriority {
  priority: string
  status: string
  createdAt: Date | string
}

interface SortableDecision {
  status: string
  createdAt: Date | string
}

/**
 * Sort action items by status (open first), then by priority (high to low), then by createdAt (newest first)
 */
export function sortActionItems<T extends SortableByPriority>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // First sort by status (open items first)
    const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
    if (statusDiff !== 0) return statusDiff

    // Then by priority (high first)
    const priorityDiff = (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
    if (priorityDiff !== 0) return priorityDiff

    // Finally by createdAt (newest first)
    const aDate = new Date(a.createdAt).getTime()
    const bDate = new Date(b.createdAt).getTime()
    return bDate - aDate
  })
}

/**
 * Sort decisions by status (active first), then by createdAt (newest first)
 */
export function sortDecisions<T extends SortableDecision>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // First sort by status (active items first)
    const statusDiff = (decisionStatusOrder[a.status] || 99) - (decisionStatusOrder[b.status] || 99)
    if (statusDiff !== 0) return statusDiff

    // Then by createdAt (newest first)
    const aDate = new Date(a.createdAt).getTime()
    const bDate = new Date(b.createdAt).getTime()
    return bDate - aDate
  })
}
