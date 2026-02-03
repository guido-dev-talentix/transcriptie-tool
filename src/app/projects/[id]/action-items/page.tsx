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
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Laden...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Project niet gevonden'}</p>
        <Link href="/projects" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          Terug naar projecten
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-sm text-gray-500">{project.name}</p>
            <h1 className="text-2xl font-bold text-gray-900">Actiepunten</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Totaal</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-600">{stats.open}</p>
            <p className="text-xs text-gray-500">Open</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-gray-500">In uitvoering</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.done}</p>
            <p className="text-xs text-gray-500">Afgerond</p>
          </div>
        </div>
      </div>

      {/* Filter & List */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Alle ({stats.total})
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                filter === 'open'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Open ({stats.open + stats.inProgress})
            </button>
            <button
              onClick={() => setFilter('done')}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                filter === 'done'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Afgerond ({stats.done})
            </button>
          </div>
        </div>

        <div className="p-4">
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
