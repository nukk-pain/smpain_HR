import React, { createContext, useContext, ReactNode } from 'react'
import { toast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Notification } from '../types'

interface NotificationContextType {
  showNotification: (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message?: string,
    duration?: number
  ) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const showNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string = '',
    duration?: number
  ) => {
    const variant = type === 'error' ? 'destructive' : 'default'
    
    toast({
      title,
      description: message || undefined,
      variant,
      duration: duration || 5000,
    })
  }

  const showSuccess = (message: string, duration?: number) => {
    showNotification('success', '성공', message, duration)
  }

  const showError = (message: string, duration?: number) => {
    showNotification('error', '오류', message, duration)
  }

  const showWarning = (message: string, duration?: number) => {
    showNotification('warning', '경고', message, duration)
  }

  const showInfo = (message: string, duration?: number) => {
    showNotification('info', '정보', message, duration)
  }

  const value: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster />
    </NotificationContext.Provider>
  )
}