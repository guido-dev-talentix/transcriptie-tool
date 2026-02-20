'use client'

interface ContextMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
}

export default function ContextMenu({ x, y, items }: ContextMenuProps) {
  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation()
            item.onClick()
          }}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
            item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
