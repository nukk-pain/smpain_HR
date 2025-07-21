import React from 'react'

interface PageTitleProps {
  children: React.ReactNode
}

export function PageTitle({ children }: PageTitleProps) {
  return (
    <h4 className="text-2xl font-semibold tracking-tight mb-4">
      {children}
    </h4>
  )
}