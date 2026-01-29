import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    // Get upload URL from AssemblyAI
    const uploadUrl = await client.files.createUploadUrl()

    return NextResponse.json({ uploadUrl })
  } catch (error) {
    console.error('Failed to get upload URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get upload URL' },
      { status: 500 }
    )
  }
}
