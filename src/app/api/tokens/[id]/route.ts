import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// DELETE /api/tokens/[id] - Token intrekken (alleen je eigen tokens)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authGate = await requireUser()
  if (authGate instanceof NextResponse) return authGate

  const { id } = await params

  const token = await prisma.apiToken.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!token || token.userId !== authGate.id) {
    return NextResponse.json({ error: 'Token niet gevonden' }, { status: 404 })
  }

  await prisma.apiToken.delete({ where: { id } })

  return NextResponse.json({ deleted: true })
}
