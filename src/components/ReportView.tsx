'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface Report {
  id: string
  title: string
  content: string
  type: string
  status: string
  createdAt: string
  project?: { id: string; name: string }
  transcript?: { id: string; title: string | null; filename: string }
}

interface ReportViewProps {
  report: Report
  onUpdate?: (report: Report) => void
  onDelete?: () => void
}

export default function ReportView({ report, onUpdate, onDelete }: ReportViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(report.content)
  const [title, setTitle] = useState(report.title)
  const [isSaving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })

      if (response.ok) {
        const updated = await response.json()
        setIsEditing(false)
        if (onUpdate) {
          onUpdate({ ...report, ...updated })
        }
      }
    } catch (error) {
      console.error('Error saving report:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je dit verslag wilt verwijderen?')) return

    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
      })

      if (response.ok && onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      meeting: 'Vergaderverslag',
      weekly: 'Weekoverzicht',
      summary: 'Samenvatting',
    }
    return (
      <span className="badge badge-accent">
        {labels[type] || type}
      </span>
    )
  }

  return (
    <div className="card !p-0">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input text-heading-s font-display font-semibold"
              />
            ) : (
              <h2 className="text-heading-s font-display font-semibold text-primary">{report.title}</h2>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate font-body">
              {getTypeBadge(report.type)}
              <span>{new Date(report.createdAt).toLocaleDateString('nl-NL')}</span>
              {report.transcript && (
                <span>
                  Van: <span className="font-display font-semibold">{report.transcript.title || report.transcript.filename}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setContent(report.content)
                    setTitle(report.title)
                  }}
                  className="btn-secondary"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary disabled:opacity-50"
                >
                  {isSaving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                >
                  Bewerken
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 border-2 border-cta-red/30 text-cta-red rounded-xl hover:bg-cta-red/10 font-display font-semibold transition-colors"
                >
                  Verwijderen
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="input font-mono text-sm resize-none"
            placeholder="Markdown inhoud..."
          />
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-primary prose-a:text-brand-light-blue prose-p:font-body prose-p:text-slate prose-p:font-light">
            <ReactMarkdown>{report.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
