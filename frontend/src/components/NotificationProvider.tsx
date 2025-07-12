import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Snackbar, Alert, AlertColor } from '@mui/material'
import { Notification } from '../types'

interface NotificationContextType {
  showNotification: (
    type: AlertColor,
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
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = (
    type: AlertColor,
    title: string,
    message: string = '',
    duration: number = 5000
  ) => {
    const id = Date.now().toString()
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration,
    }

    setNotifications(prev => [...prev, notification])

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
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
      
      {/* Render notifications */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          style={{ marginTop: index * 60 }} // Stack notifications
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            <strong>{notification.title}</strong>
            {notification.message && (
              <>
                <br />
                {notification.message}
              </>
            )}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  )
}