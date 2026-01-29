import UploadForm from '@/components/UploadForm'

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Audio Transcriptie</h1>
        <p className="mt-2 text-gray-600">
          Upload een audiobestand en ontvang een transcriptie met AssemblyAI
        </p>
      </div>

      <UploadForm />

      <div className="text-center text-sm text-gray-500">
        <p>
          Ondersteunde formaten: MP3, WAV, M4A, MP4
        </p>
        <p className="mt-1">
          Maximale bestandsgrootte: 100MB (via Vercel Blob Storage)
        </p>
      </div>
    </div>
  )
}
