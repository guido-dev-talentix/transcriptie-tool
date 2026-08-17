import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import {
  ChunkTooLargeError,
  cleanupStaleUploads,
  isValidUploadId,
  MAX_CHUNK_BYTES,
  MAX_CHUNKS,
  writeChunkFromStream,
} from '@/lib/uploads'

// PUT /api/upload/chunk?uploadId=…&index=…
// Ontvangt één stuk van een audiobestand (ruwe bytes in de body) en streamt
// het naar schijf. Herhaalbaar: hetzelfde stuk nogmaals sturen overschrijft.
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
  if (!request.body) {
    return NextResponse.json({ error: 'Lege chunk' }, { status: 400 })
  }

  // Bij het eerste stuk van een nieuwe upload: oude, achtergebleven uploads opruimen
  if (index === 0) void cleanupStaleUploads()

  try {
    const received = await writeChunkFromStream(user.id, uploadId, index, request.body, MAX_CHUNK_BYTES)
    if (received === 0) {
      return NextResponse.json({ error: 'Lege chunk' }, { status: 400 })
    }
    return NextResponse.json({ received })
  } catch (error) {
    if (error instanceof ChunkTooLargeError) {
      return NextResponse.json({ error: 'Chunk te groot' }, { status: 413 })
    }
    console.error('Chunk upload error:', error)
    return NextResponse.json({ error: 'Chunk opslaan mislukt' }, { status: 500 })
  }
}
