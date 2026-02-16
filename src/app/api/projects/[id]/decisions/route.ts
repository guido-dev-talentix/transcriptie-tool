import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sortDecisions } from '@/lib/sorting'
import { checkProjectAccess } from '@/lib/auth'

// GET /api/projects/[id]/decisions - List decisions for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const access = await checkProjectAccess(id)
    if (access instanceof NextResponse) return access

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

    const decisions = await prisma.decision.findMany({
      where: { projectId: id },
      include: {
        transcript: {
          select: { id: true, title: true, filename: true },
        },
      },
    })

    // Sort decisions: active first, then by createdAt desc
    const sortedDecisions = sortDecisions(decisions)

    return NextResponse.json(sortedDecisions)
  } catch (error) {
    console.error('Error fetching project decisions:', error)
    return NextResponse.json(
      { error: 'Kon besluiten niet ophalen' },
      { status: 500 }
    )
  }
}
