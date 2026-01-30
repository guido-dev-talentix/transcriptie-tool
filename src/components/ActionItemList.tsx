'use client'

import { useState } from 'react'

interface ActionItem {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  assignee: string | null
  dueDate: string | null
  createdAt: string
}

interface ActionItemListProps {
  actionItems: ActionItem[]
  onStatusChange?: (id: string, status: string) => void
  showProject?: boolean
}

export default function ActionItemList({
  actionItems,
  onStatusChange,
  showProject = false,
}: ActionItemListProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id)
    try {
      const response = await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok && onStatusChange) {
        onStatusChange(id, newStatus)
      }
    } catch (error) {
      console.error('Error updating action item:', error)
    } finally {
      setUpdating(null)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      high: 'Hoog',
      medium: 'Medium',
      low: 'Laag',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[priority] || styles.medium}`}>
        {labels[priority] || priority}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    if (status === 'done') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
    if (status === 'in_progress') {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
      </svg>
    )
  }

  if (actionItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Geen actiepunten gevonden</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {actionItems.map((item) => (
        <div
          key={item.id}
          className={`py-4 flex items-start gap-3 ${item.status === 'done' ? 'opacity-60' : ''}`}
        >
          <button
            onClick={() => {
              const nextStatus = item.status === 'open' ? 'in_progress' : item.status === 'in_progress' ? 'done' : 'open'
              handleStatusChange(item.id, nextStatus)
            }}
            disabled={updating === item.id}
            className="mt-0.5 flex-shrink-0 hover:opacity-75 transition-opacity disabled:opacity-50"
            title={`Status: ${item.status}`}
          >
            {updating === item.id ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              getStatusIcon(item.status)
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-medium ${item.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {item.title}
              </p>
              {getPriorityBadge(item.priority)}
            </div>

            {item.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {item.description}
              </p>
            )}

            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
              {item.assignee && (
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {item.assignee}
                </span>
              )}
              {item.dueDate && (
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(item.dueDate).toLocaleDateString('nl-NL')}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
