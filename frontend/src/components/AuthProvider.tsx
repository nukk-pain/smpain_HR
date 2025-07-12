import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthState } from '../types'
import apiService from '../services/api'

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
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

  // Check if user is already authenticated on app start
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await apiService.getCurrentUser()
      if (response.success && response.data) {
        setAuthState({
          isAuthenticated: true,
          user: response.data as User,
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
      if (response.success && response.data) {
        setAuthState({
          isAuthenticated: true,
          user: response.data as User,
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

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}