import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects - List folders and root projects in structured format
// When ?status=active is passed, returns a flat array for backward compatibility
export async function GET(request: NextRequest) {
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

    // Check if caller wants a flat list (backward compat for UploadForm/TranscriptView)
    const statusFilter = request.nextUrl.searchParams.get('status')

    if (statusFilter) {
      // Flat array format: return all projects matching status
      const projects = await prisma.project.findMany({
        where: {
          ...roleFilter,
          status: statusFilter,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
      })
      return NextResponse.json(projects)
    }

    // Structured format: folders + root projects
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    // Ensure user exists in Prisma DB
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })
    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      })
    }
    if (!dbUser && user.email) {
      const isSearchX = user.email.endsWith('@searchxrecruitment.com')
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          role: 'USER',
          approved: isSearchX,
        },
      })
    }
    if (!dbUser) {
      return NextResponse.json(
        { error: 'Gebruiker niet gevonden' },
        { status: 401 }
      )
    }

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
        users: {
          create: {
            userId: dbUser.id,
            role: 'OWNER',
          },
        },
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
