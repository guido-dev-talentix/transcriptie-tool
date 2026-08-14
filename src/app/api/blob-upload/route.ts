import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireUser } from '@/lib/auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Alleen ingelogde, goedgekeurde gebruikers mogen upload-tokens krijgen.
        // (De onUploadCompleted-callback komt van Vercel zelf, zonder sessie —
        // daarom zit de check hier en niet bovenaan de handler.)
        const authGate = await requireUser()
        if (authGate instanceof NextResponse) {
          throw new Error('Niet geautoriseerd om te uploaden')
        }

        // Validate file type
        const allowedExtensions = ['.mp3', '.wav', '.m4a', '.mp4']
        const hasValidExtension = allowedExtensions.some((ext) =>
          pathname.toLowerCase().endsWith(ext)
        )

        if (!hasValidExtension) {
          throw new Error('Invalid file type. Allowed: .mp3, .wav, .m4a, .mp4')
        }

        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/mp4',
            'audio/x-m4a',
            'audio/m4a',
            'video/mp4',
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
          addRandomSuffix: true, // Ensure unique filenames
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Blob upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
