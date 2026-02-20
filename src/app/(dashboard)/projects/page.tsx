'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import FolderItem from '@/components/FolderItem'
import ProjectCard from '@/components/ProjectCard'

interface ProjectItem {
  id: string
  name: string
  status: string
  updatedAt: string
}

interface FolderItem_ {
  id: string
  name: string
  projects: ProjectItem[]
  _count: {
    projects: number
  }
}

function RootDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root' })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-lg transition-colors ${isOver ? 'bg-slate-50' : ''}`}
    >
      {children}
    </div>
  )
}

export default function ProjectsPage() {
  const [folders, setFolders] = useState<FolderItem_[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setFolders(data.folders || [])
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      setError('Kon projecten niet ophalen')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const projectId = active.id as string
    const targetId = over.id as string

    let newFolderId: string | null = null
    if (targetId === 'root') {
      newFolderId = null
    } else if (targetId.startsWith('folder-')) {
      newFolderId = targetId.replace('folder-', '')
    } else {
      return
    }

    // Find which project is being moved and from where
    let movedProject: ProjectItem | null = null

    // Check root projects
    const rootIndex = projects.findIndex((p) => p.id === projectId)
    if (rootIndex !== -1) {
      movedProject = projects[rootIndex]
      // If dragging to root from root, do nothing
      if (newFolderId === null) return
    }

    // Check folder projects
    let sourceFolderId: string | null = null
    if (!movedProject) {
      for (const folder of folders) {
        const idx = folder.projects.findIndex((p) => p.id === projectId)
        if (idx !== -1) {
          movedProject = folder.projects[idx]
          sourceFolderId = folder.id
          break
        }
      }
    }

    if (!movedProject) return

    // Don't move to the same folder
    if (sourceFolderId === newFolderId) return

    // Optimistic update
    const prevFolders = [...folders.map((f) => ({ ...f, projects: [...f.projects] }))]
    const prevProjects = [...projects]

    // Remove from source
    if (rootIndex !== -1) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
    } else if (sourceFolderId) {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === sourceFolderId
            ? {
                ...f,
                projects: f.projects.filter((p) => p.id !== projectId),
                _count: { projects: f._count.projects - 1 },
              }
            : f
        )
      )
    }

    // Add to destination
    if (newFolderId === null) {
      setProjects((prev) => [movedProject!, ...prev])
    } else {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === newFolderId
            ? {
                ...f,
                projects: [movedProject!, ...f.projects],
                _count: { projects: f._count.projects + 1 },
              }
            : f
        )
      )
    }

    // API call
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: newFolderId }),
      })

      if (!response.ok) {
        throw new Error('Failed to move project')
      }
    } catch (err) {
      console.error('Error moving project:', err)
      // Revert on failure
      setFolders(prevFolders)
      setProjects(prevProjects)
    }
  }

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) return

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })

      if (response.ok) {
        const folder = await response.json()
        setFolders((prev) => [
          ...prev,
          { ...folder, projects: [], _count: { projects: 0 } },
        ])
        setNewFolderName('')
        setShowNewFolderInput(false)
      }
    } catch (err) {
      console.error('Error creating folder:', err)
    }
  }

  const handleNewFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder()
    } else if (e.key === 'Escape') {
      setNewFolderName('')
      setShowNewFolderInput(false)
    }
  }

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        setFolders((prev) =>
          prev.map((f) => (f.id === id ? { ...f, name } : f))
        )
      }
    } catch (err) {
      console.error('Error renaming folder:', err)
    }
  }

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze map wilt verwijderen? Projecten worden losse projecten.')) {
      return
    }

    const folder = folders.find((f) => f.id === id)
    if (!folder) return

    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Move folder's projects to root
        setProjects((prev) => [...folder.projects, ...prev])
        setFolders((prev) => prev.filter((f) => f.id !== id))
      }
    } catch (err) {
      console.error('Error deleting folder:', err)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-sky-500 animate-spin mx-auto"></div>
        <p className="mt-3 text-sm text-slate-500">Laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  const hasContent = folders.length > 0 || projects.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Projecten</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolderInput(true)}
            className="btn-secondary"
          >
            + Nieuwe map
          </button>
          <Link href="/projects/new" className="btn-primary">
            + Nieuw project
          </Link>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolderInput && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleNewFolderKeyDown}
            placeholder="Mapnaam..."
            className="input flex-1"
            autoFocus
          />
          <button onClick={handleCreateFolder} className="btn-primary">
            Aanmaken
          </button>
          <button
            onClick={() => {
              setNewFolderName('')
              setShowNewFolderInput(false)
            }}
            className="btn-secondary"
          >
            Annuleren
          </button>
        </div>
      )}

      {!hasContent ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">Nog geen projecten</p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block text-sm text-sky-600 hover:text-sky-700"
          >
            Maak je eerste project aan
          </Link>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <RootDropZone>
            <div className="space-y-4">
              {/* Folders */}
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                >
                  {folder.projects.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 pl-2">
                      Sleep projecten hierheen
                    </p>
                  ) : (
                    folder.projects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))
                  )}
                </FolderItem>
              ))}

              {/* Root projects */}
              {projects.length > 0 && (
                <div className="space-y-2">
                  {folders.length > 0 && (
                    <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide px-2 pt-2">
                      Losse projecten
                    </h2>
                  )}
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </div>
          </RootDropZone>
        </DndContext>
      )}
    </div>
  )
}
