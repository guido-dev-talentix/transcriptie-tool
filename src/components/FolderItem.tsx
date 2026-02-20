'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ChevronDown, ChevronRight, FolderOpen, Folder } from 'lucide-react'
import { useContextMenu } from '@/hooks/useContextMenu'
import ContextMenu from '@/components/ContextMenu'

interface FolderItemProps {
  folder: {
    id: string
    name: string
    _count: {
      projects: number
    }
  }
  children: React.ReactNode
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export default function FolderItem({ folder, children, onRename, onDelete }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameName, setRenameName] = useState(folder.name)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const { contextMenu, handleContextMenu, close } = useContextMenu()

  const { isOver, setNodeRef } = useDroppable({
    id: 'folder-' + folder.id,
  })

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [isRenaming])

  const handleRenameSubmit = () => {
    const trimmed = renameName.trim()
    if (trimmed && trimmed !== folder.name) {
      onRename(folder.id, trimmed)
    } else {
      setRenameName(folder.name)
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setRenameName(folder.name)
      setIsRenaming(false)
    }
  }

  const contextMenuItems = [
    {
      label: 'Hernoemen',
      onClick: () => {
        close()
        setIsRenaming(true)
      },
    },
    {
      label: 'Verwijderen',
      danger: true,
      onClick: () => {
        close()
        onDelete(folder.id)
      },
    },
  ]

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${isOver ? 'bg-sky-50' : ''}`}
    >
      {/* Folder header */}
      <div
        className="flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer hover:bg-slate-50 select-none"
        onClick={() => setIsOpen(!isOpen)}
        onContextMenu={handleContextMenu}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        {isOpen ? (
          <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
        ) : (
          <Folder className="w-5 h-5 text-amber-500 flex-shrink-0" />
        )}

        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="input !py-0.5 !px-2 text-sm flex-1"
          />
        ) : (
          <span className="text-sm font-medium text-slate-900 flex-1 truncate">
            {folder.name}
          </span>
        )}

        <span className="text-xs text-slate-400 flex-shrink-0">
          {folder._count.projects}
        </span>
      </div>

      {/* Folder contents */}
      {isOpen && (
        <div className="ml-6 space-y-2 pb-2">
          {children}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenuItems} />
      )}
    </div>
  )
}
