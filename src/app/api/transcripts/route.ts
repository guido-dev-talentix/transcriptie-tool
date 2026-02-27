import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    })
    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true },
      })
    }

    const isAdmin = dbUser?.role === 'ADMIN'

    const { searchParams } = new URL(request.url)
    const unlinked = searchParams.get('unlinked') === 'true'

    // Build filter: admins see all, regular users only see transcripts from their projects
    const accessFilter = isAdmin
      ? {}
      : { project: { users: { some: { userId: user.id } } } }

    const transcripts = await prisma.transcript.findMany({
      where: unlinked
        ? { projectId: null, status: 'completed' }
        : { projectId: { not: null }, ...accessFilter },
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
        aiStatus: true,
        project: {
          select: { id: true, name: true },
        },
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    // Verify user has access to the transcript's project
    const transcript = await prisma.transcript.findUnique({
      where: { id },
      select: { projectId: true },
    })

    if (!transcript) {
      return NextResponse.json({ error: 'Transcriptie niet gevonden' }, { status: 404 })
    }

    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true },
      })
    }

    const isAdmin = dbUser?.role === 'ADMIN'

    if (!isAdmin && transcript.projectId) {
      const membership = await prisma.userProject.findUnique({
        where: {
          userId_projectId: { userId: user.id, projectId: transcript.projectId },
        },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
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
