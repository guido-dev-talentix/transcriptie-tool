'use client'

import { useState } from 'react'
import Link from 'next/link'
import ActionItemList from './ActionItemList'

interface UnlinkedTranscript {
  id: string
  title: string | null
  filename: string
  duration: number | null
  createdAt: string
}

interface DashboardData {
  project: {
    id: string
    name: string
    description: string | null
    status: string
    createdAt: string
    updatedAt: string
  }
  stats: {
    totalTranscripts: number
    totalReports: number
    actionItems: {
      open: number
      inProgress: number
      done: number
      total: number
    }
  }
  recent: {
    transcripts: Array<{
      id: string
      title: string | null
      filename: string
      status: string
      duration: number | null
      createdAt: string
    }>
    reports: Array<{
      id: string
      title: string
      type: string
      status: string
      createdAt: string
    }>
    actionItems: Array<{
      id: string
      title: string
      status: string
      priority: string
      assignee: string | null
      dueDate: string | null
      createdAt: string
      description: string | null
    }>
  }
}

interface ProjectDashboardProps {
  data: DashboardData
  onRefresh: () => void
}

export default function ProjectDashboard({ data, onRefresh }: ProjectDashboardProps) {
  const { project, stats, recent } = data
  const [actionItems, setActionItems] = useState(recent.actionItems)
  const [showAddModal, setShowAddModal] = useState(false)
  const [unlinkedTranscripts, setUnlinkedTranscripts] = useState<UnlinkedTranscript[]>([])
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([])
  const [loadingTranscripts, setLoadingTranscripts] = useState(false)
  const [addingTranscripts, setAddingTranscripts] = useState(false)

  const fetchUnlinkedTranscripts = async () => {
    setLoadingTranscripts(true)
    try {
      const response = await fetch('/api/transcripts?unlinked=true')
      if (response.ok) {
        const transcripts = await response.json()
        setUnlinkedTranscripts(transcripts)
      }
    } catch (err) {
      console.error('Error fetching unlinked transcripts:', err)
    } finally {
      setLoadingTranscripts(false)
    }
  }

  const handleOpenModal = () => {
    setShowAddModal(true)
    setSelectedTranscripts([])
    fetchUnlinkedTranscripts()
  }

  const handleToggleTranscript = (id: string) => {
    setSelectedTranscripts((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleAddTranscripts = async () => {
    if (selectedTranscripts.length === 0) return

    setAddingTranscripts(true)
    try {
      await Promise.all(
        selectedTranscripts.map((transcriptId) =>
          fetch(`/api/transcripts/${transcriptId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: project.id }),
          })
        )
      )
      setShowAddModal(false)
      onRefresh()
    } catch (err) {
      console.error('Error adding transcripts:', err)
    } finally {
      setAddingTranscripts(false)
    }
  }

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === 'done') {
      setActionItems((prev) => prev.filter((item) => item.id !== id))
    } else {
      setActionItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      )
    }
    onRefresh()
  }

  const handleItemUpdate = (id: string, updates: Partial<DashboardData['recent']['actionItems'][0]>) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
    onRefresh()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    if (status === 'done') return <span className="badge badge-success">Afgerond</span>
    if (status === 'in_progress') return <span className="badge badge-accent">Bezig</span>
    return <span className="badge badge-neutral">Open</span>
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-semibold text-slate-900">{stats.totalTranscripts}</p>
          <p className="text-xs text-slate-500 mt-1">Transcripties</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-slate-900">{stats.totalReports}</p>
          <p className="text-xs text-slate-500 mt-1">Verslagen</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-amber-600">{stats.actionItems.open + stats.actionItems.inProgress}</p>
          <p className="text-xs text-slate-500 mt-1">Open acties</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-semibold text-emerald-600">{stats.actionItems.done}</p>
          <p className="text-xs text-slate-500 mt-1">Afgerond</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Action Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-900">Open Actiepunten</h3>
            <Link
              href={`/projects/${project.id}/action-items`}
              className="text-xs text-sky-600 hover:text-sky-700"
            >
              Bekijk alle
            </Link>
          </div>
          <ActionItemList
            actionItems={actionItems}
            onStatusChange={handleStatusChange}
            onItemUpdate={handleItemUpdate}
          />
        </div>

        {/* Recent Transcripts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-900">Transcripties</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenModal}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                + Toevoegen
              </button>
              <Link href="/transcripts" className="text-xs text-sky-600 hover:text-sky-700">
                Bekijk alle
              </Link>
            </div>
          </div>

          {recent.transcripts.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Nog geen transcripties</p>
          ) : (
            <div className="space-y-2">
              {recent.transcripts.map((t) => (
                <Link
                  key={t.id}
                  href={`/transcripts/${t.id}`}
                  className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-slate-900 truncate">
                      {t.title || t.filename}
                    </p>
                    <span className={`badge ${
                      t.status === 'completed' ? 'badge-success' :
                      t.status === 'processing' ? 'badge-accent' : 'badge-neutral'
                    }`}>
                      {t.status === 'completed' ? 'Voltooid' : t.status === 'processing' ? 'Bezig' : t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{formatDuration(t.duration)}</span>
                    <span>•</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('nl-NL')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-900">Verslagen</h3>
          <Link
            href={`/projects/${project.id}/reports`}
            className="text-xs text-sky-600 hover:text-sky-700"
          >
            Bekijk alle
          </Link>
        </div>

        {recent.reports.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            Nog geen verslagen
          </p>
        ) : (
          <div className="space-y-2">
            {recent.reports.map((r) => (
              <Link
                key={r.id}
                href={`/projects/${project.id}/reports/${r.id}`}
                className="block p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-900">{r.title}</p>
                  <span className="badge badge-neutral">
                    {r.type === 'meeting' ? 'Vergadering' : r.type === 'weekly' ? 'Weekoverzicht' : 'Samenvatting'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(r.createdAt).toLocaleDateString('nl-NL')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Transcripts Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-medium text-slate-900">Transcripties toevoegen</h3>
              <p className="text-xs text-slate-500 mt-1">
                Selecteer transcripties om aan dit project toe te voegen
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingTranscripts ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-slate-500">Laden...</p>
                </div>
              ) : unlinkedTranscripts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Geen ongekoppelde transcripties</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unlinkedTranscripts.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTranscripts.includes(t.id)
                          ? 'border-sky-400 bg-sky-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTranscripts.includes(t.id)}
                        onChange={() => handleToggleTranscript(t.id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-slate-900">
                          {t.title || t.filename}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{formatDuration(t.duration)}</span>
                          <span>•</span>
                          <span>{new Date(t.createdAt).toLocaleDateString('nl-NL')}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddTranscripts}
                disabled={selectedTranscripts.length === 0 || addingTranscripts}
                className="btn-primary disabled:opacity-50"
              >
                {addingTranscripts ? 'Toevoegen...' : `Toevoegen (${selectedTranscripts.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
