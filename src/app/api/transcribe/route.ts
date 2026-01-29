import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'
import { PrismaClient } from '@prisma/client'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

const prisma = new PrismaClient()

export const maxDuration = 300 // 5 minutes for long transcriptions

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, filename } = await request.json()

    if (!audioUrl || !filename) {
      return NextResponse.json(
        { error: 'Audio URL and filename are required' },
        { status: 400 }
      )
    }

    // Start transcription (waits for completion)
    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
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
        filename,
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
      filename,
      text: transcript.text,
      srt,
      duration: transcript.audio_duration,
      language: transcript.language_code,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    )
  }
}
