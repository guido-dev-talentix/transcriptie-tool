import Link from 'next/link'
import TranscriptView from '@/components/TranscriptView'

export default function TranscriptPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href="/transcripts"
          className="text-gray-500 hover:text-gray-700"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Transcriptie</h1>
      </div>

      <TranscriptView id={params.id} />
    </div>
  )
}
