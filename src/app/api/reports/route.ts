import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/reports - List reports
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')

    const where: { projectId?: string; type?: string } = {}
    if (projectId) where.projectId = projectId
    if (type) where.type = type

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: { id: true, name: true },
        },
        transcript: {
          select: { id: true, title: true, filename: true },
        },
        _count: {
          select: { actionItems: true },
        },
      },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Kon verslagen niet ophalen' },
      { status: 500 }
    )
  }
}

// POST /api/reports - Create new report manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, type = 'meeting', projectId, transcriptId } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Titel is verplicht' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Inhoud is verplicht' },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is verplicht' },
        { status: 400 }
      )
    }

    const report = await prisma.report.create({
      data: {
        title: title.trim(),
        content,
        type,
        projectId,
        transcriptId: transcriptId || null,
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Kon verslag niet aanmaken' },
      { status: 500 }
    )
  }
}
