import { createReadStream } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'

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

export const CHUNK_SIZE = 16 * 1024 * 1024 // 16 MB per request
export const MAX_CHUNK_BYTES = 32 * 1024 * 1024 // harde bovengrens per request
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 2 * 1024 * 1024 * 1024 // 2 GB
export const MAX_CHUNKS = Math.ceil(MAX_UPLOAD_BYTES / CHUNK_SIZE)

export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4']

const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000

const UPLOAD_ID_RE = /^[a-f0-9-]{16,64}$/i
const USER_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

function baseDir(): string {
  return process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'transcriptie-uploads')
}

export function isValidUploadId(id: string | null): id is string {
  return !!id && UPLOAD_ID_RE.test(id)
}

export function hasAllowedAudioExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ALLOWED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function uploadDir(userId: string, uploadId: string): string {
  if (!USER_ID_RE.test(userId) || !isValidUploadId(uploadId)) {
    throw new Error('Ongeldige upload-identificatie')
  }
  return join(baseDir(), userId, uploadId)
}

export async function writeChunk(
  userId: string,
  uploadId: string,
  index: number,
  data: Uint8Array
): Promise<void> {
  const dir = uploadDir(userId, uploadId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, String(index)), data)
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
 * Best effort; wordt aangeroepen bij elke voltooide upload.
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
