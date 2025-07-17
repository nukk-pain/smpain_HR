import * as React from 'react'
import { cn } from '@/utils/cn'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, children }) => (
  <div className={cn(open ? 'block' : 'hidden')}>{children}</div>
)

export const SheetTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => <button ref={ref} className={className} {...props} />
)
SheetTrigger.displayName = 'SheetTrigger'

export const SheetContent: React.FC<{ side?: 'left' | 'right'; className?: string }> = ({ children, className }) => (
  <div className={cn('fixed top-0 bottom-0 w-64 bg-white shadow-md', className)}>{children}</div>
)
