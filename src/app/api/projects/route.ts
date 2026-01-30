import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const projects = await prisma.project.findMany({
      where: status ? { status } : undefined,
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
    const { name, description } = body

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
