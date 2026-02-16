import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/decisions/[id] - Get single decision
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const decision = await prisma.decision.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        transcript: {
          select: { id: true, title: true, filename: true },
        },
      },
    })

    if (!decision) {
      return NextResponse.json(
        { error: 'Besluit niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json(decision)
  } catch (error) {
    console.error('Error fetching decision:', error)
    return NextResponse.json(
      { error: 'Kon besluit niet ophalen' },
      { status: 500 }
    )
  }
}

// PATCH /api/decisions/[id] - Update decision
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, context, status, madeBy } = body

    const updateData: {
      title?: string
      description?: string | null
      context?: string | null
      status?: string
      madeBy?: string | null
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

    if (context !== undefined) {
      updateData.context = context?.trim() || null
    }

    if (status !== undefined) {
      if (!['active', 'superseded', 'revoked'].includes(status)) {
        return NextResponse.json(
          { error: 'Ongeldige status' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (madeBy !== undefined) {
      updateData.madeBy = madeBy?.trim() || null
    }

    const decision = await prisma.decision.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(decision)
  } catch (error) {
    console.error('Error updating decision:', error)
    return NextResponse.json(
      { error: 'Kon besluit niet bijwerken' },
      { status: 500 }
    )
  }
}

// DELETE /api/decisions/[id] - Delete decision
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.decision.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting decision:', error)
    return NextResponse.json(
      { error: 'Kon besluit niet verwijderen' },
      { status: 500 }
    )
  }
}
