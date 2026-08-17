import { NextResponse } from 'next/server'

// Publiek, zonder data: de deploy-pipeline vergelijkt dit met de laatste commit op main
export async function GET() {
  return NextResponse.json({
    sha: process.env.GIT_SHA || 'unknown',
    builtAt: process.env.BUILT_AT || 'unknown',
  })
}
