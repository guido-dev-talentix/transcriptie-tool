'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { upload } from '@vercel/blob/client'

interface TranscriptResult {
  id: string
  filename: string
  title?: string
  text: string
  srt?: string
  duration?: number
  language?: string
}

interface Project {
  id: string
  name: string
}

interface AiResults {
  summary?: string
  actionItemCount?: number
  decisionCount?: number
  reportId?: string
}

export default function UploadForm() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [result, setResult] = useState<TranscriptResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const [uploadType, setUploadType] = useState<'audio' | 'pdf'>('audio')
  const [title, setTitle] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Post-upload state
  const [editableTitle, setEditableTitle] = useState('')
  const [postProjectId, setPostProjectId] = useState<string>('')
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [aiStatus, setAiStatus] = useState<'processing' | 'completed' | 'error' | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [optExtractActionItems, setOptExtractActionItems] = useState(true)
  const [optExtractDecisions, setOptExtractDecisions] = useState(true)
  const [optGenerateReport, setOptGenerateReport] = useState(false)
  const [aiResults, setAiResults] = useState<AiResults>({})
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchProjects()

    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('projectId')
    if (projectId) {
      setSelectedProjectId(projectId)
    }
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?status=active')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  const handleAudioUpload = async (file: File) => {
    setError(null)
    setResult(null)
    setIsUploading(true)

    try {
      setUploadProgress('Uploaden...')

      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
      })

      setUploadProgress('Transcriptie starten...')

      const response = await fetch('/api/transcribe-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: blob.url,
          filename: file.name,
          title: title.trim() || undefined,
          projectId: selectedProjectId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transcriptie mislukt')
      }

      setResult(data)
      setEditableTitle(data.title || data.filename.replace(/\.[^/.]+$/, ''))
      setPostProjectId(selectedProjectId)
      setUploadProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan')
    } finally {
      setIsUploading(false)
    }
  }

  const handlePdfUpload = async (file: File) => {
    setError(null)
    setResult(null)
    setIsUploading(true)

    try {
      setUploadProgress('PDF verwerken...')

      const formData = new FormData()
      formData.append('file', file)
      if (title.trim()) formData.append('title', title.trim())
      if (selectedProjectId) formData.append('projectId', selectedProjectId)

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'PDF verwerking mislukt')
      }

      setResult(data)
      setEditableTitle(data.title || data.filename.replace(/\.[^/.]+$/, ''))
      setPostProjectId(selectedProjectId)
      setUploadProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpload = async (file: File) => {
    if (uploadType === 'pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      await handlePdfUpload(file)
    } else {
      await handleAudioUpload(file)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [uploadType, title, selectedProjectId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleCopyText = async () => {
    if (!result?.text) return
    try {
      await navigator.clipboard.writeText(result.text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      setError('Kopiëren mislukt')
    }
  }

  const handleTitleSave = async () => {
    if (!result || editableTitle.trim() === (result.title || '')) return
    try {
      const response = await fetch(`/api/transcripts/${result.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editableTitle.trim() }),
      })
      if (response.ok) {
        setResult({ ...result, title: editableTitle.trim() })
      }
    } catch (err) {
      console.error('Failed to save title:', err)
    }
  }

  const handleProjectChange = async (newProjectId: string) => {
    setPostProjectId(newProjectId)
    if (!result) return
    try {
      await fetch(`/api/transcripts/${result.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: newProjectId || null }),
      })
    } catch (err) {
      console.error('Failed to update project:', err)
    }
  }

  const handleStartAiProcessing = async () => {
    if (!result) return

    setIsAiProcessing(true)
    setAiStatus('processing')
    setAiError(null)
    setAiResults({})

    try {
      const response = await fetch('/api/ai/process-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptId: result.id,
          projectId: postProjectId || undefined,
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

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/transcripts/${result.id}`)
          if (pollRes.ok) {
            const transcript = await pollRes.json()
            if (transcript.aiStatus === 'completed') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              pollingRef.current = null
              setAiStatus('completed')
              setIsAiProcessing(false)

              const results: AiResults = {
                summary: transcript.summary,
              }

              // Fetch counts
              if (optExtractActionItems) {
                try {
                  const aiRes = await fetch(`/api/action-items?transcriptId=${result.id}`)
                  if (aiRes.ok) {
                    const items = await aiRes.json()
                    results.actionItemCount = items.length
                  }
                } catch { /* ignore */ }
              }
              if (optExtractDecisions) {
                try {
                  const decRes = await fetch(`/api/decisions?transcriptId=${result.id}`)
                  if (decRes.ok) {
                    const items = await decRes.json()
                    results.decisionCount = items.length
                  }
                } catch { /* ignore */ }
              }

              setAiResults(results)
            } else if (transcript.aiStatus === 'error') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              pollingRef.current = null
              setAiStatus('error')
              setAiError(transcript.aiError || 'Onbekende fout')
              setIsAiProcessing(false)
            }
          }
        } catch {
          // polling error, continue
        }
      }, 5000)
    } catch (err) {
      setAiStatus('error')
      setAiError(err instanceof Error ? err.message : 'AI verwerking mislukt')
      setIsAiProcessing(false)
    }
  }

  const handleNewTranscript = () => {
    setResult(null)
    setTitle('')
    setSelectedProjectId('')
    setEditableTitle('')
    setPostProjectId('')
    setAiStatus(null)
    setAiError(null)
    setAiResults({})
    setIsAiProcessing(false)
    setOptExtractActionItems(true)
    setOptExtractDecisions(true)
    setOptGenerateReport(false)
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  return (
    <div className="w-full">
      {/* Form inputs before upload */}
      {!result && (
        <div className="mb-6 space-y-4">
          {/* Upload Type Toggle */}
          <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setUploadType('audio')}
              disabled={isUploading}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                uploadType === 'audio'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Audio/Video
            </button>
            <button
              type="button"
              onClick={() => setUploadType('pdf')}
              disabled={isUploading}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                uploadType === 'pdf'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              PDF
            </button>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Titel (optioneel)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Interview Jan de Vries"
              disabled={isUploading}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="project" className="block text-sm font-medium text-slate-700 mb-1">
              Project (optioneel)
            </label>
            <select
              id="project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isUploading}
              className="input"
            >
              <option value="">Geen project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {!result && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging
              ? 'border-sky-400 bg-sky-50'
              : 'border-slate-300 hover:border-slate-400 bg-white'
            }
            ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
          `}
        >
          <input
            type="file"
            accept={uploadType === 'pdf' ? '.pdf,application/pdf' : '.mp3,.wav,.m4a,.mp4,audio/*,video/mp4'}
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          <div className="space-y-3">
            {isUploading ? (
              <>
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin mx-auto" />
                <p className="text-sm text-slate-600">{uploadProgress}</p>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-sm text-slate-600">
                    Sleep een bestand hierheen of{' '}
                    <span className="text-sky-600 font-medium">klik om te selecteren</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Post-upload Results */}
      {result && (
        <div className="space-y-4">
          {/* Title + Duration */}
          <div className="card">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave() }}
                className="flex-1 text-base font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none px-1 py-0.5 transition-colors"
                placeholder="Titel invoeren..."
              />
              {result.duration && (
                <span className="badge badge-neutral whitespace-nowrap">
                  {Math.floor(result.duration / 60)}:{String(Math.floor(result.duration % 60)).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          {/* Project selector */}
          <div className="card">
            <label className="block text-sm font-medium text-slate-700 mb-2">Project</label>
            <select
              value={postProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={isAiProcessing}
              className="input"
            >
              <option value="">Geen project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* AI Processing Section */}
          {postProjectId && (
            <div className="card">
              <h3 className="text-sm font-medium text-slate-900 mb-3">AI Verwerking</h3>

              {/* Options checkboxes */}
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optExtractActionItems}
                    onChange={(e) => setOptExtractActionItems(e.target.checked)}
                    disabled={isAiProcessing}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Actiepunten extraheren</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optExtractDecisions}
                    onChange={(e) => setOptExtractDecisions(e.target.checked)}
                    disabled={isAiProcessing}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Besluiten extraheren</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optGenerateReport}
                    onChange={(e) => setOptGenerateReport(e.target.checked)}
                    disabled={isAiProcessing}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Verslag genereren</span>
                </label>
              </div>

              {/* Start button */}
              {!aiStatus && (
                <button
                  onClick={handleStartAiProcessing}
                  disabled={isAiProcessing}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  Verwerk met AI
                </button>
              )}

              {/* Processing state */}
              {aiStatus === 'processing' && (
                <div className="flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="w-5 h-5 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin flex-shrink-0" />
                  <span className="text-sm text-sky-700">AI verwerking bezig... Dit kan even duren.</span>
                </div>
              )}

              {/* Completed state */}
              {aiStatus === 'completed' && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-emerald-700">AI verwerking voltooid</span>
                    </div>
                    {aiResults.summary && (
                      <p className="text-sm text-emerald-700 mt-1">{aiResults.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiResults.actionItemCount !== undefined && aiResults.actionItemCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                        {aiResults.actionItemCount} actiepunt{aiResults.actionItemCount !== 1 ? 'en' : ''} geëxtraheerd
                      </span>
                    )}
                    {aiResults.decisionCount !== undefined && aiResults.decisionCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                        {aiResults.decisionCount} besluit{aiResults.decisionCount !== 1 ? 'en' : ''} geëxtraheerd
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Error state */}
              {aiStatus === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{aiError || 'Er is een fout opgetreden'}</p>
                  <button
                    onClick={() => { setAiStatus(null); setAiError(null) }}
                    className="mt-2 text-sm text-red-700 underline hover:no-underline"
                  >
                    Opnieuw proberen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Transcript Card - Full text */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-900">Transcriptie</h2>
              <button
                onClick={handleCopyText}
                className={`btn-secondary text-sm ${isCopied ? 'text-emerald-600 border-emerald-300' : ''}`}
              >
                {isCopied ? 'Gekopieerd!' : 'Kopieer tekst'}
              </button>
            </div>

            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {result.text}
            </p>
          </div>

          {/* SRT Section */}
          {result.srt && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-900">SRT Ondertitels</h2>
                <button
                  onClick={() => {
                    if (!result.srt) return
                    const blob = new Blob([result.srt], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${result.filename.replace(/\.[^/.]+$/, '')}.srt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="btn-secondary text-sm"
                >
                  Download
                </button>
              </div>

              <pre className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 overflow-x-auto max-h-48 overflow-y-auto">
                {result.srt}
              </pre>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <a
              href={`/transcripts/${result.id}`}
              className="flex-1 btn-secondary text-center"
            >
              Bekijk details
            </a>
            <button
              onClick={handleNewTranscript}
              className="flex-1 btn-secondary"
            >
              Nieuwe transcriptie
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
