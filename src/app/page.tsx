import UploadForm from '@/components/UploadForm'

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Simple header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Transcriptie
        </h1>
        <p className="mt-2 text-slate-500">
          Upload een audio- of PDF-bestand
        </p>
      </div>

      {/* Upload Form */}
      <UploadForm />

      {/* Supported formats */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
        <span>MP3, WAV, M4A, MP4</span>
        <span>•</span>
        <span>PDF</span>
        <span>•</span>
        <span>Max 100MB</span>
      </div>
    </div>
  )
}
