'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from './StatusBadge'

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

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

    // Poll for updates every 5 seconds if there are processing items
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <svg
          className="animate-spin h-8 w-8 mx-auto text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="mt-2 text-gray-500">Laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchTranscripts}
          className="mt-4 text-blue-500 hover:text-blue-700"
        >
          Opnieuw proberen
        </button>
      </div>
    )
  }

  if (transcripts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nog geen transcripties</p>
        <Link
          href="/"
          className="mt-4 inline-block text-blue-500 hover:text-blue-700"
        >
          Upload je eerste bestand
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bestand
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duur
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Datum
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acties
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transcripts.map((transcript) => (
            <tr key={transcript.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <Link
                  href={`/transcripts/${transcript.id}`}
                  className="block hover:text-blue-600"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {transcript.title || transcript.filename}
                  </div>
                  {transcript.title && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {transcript.filename}
                    </div>
                  )}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDuration(transcript.duration)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={transcript.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(transcript.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/transcripts/${transcript.id}`}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Bekijken
                </Link>
                <button
                  onClick={() => handleDelete(transcript.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Verwijderen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
