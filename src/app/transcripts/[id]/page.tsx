import Link from 'next/link'
import TranscriptView from '@/components/TranscriptView'
import { use } from 'react'

export default function TranscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/transcripts" className="text-slate-400 hover:text-slate-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">Transcriptie</h1>
      </div>

      <TranscriptView id={id} />
    </div>
  )
}
