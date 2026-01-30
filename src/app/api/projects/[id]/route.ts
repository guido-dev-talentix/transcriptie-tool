import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/projects/[id] - Get single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        actionItems: {
          where: { status: { not: 'done' } },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: 20,
        },
        _count: {
          select: {
            transcripts: true,
            reports: true,
            actionItems: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Kon project niet ophalen' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, status } = body

    const updateData: { name?: string; description?: string; status?: string } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Projectnaam mag niet leeg zijn' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (status !== undefined) {
      if (!['active', 'completed', 'archived'].includes(status)) {
        return NextResponse.json(
          { error: 'Ongeldige status' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Kon project niet bijwerken' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.project.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Kon project niet verwijderen' },
      { status: 500 }
    )
  }
}
