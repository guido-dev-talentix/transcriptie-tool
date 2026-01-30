'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProjectDashboard from '@/components/ProjectDashboard'

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

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingStatus, setIsEditingStatus] = useState(false)

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/dashboard`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Project niet gevonden')
          return
        }
        throw new Error('Failed to fetch')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError('Kon project niet laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (!data) return

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setData({
          ...data,
          project: { ...data.project, status: newStatus },
        })
        setIsEditingStatus(false)
      }
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je dit project wilt verwijderen? Alle gekoppelde verslagen en actiepunten worden ook verwijderd.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/projects')
      }
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      active: 'Actief',
      completed: 'Voltooid',
      archived: 'Gearchiveerd',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Laden...</p>
      </div>
    )
  }

  if (error || !data) {
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
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/projects" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{data.project.name}</h1>
            </div>
            {data.project.description && (
              <p className="text-gray-600 mt-1">{data.project.description}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              {isEditingStatus ? (
                <select
                  value={data.project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  onBlur={() => setIsEditingStatus(false)}
                  autoFocus
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Actief</option>
                  <option value="completed">Voltooid</option>
                  <option value="archived">Gearchiveerd</option>
                </select>
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="hover:opacity-75 transition-opacity"
                >
                  {getStatusBadge(data.project.status)}
                </button>
              )}
              <span className="text-sm text-gray-500">
                Aangemaakt: {new Date(data.project.createdAt).toLocaleDateString('nl-NL')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/?projectId=${id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              + Transcriptie
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm"
            >
              Verwijderen
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <ProjectDashboard data={data} onRefresh={fetchDashboard} />
    </div>
  )
}
