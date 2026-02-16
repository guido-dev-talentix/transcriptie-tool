import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const parentId = searchParams.get('parentId')

    // If parentId is 'null' string or not present, we assume root (null)
    // But if we want to fetch specific folder's children, we pass parentId
    // If we want ALL projects (optional), we might need a flag, but for hierarchy default is root.

    // Let's decide: if parentId param is provided, filter by it.
    // If NOT provided, filter by parentId: null (root projects).

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
      // Fallback: try matching by email (e.g. for manually created admins)
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true },
      })
    }

    const where: any = {}
    if (status) where.status = status

    if (parentId && parentId !== 'null') {
      where.parentId = parentId
    } else {
      where.parentId = null
    }

    // Role-based filtering
    if (dbUser?.role !== 'ADMIN') {
      where.users = {
        some: {
          userId: user.id
        }
      }
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            transcripts: true,
            reports: true,
            actionItems: {
              where: { status: { not: 'done' } },
            },
          },
        },
      },
    })

    return NextResponse.json(projects)
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
    const { name, description, parentId } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Projectnaam is verplicht' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
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
