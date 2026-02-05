'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import ActionItemList from '@/components/ActionItemList'

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

interface Project {
  id: string
  name: string
}

export default function ProjectActionItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all')

  const fetchData = async () => {
    try {
      const [projectRes, itemsRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/action-items`),
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

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        setActionItems(itemsData)
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
    setActionItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    )
  }

  const handleItemUpdate = (itemId: string, updates: Partial<ActionItem>) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    )
  }

  const filteredItems = actionItems.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'open') return item.status !== 'done'
    if (filter === 'done') return item.status === 'done'
    return true
  })

  const stats = {
    total: actionItems.length,
    open: actionItems.filter((i) => i.status === 'open').length,
    inProgress: actionItems.filter((i) => i.status === 'in_progress').length,
    done: actionItems.filter((i) => i.status === 'done').length,
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
            <h1 className="text-heading-l font-display font-bold text-primary">Actiepunten</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          <div className="text-center p-5 bg-surface-muted rounded-xl">
            <p className="text-heading-s font-display font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-slate font-body mt-1">Totaal</p>
          </div>
          <div className="text-center p-5 bg-surface-muted rounded-xl">
            <p className="text-heading-s font-display font-bold text-slate">{stats.open}</p>
            <p className="text-xs text-slate font-body mt-1">Open</p>
          </div>
          <div className="text-center p-5 bg-accent-glow rounded-xl">
            <p className="text-heading-s font-display font-bold text-brand-light-blue">{stats.inProgress}</p>
            <p className="text-xs text-slate font-body mt-1">In uitvoering</p>
          </div>
          <div className="text-center p-5 bg-emerald-50 rounded-xl">
            <p className="text-heading-s font-display font-bold text-emerald-600">{stats.done}</p>
            <p className="text-xs text-slate font-body mt-1">Afgerond</p>
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
              onClick={() => setFilter('open')}
              className={`px-4 py-2 text-sm rounded-xl font-display font-semibold transition-all ${
                filter === 'open'
                  ? 'bg-primary text-white shadow-button'
                  : 'text-slate hover:bg-surface-muted'
              }`}
            >
              Open ({stats.open + stats.inProgress})
            </button>
            <button
              onClick={() => setFilter('done')}
              className={`px-4 py-2 text-sm rounded-xl font-display font-semibold transition-all ${
                filter === 'done'
                  ? 'bg-primary text-white shadow-button'
                  : 'text-slate hover:bg-surface-muted'
              }`}
            >
              Afgerond ({stats.done})
            </button>
          </div>
        </div>

        <div className="p-5">
          <ActionItemList
            actionItems={filteredItems}
            onStatusChange={handleStatusChange}
            onItemUpdate={handleItemUpdate}
          />
        </div>
      </div>
    </div>
  )
}
