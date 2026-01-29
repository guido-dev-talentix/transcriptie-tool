import { AssemblyAI, TranscriptUtterance } from 'assemblyai'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

export interface TranscriptionResult {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text?: string
  utterances?: TranscriptUtterance[]
  audio_duration?: number
  language_code?: string
  error?: string
}

export async function uploadAndTranscribe(
  audioData: Buffer,
  filename: string,
  webhookUrl?: string
): Promise<{ assemblyId: string }> {
  // Upload the audio file
  const uploadUrl = await client.files.upload(audioData)

  // Start transcription with webhook
  const transcript = await client.transcripts.submit({
    audio_url: uploadUrl,
    language_detection: true,
    webhook_url: webhookUrl,
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

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
