import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Vercel Cron of externe cron service pingt dit endpoint
// om de Neon database wakker te houden en auto-suspend te voorkomen.
export async function GET(request: NextRequest) {
  // Optionele beveiliging: controleer CRON_SECRET header
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const start = Date.now()
    const result = await prisma.$queryRaw<[{ test: number }]>`SELECT 1 as test`
    const latency = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[keep-alive] Database ping failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
