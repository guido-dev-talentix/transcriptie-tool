'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Transcript {
  id: string
  filename: string
  title: string | null
  duration: number | null
  status: string
  language: string | null
  createdAt: string
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TranscriptList() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTranscripts = async () => {
    try {
      const response = await fetch('/api/transcripts')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setTranscripts(data)
    } catch (err) {
      setError('Kon transcripties niet laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTranscripts()

    const interval = setInterval(() => {
      if (transcripts.some((t) => t.status === 'processing' || t.status === 'pending')) {
        fetchTranscripts()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [transcripts])

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze transcriptie wilt verwijderen?')) {
      return
    }

    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
      setTranscripts(transcripts.filter((t) => t.id !== id))
    } catch (err) {
      alert('Verwijderen mislukt')
    }
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin mx-auto"></div>
        <p className="mt-3 text-sm text-slate-500">Laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchTranscripts} className="mt-4 text-sm text-sky-600 hover:text-sky-700">
          Opnieuw proberen
        </button>
      </div>
    )
  }

  if (transcripts.length === 0) {
    return (
      <div className="text-center py-12 card">
        <p className="text-slate-500">Nog geen transcripties</p>
        <Link href="/" className="mt-4 inline-block text-sm text-sky-600 hover:text-sky-700">
          Upload je eerste bestand
        </Link>
      </div>
    )
  }

  return (
    <div className="card !p-0">
      <div className="divide-y divide-slate-200">
        {transcripts.map((t) => (
          <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
            <Link href={`/transcripts/${t.id}`} className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {t.title || t.filename}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>{formatDuration(t.duration)}</span>
                <span>{new Date(t.createdAt).toLocaleDateString('nl-NL')}</span>
              </div>
            </Link>
            <div className="flex items-center gap-3 ml-4">
              {getStatusBadge(t.status)}
              <button
                onClick={() => handleDelete(t.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Verwijderen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
