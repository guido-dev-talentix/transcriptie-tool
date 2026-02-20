'use client'

import Link from 'next/link'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    status: string
    updatedAt: string
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'badge-success',
      completed: 'badge-neutral',
      archived: 'badge-neutral',
    }
    const labels: Record<string, string> = {
      active: 'Actief',
      completed: 'Voltooid',
      archived: 'Gearchiveerd',
    }
    return (
      <span className={`badge ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      tabIndex={-1}
      className={`card flex items-center gap-3 hover:border-slate-300 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <Link
        href={`/projects/${project.id}`}
        className="flex-1 flex items-center justify-between min-w-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-medium text-slate-900 truncate">{project.name}</h3>
          {getStatusBadge(project.status)}
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0 ml-3">
          {new Date(project.updatedAt).toLocaleDateString('nl-NL')}
        </span>
      </Link>
    </div>
  )
}
