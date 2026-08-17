import { AssemblyAI, TranscriptUtterance } from 'assemblyai'
import type { FileUploadData } from 'assemblyai'
import { prisma } from '@/lib/db'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

// AssemblyAI roept /api/webhook aan zodra een transcriptie klaar is. Met een
// geheime header (ASSEMBLYAI_WEBHOOK_SECRET) weren we vervalste aanroepen.
export const WEBHOOK_HEADER_NAME = 'x-transcriptie-webhook-secret'

export interface TranscriptionResult {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text?: string
  utterances?: TranscriptUtterance[]
  audio_duration?: number
  language_code?: string
  error?: string
}

/**
 * Upload audio (stream, buffer of pad) naar AssemblyAI en start de transcriptie.
 * Geeft direct het AssemblyAI-id terug; het resultaat komt via de webhook of
 * via polling (`syncTranscriptWithAssemblyAI`).
 */
export async function uploadAndSubmit(
  audio: FileUploadData | string,
  options: { webhookUrl?: string } = {}
): Promise<{ assemblyId: string }> {
  const uploadUrl = await client.files.upload(audio)

  const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET
  const transcript = await client.transcripts.submit({
    audio_url: uploadUrl,
    language_detection: true,
    ...(options.webhookUrl
      ? {
          webhook_url: options.webhookUrl,
          ...(secret
            ? { webhook_auth_header_name: WEBHOOK_HEADER_NAME, webhook_auth_header_value: secret }
            : {}),
        }
      : {}),
  })

  return { assemblyId: transcript.id }
}

export async function getTranscriptionStatus(assemblyId: string): Promise<TranscriptionResult> {
  const transcript = await client.transcripts.get(assemblyId)

  return {
    id: transcript.id,
    status: transcript.status,
    text: transcript.text || undefined,
    utterances: transcript.utterances || undefined,
    audio_duration: transcript.audio_duration || undefined,
    language_code: transcript.language_code || undefined,
    error: transcript.error || undefined,
  }
}

export async function getSubtitles(assemblyId: string, format: 'srt' | 'vtt' = 'srt'): Promise<string> {
  const subtitles = await client.transcripts.subtitles(assemblyId, format)
  return subtitles
}

const transcriptInclude = { project: { select: { id: true, name: true } } } as const

/**
 * Haalt de actuele status bij AssemblyAI op en schrijft het resultaat naar de
 * database. Wordt gebruikt door de webhook én als polling-fallback (bijv. lokaal,
 * waar AssemblyAI de webhook niet kan bereiken).
 * Geeft de bijgewerkte rij terug, of null als de transcriptie nog loopt.
 */
export async function syncTranscriptWithAssemblyAI(transcript: { id: string; assemblyId: string }) {
  const result = await getTranscriptionStatus(transcript.assemblyId)

  if (result.status === 'completed') {
    let srt: string | undefined
    try {
      srt = await getSubtitles(transcript.assemblyId, 'srt')
    } catch (e) {
      console.error('Failed to get subtitles:', e)
    }

    return prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        status: 'completed',
        text: result.text,
        srt,
        duration: result.audio_duration ? Math.round(result.audio_duration) : null,
        language: result.language_code,
        error: null,
      },
      include: transcriptInclude,
    })
  }

  if (result.status === 'error') {
    return prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        status: 'error',
        error: result.error || 'Unknown error',
      },
      include: transcriptInclude,
    })
  }

  return null
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
