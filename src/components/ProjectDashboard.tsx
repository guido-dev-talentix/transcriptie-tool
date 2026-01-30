'use client'

import { useState, useEffect } from 'react'
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Transcripties</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalTranscripts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Verslagen</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Open Acties</p>
          <p className="text-2xl font-bold text-orange-600">{stats.actionItems.open + stats.actionItems.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Afgerond</p>
          <p className="text-2xl font-bold text-green-600">{stats.actionItems.done}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Action Items */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Open Actiepunten</h3>
            <Link
              href={`/projects/${project.id}/action-items`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Bekijk alle
            </Link>
          </div>
          <div className="p-4">
            <ActionItemList actionItems={actionItems} onStatusChange={handleStatusChange} />
          </div>
        </div>

        {/* Recent Transcripts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recente Transcripties</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenModal}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                + Toevoegen
              </button>
              <Link href="/transcripts" className="text-sm text-blue-600 hover:text-blue-800">
                Bekijk alle
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recent.transcripts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nog geen transcripties
              </div>
            ) : (
              recent.transcripts.map((t) => (
                <Link
                  key={t.id}
                  href={`/transcripts/${t.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t.title || t.filename}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatDuration(t.duration)}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('nl-NL')}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        t.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : t.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Verslagen</h3>
          <Link
            href={`/projects/${project.id}/reports`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Bekijk alle
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recent.reports.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nog geen verslagen. Genereer een verslag vanuit een transcriptie.
            </div>
          ) : (
            recent.reports.map((r) => (
              <Link
                key={r.id}
                href={`/projects/${project.id}/reports/${r.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{r.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {r.type === 'meeting' ? 'Vergadering' : r.type === 'weekly' ? 'Weekoverzicht' : 'Samenvatting'}
                  </span>
                  <span>{new Date(r.createdAt).toLocaleDateString('nl-NL')}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Add Transcripts Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Transcripties toevoegen</h3>
              <p className="text-sm text-gray-500 mt-1">
                Selecteer transcripties om aan dit project toe te voegen
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingTranscripts ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Laden...</p>
                </div>
              ) : unlinkedTranscripts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Geen ongekoppelde transcripties gevonden</p>
                  <p className="text-sm mt-1">Alle transcripties zijn al aan een project gekoppeld</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unlinkedTranscripts.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTranscripts.includes(t.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTranscripts.includes(t.id)}
                        onChange={() => handleToggleTranscript(t.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {t.title || t.filename}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{formatDuration(t.duration)}</span>
                          <span>{new Date(t.createdAt).toLocaleDateString('nl-NL')}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddTranscripts}
                disabled={selectedTranscripts.length === 0 || addingTranscripts}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingTranscripts
                  ? 'Toevoegen...'
                  : `Toevoegen (${selectedTranscripts.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
