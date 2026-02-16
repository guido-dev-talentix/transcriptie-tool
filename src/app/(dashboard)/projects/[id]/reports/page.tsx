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
      meeting: 'badge-accent',
      weekly: 'badge-primary',
      summary: 'badge-success',
    }
    const labels: Record<string, string> = {
      meeting: 'Vergaderverslag',
      weekly: 'Weekoverzicht',
      summary: 'Samenvatting',
    }
    return (
      <span className={`badge ${styles[type] || 'badge-neutral'}`}>
        {labels[type] || type}
      </span>
    )
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
        <div className="flex items-center gap-4">
          <Link href={`/projects/${id}`} className="text-slate hover:text-brand-light-blue transition-colors p-2 rounded-xl hover:bg-accent-glow">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-sm text-slate font-body">{project.name}</p>
            <h1 className="text-heading-l font-display font-bold text-primary">Verslagen</h1>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card !p-0">
        {reports.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-display font-semibold text-primary">Nog geen verslagen</p>
            <p className="text-sm mt-2 text-slate-light font-body">Genereer een verslag vanuit een transcriptie</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/projects/${id}/reports/${report.id}`}
                className="block p-5 hover:bg-surface-muted transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-primary truncate group-hover:text-brand-light-blue transition-colors">
                      {report.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-light font-body">
                      {getTypeBadge(report.type)}
                      <span>{new Date(report.createdAt).toLocaleDateString('nl-NL')}</span>
                      {report.transcript && (
                        <span className="truncate">
                          Van: {report.transcript.title || report.transcript.filename}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-light group-hover:text-brand-light-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
