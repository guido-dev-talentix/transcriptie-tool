import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'
import { PrismaClient } from '@prisma/client'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

const prisma = new PrismaClient()

const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'video/mp4',
]

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4']

// Configure route for large file uploads
export const maxDuration = 300 // 5 minutes for long transcriptions

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file extension
    const filename = file.name.toLowerCase()
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext))

    if (!hasValidExtension && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: .mp3, .wav, .m4a, .mp4' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload and transcribe synchronously (waits for completion)
    const transcript = await client.transcripts.transcribe({
      audio: buffer,
      language_detection: true,
    })

    if (transcript.status === 'error') {
      return NextResponse.json(
        { error: transcript.error || 'Transcription failed' },
        { status: 500 }
      )
    }

    // Get subtitles
    const srt = await client.transcripts.subtitles(transcript.id, 'srt')

    // Save to database
    const savedTranscript = await prisma.transcript.create({
      data: {
        filename: file.name,
        duration: transcript.audio_duration,
        status: 'completed',
        text: transcript.text,
        srt,
        language: transcript.language_code,
        assemblyId: transcript.id,
      },
    })

    return NextResponse.json({
      id: savedTranscript.id,
      assemblyId: transcript.id,
      status: 'completed',
      filename: file.name,
      text: transcript.text,
      srt,
      duration: transcript.audio_duration,
      language: transcript.language_code,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
