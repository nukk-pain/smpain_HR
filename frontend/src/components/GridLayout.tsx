import React from 'react'
import { cn } from '@/lib/utils'

interface GridLayoutProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  mdCols?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

export function GridLayout({ 
  children, 
  cols = 1, 
  mdCols = 2, 
  gap = 4, 
  className = '' 
}: GridLayoutProps) {
  const gridColsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }

  const mdGridColsMap = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
  }

  const gapMap = {
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
  }
  
  return (
    <div className={cn(
      'grid',
      gridColsMap[cols],
      mdGridColsMap[mdCols],
      gapMap[gap],
      className
    )}>
      {children}
    </div>
  )
}