'use client'

import { useState, useCallback, useEffect } from 'react'
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

interface SavedDestination {
  id: string
  label: string
  type: 'slack' | 'gmail'
  address: string
}

interface Project {
  id: string
  name: string
}

export default function UploadForm() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [result, setResult] = useState<TranscriptResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isSendingToN8N, setIsSendingToN8N] = useState(false)
  const [n8nSuccess, setN8nSuccess] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const [uploadType, setUploadType] = useState<'audio' | 'pdf'>('audio')
  const [title, setTitle] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([])
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('new')
  const [newDestinationType, setNewDestinationType] = useState<'slack' | 'gmail'>('slack')
  const [newDestinationAddress, setNewDestinationAddress] = useState('')
  const [saveDestination, setSaveDestination] = useState(false)
  const [newDestinationLabel, setNewDestinationLabel] = useState('')
  const [isSavingDestination, setIsSavingDestination] = useState(false)

  useEffect(() => {
    fetchSavedDestinations()
    fetchProjects()

    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('projectId')
    if (projectId) {
      setSelectedProjectId(projectId)
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

  const fetchSavedDestinations = async () => {
    try {
      const response = await fetch('/api/saved-destinations')
      if (response.ok) {
        const data = await response.json()
        setSavedDestinations(data)
      }
    } catch (err) {
      console.error('Failed to fetch saved destinations:', err)
    }
  }

  const handleDeleteDestination = async (id: string) => {
    try {
      const response = await fetch(`/api/saved-destinations/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSavedDestinations(prev => prev.filter(d => d.id !== id))
        if (selectedDestinationId === id) {
          setSelectedDestinationId('new')
        }
      }
    } catch (err) {
      console.error('Failed to delete destination:', err)
    }
  }

  const handleAudioUpload = async (file: File) => {
    setError(null)
    setResult(null)
    setIsUploading(true)
    setIsExpanded(false)

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
    setIsExpanded(false)

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
    } catch (err) {
      setError('Kopiëren mislukt')
    }
  }

  const handleSendToN8N = async () => {
    if (!result) return

    let destinationType: 'slack' | 'gmail' | undefined
    let destinationAddress: string | undefined

    if (selectedDestinationId === 'new') {
      if (newDestinationAddress.trim()) {
        destinationType = newDestinationType
        destinationAddress = newDestinationAddress.trim()

        if (saveDestination && newDestinationLabel.trim()) {
          setIsSavingDestination(true)
          try {
            const saveResponse = await fetch('/api/saved-destinations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                label: newDestinationLabel.trim(),
                type: newDestinationType,
                address: newDestinationAddress.trim(),
              }),
            })
            if (saveResponse.ok) {
              await fetchSavedDestinations()
              setSaveDestination(false)
              setNewDestinationLabel('')
            }
          } catch (err) {
            console.error('Failed to save destination:', err)
          } finally {
            setIsSavingDestination(false)
          }
        }
      }
    } else {
      const selectedDest = savedDestinations.find(d => d.id === selectedDestinationId)
      if (selectedDest) {
        destinationType = selectedDest.type
        destinationAddress = selectedDest.address
      }
    }

    setIsSendingToN8N(true)
    setN8nSuccess(false)
    try {
      const response = await fetch('/api/send-to-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptId: result.id,
          filename: result.filename,
          title: result.title || title.trim() || undefined,
          status: 'completed',
          text: result.text,
          duration: result.duration,
          destinationType,
          destinationAddress,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Verzenden naar N8N mislukt')
      }
      setN8nSuccess(true)
      setTimeout(() => setN8nSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verzenden naar N8N mislukt')
    } finally {
      setIsSendingToN8N(false)
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

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Destination selector */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-900 mb-3">Verstuur naar</h3>

            <div className="space-y-3">
              <select
                value={selectedDestinationId}
                onChange={(e) => setSelectedDestinationId(e.target.value)}
                className="input"
              >
                <option value="new">+ Nieuwe bestemming</option>
                {savedDestinations.map((dest) => (
                  <option key={dest.id} value={dest.id}>
                    {dest.label} ({dest.type})
                  </option>
                ))}
              </select>

              {selectedDestinationId !== 'new' && (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg text-sm">
                  <span className="text-slate-600">
                    {savedDestinations.find(d => d.id === selectedDestinationId)?.address}
                  </span>
                  <button
                    onClick={() => handleDeleteDestination(selectedDestinationId)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Verwijderen
                  </button>
                </div>
              )}

              {selectedDestinationId === 'new' && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                      <select
                        value={newDestinationType}
                        onChange={(e) => setNewDestinationType(e.target.value as 'slack' | 'gmail')}
                        className="input"
                      >
                        <option value="slack">Slack</option>
                        <option value="gmail">Gmail</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {newDestinationType === 'slack' ? 'Kanaal' : 'E-mail'}
                      </label>
                      <input
                        type={newDestinationType === 'gmail' ? 'email' : 'text'}
                        value={newDestinationAddress}
                        onChange={(e) => setNewDestinationAddress(e.target.value)}
                        placeholder={newDestinationType === 'slack' ? '#algemeen' : 'email@voorbeeld.nl'}
                        className="input"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveDestination}
                      onChange={(e) => setSaveDestination(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-600">Bewaar voor later</span>
                  </label>

                  {saveDestination && (
                    <input
                      type="text"
                      value={newDestinationLabel}
                      onChange={(e) => setNewDestinationLabel(e.target.value)}
                      placeholder="Label (bijv. Werk Slack)"
                      className="input"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSendToN8N}
            disabled={isSendingToN8N || isSavingDestination}
            className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${
              n8nSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
            }`}
          >
            {isSendingToN8N ? 'Verzenden...' : n8nSuccess ? 'Verzonden!' : 'Verstuur naar n8n'}
          </button>

          {/* Transcript Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-900">
                {result.title || 'Transcriptie'}
              </h2>
              <div className="flex gap-2 text-xs">
                {result.duration && (
                  <span className="badge badge-neutral">
                    {Math.floor(result.duration / 60)}:{String(Math.floor(result.duration % 60)).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
              {isExpanded
                ? result.text
                : result.text.substring(0, 300) + (result.text.length > 300 ? '...' : '')
              }
            </p>

            {result.text.length > 300 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 text-sm text-sky-600 hover:text-sky-700"
              >
                {isExpanded ? 'Minder weergeven' : 'Meer weergeven'}
              </button>
            )}

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={handleCopyText}
                className={`btn-secondary text-sm ${isCopied ? 'text-emerald-600 border-emerald-300' : ''}`}
              >
                {isCopied ? 'Gekopieerd!' : 'Kopieer tekst'}
              </button>
            </div>
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

          {/* New Upload Button */}
          <button
            onClick={() => {
              setResult(null)
              setIsExpanded(false)
              setTitle('')
              setSelectedProjectId('')
              setSelectedDestinationId('new')
              setNewDestinationType('slack')
              setNewDestinationAddress('')
              setSaveDestination(false)
              setNewDestinationLabel('')
            }}
            className="w-full btn-secondary"
          >
            Nieuwe transcriptie
          </button>
        </div>
      )}
    </div>
  )
}
