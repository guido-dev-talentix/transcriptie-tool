import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/projects/[id]/action-items - List action items for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project niet gevonden' },
        { status: 404 }
      )
    }

    const actionItems = await prisma.actionItem.findMany({
      where: { projectId: id },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        transcript: {
          select: { id: true, title: true, filename: true },
        },
        report: {
          select: { id: true, title: true },
        },
      },
    })

    return NextResponse.json(actionItems)
  } catch (error) {
    console.error('Error fetching project action items:', error)
    return NextResponse.json(
      { error: 'Kon actiepunten niet ophalen' },
      { status: 500 }
    )
  }
}
