import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { checkProjectAccess, requireUser } from '@/lib/auth'
import { uploadAndSubmit } from '@/lib/assemblyai'
import {
  chunksAsStream,
  cleanupStaleUploads,
  hasAllowedAudioExtension,
  isValidUploadId,
  MAX_CHUNKS,
  MAX_UPLOAD_BYTES,
  removeUpload,
  verifyChunks,
} from '@/lib/uploads'

interface CompleteBody {
  uploadId?: string
  totalChunks?: number
  size?: number
  filename?: string
  title?: string
  projectId?: string
  isPrivate?: boolean
}

function webhookUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_BASE_URL
  // AssemblyAI kan alleen publieke https-adressen aanroepen; lokaal (http://localhost)
  // vangt de polling-fallback in GET /api/transcripts/[id] het resultaat op.
  if (!base || !base.startsWith('https://')) return undefined
  return `${base.replace(/\/$/, '')}/api/webhook`
}

// POST /api/upload/complete
// Alle stukken zijn binnen: stuur ze als één stream naar AssemblyAI, start de
// transcriptie en geef het transcript-id terug. De tekst volgt asynchroon via
// de webhook of via polling op /api/transcripts/[id].
export async function POST(request: NextRequest) {
  const authGate = await requireUser()
  if (authGate instanceof NextResponse) return authGate
  const user = authGate

  let body: CompleteBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  const { uploadId, totalChunks, size, filename, title, projectId } = body
  const isPrivate = Boolean(body.isPrivate)

  if (!isValidUploadId(uploadId ?? null)) {
    return NextResponse.json({ error: 'Ongeldig uploadId' }, { status: 400 })
  }
  if (!Number.isInteger(totalChunks) || totalChunks! < 1 || totalChunks! > MAX_CHUNKS) {
    return NextResponse.json({ error: 'Ongeldig aantal chunks' }, { status: 400 })
  }
  if (!filename || !hasAllowedAudioExtension(filename)) {
    return NextResponse.json(
      { error: 'Bestandstype wordt niet ondersteund. Gebruik .mp3, .wav, .m4a of .mp4' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(size) || size! <= 0 || size! > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Bestand is te groot (maximaal ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)` },
      { status: 413 }
    )
  }

  // Privé-transcripties horen niet in (gedeelde) projecten
  const targetProjectId = isPrivate ? null : projectId || null
  if (targetProjectId) {
    const access = await checkProjectAccess(targetProjectId)
    if (access instanceof NextResponse) return access
  }

  const check = await verifyChunks(user.id, uploadId!, totalChunks!)
  if (!check.ok) {
    return NextResponse.json(
      { error: 'Niet alle stukken zijn ontvangen', missing: check.missing },
      { status: 400 }
    )
  }
  if (check.size !== size) {
    await removeUpload(user.id, uploadId!)
    return NextResponse.json(
      { error: 'Ontvangen grootte komt niet overeen met het bestand — probeer opnieuw' },
      { status: 400 }
    )
  }

  // userId volgt de bestaande conventie: het Supabase auth-id
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const transcript = await prisma.transcript.create({
    data: {
      filename,
      title: title?.trim() || null,
      status: 'processing',
      projectId: targetProjectId,
      userId: authUser?.id || user.id,
      isPrivate,
    },
  })

  try {
    const { assemblyId } = await uploadAndSubmit(chunksAsStream(user.id, uploadId!, totalChunks!), {
      webhookUrl: webhookUrl(),
    })

    await prisma.transcript.update({
      where: { id: transcript.id },
      data: { assemblyId },
    })

    return NextResponse.json({
      id: transcript.id,
      assemblyId,
      status: 'processing',
      filename,
      title: transcript.title,
    })
  } catch (error) {
    console.error('Transcriptie starten mislukt:', error)
    await prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Transcriptie starten mislukt',
      },
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcriptie starten mislukt' },
      { status: 500 }
    )
  } finally {
    await removeUpload(user.id, uploadId!)
    void cleanupStaleUploads()
  }
}
