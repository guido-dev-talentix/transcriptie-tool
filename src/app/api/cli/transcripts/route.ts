import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireToken } from '@/lib/auth'

// GET /api/cli/transcripts - Lijst voor de CLI (Bearer-token in plaats van sessie)
//   ?zoek=term   zoekt in titel, bestandsnaam en transcripttekst
//   ?limit=20    aantal resultaten (max 100)
export async function GET(request: NextRequest) {
  const user = await requireToken(request)
  if (user instanceof NextResponse) return user

  const { searchParams } = new URL(request.url)
  const zoek = searchParams.get('zoek')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)

  // Privé-transcripties van anderen blijven onzichtbaar, net als in de web-app
  const privacyFilter = {
    OR: [{ isPrivate: false }, { userId: user.id }],
  }

  const transcripts = await prisma.transcript.findMany({
    where: {
      AND: [
        privacyFilter,
        ...(zoek
          ? [{
              OR: [
                { title: { contains: zoek, mode: 'insensitive' as const } },
                { filename: { contains: zoek, mode: 'insensitive' as const } },
                { text: { contains: zoek, mode: 'insensitive' as const } },
              ],
            }]
          : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      filename: true,
      duration: true,
      status: true,
      createdAt: true,
      isPrivate: true,
      project: { select: { name: true } },
    },
  })

  return NextResponse.json(transcripts)
}
