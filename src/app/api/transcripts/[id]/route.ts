import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTranscriptionStatus, getSubtitles } from '@/lib/assemblyai'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const transcript = await prisma.transcript.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    })

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    // If still processing, check AssemblyAI status
    if (transcript.status === 'processing' && transcript.assemblyId) {
      const result = await getTranscriptionStatus(transcript.assemblyId)

      if (result.status === 'completed') {
        // Get SRT subtitles
        let srt: string | undefined
        try {
          srt = await getSubtitles(transcript.assemblyId, 'srt')
        } catch (e) {
          console.error('Failed to get subtitles:', e)
        }

        // Update database
        const updated = await prisma.transcript.update({
          where: { id: transcript.id },
          data: {
            status: 'completed',
            text: result.text,
            srt,
            duration: result.audio_duration ? Math.round(result.audio_duration) : null,
            language: result.language_code,
          },
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        })

        return NextResponse.json(updated)
      } else if (result.status === 'error') {
        const updated = await prisma.transcript.update({
          where: { id: transcript.id },
          data: {
            status: 'error',
            error: result.error || 'Unknown error',
          },
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        })

        return NextResponse.json(updated)
      }
    }

    return NextResponse.json(transcript)
  } catch (error) {
    console.error('Failed to fetch transcript:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { title, projectId } = body
    const { id } = await params

    const updateData: { title?: string; projectId?: string | null } = {}

    if (title !== undefined) {
      updateData.title = title
    }

    if (projectId !== undefined) {
      updateData.projectId = projectId || null
    }

    const updated = await prisma.transcript.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update transcript:', error)
    return NextResponse.json(
      { error: 'Failed to update transcript' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.transcript.delete({
      where: { id },
    })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Failed to delete transcript:', error)
    return NextResponse.json(
      { error: 'Failed to delete transcript' },
      { status: 500 }
    )
  }
}
