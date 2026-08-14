import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser, generateToken, hashToken } from '@/lib/auth'

// GET /api/tokens - CLI-tokens van de ingelogde gebruiker (nooit het token zelf)
export async function GET() {
  const authGate = await requireUser()
  if (authGate instanceof NextResponse) return authGate

  const tokens = await prisma.apiToken.findMany({
    where: { userId: authGate.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
  })

  return NextResponse.json(tokens)
}

// POST /api/tokens - Nieuw CLI-token; het token is hierna niet meer op te vragen
export async function POST(request: NextRequest) {
  const authGate = await requireUser()
  if (authGate instanceof NextResponse) return authGate

  let name = 'CLI-token'
  try {
    const body = await request.json()
    if (typeof body?.name === 'string' && body.name.trim()) {
      name = body.name.trim().slice(0, 60)
    }
  } catch {
    // geen body meegegeven — standaardnaam gebruiken
  }

  const token = generateToken()

  const created = await prisma.apiToken.create({
    data: { name, tokenHash: hashToken(token), userId: authGate.id },
    select: { id: true, name: true, createdAt: true },
  })

  return NextResponse.json({ ...created, token }, { status: 201 })
}
