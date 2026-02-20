'use client'

import { useState, useEffect, useCallback } from 'react'

interface ContextMenuState {
  x: number
  y: number
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    let x = e.clientX
    let y = e.clientY

    // Boundary checks
    if (x + 160 > window.innerWidth) {
      x = window.innerWidth - 160
    }
    if (y + 100 > window.innerHeight) {
      y = window.innerHeight - 100
    }

    setContextMenu({ x, y })
  }, [])

  const close = useCallback(() => {
    setContextMenu(null)
  }, [])

  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => close()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu, close])

  return { contextMenu, handleContextMenu, close }
}
