import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTranscriptionStatus, getSubtitles } from '@/lib/assemblyai'
import { notifyN8N } from '@/lib/webhook'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript_id, status } = body

    console.log('Webhook received:', { transcript_id, status })

    if (!transcript_id) {
      return NextResponse.json({ error: 'Missing transcript_id' }, { status: 400 })
    }

    // Find the transcript record
    const transcript = await prisma.transcript.findFirst({
      where: { assemblyId: transcript_id },
    })

    if (!transcript) {
      console.error('Transcript not found for assemblyId:', transcript_id)
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    if (status === 'completed') {
      // Fetch full transcription result
      const result = await getTranscriptionStatus(transcript_id)

      // Get SRT subtitles
      let srt: string | undefined
      try {
        srt = await getSubtitles(transcript_id, 'srt')
      } catch (e) {
        console.error('Failed to get subtitles:', e)
      }

      // Update database
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: {
          status: 'completed',
          text: result.text,
          srt,
          duration: result.audio_duration ? Math.round(result.audio_duration) : null,
          language: result.language_code,
        },
      })

      // Notify N8N
      await notifyN8N({
        transcriptId: transcript.id,
        filename: transcript.filename,
        status: 'completed',
        text: result.text,
        duration: result.audio_duration ? Math.round(result.audio_duration) : undefined,
      })
    } else if (status === 'error') {
      const result = await getTranscriptionStatus(transcript_id)

      await prisma.transcript.update({
        where: { id: transcript.id },
        data: {
          status: 'error',
          error: result.error || 'Unknown error',
        },
      })

      await notifyN8N({
        transcriptId: transcript.id,
        filename: transcript.filename,
        status: 'error',
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
