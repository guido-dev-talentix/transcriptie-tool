'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReportView from '@/components/ReportView'

interface Report {
  id: string
  title: string
  content: string
  type: string
  status: string
  createdAt: string
  project?: { id: string; name: string }
  transcript?: { id: string; title: string | null; filename: string }
}

export default function ProjectReportPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>
}) {
  const { id, reportId } = use(params)
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/${reportId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Verslag niet gevonden')
            return
          }
          throw new Error('Failed to fetch report')
        }
        const data = await response.json()
        setReport(data)
      } catch (err) {
        setError('Kon verslag niet laden')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportId])

  const handleUpdate = (updatedReport: Report) => {
    setReport(updatedReport)
  }

  const handleDelete = () => {
    router.push(`/projects/${id}/reports`)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Laden...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Verslag niet gevonden'}</p>
        <Link
          href={`/projects/${id}/reports`}
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          Terug naar verslagen
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/projects/${id}`} className="hover:text-gray-700">
          {report.project?.name || 'Project'}
        </Link>
        <span>/</span>
        <Link href={`/projects/${id}/reports`} className="hover:text-gray-700">
          Verslagen
        </Link>
        <span>/</span>
        <span className="text-gray-900">{report.title}</span>
      </div>

      {/* Report */}
      <ReportView report={report} onUpdate={handleUpdate} onDelete={handleDelete} />
    </div>
  )
}
