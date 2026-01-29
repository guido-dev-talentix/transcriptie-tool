import TranscriptList from '@/components/TranscriptList'

export default function TranscriptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transcripties</h1>
        <p className="mt-1 text-gray-600">
          Overzicht van al je transcripties
        </p>
      </div>

      <TranscriptList />
    </div>
  )
}
