'use client'

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'badge-success'
      case 'processing':
        return 'badge-accent'
      case 'pending':
        return 'badge-warning'
      case 'error':
        return 'badge-error'
      default:
        return 'badge-neutral'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Voltooid'
      case 'processing':
        return 'Bezig...'
      case 'pending':
        return 'Wachten'
      case 'error':
        return 'Fout'
      default:
        return status
    }
  }

  return (
    <span className={`badge ${getStatusStyles()} inline-flex items-center gap-1.5`}>
      {status === 'processing' && (
        <svg
          className="animate-spin h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {getStatusText()}
    </span>
  )
}
