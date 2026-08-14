import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireToken } from '@/lib/auth'

// GET /api/cli/transcripts/[id] - Eén transcriptie voor de CLI.
// De id mag een prefix zijn, zodat je in de terminal niet de hele cuid hoeft
// over te typen.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireToken(request)
  if (user instanceof NextResponse) return user

  const { id } = await params

  const privacyFilter = {
    OR: [{ isPrivate: false }, { userId: user.id }],
  }

  const matches = await prisma.transcript.findMany({
    where: { AND: [privacyFilter, { id: { startsWith: id } }] },
    take: 2,
    select: {
      id: true,
      title: true,
      filename: true,
      duration: true,
      status: true,
      createdAt: true,
      isPrivate: true,
      text: true,
      cleanedText: true,
      summary: true,
      srt: true,
      project: { select: { name: true } },
    },
  })

  if (matches.length === 0) {
    return NextResponse.json({ error: 'Transcriptie niet gevonden' }, { status: 404 })
  }
  if (matches.length > 1) {
    return NextResponse.json(
      { error: 'Meerdere transcripties matchen deze id — gebruik een langere prefix' },
      { status: 409 }
    )
  }

  return NextResponse.json(matches[0])
}
