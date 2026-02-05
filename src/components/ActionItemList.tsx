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
  onItemUpdate?: (id: string, updates: Partial<ActionItem>) => void
}

export default function ActionItemList({
  actionItems,
  onStatusChange,
  onItemUpdate,
}: ActionItemListProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium',
    dueDate: '',
  })

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

  const handleEditClick = (item: ActionItem) => {
    setEditingItem(item)
    setEditForm({
      title: item.title,
      description: item.description || '',
      assignee: item.assignee || '',
      priority: item.priority,
      dueDate: item.dueDate ? item.dueDate.split('T')[0] : '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    setUpdating(editingItem.id)
    try {
      const response = await fetch(`/api/action-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          assignee: editForm.assignee || null,
          priority: editForm.priority,
          dueDate: editForm.dueDate || null,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        if (onItemUpdate) {
          onItemUpdate(editingItem.id, updated)
        }
        setEditingItem(null)
      }
    } catch (error) {
      console.error('Error updating action item:', error)
    } finally {
      setUpdating(null)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: 'badge-error',
      medium: 'badge-warning',
      low: 'badge-neutral',
    }
    const labels: Record<string, string> = {
      high: 'Hoog',
      medium: 'Medium',
      low: 'Laag',
    }
    return (
      <span className={`badge ${styles[priority] || styles.medium}`}>
        {labels[priority] || priority}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    if (status === 'done') {
      return (
        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
    if (status === 'in_progress') {
      return (
        <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
      </svg>
    )
  }

  if (actionItems.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <p className="text-sm">Geen actiepunten</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {actionItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
              item.status === 'done' ? 'opacity-60' : ''
            }`}
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
                <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin" />
              ) : (
                getStatusIcon(item.status)
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm ${item.status === 'done' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                  {item.title}
                </p>
                {getPriorityBadge(item.priority)}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                {item.assignee && (
                  <span>{item.assignee}</span>
                )}
                {item.dueDate && (
                  <span>{new Date(item.dueDate).toLocaleDateString('nl-NL')}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleEditClick(item)}
              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded hover:bg-slate-100"
              title="Bewerken"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-medium text-slate-900">Actiepunt bewerken</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titel</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beschrijving</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Toegewezen aan</label>
                <input
                  type="text"
                  value={editForm.assignee}
                  onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                  placeholder="Naam"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioriteit</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="input"
                  >
                    <option value="low">Laag</option>
                    <option value="medium">Medium</option>
                    <option value="high">Hoog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updating === editingItem.id || !editForm.title.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {updating === editingItem.id ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
