import React from 'react'

interface GridLayoutProps {
  children: React.ReactNode
  cols?: number
  mdCols?: number
  gap?: number
  className?: string
}

export function GridLayout({ 
  children, 
  cols = 1, 
  mdCols = 2, 
  gap = 4, 
  className = '' 
}: GridLayoutProps) {
  const gridCols = `grid-cols-${cols}`
  const mdGridCols = `md:grid-cols-${mdCols}`
  const gapClass = `gap-${gap}`
  
  return (
    <div className={`grid ${gridCols} ${mdGridCols} ${gapClass} ${className}`}>
      {children}
    </div>
  )
}