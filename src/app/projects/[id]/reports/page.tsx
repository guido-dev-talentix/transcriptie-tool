'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'

interface Report {
  id: string
  title: string
  type: string
  status: string
  createdAt: string
  transcript?: {
    id: string
    title: string | null
    filename: string
  }
}

interface Project {
  id: string
  name: string
}

export default function ProjectReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, reportsRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/reports`),
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

        if (reportsRes.ok) {
          const reportsData = await reportsRes.json()
          setReports(reportsData)
        }
      } catch (err) {
        setError('Kon gegevens niet laden')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      meeting: 'bg-blue-100 text-blue-800',
      weekly: 'bg-purple-100 text-purple-800',
      summary: 'bg-green-100 text-green-800',
    }
    const labels: Record<string, string> = {
      meeting: 'Vergaderverslag',
      weekly: 'Weekoverzicht',
      summary: 'Samenvatting',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
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
        <div className="flex items-center gap-2">
          <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-sm text-gray-500">{project.name}</p>
            <h1 className="text-2xl font-bold text-gray-900">Verslagen</h1>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white shadow rounded-lg">
        {reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nog geen verslagen</p>
            <p className="text-sm mt-1">Genereer een verslag vanuit een transcriptie</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/projects/${id}/reports/${report.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {report.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      {getTypeBadge(report.type)}
                      <span>{new Date(report.createdAt).toLocaleDateString('nl-NL')}</span>
                      {report.transcript && (
                        <span className="truncate">
                          Van: {report.transcript.title || report.transcript.filename}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
