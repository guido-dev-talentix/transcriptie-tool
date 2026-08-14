import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authGate = await requireUser()
    if (authGate instanceof NextResponse) return authGate

    const { id } = await params

    await prisma.savedDestination.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete saved destination:', error)
    return NextResponse.json(
      { error: 'Failed to delete saved destination' },
      { status: 500 }
    )
  }
}
