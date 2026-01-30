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

  // Upload type state
  const [uploadType, setUploadType] = useState<'audio' | 'pdf'>('audio')

  // Title state
  const [title, setTitle] = useState('')

  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Destination states
  const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([])
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('new')
  const [newDestinationType, setNewDestinationType] = useState<'slack' | 'gmail'>('slack')
  const [newDestinationAddress, setNewDestinationAddress] = useState('')
  const [saveDestination, setSaveDestination] = useState(false)
  const [newDestinationLabel, setNewDestinationLabel] = useState('')
  const [isSavingDestination, setIsSavingDestination] = useState(false)

  // Load saved destinations and projects
  useEffect(() => {
    fetchSavedDestinations()
    fetchProjects()

    // Check for projectId in URL
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
      // Step 1: Upload to Vercel Blob (bypasses Vercel function size limit)
      setUploadProgress('Bestand uploaden naar cloud storage...')

      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
      })

      console.log('File uploaded to Blob:', blob.url)

      // Step 2: Transcribe using the blob URL
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

    // Determine destination
    let destinationType: 'slack' | 'gmail' | undefined
    let destinationAddress: string | undefined

    if (selectedDestinationId === 'new') {
      if (newDestinationAddress.trim()) {
        destinationType = newDestinationType
        destinationAddress = newDestinationAddress.trim()

        // Save destination if checkbox is checked
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
              // Reset the "save" form
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
    <div className="w-full max-w-xl mx-auto">
      {/* Title and Project inputs - shown before upload */}
      {!result && (
        <div className="mb-4 space-y-4">
          {/* Upload Type Toggle */}
          <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => setUploadType('audio')}
              disabled={isUploading}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                uploadType === 'audio'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
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
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              PDF (tekst)
            </button>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Titel (optioneel)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Interview Jan de Vries"
              disabled={isUploading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
              Project (optioneel)
            </label>
            <select
              id="project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isUploading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Geen project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
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

        <div className="space-y-4">
          <div className="flex justify-center">
            {isUploading ? (
              <svg
                className="animate-spin h-12 w-12 text-blue-500"
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
            ) : (
              <svg
                className="h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {isUploading ? (
            <div>
              <p className="text-lg font-medium text-gray-900">{uploadProgress}</p>
              <p className="text-sm text-gray-500 mt-1">Even geduld...</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                {uploadType === 'pdf'
                  ? 'Sleep je PDF bestand hierheen'
                  : 'Sleep je audiobestand hierheen'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                of klik om te selecteren
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {uploadType === 'pdf'
                  ? 'Ondersteund formaat: .pdf'
                  : 'Ondersteunde formaten: .mp3, .wav, .m4a, .mp4'}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          {/* Destination selector */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verstuur naar</h3>

            {/* Saved destinations dropdown */}
            <div className="space-y-4">
              <div>
                <select
                  value={selectedDestinationId}
                  onChange={(e) => setSelectedDestinationId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="new">+ Nieuwe bestemming</option>
                  {savedDestinations.map((dest) => (
                    <option key={dest.id} value={dest.id}>
                      {dest.label} ({dest.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Show selected destination info */}
              {selectedDestinationId !== 'new' && (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-600">
                      {savedDestinations.find(d => d.id === selectedDestinationId)?.type === 'slack' ? 'Slack: ' : 'Gmail: '}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {savedDestinations.find(d => d.id === selectedDestinationId)?.address}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteDestination(selectedDestinationId)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Verwijderen
                  </button>
                </div>
              )}

              {/* New destination form */}
              {selectedDestinationId === 'new' && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newDestinationType}
                        onChange={(e) => setNewDestinationType(e.target.value as 'slack' | 'gmail')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="slack">Slack</option>
                        <option value="gmail">Gmail</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {newDestinationType === 'slack' ? 'Kanaal' : 'E-mailadres'}
                      </label>
                      <input
                        type={newDestinationType === 'gmail' ? 'email' : 'text'}
                        value={newDestinationAddress}
                        onChange={(e) => setNewDestinationAddress(e.target.value)}
                        placeholder={newDestinationType === 'slack' ? '#algemeen' : 'email@voorbeeld.nl'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Save for later option */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="saveDestination"
                      checked={saveDestination}
                      onChange={(e) => setSaveDestination(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <label htmlFor="saveDestination" className="text-sm font-medium text-gray-700">
                        Bewaar voor later
                      </label>
                      {saveDestination && (
                        <input
                          type="text"
                          value={newDestinationLabel}
                          onChange={(e) => setNewDestinationLabel(e.target.value)}
                          placeholder="Bijv. Werk Slack"
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prominent n8n button */}
          <button
            onClick={handleSendToN8N}
            disabled={isSendingToN8N || isSavingDestination}
            className={`w-full py-4 text-lg font-semibold rounded-lg transition-colors ${
              n8nSuccess
                ? 'bg-green-600 text-white'
                : isSendingToN8N || isSavingDestination
                ? 'bg-purple-400 text-white cursor-wait'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isSendingToN8N ? 'Verzenden...' : n8nSuccess ? 'Verzonden naar n8n!' : 'Verstuur naar n8n'}
          </button>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {result.title || 'Transcriptie'}
              </h2>
              <div className="flex gap-2 text-sm text-gray-500">
                <span>{result.filename}</span>
                {result.duration && (
                  <span>• {Math.floor(result.duration / 60)}:{String(Math.floor(result.duration % 60)).padStart(2, '0')}</span>
                )}
                {result.language && <span>• {result.language}</span>}
              </div>
            </div>

            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-gray-700">
                {isExpanded
                  ? result.text
                  : result.text.substring(0, 300) + (result.text.length > 300 ? '...' : '')
                }
              </p>
            </div>

            {result.text.length > 300 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {isExpanded ? 'Minder weergeven' : 'Meer weergeven'}
                <svg
                  className={`ml-1 h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}

            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleCopyText}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isCopied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isCopied ? 'Gekopieerd!' : 'Kopieer tekst'}
              </button>
            </div>
          </div>

          {result.srt && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">SRT Ondertitels</h2>
                <button
                  onClick={() => {
                    const blob = new Blob([result.srt], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${result.filename.replace(/\.[^/.]+$/, '')}.srt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download SRT
                </button>
              </div>

              <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 overflow-x-auto max-h-64 overflow-y-auto">
                {result.srt}
              </pre>
            </div>
          )}

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
            className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Nieuwe transcriptie
          </button>
        </div>
      )}
    </div>
  )
}
