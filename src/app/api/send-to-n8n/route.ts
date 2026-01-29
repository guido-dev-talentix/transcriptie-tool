import { NextRequest, NextResponse } from 'next/server'
import { notifyN8N } from '@/lib/webhook'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data.transcriptId || !data.filename) {
      return NextResponse.json(
        { error: 'Missing required fields: transcriptId and filename' },
        { status: 400 }
      )
    }

    await notifyN8N({
      transcriptId: data.transcriptId,
      filename: data.filename,
      status: data.status || 'completed',
      text: data.text,
      duration: data.duration,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send to N8N error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send to N8N' },
      { status: 500 }
    )
  }
}
