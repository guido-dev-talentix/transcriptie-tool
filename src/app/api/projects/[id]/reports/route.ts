import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET /api/projects/[id]/reports - List reports for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

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

    const reports = await prisma.report.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        transcript: {
          select: { id: true, title: true, filename: true },
        },
      },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching project reports:', error)
    return NextResponse.json(
      { error: 'Kon verslagen niet ophalen' },
      { status: 500 }
    )
  }
}
