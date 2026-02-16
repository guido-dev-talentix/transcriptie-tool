'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import DecisionList from '@/components/DecisionList'

interface Decision {
  id: string
  title: string
  description: string | null
  context: string | null
  status: string
  madeBy: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
}

export default function ProjectDecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    context: '',
    madeBy: '',
  })
  const [adding, setAdding] = useState(false)

  const fetchData = async () => {
    try {
      const [projectRes, decisionsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/decisions`),
      ])

      if (!projectRes.ok) {
        if (projectRes.status === 404) {
          setError('Project niet gevonden')
          return
        }
        throw new Error('Failed to fetch project')
      }

      const projectData = await projectRes.json()
      setProject(projectData)

      if (decisionsRes.ok) {
        const decisionsData = await decisionsRes.json()
        setDecisions(decisionsData)
      }
    } catch (err) {
      setError('Kon gegevens niet laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleStatusChange = (itemId: string, newStatus: string) => {
    setDecisions((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    )
  }

  const handleItemUpdate = (itemId: string, updates: Partial<Decision>) => {
    setDecisions((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    )
  }

  const handleAddDecision = async () => {
    if (!addForm.title.trim()) return

    setAdding(true)
    try {
      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          projectId: id,
        }),
      })

      if (response.ok) {
        const newDecision = await response.json()
        setDecisions((prev) => [newDecision, ...prev])
        setShowAddModal(false)
        setAddForm({ title: '', description: '', context: '', madeBy: '' })
      }
    } catch (error) {
      console.error('Error adding decision:', error)
    } finally {
      setAdding(false)
    }
  }

  const filteredItems = decisions.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'active') return item.status === 'active'
    if (filter === 'inactive') return item.status !== 'active'
    return true
  })

  const stats = {
    total: decisions.length,
    active: decisions.filter((i) => i.status === 'active').length,
    superseded: decisions.filter((i) => i.status === 'superseded').length,
    revoked: decisions.filter((i) => i.status === 'revoked').length,
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-brand-light-blue animate-spin mx-auto"></div>
        <p className="mt-4 text-slate font-body">Laden...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-16 card">
        <div className="w-16 h-16 rounded-2xl bg-cta-red/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-cta-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-cta-red font-display font-semibold">{error || 'Project niet gevonden'}</p>
        <Link href="/projects" className="mt-4 inline-block btn-secondary">
          Terug naar projecten
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <Link href={`/projects/${id}`} className="text-slate hover:text-brand-light-blue transition-colors p-2 rounded-xl hover:bg-accent-glow">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-sm text-slate font-body">{project.name}</p>
            <h1 className="text-heading-l font-display font-bold text-primary">Besluiten</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          <div className="text-center p-5 bg-surface-muted rounded-xl">
            <p className="text-heading-s font-display font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-slate font-body mt-1">Totaal</p>
          </div>
          <div className="text-center p-5 bg-emerald-50 rounded-xl">
            <p className="text-heading-s font-display font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-slate font-body mt-1">Actief</p>
          </div>
          <div className="text-center p-5 bg-amber-50 rounded-xl">
            <p className="text-heading-s font-display font-bold text-amber-600">{stats.superseded}</p>
            <p className="text-xs text-slate font-body mt-1">Vervangen</p>
          </div>
          <div className="text-center p-5 bg-slate-50 rounded-xl">
            <p className="text-heading-s font-display font-bold text-slate-500">{stats.revoked}</p>
            <p className="text-xs text-slate font-body mt-1">Ingetrokken</p>
          </div>
        </div>
      </div>

      {/* Filter & List */}
      <div className="card !p-0">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm rounded-xl font-display font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-primary text-white shadow-button'
                  : 'text-slate hover:bg-surface-muted'
              }`}
            >
              Alle ({stats.total})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 text-sm rounded-xl font-display font-semibold transition-all ${
                filter === 'active'
                  ? 'bg-primary text-white shadow-button'
                  : 'text-slate hover:bg-surface-muted'
              }`}
            >
              Actief ({stats.active})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 text-sm rounded-xl font-display font-semibold transition-all ${
                filter === 'inactive'
                  ? 'bg-primary text-white shadow-button'
                  : 'text-slate hover:bg-surface-muted'
              }`}
            >
              Inactief ({stats.superseded + stats.revoked})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-sm"
          >
            + Nieuw besluit
          </button>
        </div>

        <div className="p-5">
          <DecisionList
            decisions={filteredItems}
            onStatusChange={handleStatusChange}
            onItemUpdate={handleItemUpdate}
          />
        </div>
      </div>

      {/* Add Decision Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-medium text-slate-900">Nieuw besluit toevoegen</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titel *</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  className="input"
                  placeholder="Wat is besloten?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beschrijving</label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder="Uitgebreide beschrijving van het besluit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Context / Reden</label>
                <textarea
                  value={addForm.context}
                  onChange={(e) => setAddForm({ ...addForm, context: e.target.value })}
                  rows={2}
                  className="input resize-none"
                  placeholder="Waarom is dit besloten?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Besluitnemer</label>
                <input
                  type="text"
                  value={addForm.madeBy}
                  onChange={(e) => setAddForm({ ...addForm, madeBy: e.target.value })}
                  placeholder="Wie heeft dit besloten?"
                  className="input"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setAddForm({ title: '', description: '', context: '', madeBy: '' })
                }}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddDecision}
                disabled={adding || !addForm.title.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {adding ? 'Toevoegen...' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
