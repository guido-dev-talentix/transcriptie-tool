import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// PATCH /api/folders/[id] - Rename a folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const folder = await prisma.folder.findUnique({
      where: { id },
    })

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json(
        { error: 'Map niet gevonden' },
        { status: 404 }
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

    const updated = await prisma.folder.update({
      where: { id },
      data: { name: name.trim() },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error renaming folder:', error)
    return NextResponse.json(
      { error: 'Kon map niet hernoemen' },
      { status: 500 }
    )
  }
}

// DELETE /api/folders/[id] - Delete a folder (projects move to root via onDelete: SetNull)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Niet geautoriseerd' },
        { status: 401 }
      )
    }

    const folder = await prisma.folder.findUnique({
      where: { id },
    })

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json(
        { error: 'Map niet gevonden' },
        { status: 404 }
      )
    }

    await prisma.folder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Kon map niet verwijderen' },
      { status: 500 }
    )
  }
}
