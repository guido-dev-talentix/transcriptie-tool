'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from './StatusBadge'

interface Transcript {
  id: string
  filename: string
  title: string | null
  duration: number | null
  status: string
  text: string | null
  srt: string | null
  language: string | null
  error: string | null
  createdAt: string
  cleanedText: string | null
  summary: string | null
  projectId: string | null
  project?: { id: string; name: string } | null
}

interface Project {
  id: string
  name: string
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TranscriptView({ id }: { id: string }) {
  const router = useRouter()
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [sendingToN8n, setSendingToN8n] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [processingAI, setProcessingAI] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showAISection, setShowAISection] = useState(false)

  const fetchTranscript = async () => {
    try {
      const response = await fetch(`/api/transcripts/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Transcriptie niet gevonden')
          return
        }
        throw new Error('Failed to fetch')
      }
      const data = await response.json()
      setTranscript(data)
    } catch (err) {
      setError('Kon transcriptie niet laden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTranscript()
    fetchProjects()

    // Poll for updates if processing
    const interval = setInterval(() => {
      if (transcript?.status === 'processing' || transcript?.status === 'pending') {
        fetchTranscript()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [id, transcript?.status])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?status=active')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
    }
  }

  const [savingProject, setSavingProject] = useState(false)

  useEffect(() => {
    if (transcript?.projectId) {
      setSelectedProjectId(transcript.projectId)
    }
  }, [transcript?.projectId])

  const handleSaveProject = async () => {
    if (!transcript) return

    setSavingProject(true)
    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId || null }),
      })

      if (!response.ok) {
        throw new Error('Project koppeling mislukt')
      }

      const updated = await response.json()
      setTranscript(updated)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Project koppeling mislukt')
    } finally {
      setSavingProject(false)
    }
  }

  const handleProcessWithAI = async () => {
    if (!transcript) return
    if (!selectedProjectId) {
      alert('Selecteer eerst een project')
      return
    }

    setProcessingAI(true)
    try {
      const response = await fetch('/api/ai/process-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptId: transcript.id,
          projectId: selectedProjectId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'AI verwerking mislukt')
      }

      const result = await response.json()
      setTranscript({
        ...transcript,
        cleanedText: result.transcript.cleanedText,
        summary: result.transcript.summary,
        projectId: selectedProjectId,
      })
      setShowAISection(true)
      alert(`AI verwerking voltooid! ${result.actionItems.length} actiepunten geëxtraheerd.`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'AI verwerking mislukt')
    } finally {
      setProcessingAI(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!transcript || !selectedProjectId) return

    setGeneratingReport(true)
    try {
      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptId: transcript.id,
          projectId: selectedProjectId,
          type: 'meeting',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Verslag genereren mislukt')
      }

      const result = await response.json()
      router.push(`/projects/${selectedProjectId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Verslag genereren mislukt')
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleCopy = async () => {
    if (transcript?.text) {
      await navigator.clipboard.writeText(transcript.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze transcriptie wilt verwijderen?')) {
      return
    }

    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
      router.push('/transcripts')
    } catch (err) {
      alert('Verwijderen mislukt')
    }
  }

  const handleSendToN8n = async () => {
    if (!transcript) return

    setSendingToN8n(true)
    try {
      const response = await fetch('/api/send-to-n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptId: transcript.id,
          filename: transcript.filename,
          status: transcript.status,
          text: transcript.text,
          duration: transcript.duration,
        }),
      })

      if (!response.ok) throw new Error('Send to N8N failed')

      alert('Succesvol verstuurd naar n8n!')
    } catch (err) {
      alert('Versturen naar n8n mislukt')
    } finally {
      setSendingToN8n(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!transcript) return

    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: titleValue }),
      })

      if (!response.ok) throw new Error('Update failed')

      const updated = await response.json()
      setTranscript(updated)
      setEditingTitle(false)
    } catch (err) {
      alert('Titel opslaan mislukt')
    }
  }

  const handleStartEditTitle = () => {
    setTitleValue(transcript?.title || transcript?.filename || '')
    setEditingTitle(true)
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

  if (error || !transcript) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Niet gevonden'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            {editingTitle ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Voer een titel in..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') setEditingTitle(false)
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Opslaan
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {transcript.title || transcript.filename}
                </h2>
                <button
                  onClick={handleStartEditTitle}
                  className="text-gray-400 hover:text-gray-600"
                  title="Titel bewerken"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            )}
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              {transcript.title && <span>Bestand: {transcript.filename}</span>}
              <span>Duur: {formatDuration(transcript.duration)}</span>
              {transcript.language && <span>Taal: {transcript.language}</span>}
            </div>
          </div>
          <StatusBadge status={transcript.status} />
        </div>
      </div>

      {/* Processing state */}
      {(transcript.status === 'processing' || transcript.status === 'pending') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto text-blue-500"
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
          <p className="mt-4 text-lg font-medium text-blue-900">
            Je audio wordt getranscribeerd...
          </p>
          <p className="mt-1 text-sm text-blue-700">
            Dit kan enkele minuten duren, afhankelijk van de lengte van het bestand.
          </p>
        </div>
      )}

      {/* Error state */}
      {transcript.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-900">Er is iets misgegaan</h3>
          <p className="mt-2 text-sm text-red-700">
            {transcript.error || 'Onbekende fout bij het transcriberen'}
          </p>
        </div>
      )}

      {/* Completed state */}
      {transcript.status === 'completed' && transcript.text && (
        <>
          {/* AI Processing Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">AI Verwerking</h3>

            {/* Project selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project koppelen
              </label>
              <div className="flex items-center gap-2 max-w-md">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Geen project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedProjectId !== (transcript.projectId || '') && (
                  <button
                    onClick={handleSaveProject}
                    disabled={savingProject}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm whitespace-nowrap"
                  >
                    {savingProject ? 'Opslaan...' : 'Opslaan'}
                  </button>
                )}
              </div>
              {transcript.project && (
                <p className="mt-1 text-sm text-gray-500">
                  Huidig project: {transcript.project.name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleProcessWithAI}
                disabled={processingAI || !selectedProjectId}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAI ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verwerken...
                  </>
                ) : (
                  'Verwerk met AI'
                )}
              </button>

              {(transcript.cleanedText || transcript.summary) && (
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport || !selectedProjectId}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport ? 'Genereren...' : 'Genereer Verslag'}
                </button>
              )}
            </div>

            {/* AI Results */}
            {(transcript.summary || transcript.cleanedText) && (
              <div className="mt-6 space-y-4">
                {transcript.summary && (
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Samenvatting</h4>
                    <p className="text-gray-600">{transcript.summary}</p>
                  </div>
                )}

                {transcript.cleanedText && (
                  <div className="bg-white rounded-lg p-4 border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Opgeschoonde Tekst</h4>
                      <button
                        onClick={() => setShowAISection(!showAISection)}
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        {showAISection ? 'Verbergen' : 'Tonen'}
                      </button>
                    </div>
                    {showAISection && (
                      <p className="text-gray-600 whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                        {transcript.cleanedText}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSendToN8n}
              disabled={sendingToN8n}
              className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingToN8n ? 'Versturen...' : 'Verstuur naar n8n'}
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {copied ? 'Gekopieerd!' : 'Kopieer tekst'}
            </button>
            <a
              href={`/api/transcripts/${id}/download?format=txt`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Download .txt
            </a>
            {transcript.srt && (
              <a
                href={`/api/transcripts/${id}/download?format=srt`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Download .srt
              </a>
            )}
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              Verwijderen
            </button>
          </div>

          {/* Transcript text */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Transcriptie</h3>
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                {expanded ? 'Toon minder' : 'Toon alles'}
                <svg
                  className={`ml-1 h-4 w-4 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {expanded
                  ? transcript.text
                  : transcript.text.substring(0, 300) + (transcript.text.length > 300 ? '...' : '')
                }
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
