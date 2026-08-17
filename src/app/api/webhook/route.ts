import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncTranscriptWithAssemblyAI, WEBHOOK_HEADER_NAME } from '@/lib/assemblyai'
import { notifyN8N } from '@/lib/webhook'

// POST /api/webhook — aangeroepen door AssemblyAI zodra een transcriptie klaar is
export async function POST(request: NextRequest) {
  try {
    // Fail-closed: zonder geconfigureerd geheim accepteren we geen webhooks
    // (de polling-fallback in GET /api/transcripts/[id] werkt dan nog steeds)
    const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET
    if (!secret || request.headers.get(WEBHOOK_HEADER_NAME) !== secret) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const body = await request.json()
    const { transcript_id, status } = body

    console.log('Webhook received:', { transcript_id, status })

    if (!transcript_id) {
      return NextResponse.json({ error: 'Missing transcript_id' }, { status: 400 })
    }

    const transcript = await prisma.transcript.findFirst({
      where: { assemblyId: transcript_id },
      select: { id: true, assemblyId: true, filename: true, status: true },
    })

    if (!transcript || !transcript.assemblyId) {
      console.error('Transcript not found for assemblyId:', transcript_id)
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    // Al verwerkt (bijv. via polling) — niets meer te doen
    if (transcript.status === 'completed') {
      return NextResponse.json({ received: true })
    }

    // Status en tekst altijd rechtstreeks bij AssemblyAI ophalen, niet uit de
    // webhook-body vertrouwen
    const updated = await syncTranscriptWithAssemblyAI({
      id: transcript.id,
      assemblyId: transcript.assemblyId,
    })

    if (updated?.status === 'completed') {
      await notifyN8N({
        transcriptId: updated.id,
        filename: updated.filename,
        status: 'completed',
        text: updated.text ?? undefined,
        duration: updated.duration ?? undefined,
      })
    } else if (updated?.status === 'error') {
      await notifyN8N({
        transcriptId: updated.id,
        filename: updated.filename,
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
