'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Transcript {
  id: string
  filename: string
  title: string | null
  status: string
  duration: number | null
  createdAt: string
  aiStatus: string | null
  project?: {
    id: string
    name: string
  }
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTranscripts = async () => {
    try {
      const response = await fetch('/api/transcripts')
      if (response.ok) {
        const data = await response.json()
        setTranscripts(data)
      }
    } catch (err) {
      console.error('Failed to fetch transcripts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTranscripts()
  }, [])

  // Poll for updates when any transcript is processing
  useEffect(() => {
    const hasProcessing = transcripts.some(
      t => t.status === 'processing' || t.status === 'pending' || t.aiStatus === 'processing'
    )

    if (!hasProcessing) return

    const interval = setInterval(() => {
      fetchTranscripts()
    }, 5000)

    return () => clearInterval(interval)
  }, [transcripts])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'badge-success',
      processing: 'badge-accent',
      pending: 'badge-neutral',
      error: 'badge-error',
    }
    const labels: Record<string, string> = {
      completed: 'Voltooid',
      processing: 'Bezig',
      pending: 'Wachtend',
      error: 'Fout',
    }
    return (
      <span className={`badge ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getAIStatusIndicator = (aiStatus: string | null) => {
    if (!aiStatus) return null

    if (aiStatus === 'processing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-brand-light-blue/10 text-brand-light-blue text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-brand-light-blue animate-pulse"></span>
          AI verwerkt
        </span>
      )
    }

    if (aiStatus === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          AI klaar
        </span>
      )
    }

    if (aiStatus === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-cta-red/10 text-cta-red text-xs font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          AI fout
        </span>
      )
    }

    return null
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
        <h1 className="text-xl font-semibold text-slate-900">Transcripties</h1>
        <Link href="/" className="btn-primary">
          + Nieuwe transcriptie
        </Link>
      </div>

      {transcripts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">Nog geen transcripties</p>
          <Link href="/" className="mt-4 inline-block text-sm text-sky-600 hover:text-sky-700">
            Upload je eerste bestand
          </Link>
        </div>
      ) : (
        <div className="card !p-0">
          <div className="divide-y divide-slate-200">
            {transcripts.map((t) => (
              <Link
                key={t.id}
                href={`/transcripts/${t.id}`}
                className="block p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {t.title || t.filename}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{formatDuration(t.duration)}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString('nl-NL')}</span>
                      {t.project && (
                        <span className="text-sky-600">{t.project.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getAIStatusIndicator(t.aiStatus)}
                    {getStatusBadge(t.status)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
