'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  _count?: {
    transcripts: number
    reports: number
    actionItems: number
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Projecten</h1>
        <Link href="/projects/new" className="btn-primary">
          + Nieuw project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">Nog geen projecten</p>
          <Link href="/projects/new" className="mt-4 inline-block text-sm text-sky-600 hover:text-sky-700">
            Maak je eerste project aan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card block hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-slate-900">{project.name}</h2>
                    {getStatusBadge(project.status)}
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>{project._count?.transcripts || 0} transcripties</span>
                    <span>{project._count?.reports || 0} verslagen</span>
                    <span>{project._count?.actionItems || 0} actiepunten</span>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(project.createdAt).toLocaleDateString('nl-NL')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
