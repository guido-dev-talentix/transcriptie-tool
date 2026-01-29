import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'txt'
    const { id } = await params

    const transcript = await prisma.transcript.findUnique({
      where: { id },
    })

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    if (transcript.status !== 'completed') {
      return NextResponse.json(
        { error: 'Transcript not yet completed' },
        { status: 400 }
      )
    }

    const baseFilename = transcript.filename.replace(/\.[^/.]+$/, '')

    if (format === 'srt') {
      if (!transcript.srt) {
        return NextResponse.json(
          { error: 'SRT not available' },
          { status: 404 }
        )
      }

      return new NextResponse(transcript.srt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseFilename}.srt"`,
        },
      })
    }

    // Default: txt format
    if (!transcript.text) {
      return NextResponse.json(
        { error: 'Transcript text not available' },
        { status: 404 }
      )
    }

    return new NextResponse(transcript.text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseFilename}.txt"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}
