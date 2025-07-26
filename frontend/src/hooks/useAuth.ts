import { useState, useCallback, useEffect, useContext, createContext, ReactNode } from 'react';
import { api } from '../services/api';

export interface User {
  _id: string;
  username: string;
  name: string;
  role: 'Admin' | 'Manager' | 'User';
  department?: string;
  position?: string;
  employeeId?: string;
  permissions?: string[];
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  canManageUsers: boolean;
  canApproveLeave: boolean;
  canViewPayroll: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Custom hook for auth state management
export function useAuthState() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null,
  });

  const setUser = useCallback((user: User | null) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
      error: null,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        return true;
      } else {
        setError('Login failed. Please try again.');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      return false;
    }
  }, [setLoading, clearError, setUser, setError]);

  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, [setUser, setLoading]);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    
    try {
      const response = await api.get('/auth/check');
      
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    if (state.user.role === 'Admin') return true;
    return state.user.permissions?.includes(permission) || false;
  }, [state.user]);

  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!state.user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(state.user.role);
  }, [state.user]);

  const isAdmin = state.user?.role === 'Admin';
  const isManager = state.user?.role === 'Manager' || isAdmin;
  const canManageUsers = hasPermission('user:manage') || isAdmin;
  const canApproveLeave = hasPermission('leave:approve') || isManager;
  const canViewPayroll = hasPermission('payroll:view') || isManager;

  return {
    ...state,
    login,
    logout,
    checkAuth,
    clearError,
    hasPermission,
    hasRole,
    isAdmin,
    isManager,
    canManageUsers,
    canApproveLeave,
    canViewPayroll,
  };
}

// AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthState();

  // Check authentication on mount
  useEffect(() => {
    auth.checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for protected routes
export function useRequireAuth(requiredPermission?: string, requiredRole?: string | string[]) {
  const auth = useAuth();

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.isAuthenticated) {
      // Redirect to login or show error
      console.error('Authentication required');
      return;
    }

    if (requiredPermission && !auth.hasPermission(requiredPermission)) {
      console.error(`Permission required: ${requiredPermission}`);
      return;
    }

    if (requiredRole && !auth.hasRole(requiredRole)) {
      console.error(`Role required: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`);
      return;
    }
  }, [auth.loading, auth.isAuthenticated, auth.hasPermission, auth.hasRole, requiredPermission, requiredRole]);

  return auth;
}

// Hook for conditional rendering based on permissions
export function usePermissionCheck() {
  const auth = useAuth();

  const canAccess = useCallback((permission?: string, role?: string | string[]) => {
    if (!auth.isAuthenticated) return false;
    
    if (permission && !auth.hasPermission(permission)) {
      return false;
    }
    
    if (role && !auth.hasRole(role)) {
      return false;
    }
    
    return true;
  }, [auth.isAuthenticated, auth.hasPermission, auth.hasRole]);

  const requireAuth = useCallback((component: ReactNode, fallback?: ReactNode) => {
    return auth.isAuthenticated ? component : (fallback || null);
  }, [auth.isAuthenticated]);

  const requirePermission = useCallback((
    permission: string, 
    component: ReactNode, 
    fallback?: ReactNode
  ) => {
    return auth.hasPermission(permission) ? component : (fallback || null);
  }, [auth.hasPermission]);

  const requireRole = useCallback((
    role: string | string[], 
    component: ReactNode, 
    fallback?: ReactNode
  ) => {
    return auth.hasRole(role) ? component : (fallback || null);
  }, [auth.hasRole]);

  return {
    canAccess,
    requireAuth,
    requirePermission,
    requireRole,
    ...auth,
  };
}