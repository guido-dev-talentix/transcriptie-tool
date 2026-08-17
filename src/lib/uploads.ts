import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { CHUNK_SIZE, DEFAULT_MAX_UPLOAD_BYTES } from '@/lib/upload-constants'

export { CHUNK_SIZE, MAX_CHUNK_BYTES, ALLOWED_AUDIO_EXTENSIONS, hasAllowedAudioExtension } from '@/lib/upload-constants'

/**
 * Tijdelijke opslag voor uploads in stukken (chunks).
 *
 * De browser stuurt een bestand in stukken van CHUNK_SIZE naar
 * /api/upload/chunk; elk stuk wordt als los bestand weggeschreven onder
 * <UPLOAD_TMP_DIR>/<userId>/<uploadId>/<index>. Bij /api/upload/complete worden
 * de stukken als één stream naar AssemblyAI gestuurd en daarna verwijderd.
 *
 * Waarom chunks en niet één grote request: Node kapt requests standaard na
 * 300 s af (server.requestTimeout) en een haperende verbinding zou anders het
 * hele bestand opnieuw moeten sturen. Nu is elke request klein en herhaalbaar.
 */

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES
export const MAX_CHUNKS = Math.ceil(MAX_UPLOAD_BYTES / CHUNK_SIZE)

const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000

const UPLOAD_ID_RE = /^[a-f0-9-]{16,64}$/i
const USER_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

function baseDir(): string {
  return process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'transcriptie-uploads')
}

export function isValidUploadId(id: string | null): id is string {
  return !!id && UPLOAD_ID_RE.test(id)
}

function uploadDir(userId: string, uploadId: string): string {
  if (!USER_ID_RE.test(userId) || !isValidUploadId(uploadId)) {
    throw new Error('Ongeldige upload-identificatie')
  }
  return join(baseDir(), userId, uploadId)
}

export class ChunkTooLargeError extends Error {
  constructor() {
    super('Chunk te groot')
  }
}

/**
 * Schrijft een binnenkomend stuk streamend naar schijf (geen buffer van 16 MB in
 * het geheugen). Boven maxBytes wordt de stream afgebroken en het deelbestand
 * verwijderd. Geeft het aantal geschreven bytes terug.
 */
export async function writeChunkFromStream(
  userId: string,
  uploadId: string,
  index: number,
  body: ReadableStream<Uint8Array>,
  maxBytes: number
): Promise<number> {
  const dir = uploadDir(userId, uploadId)
  await mkdir(dir, { recursive: true })
  const path = join(dir, String(index))

  let written = 0
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, callback) {
      written += chunk.length
      if (written > maxBytes) {
        callback(new ChunkTooLargeError())
        return
      }
      callback(null, chunk)
    },
  })

  try {
    await pipeline(Readable.fromWeb(body as import('node:stream/web').ReadableStream), limiter, createWriteStream(path))
  } catch (e) {
    await rm(path, { force: true }).catch(() => {})
    throw e
  }
  return written
}

/**
 * Controleert of alle stukken binnen zijn en geeft de totale grootte terug.
 */
export async function verifyChunks(
  userId: string,
  uploadId: string,
  totalChunks: number
): Promise<{ ok: true; size: number } | { ok: false; missing: number[] }> {
  const dir = uploadDir(userId, uploadId)
  const missing: number[] = []
  let size = 0

  for (let i = 0; i < totalChunks; i++) {
    try {
      const info = await stat(join(dir, String(i)))
      size += info.size
    } catch {
      missing.push(i)
    }
  }

  return missing.length ? { ok: false, missing } : { ok: true, size }
}

/**
 * Eén doorlopende leesstream over alle stukken, in volgorde — zonder ze eerst
 * aan elkaar te plakken op schijf of in het geheugen te laden.
 */
export function chunksAsStream(userId: string, uploadId: string, totalChunks: number): Readable {
  const dir = uploadDir(userId, uploadId)

  return Readable.from(
    (async function* () {
      for (let i = 0; i < totalChunks; i++) {
        yield* createReadStream(join(dir, String(i)))
      }
    })()
  )
}

export async function removeUpload(userId: string, uploadId: string): Promise<void> {
  try {
    await rm(uploadDir(userId, uploadId), { recursive: true, force: true })
  } catch (e) {
    console.error('Kon tijdelijke upload niet verwijderen:', e)
  }
}

/**
 * Ruimt achtergebleven uploads (afgebroken browsersessies) ouder dan een dag op.
 * Best effort; wordt aangeroepen bij de start van elke nieuwe upload en bij
 * elke voltooide upload.
 */
export async function cleanupStaleUploads(): Promise<void> {
  const root = baseDir()
  let users: string[]
  try {
    users = await readdir(root)
  } catch {
    return
  }

  const cutoff = Date.now() - STALE_UPLOAD_MS
  for (const user of users) {
    const userPath = join(root, user)
    let uploads: string[] = []
    try {
      uploads = await readdir(userPath)
    } catch {
      continue
    }
    for (const upload of uploads) {
      const path = join(userPath, upload)
      try {
        const info = await stat(path)
        if (info.mtimeMs < cutoff) {
          await rm(path, { recursive: true, force: true })
        }
      } catch {
        /* negeren */
      }
    }
  }
}
