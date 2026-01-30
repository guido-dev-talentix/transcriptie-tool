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
      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
        {labels[type] || type}
      </span>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-semibold px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{report.title}</h2>
            )}
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
              {getTypeBadge(report.type)}
              <span>{new Date(report.createdAt).toLocaleDateString('nl-NL')}</span>
              {report.transcript && (
                <span>
                  Van: {report.transcript.title || report.transcript.filename}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setContent(report.content)
                    setTitle(report.title)
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Bewerken
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Markdown inhoud..."
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{report.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
