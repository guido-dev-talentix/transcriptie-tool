'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users } from 'lucide-react'
import ProjectDashboard from '@/components/ProjectDashboard'

interface DashboardData {
  project: {
    id: string
    name: string
    description: string | null
    status: string
    statusSummary: string | null
    statusUpdatedAt: string | null
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
    decisions: {
      active: number
      superseded: number
      revoked: number
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
    decisions: Array<{
      id: string
      title: string
      description: string | null
      context: string | null
      status: string
      madeBy: string | null
      createdAt: string
    }>
  }
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [subProjects, setSubProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          if (data.role === 'ADMIN') setIsAdmin(true)
        }
      } catch (err) {
        console.error('Failed to check admin:', err)
      }
    }
    checkAdmin()
  }, [])

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

  const fetchSubProjects = async () => {
    try {
      const response = await fetch(`/api/projects?parentId=${id}`)
      if (response.ok) {
        const data = await response.json()
        setSubProjects(data)
      }
    } catch (err) {
      console.error('Failed to fetch sub-projects', err)
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchSubProjects()
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
    if (!confirm('Weet je zeker dat je dit project wilt verwijderen?')) {
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
      active: 'badge-success',
      completed: 'badge-neutral',
      archived: 'badge-neutral',
    }
    const labels: Record<string, string> = {
      active: 'Actief',
      completed: 'Voltooid',
      archived: 'Gearchiveerd',
    }
    return (
      <span className={`badge ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin mx-auto"></div>
        <p className="mt-3 text-sm text-slate-500">Laden...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600">{error || 'Project niet gevonden'}</p>
        <Link href="/projects" className="mt-4 inline-block text-sm text-sky-600 hover:text-sky-700">
          Terug naar projecten
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/projects" className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-slate-900">{data.project.name}</h1>
            </div>
            {data.project.description && (
              <p className="text-sm text-slate-500 ml-8">{data.project.description}</p>
            )}
            <div className="mt-3 ml-8 flex items-center gap-3">
              {isEditingStatus ? (
                <select
                  value={data.project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  onBlur={() => setIsEditingStatus(false)}
                  autoFocus
                  className="input !w-auto !py-1 text-sm"
                >
                  <option value="active">Actief</option>
                  <option value="completed">Voltooid</option>
                  <option value="archived">Gearchiveerd</option>
                </select>
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="hover:opacity-75"
                >
                  {getStatusBadge(data.project.status)}
                </button>
              )}
              <span className="text-xs text-slate-400">
                Aangemaakt: {new Date(data.project.createdAt).toLocaleDateString('nl-NL')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href={`/projects/${id}/members`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Users className="w-4 h-4" />
                Leden beheren
              </Link>
            )}
            <Link
              href={`/?projectId=${id}`}
              className="btn-primary"
            >
              + Transcriptie
            </Link>
            <button
              onClick={handleDelete}
              className="btn-danger"
            >
              Verwijderen
            </button>
          </div>
        </div>
      </div>

      {/* Sub Projects (Folders) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-900">Mappen</h2>
          <Link
            href={`/projects/new?parentId=${data.project.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            + Nieuwe map
          </Link>
        </div>

        {subProjects.length === 0 ? (
          <p className="text-sm text-slate-500">Geen submappen</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subProjects.map((sub) => (
              <Link
                key={sub.id}
                href={`/projects/${sub.id}`}
                className="block p-4 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-indigo-200" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.764 5.574C19.349 4.673 18.528 4 17.5 4H7.5C6.12 4 5 5.12 5 6.5v11c0 1.38 1.12 2.5 2.5 2.5h9c1.028 0 1.849-.673 2.264-1.574l2-4.502a2.5 2.5 0 00-2.264-3.426H5.5V6.5a1 1 0 011-1h11a1 1 0 011 1v2.5h2.264a2.5 2.5 0 002.264-2.5v-.5a.5.5 0 00-.264-.426l-2-1z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">{sub.name}</h3>
                    <p className="text-xs text-slate-500">{new Date(sub.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard */}
      <ProjectDashboard data={data} onRefresh={fetchDashboard} />
    </div>
  )
}
