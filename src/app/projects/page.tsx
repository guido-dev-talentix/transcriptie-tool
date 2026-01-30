'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    transcripts: number
    reports: number
    actionItems: number
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('active')

  useEffect(() => {
    fetchProjects()
  }, [filter])

  const fetchProjects = async () => {
    try {
      const url = filter === 'all' ? '/api/projects' : `/api/projects?status=${filter}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projecten</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nieuw Project
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { value: 'active', label: 'Actief' },
            { value: 'completed', label: 'Voltooid' },
            { value: 'archived', label: 'Gearchiveerd' },
            { value: 'all', label: 'Alles' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === tab.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">Laden...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen projecten</h3>
          <p className="mt-1 text-sm text-gray-500">
            Begin door een nieuw project aan te maken.
          </p>
          <div className="mt-6">
            <Link
              href="/projects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Nieuw Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {project.name}
                </h2>
                {getStatusBadge(project.status)}
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {project._count.transcripts}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {project._count.actionItems} open
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
