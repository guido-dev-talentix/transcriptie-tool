import { NextRequest, NextResponse } from 'next/server'
import { notifyN8N, Destination } from '@/lib/webhook'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data.transcriptId || !data.filename) {
      return NextResponse.json(
        { error: 'Missing required fields: transcriptId and filename' },
        { status: 400 }
      )
    }

    // Build destination object if provided
    let destination: Destination | undefined
    if (data.destinationType && data.destinationAddress) {
      if (data.destinationType !== 'slack' && data.destinationType !== 'gmail') {
        return NextResponse.json(
          { error: 'destinationType must be "slack" or "gmail"' },
          { status: 400 }
        )
      }
      destination = {
        type: data.destinationType,
        address: data.destinationAddress,
      }
    }

    await notifyN8N({
      transcriptId: data.transcriptId,
      filename: data.filename,
      status: data.status || 'completed',
      title: data.title,
      text: data.text,
      duration: data.duration,
      destination,
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
