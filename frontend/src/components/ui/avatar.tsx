import * as React from 'react'
import { cn } from '@/utils/cn'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className, children, ...props }) => (
  <div className={cn('rounded-full bg-gray-200 overflow-hidden', className)} {...props}>
    {src ? <img src={src} alt={alt} /> : children}
  </div>
)
Avatar.displayName = 'Avatar'
