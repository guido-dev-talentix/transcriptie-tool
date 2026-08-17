import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { isValidUploadId, MAX_CHUNK_BYTES, MAX_CHUNKS, writeChunk } from '@/lib/uploads'

// PUT /api/upload/chunk?uploadId=…&index=…
// Ontvangt één stuk van een audiobestand (ruwe bytes in de body) en zet het
// tijdelijk op schijf. Herhaalbaar: hetzelfde stuk nogmaals sturen overschrijft.
export async function PUT(request: NextRequest) {
  const authGate = await requireUser()
  if (authGate instanceof NextResponse) return authGate
  const user = authGate

  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')
  const index = Number(searchParams.get('index'))

  if (!isValidUploadId(uploadId)) {
    return NextResponse.json({ error: 'Ongeldig uploadId' }, { status: 400 })
  }
  if (!Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS) {
    return NextResponse.json({ error: 'Ongeldige chunk-index' }, { status: 400 })
  }

  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > MAX_CHUNK_BYTES) {
    return NextResponse.json({ error: 'Chunk te groot' }, { status: 413 })
  }

  try {
    const data = new Uint8Array(await request.arrayBuffer())
    if (data.byteLength === 0) {
      return NextResponse.json({ error: 'Lege chunk' }, { status: 400 })
    }
    if (data.byteLength > MAX_CHUNK_BYTES) {
      return NextResponse.json({ error: 'Chunk te groot' }, { status: 413 })
    }

    await writeChunk(user.id, uploadId, index, data)
    return NextResponse.json({ received: data.byteLength })
  } catch (error) {
    console.error('Chunk upload error:', error)
    return NextResponse.json({ error: 'Chunk opslaan mislukt' }, { status: 500 })
  }
}
