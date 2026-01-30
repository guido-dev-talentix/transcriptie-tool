import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/reports/[id] - Get single report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        transcript: {
          select: { id: true, title: true, filename: true, duration: true },
        },
        actionItems: {
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Verslag niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { error: 'Kon verslag niet ophalen' },
      { status: 500 }
    )
  }
}

// PATCH /api/reports/[id] - Update report
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, type, status } = body

    const updateData: { title?: string; content?: string; type?: string; status?: string } = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Titel mag niet leeg zijn' },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    }

    if (content !== undefined) {
      updateData.content = content
    }

    if (type !== undefined) {
      if (!['meeting', 'weekly', 'summary'].includes(type)) {
        return NextResponse.json(
          { error: 'Ongeldig type' },
          { status: 400 }
        )
      }
      updateData.type = type
    }

    if (status !== undefined) {
      if (!['draft', 'final'].includes(status)) {
        return NextResponse.json(
          { error: 'Ongeldige status' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json(
      { error: 'Kon verslag niet bijwerken' },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/[id] - Delete report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.report.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: 'Kon verslag niet verwijderen' },
      { status: 500 }
    )
  }
}
