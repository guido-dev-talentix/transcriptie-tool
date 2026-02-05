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
  }, [id])

  useEffect(() => {
    if (transcript?.status !== 'processing' && transcript?.status !== 'pending') {
      return
    }

    const interval = setInterval(() => {
      fetchTranscript()
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
      <div className="text-center py-16">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-brand-light-blue animate-spin mx-auto"></div>
        <p className="mt-4 text-slate font-body">Laden...</p>
      </div>
    )
  }

  if (error || !transcript) {
    return (
      <div className="text-center py-16 card">
        <div className="w-16 h-16 rounded-2xl bg-cta-red/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-cta-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-cta-red font-display font-semibold">{error || 'Niet gevonden'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            {editingTitle ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="input flex-1"
                  placeholder="Voer een titel in..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') setEditingTitle(false)
                  }}
                />
                <button onClick={handleSaveTitle} className="btn-primary">
                  Opslaan
                </button>
                <button onClick={() => setEditingTitle(false)} className="btn-secondary">
                  Annuleren
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-heading-s font-display font-semibold text-primary">
                  {transcript.title || transcript.filename}
                </h2>
                <button
                  onClick={handleStartEditTitle}
                  className="text-slate hover:text-brand-light-blue transition-colors p-2 rounded-xl hover:bg-accent-glow"
                  title="Titel bewerken"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate font-body">
              {transcript.title && <span className="badge badge-neutral">{transcript.filename}</span>}
              <span className="badge badge-accent">Duur: {formatDuration(transcript.duration)}</span>
              {transcript.language && <span className="badge badge-primary">{transcript.language}</span>}
            </div>
          </div>
          <StatusBadge status={transcript.status} />
        </div>
      </div>

      {/* Processing state */}
      {(transcript.status === 'processing' || transcript.status === 'pending') && (
        <div className="bg-accent-glow border-2 border-brand-light-blue/30 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-brand-light-blue animate-spin mx-auto"></div>
          <p className="mt-6 text-heading-s font-display font-semibold text-primary">
            Je audio wordt getranscribeerd...
          </p>
          <p className="mt-2 text-body-l text-slate font-body">
            Dit kan enkele minuten duren, afhankelijk van de lengte van het bestand.
          </p>
        </div>
      )}

      {/* Error state */}
      {transcript.status === 'error' && (
        <div className="bg-cta-red/10 border-2 border-cta-red/20 rounded-2xl p-6">
          <h3 className="text-lg font-display font-semibold text-cta-red">Er is iets misgegaan</h3>
          <p className="mt-2 text-sm text-cta-red/80 font-body">
            {transcript.error || 'Onbekende fout bij het transcriberen'}
          </p>
        </div>
      )}

      {/* Completed state */}
      {transcript.status === 'completed' && transcript.text && (
        <>
          {/* AI Processing Section */}
          <div className="bg-brand-light-blue/15 border-2 border-brand-light-blue/20 rounded-2xl p-6">
            <h3 className="text-lg font-display font-semibold text-primary mb-5">AI Verwerking</h3>

            {/* Project selector */}
            <div className="mb-5">
              <label className="block text-sm font-display font-semibold text-primary mb-2">
                Project koppelen
              </label>
              <div className="flex items-center gap-3 max-w-md">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="input flex-1"
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
                    className="btn-secondary whitespace-nowrap"
                  >
                    {savingProject ? 'Opslaan...' : 'Opslaan'}
                  </button>
                )}
              </div>
              {transcript.project && (
                <p className="mt-2 text-sm text-slate font-body">
                  Huidig project: <span className="font-display font-semibold">{transcript.project.name}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleProcessWithAI}
                disabled={processingAI || !selectedProjectId}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {processingAI ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin mr-2"></div>
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
                  className="btn-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport ? 'Genereren...' : 'Genereer Verslag'}
                </button>
              )}
            </div>

            {/* AI Results */}
            {(transcript.summary || transcript.cleanedText) && (
              <div className="mt-6 space-y-4">
                {transcript.summary && (
                  <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <h4 className="text-sm font-display font-semibold text-primary mb-3">Samenvatting</h4>
                    <p className="text-body-l text-slate font-body font-light">{transcript.summary}</p>
                  </div>
                )}

                {transcript.cleanedText && (
                  <div className="bg-white rounded-xl p-5 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-display font-semibold text-primary">Opgeschoonde Tekst</h4>
                      <button
                        onClick={() => setShowAISection(!showAISection)}
                        className="text-sm font-display font-semibold text-brand-light-blue hover:text-accent-hover transition-colors"
                      >
                        {showAISection ? 'Verbergen' : 'Tonen'}
                      </button>
                    </div>
                    {showAISection && (
                      <p className="text-body-l text-slate font-body font-light whitespace-pre-wrap max-h-64 overflow-y-auto">
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
              className="btn-secondary disabled:opacity-50"
            >
              {sendingToN8n ? 'Versturen...' : 'Verstuur naar n8n'}
            </button>
            <button
              onClick={handleCopy}
              className={`btn-secondary ${copied ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : ''}`}
            >
              {copied ? 'Gekopieerd!' : 'Kopieer tekst'}
            </button>
            <a
              href={`/api/transcripts/${id}/download?format=txt`}
              className="btn-secondary"
            >
              Download .txt
            </a>
            {transcript.srt && (
              <a
                href={`/api/transcripts/${id}/download?format=srt`}
                className="btn-secondary"
              >
                Download .srt
              </a>
            )}
            <button
              onClick={handleDelete}
              className="px-5 py-2.5 border-2 border-cta-red/30 text-cta-red rounded-xl hover:bg-cta-red/10 font-display font-semibold transition-colors"
            >
              Verwijderen
            </button>
          </div>

          {/* Transcript text */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-display font-semibold text-primary">Transcriptie</h3>
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center text-sm font-display font-semibold text-brand-light-blue hover:text-accent-hover transition-colors"
              >
                {expanded ? 'Toon minder' : 'Toon alles'}
                <svg
                  className={`ml-2 h-4 w-4 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-body-l text-slate font-body font-light leading-relaxed">
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
