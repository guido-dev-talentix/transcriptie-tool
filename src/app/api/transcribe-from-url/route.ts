import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'
import { del } from '@vercel/blob'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

export const maxDuration = 300 // 5 minutes for long transcriptions

export async function POST(request: NextRequest) {
  try {
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { audioUrl, filename, title, projectId, isPrivate } = await request.json()
    // Privé kan alleen met een ingelogde eigenaar, en zonder projectkoppeling
    const markPrivate = Boolean(isPrivate) && !!user

    if (!audioUrl || !filename) {
      return NextResponse.json(
        { error: 'Audio URL and filename are required' },
        { status: 400 }
      )
    }

    console.log('Starting transcription for:', filename, 'from URL:', audioUrl)

    // Transcribe from URL (waits for completion)
    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
      language_detection: true,
    })

    if (transcript.status === 'error') {
      console.error('Transcription error:', transcript.error)
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
        title: title || null,
        duration: transcript.audio_duration,
        status: 'completed',
        text: transcript.text,
        srt,
        language: transcript.language_code,
        assemblyId: transcript.id,
        projectId: markPrivate ? null : (projectId || null),
        userId: user?.id || null,
        isPrivate: markPrivate,
      },
    })

    // Delete audio blob — no longer needed after transcription
    try {
      await del(audioUrl)
      console.log('Blob deleted:', audioUrl)
    } catch (blobError) {
      console.error('Failed to delete blob (non-critical):', blobError)
    }

    return NextResponse.json({
      id: savedTranscript.id,
      assemblyId: transcript.id,
      status: 'completed',
      filename,
      title: savedTranscript.title,
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
