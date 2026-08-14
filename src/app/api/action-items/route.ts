import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sortActionItems } from '@/lib/sorting'
import { requireUser } from '@/lib/auth'

// GET /api/action-items - List action items
export async function GET(request: NextRequest) {
  try {
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const transcriptId = searchParams.get('transcriptId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const where: { projectId?: string; transcriptId?: string; status?: string; priority?: string } = {}
    if (projectId) where.projectId = projectId
    if (transcriptId) where.transcriptId = transcriptId
    if (status) where.status = status
    if (priority) where.priority = priority

    const actionItems = await prisma.actionItem.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        transcript: {
          select: { id: true, title: true, filename: true },
        },
        report: {
          select: { id: true, title: true },
        },
      },
    })

    // Sort with custom priority order: high → medium → low
    const sortedItems = sortActionItems(actionItems)

    return NextResponse.json(sortedItems)
  } catch (error) {
    console.error('Error fetching action items:', error)
    return NextResponse.json(
      { error: 'Kon actiepunten niet ophalen' },
      { status: 500 }
    )
  }
}

// POST /api/action-items - Create action item manually
export async function POST(request: NextRequest) {
  try {
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

    const body = await request.json()
    const {
      title,
      description,
      priority = 'medium',
      assignee,
      dueDate,
      projectId,
      transcriptId,
      reportId,
    } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Titel is verplicht' },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is verplicht' },
        { status: 400 }
      )
    }

    if (!['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Ongeldige prioriteit' },
        { status: 400 }
      )
    }

    const actionItem = await prisma.actionItem.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority,
        assignee: assignee?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sourceType: 'manual',
        projectId,
        transcriptId: transcriptId || null,
        reportId: reportId || null,
      },
    })

    return NextResponse.json(actionItem, { status: 201 })
  } catch (error) {
    console.error('Error creating action item:', error)
    return NextResponse.json(
      { error: 'Kon actiepunt niet aanmaken' },
      { status: 500 }
    )
  }
}
