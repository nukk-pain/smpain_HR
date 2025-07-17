import * as React from 'react'
import { cn } from '@/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost'
  size?: 'default' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none',
      variant === 'ghost' ? 'bg-transparent hover:bg-gray-100' : 'bg-primary text-white hover:bg-primary/90',
      size === 'icon' ? 'h-10 w-10' : 'h-10 px-4 py-2',
      className
    )
    return <button ref={ref} className={classes} {...props} />
  }
)
Button.displayName = 'Button'
