import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unlinked = searchParams.get('unlinked') === 'true'

    const transcripts = await prisma.transcript.findMany({
      where: unlinked ? { projectId: null, status: 'completed' } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        title: true,
        duration: true,
        status: true,
        language: true,
        createdAt: true,
        projectId: true,
      },
    })

    return NextResponse.json(transcripts)
  } catch (error) {
    console.error('Failed to fetch transcripts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
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
