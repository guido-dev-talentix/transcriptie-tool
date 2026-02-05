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
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-brand-light-blue animate-spin mx-auto"></div>
        <p className="mt-4 text-slate font-body">Laden...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="text-center py-16 card">
        <div className="w-16 h-16 rounded-2xl bg-cta-red/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-cta-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-cta-red font-display font-semibold">{error || 'Verslag niet gevonden'}</p>
        <Link
          href={`/projects/${id}/reports`}
          className="mt-4 inline-block btn-secondary"
        >
          Terug naar verslagen
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate font-body">
        <Link href={`/projects/${id}`} className="hover:text-brand-light-blue transition-colors">
          {report.project?.name || 'Project'}
        </Link>
        <span className="text-slate-light">/</span>
        <Link href={`/projects/${id}/reports`} className="hover:text-brand-light-blue transition-colors">
          Verslagen
        </Link>
        <span className="text-slate-light">/</span>
        <span className="text-primary font-display font-semibold">{report.title}</span>
      </div>

      {/* Report */}
      <ReportView report={report} onUpdate={handleUpdate} onDelete={handleDelete} />
    </div>
  )
}
