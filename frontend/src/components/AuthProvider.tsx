import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthState } from '../types'
import apiService from '../services/api'

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  })
  const [loading, setLoading] = useState(true)

  // Auto-logout functionality
  useEffect(() => {
    if (!authState.isAuthenticated) return

    let inactivityTimer: NodeJS.Timeout
    const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        logout()
        alert('세션이 만료되어 자동으로 로그아웃됩니다.')
      }, INACTIVITY_TIMEOUT)
    }

    const handleActivity = () => {
      resetTimer()
    }

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Start the timer
    resetTimer()

    return () => {
      clearTimeout(inactivityTimer)
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [authState.isAuthenticated])

  // Check if user is already authenticated on app start
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await apiService.getCurrentUser()
      if (response.authenticated && response.user) {
        setAuthState({
          isAuthenticated: true,
          user: response.user as User,
        })
      }
    } catch (error) {
      // User is not authenticated or session expired
      setAuthState({
        isAuthenticated: false,
        user: null,
      })
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.login(username, password)
      if (response.success && response.user) {
        setAuthState({
          isAuthenticated: true,
          user: response.user as User,
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setAuthState({
        isAuthenticated: false,
        user: null,
      })
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiService.getCurrentUser()
      if (response.authenticated && response.user) {
        setAuthState(prev => ({
          ...prev,
          user: response.user as User,
        }))
      }
    } catch (error) {
      console.error('Refresh user error:', error)
    }
  }

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshUser,
    loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}