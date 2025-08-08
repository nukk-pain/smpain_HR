import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthState } from '../types'
import apiService from '../services/api'
import { storeToken, getValidToken, clearAuth, getUserFromToken } from '../utils/tokenManager'

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  loading: boolean
  hasPermission: (permission: string) => boolean
  hasRole: (role: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  if (import.meta.env.DEV) {
    console.log('🔍 useAuth called, returning:', {
      isAuthenticated: context.isAuthenticated,
      hasUser: !!context.user,
      userName: context.user?.name,
      userRole: context.user?.role,
      loading: context.loading
    })
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
      if (import.meta.env.DEV) {
        console.log('🔍 AuthProvider: Starting checkAuthStatus')
      }
      
      // First check if we have a valid token
      const token = getValidToken()
      
      if (!token) {
        // No valid token, user is not authenticated
        if (import.meta.env.DEV) {
          console.log('🔍 AuthProvider: No valid token found')
        }
        setAuthState({
          isAuthenticated: false,
          user: null,
        })
        setLoading(false)
        return
      }

      if (import.meta.env.DEV) {
        console.log('🔍 AuthProvider: Valid token found, calling getCurrentUser')
      }

      // We have a valid token, verify with server and get user info
      const response = await apiService.getCurrentUser()
      
      if (import.meta.env.DEV) {
        console.log('🔍 AuthProvider: getCurrentUser response:', {
          authenticated: response.authenticated,
          hasUser: !!response.user,
          userName: response.user?.name,
          userRole: response.user?.role,
          isActive: response.user?.isActive
        })
      }
      
      if (response.authenticated && response.user) {
        // Check if user is active
        if (response.user.isActive === false) {
          if (import.meta.env.DEV) {
            console.warn('Token valid but user is deactivated:', response.user.username)
          }
          clearAuth()
          setAuthState({
            isAuthenticated: false,
            user: null,
          })
          return
        }

        if (import.meta.env.DEV) {
          console.log('✅ AuthProvider: Setting authenticated user state:', {
            userName: response.user.name,
            userRole: response.user.role
          })
        }

        setAuthState({
          isAuthenticated: true,
          user: response.user as User,
        })
        
        if (import.meta.env.DEV) {
          console.log('✅ AuthProvider: Auth state set successfully')
        }
      } else {
        // Server rejected the token, clear it
        if (import.meta.env.DEV) {
          console.warn('🔍 AuthProvider: Server rejected token')
        }
        clearAuth()
        setAuthState({
          isAuthenticated: false,
          user: null,
        })
      }
    } catch (error: any) {
      // Token verification failed, clear it
      if (import.meta.env.DEV) {
        console.error('❌ AuthProvider: Auth check failed:', error)
        
        // Log specific deactivation errors
        if (error?.response?.status === 401 && 
            error?.response?.data?.error?.includes('deactivated')) {
          console.warn('Authentication failed: User account is deactivated')
        }
      }
      clearAuth()
      setAuthState({
        isAuthenticated: false,
        user: null,
      })
    } finally {
      setLoading(false)
      if (import.meta.env.DEV) {
        console.log('🔍 AuthProvider: checkAuthStatus completed, loading set to false')
      }
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.login(username, password)
      if (response.success && response.token && response.user) {
        // Check if user is active before storing token
        if (response.user.isActive === false) {
          if (import.meta.env.DEV) {
            console.warn('Login attempted for deactivated user:', response.user.username)
          }
          return false
        }

        // Store the JWT token
        storeToken(response.token)
        
        // Set auth state with login response data first
        setAuthState({
          isAuthenticated: true,
          user: response.user as User,
        })
        
        // Try to get complete user info including calculated fields
        // Don't fail the login if this fails
        try {
          // Small delay to ensure token is properly set in interceptor
          await new Promise(resolve => setTimeout(resolve, 100))
          const userResponse = await apiService.getCurrentUser()
          if (userResponse.authenticated && userResponse.user) {
            // Double-check user is still active
            if (userResponse.user.isActive === false) {
              if (import.meta.env.DEV) {
                console.warn('User became deactivated during login process')
              }
              clearAuth()
              setAuthState({
                isAuthenticated: false,
                user: null,
              })
              return false
            }
            setAuthState({
              isAuthenticated: true,
              user: userResponse.user as User,
            })
          }
        } catch (userError: any) {
          if (import.meta.env.DEV) {
            console.warn('Failed to fetch complete user info after login:', userError)
          }
          
          // Check if error is due to account deactivation
          if (userError?.response?.status === 401 && 
              userError?.response?.data?.error?.includes('deactivated')) {
            if (import.meta.env.DEV) {
              console.warn('User deactivated after token was issued')
            }
            clearAuth()
            setAuthState({
              isAuthenticated: false,
              user: null,
            })
            return false
          }
          
          // Keep the basic user info from login response for other errors
        }
        
        return true
      }
      return false
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Login error:', error)
      }
      
      // Don't store any tokens if login failed
      clearAuth()
      
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      // With JWT, server-side logout is not necessary (tokens are stateless)
      // But we still call it for any server-side cleanup
      await apiService.logout()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Logout error:', error)
      }
    } finally {
      // Clear JWT token from client storage
      clearAuth()
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
        // Check if user became deactivated
        if (response.user.isActive === false) {
          if (import.meta.env.DEV) {
            console.warn('User became deactivated, logging out:', response.user.username)
          }
          // Auto-logout if user was deactivated
          await logout()
          return
        }

        setAuthState(prev => ({
          ...prev,
          user: response.user as User,
        }))
      } else {
        // If not authenticated, logout
        if (import.meta.env.DEV) {
          console.warn('User refresh failed: not authenticated, logging out')
        }
        await logout()
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Refresh user error:', error)
        
        // Check if error is due to deactivation
        if (error?.response?.status === 401 && 
            error?.response?.data?.error?.includes('deactivated')) {
          console.warn('User deactivated during refresh, logging out')
        }
      }
      
      // If refresh fails with 401 (including deactivation), logout
      if (error?.response?.status === 401) {
        await logout()
      }
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false
    if (authState.user.role === 'admin') return true
    return authState.user.permissions?.includes(permission) || false
  }

  const hasRole = (role: string | string[]): boolean => {
    if (!authState.user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.some(r => authState.user?.role.toLowerCase() === r.toLowerCase())
  }

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshUser,
    loading,
    hasPermission,
    hasRole,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}