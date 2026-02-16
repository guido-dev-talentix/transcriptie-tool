'use client'

import { useState } from 'react'

interface Decision {
  id: string
  title: string
  description: string | null
  context: string | null
  status: string
  madeBy: string | null
  createdAt: string
}

interface DecisionListProps {
  decisions: Decision[]
  onStatusChange?: (id: string, status: string) => void
  onItemUpdate?: (id: string, updates: Partial<Decision>) => void
}

export default function DecisionList({
  decisions,
  onStatusChange,
  onItemUpdate,
}: DecisionListProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Decision | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    context: '',
    madeBy: '',
    status: 'active',
  })

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id)
    try {
      const response = await fetch(`/api/decisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok && onStatusChange) {
        onStatusChange(id, newStatus)
      }
    } catch (error) {
      console.error('Error updating decision:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleEditClick = (item: Decision) => {
    setEditingItem(item)
    setEditForm({
      title: item.title,
      description: item.description || '',
      context: item.context || '',
      madeBy: item.madeBy || '',
      status: item.status,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    setUpdating(editingItem.id)
    try {
      const response = await fetch(`/api/decisions/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          context: editForm.context || null,
          madeBy: editForm.madeBy || null,
          status: editForm.status,
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
      console.error('Error updating decision:', error)
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'badge-success',
      superseded: 'badge-warning',
      revoked: 'badge-neutral',
    }
    const labels: Record<string, string> = {
      active: 'Actief',
      superseded: 'Vervangen',
      revoked: 'Ingetrokken',
    }
    return (
      <span className={`badge ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    if (status === 'active') {
      return (
        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
    if (status === 'superseded') {
      return (
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }

  if (decisions.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <p className="text-sm">Geen besluiten</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {decisions.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
              item.status !== 'active' ? 'opacity-60' : ''
            }`}
          >
            <button
              onClick={() => {
                const nextStatus = item.status === 'active' ? 'superseded' : item.status === 'superseded' ? 'revoked' : 'active'
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
                <p className={`text-sm ${item.status !== 'active' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                  {item.title}
                </p>
                {getStatusBadge(item.status)}
              </div>

              {item.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                {item.madeBy && (
                  <span>Door: {item.madeBy}</span>
                )}
                <span>{new Date(item.createdAt).toLocaleDateString('nl-NL')}</span>
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
              <h3 className="text-sm font-medium text-slate-900">Besluit bewerken</h3>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Context / Reden</label>
                <textarea
                  value={editForm.context}
                  onChange={(e) => setEditForm({ ...editForm, context: e.target.value })}
                  rows={2}
                  className="input resize-none"
                  placeholder="Achtergrond of reden voor dit besluit"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Besluitnemer</label>
                  <input
                    type="text"
                    value={editForm.madeBy}
                    onChange={(e) => setEditForm({ ...editForm, madeBy: e.target.value })}
                    placeholder="Naam"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">Actief</option>
                    <option value="superseded">Vervangen</option>
                    <option value="revoked">Ingetrokken</option>
                  </select>
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
