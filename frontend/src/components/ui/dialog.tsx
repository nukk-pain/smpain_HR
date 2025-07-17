import * as React from 'react'
import { cn } from '@/utils/cn'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => (
  <div className={cn(open ? 'block' : 'hidden')}>{children}</div>
)

export const DialogContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white p-4 rounded shadow-md">{children}</div>
)

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-2">{children}</div>
)

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold">{children}</h3>
)

export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-4 flex justify-end space-x-2">{children}</div>
)
