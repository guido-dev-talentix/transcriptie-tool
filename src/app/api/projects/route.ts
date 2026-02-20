import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects - List folders and root projects in structured format
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true },
      })
    }

    const isAdmin = dbUser?.role === 'ADMIN'
    const roleFilter = isAdmin ? {} : { users: { some: { userId: user.id } } }

    const [folders, projects] = await Promise.all([
      prisma.folder.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
        include: {
          projects: {
            where: roleFilter,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              name: true,
              status: true,
              updatedAt: true,
            },
          },
          _count: {
            select: { projects: true },
          },
        },
      }),
      prisma.project.findMany({
        where: {
          ...roleFilter,
          folderId: null,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
      }),
    ])

    return NextResponse.json({ folders, projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Kon projecten niet ophalen' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, folderId } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Projectnaam is verplicht' },
        { status: 400 }
      )
    }

    // Validate folder exists if folderId provided
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      })
      if (!folder) {
        return NextResponse.json(
          { error: 'Map niet gevonden' },
          { status: 404 }
        )
      }
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        folderId: folderId || null,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Kon project niet aanmaken' },
      { status: 500 }
    )
  }
}
