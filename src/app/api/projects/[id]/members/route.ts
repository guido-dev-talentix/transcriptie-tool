import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/projects/[id]/members - List project members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const { id } = await params

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project niet gevonden' }, { status: 404 })
    }

    const members = await prisma.userProject.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Kon leden niet ophalen' }, { status: 500 })
  }
}

// POST /api/projects/[id]/members - Add member to project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const { id } = await params
    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is verplicht' }, { status: 400 })
    }

    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project niet gevonden' }, { status: 404 })
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })
    }

    // Check if already a member
    const existing = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId: id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Gebruiker is al lid van dit project' }, { status: 409 })
    }

    const member = await prisma.userProject.create({
      data: {
        userId,
        projectId: id,
        role: role || 'MEMBER',
      },
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

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Error adding member:', error)
    return NextResponse.json({ error: 'Kon lid niet toevoegen' }, { status: 500 })
  }
}
