// Gedeeld tussen browser (UploadForm) en server (uploads.ts, upload-routes).
// Géén node-imports hier: dit bestand wordt ook in de client-bundle gebruikt.

export const CHUNK_SIZE = 16 * 1024 * 1024 // 16 MB per request
export const MAX_CHUNK_BYTES = 32 * 1024 * 1024 // harde bovengrens per request
export const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB

export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4']

export function hasAllowedAudioExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ALLOWED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}
