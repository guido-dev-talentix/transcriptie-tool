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
  aiStatus: string | null
  aiError: string | null
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
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showAISection, setShowAISection] = useState(false)
  const [optExtractActionItems, setOptExtractActionItems] = useState(true)
  const [optExtractDecisions, setOptExtractDecisions] = useState(true)
  const [optGenerateReport, setOptGenerateReport] = useState(false)
  const [aiResultCounts, setAiResultCounts] = useState<{ actionItems?: number; decisions?: number } | null>(null)

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

      // Show AI section when processing completes
      if (data.aiStatus === 'completed' && (data.summary || data.cleanedText)) {
        setShowAISection(true)
      }
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

  // Poll for transcription status
  useEffect(() => {
    if (transcript?.status !== 'processing' && transcript?.status !== 'pending') {
      return
    }

    const interval = setInterval(() => {
      fetchTranscript()
    }, 3000)

    return () => clearInterval(interval)
  }, [id, transcript?.status])

  // Poll for AI processing status
  useEffect(() => {
    if (transcript?.aiStatus !== 'processing') {
      return
    }

    const interval = setInterval(async () => {
      await fetchTranscript()
    }, 5000)

    return () => clearInterval(interval)
  }, [id, transcript?.aiStatus])

  // Fetch result counts when AI completes
  useEffect(() => {
    if (transcript?.aiStatus !== 'completed' || aiResultCounts) return

    const fetchCounts = async () => {
      const counts: { actionItems?: number; decisions?: number } = {}
      try {
        const [aiRes, decRes] = await Promise.all([
          fetch(`/api/action-items?transcriptId=${id}`),
          fetch(`/api/decisions?transcriptId=${id}`),
        ])
        if (aiRes.ok) {
          const items = await aiRes.json()
          counts.actionItems = items.length
        }
        if (decRes.ok) {
          const items = await decRes.json()
          counts.decisions = items.length
        }
        setAiResultCounts(counts)
      } catch {
        // ignore
      }
    }
    fetchCounts()
  }, [id, transcript?.aiStatus])

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

    setAiResultCounts(null)

    try {
      const response = await fetch('/api/ai/process-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptId: transcript.id,
          projectId: selectedProjectId,
          options: {
            extractActionItems: optExtractActionItems,
            extractDecisions: optExtractDecisions,
            generateReport: optGenerateReport,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'AI verwerking mislukt')
      }

      // Update local state to show processing
      setTranscript({
        ...transcript,
        aiStatus: 'processing',
        aiError: null,
        projectId: selectedProjectId,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'AI verwerking mislukt')
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

            {/* AI Processing Progress */}
            {transcript.aiStatus === 'processing' && (
              <div className="mb-5 bg-white rounded-xl p-5 border border-brand-light-blue/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-brand-light-blue animate-spin flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-primary">AI verwerking bezig...</p>
                    <p className="text-sm text-slate font-body mt-1">
                      De transcriptie wordt geanalyseerd. Je kunt ondertussen doorgaan met andere taken.
                    </p>
                    {/* Progress bar animation */}
                    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-light-blue rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Error */}
            {transcript.aiStatus === 'error' && (
              <div className="mb-5 bg-cta-red/10 border border-cta-red/20 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-cta-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-display font-semibold text-cta-red">AI verwerking mislukt</p>
                    <p className="text-sm text-cta-red/80 font-body mt-1">
                      {transcript.aiError || 'Er is een onbekende fout opgetreden'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Completed Success Message */}
            {transcript.aiStatus === 'completed' && !showAISection && (
              <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-display font-semibold text-emerald-700">AI verwerking voltooid!</p>
                    <button
                      onClick={() => setShowAISection(true)}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-body mt-1 underline"
                    >
                      Bekijk resultaten
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                  disabled={transcript.aiStatus === 'processing'}
                >
                  <option value="">Geen project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedProjectId !== (transcript.projectId || '') && (
                  <button
                    onClick={handleSaveProject}
                    disabled={savingProject || transcript.aiStatus === 'processing'}
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

            {/* AI Options */}
            {selectedProjectId && (
              <div className="mb-5 space-y-2">
                <label className="block text-sm font-display font-semibold text-primary mb-2">Opties</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optExtractActionItems}
                    onChange={(e) => setOptExtractActionItems(e.target.checked)}
                    disabled={transcript.aiStatus === 'processing'}
                    className="rounded border-slate-300 text-brand-light-blue focus:ring-brand-light-blue"
                  />
                  <span className="text-sm text-slate font-body">Actiepunten extraheren</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optExtractDecisions}
                    onChange={(e) => setOptExtractDecisions(e.target.checked)}
                    disabled={transcript.aiStatus === 'processing'}
                    className="rounded border-slate-300 text-brand-light-blue focus:ring-brand-light-blue"
                  />
                  <span className="text-sm text-slate font-body">Besluiten extraheren</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optGenerateReport}
                    onChange={(e) => setOptGenerateReport(e.target.checked)}
                    disabled={transcript.aiStatus === 'processing'}
                    className="rounded border-slate-300 text-brand-light-blue focus:ring-brand-light-blue"
                  />
                  <span className="text-sm text-slate font-body">Verslag genereren</span>
                </label>
              </div>
            )}

            {/* AI Result Counts */}
            {transcript.aiStatus === 'completed' && aiResultCounts && (
              <div className="mb-5 flex flex-wrap gap-2">
                {aiResultCounts.actionItems !== undefined && aiResultCounts.actionItems > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-display font-semibold rounded-full border border-blue-200">
                    {aiResultCounts.actionItems} actiepunt{aiResultCounts.actionItems !== 1 ? 'en' : ''}
                  </span>
                )}
                {aiResultCounts.decisions !== undefined && aiResultCounts.decisions > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-display font-semibold rounded-full border border-purple-200">
                    {aiResultCounts.decisions} besluit{aiResultCounts.decisions !== 1 ? 'en' : ''}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleProcessWithAI}
                disabled={transcript.aiStatus === 'processing' || !selectedProjectId}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {transcript.aiStatus === 'processing' ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin mr-2"></div>
                    Verwerken...
                  </>
                ) : transcript.aiStatus === 'completed' ? (
                  'Opnieuw verwerken'
                ) : (
                  'Verwerk met AI'
                )}
              </button>
            </div>

            {/* AI Results */}
            {(transcript.summary || transcript.cleanedText) && showAISection && (
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
                        onClick={() => setShowAISection(false)}
                        className="text-sm font-display font-semibold text-brand-light-blue hover:text-accent-hover transition-colors"
                      >
                        Verbergen
                      </button>
                    </div>
                    <p className="text-body-l text-slate font-body font-light whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {transcript.cleanedText}
                    </p>
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
