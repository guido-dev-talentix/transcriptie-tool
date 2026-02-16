import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sortDecisions } from '@/lib/sorting'

// GET /api/decisions - List decisions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const transcriptId = searchParams.get('transcriptId')
    const status = searchParams.get('status')

    const where: { projectId?: string; transcriptId?: string; status?: string } = {}
    if (projectId) where.projectId = projectId
    if (transcriptId) where.transcriptId = transcriptId
    if (status) where.status = status

    const decisions = await prisma.decision.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        transcript: {
          select: { id: true, title: true, filename: true },
        },
      },
    })

    // Sort decisions: active first, then by createdAt desc
    const sortedDecisions = sortDecisions(decisions)

    return NextResponse.json(sortedDecisions)
  } catch (error) {
    console.error('Error fetching decisions:', error)
    return NextResponse.json(
      { error: 'Kon besluiten niet ophalen' },
      { status: 500 }
    )
  }
}

// POST /api/decisions - Create decision manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      context,
      madeBy,
      projectId,
      transcriptId,
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

    const decision = await prisma.decision.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        context: context?.trim() || null,
        madeBy: madeBy?.trim() || null,
        sourceType: 'manual',
        projectId,
        transcriptId: transcriptId || null,
      },
    })

    return NextResponse.json(decision, { status: 201 })
  } catch (error) {
    console.error('Error creating decision:', error)
    return NextResponse.json(
      { error: 'Kon besluit niet aanmaken' },
      { status: 500 }
    )
  }
}
