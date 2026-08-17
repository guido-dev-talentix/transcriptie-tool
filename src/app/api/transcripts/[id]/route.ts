import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncTranscriptWithAssemblyAI } from '@/lib/assemblyai'
import { getTranscriptViewer, canViewTranscript, requireUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

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

    if (transcript.isPrivate) {
      const viewer = await getTranscriptViewer()
      if (!canViewTranscript(transcript, viewer)) {
        return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
      }
    }

    // Nog bezig: status bij AssemblyAI ophalen (polling-fallback naast de webhook)
    if ((transcript.status === 'processing' || transcript.status === 'pending') && transcript.assemblyId) {
      const updated = await syncTranscriptWithAssemblyAI({
        id: transcript.id,
        assemblyId: transcript.assemblyId,
      })
      if (updated) return NextResponse.json(updated)
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
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

    const body = await request.json()
    const { title, projectId, isPrivate } = body
    const { id } = await params

    const existing = await prisma.transcript.findUnique({
      where: { id },
      select: { isPrivate: true, userId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    const viewer = await getTranscriptViewer()
    if (!canViewTranscript(existing, viewer)) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    const isOwner =
      !!viewer && !!existing.userId &&
      (existing.userId === viewer.authId || existing.userId === viewer.dbId)

    const updateData: { title?: string; projectId?: string | null; isPrivate?: boolean } = {}

    if (title !== undefined) {
      updateData.title = title
    }

    if (projectId !== undefined) {
      updateData.projectId = projectId || null
    }

    if (isPrivate !== undefined) {
      // Alleen de eigenaar mag de privé-status wijzigen
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Alleen de eigenaar kan de privé-status wijzigen' },
          { status: 403 }
        )
      }
      updateData.isPrivate = Boolean(isPrivate)
      // Privé-transcripties horen niet in (gedeelde) projecten
      if (updateData.isPrivate) {
        updateData.projectId = null
      }
    }

    // Blokkeer projectkoppeling zolang de transcriptie privé is/blijft
    const staysPrivate = updateData.isPrivate ?? existing.isPrivate
    if (staysPrivate && updateData.projectId) {
      return NextResponse.json(
        { error: 'Een privé-transcriptie kan niet aan een project gekoppeld worden' },
        { status: 400 }
      )
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
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

    const { id } = await params

    const existing = await prisma.transcript.findUnique({
      where: { id },
      select: { isPrivate: true, userId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }
    if (existing.isPrivate) {
      const viewer = await getTranscriptViewer()
      if (!canViewTranscript(existing, viewer)) {
        return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
      }
    }

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
