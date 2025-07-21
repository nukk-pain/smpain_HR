import React from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'

interface ActionButtonProps {
  action: 'edit' | 'delete'
  onClick?: () => void
  className?: string
}

export function ActionButton({ action, onClick, className }: ActionButtonProps) {
  const getIcon = () => {
    switch (action) {
      case 'edit':
        return <Edit className="h-4 w-4" />
      case 'delete':
        return <Trash2 className="h-4 w-4" />
      default:
        return null
    }
  }

  const getLabel = () => {
    switch (action) {
      case 'edit':
        return 'Edit'
      case 'delete':
        return 'Delete'
      default:
        return ''
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={className}
      aria-label={getLabel()}
    >
      {getIcon()}
    </Button>
  )
}