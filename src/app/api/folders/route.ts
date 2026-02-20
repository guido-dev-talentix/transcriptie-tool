import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/folders - List current user's folders with project counts
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Kon mappen niet ophalen' },
      { status: 500 }
    )
  }
}

// POST /api/folders - Create a folder
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Mapnaam is verplicht' },
        { status: 400 }
      )
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        userId: user.id,
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Kon map niet aanmaken' },
      { status: 500 }
    )
  }
}
