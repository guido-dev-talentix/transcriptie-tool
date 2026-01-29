'use client'

import { useState, useCallback } from 'react'

interface TranscriptResult {
  id: string
  filename: string
  text: string
  srt: string
  duration: number
  language: string
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

  const handleUpload = async (file: File) => {
    setError(null)
    setResult(null)
    setIsUploading(true)
    setUploadProgress('Bestand uploaden naar AssemblyAI...')

    try {
      // Step 1: Get upload URL from AssemblyAI via our API
      const uploadUrlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })

      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.json()
        throw new Error(error.error || 'Kon upload URL niet ophalen')
      }

      const { uploadUrl } = await uploadUrlResponse.json()

      // Step 2: Upload file directly to AssemblyAI
      setUploadProgress('Bestand uploaden... (dit kan even duren)')
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload naar AssemblyAI mislukt')
      }

      const audioUrl = await uploadResponse.text()

      // Step 3: Start transcription
      setUploadProgress('Transcriptie starten...')
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          filename: file.name,
        }),
      })

      if (!transcribeResponse.ok) {
        const error = await transcribeResponse.json()
        throw new Error(error.error || 'Transcriptie starten mislukt')
      }

      const data = await transcribeResponse.json()
      setResult(data)
      setUploadProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [])

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
    setIsSendingToN8N(true)
    setN8nSuccess(false)
    try {
      const response = await fetch('/api/send-to-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptId: result.id,
          filename: result.filename,
          status: 'completed',
          text: result.text,
          duration: result.duration,
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
          accept=".mp3,.wav,.m4a,.mp4,audio/*,video/mp4"
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
                Sleep je audiobestand hierheen
              </p>
              <p className="text-sm text-gray-500 mt-1">
                of klik om te selecteren
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Ondersteunde formaten: .mp3, .wav, .m4a, .mp4
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
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Transcriptie</h2>
              <div className="flex gap-2 text-sm text-gray-500">
                <span>{result.filename}</span>
                {result.duration && (
                  <span>• {Math.floor(result.duration / 60)}:{String(Math.floor(result.duration % 60)).padStart(2, '0')}</span>
                )}
                {result.language && <span>• {result.language}</span>}
              </div>
            </div>

            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-gray-700">{result.text}</p>
            </div>

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
              <button
                onClick={handleSendToN8N}
                disabled={isSendingToN8N}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  n8nSuccess
                    ? 'bg-green-100 text-green-700'
                    : isSendingToN8N
                    ? 'bg-purple-100 text-purple-400 cursor-wait'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                {isSendingToN8N ? 'Verzenden...' : n8nSuccess ? 'Verzonden!' : 'Verzend naar N8N'}
              </button>
            </div>
          </div>

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

          <button
            onClick={() => setResult(null)}
            className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Nieuwe transcriptie
          </button>
        </div>
      )}
    </div>
  )
}
