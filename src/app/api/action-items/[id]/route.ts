import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/action-items/[id] - Get single action item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const actionItem = await prisma.actionItem.findUnique({
      where: { id },
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

    if (!actionItem) {
      return NextResponse.json(
        { error: 'Actiepunt niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json(actionItem)
  } catch (error) {
    console.error('Error fetching action item:', error)
    return NextResponse.json(
      { error: 'Kon actiepunt niet ophalen' },
      { status: 500 }
    )
  }
}

// PATCH /api/action-items/[id] - Update action item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, status, priority, assignee, dueDate } = body

    const updateData: {
      title?: string
      description?: string | null
      status?: string
      priority?: string
      assignee?: string | null
      dueDate?: Date | null
      completedAt?: Date | null
    } = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Titel mag niet leeg zijn' },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (status !== undefined) {
      if (!['open', 'in_progress', 'done'].includes(status)) {
        return NextResponse.json(
          { error: 'Ongeldige status' },
          { status: 400 }
        )
      }
      updateData.status = status
      // Set completedAt when marking as done
      if (status === 'done') {
        updateData.completedAt = new Date()
      } else {
        updateData.completedAt = null
      }
    }

    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) {
        return NextResponse.json(
          { error: 'Ongeldige prioriteit' },
          { status: 400 }
        )
      }
      updateData.priority = priority
    }

    if (assignee !== undefined) {
      updateData.assignee = assignee?.trim() || null
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }

    const actionItem = await prisma.actionItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(actionItem)
  } catch (error) {
    console.error('Error updating action item:', error)
    return NextResponse.json(
      { error: 'Kon actiepunt niet bijwerken' },
      { status: 500 }
    )
  }
}

// DELETE /api/action-items/[id] - Delete action item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.actionItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting action item:', error)
    return NextResponse.json(
      { error: 'Kon actiepunt niet verwijderen' },
      { status: 500 }
    )
  }
}
