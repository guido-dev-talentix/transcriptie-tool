import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/projects/[id]/members/[userId] - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const { id, userId } = await params
    const body = await request.json()
    const { role } = body

    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 })
    }

    const existing = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId: id } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lid niet gevonden' }, { status: 404 })
    }

    const updated = await prisma.userProject.update({
      where: { userId_projectId: { userId, projectId: id } },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Kon lid niet bijwerken' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/members/[userId] - Remove member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const { id, userId } = await params

    const existing = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId: id } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lid niet gevonden' }, { status: 404 })
    }

    await prisma.userProject.delete({
      where: { userId_projectId: { userId, projectId: id } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json({ error: 'Kon lid niet verwijderen' }, { status: 500 })
  }
}
