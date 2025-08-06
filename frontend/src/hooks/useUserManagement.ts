/**
 * User management hook
 * 
 * Provides comprehensive user CRUD operations with proper state management,
 * error handling, and loading states for the UserManagement component.
 */

import { useState, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { User } from '../types';

// Error types for better error handling
export enum UserManagementError {
  FETCH_FAILED = 'FETCH_FAILED',
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// Error information interface
export interface ErrorInfo {
  type: UserManagementError;
  message: string;
  originalError?: Error;
}

// Loading states for different operations
export interface LoadingStates {
  fetching: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

// User data for create/update operations
export interface UserFormData {
  username?: string;
  password?: string;
  name?: string;
  role?: string;
  employeeId?: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  baseSalary?: number;
  [key: string]: any;
}

// Hook return interface
export interface UseUserManagementReturn {
  readonly users: readonly User[];
  readonly loading: boolean;
  readonly loadingStates: LoadingStates;
  readonly error: ErrorInfo | null;
  readonly selectedUser: User | null;
  readonly fetchUsers: () => Promise<void>;
  readonly createUser: (userData: UserFormData) => Promise<void>;
  readonly updateUser: (id: number, userData: Partial<UserFormData>) => Promise<void>;
  readonly deleteUser: (id: number) => Promise<void>;
  readonly selectUser: (user: User | null) => void;
  readonly clearError: () => void;
  readonly refreshUsers: () => Promise<void>;
  readonly isOperationInProgress: boolean;
}

// Error message mapping
const ERROR_MESSAGES: Record<UserManagementError, string> = {
  [UserManagementError.FETCH_FAILED]: '사용자 목록을 불러오는 중 오류가 발생했습니다.',
  [UserManagementError.CREATE_FAILED]: '사용자 생성 중 오류가 발생했습니다.',
  [UserManagementError.UPDATE_FAILED]: '사용자 정보 수정 중 오류가 발생했습니다.',
  [UserManagementError.DELETE_FAILED]: '사용자 삭제 중 오류가 발생했습니다.',
  [UserManagementError.NETWORK_ERROR]: '네트워크 연결을 확인해주세요.',
  [UserManagementError.VALIDATION_ERROR]: '입력 정보를 확인해주세요.'
};

// Helper function to create error info
const createErrorInfo = (type: UserManagementError, originalError?: Error): ErrorInfo => ({
  type,
  message: ERROR_MESSAGES[type],
  originalError
});

// Helper function to determine error type
const getErrorType = (error: any): UserManagementError => {
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
    return UserManagementError.NETWORK_ERROR;
  }
  if (error?.status === 400 || error?.message?.includes('validation')) {
    return UserManagementError.VALIDATION_ERROR;
  }
  return UserManagementError.FETCH_FAILED; // Default fallback
};

/**
 * Custom hook for user management operations
 */
export const useUserManagement = (): UseUserManagementReturn => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    fetching: false,
    creating: false,
    updating: false,
    deleting: false
  });
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Ref to prevent multiple simultaneous operations
  const operationInProgress = useRef(false);

  // Computed loading state (any operation in progress)
  const loading = Object.values(loadingStates).some(Boolean);
  const isOperationInProgress = operationInProgress.current;

  // Helper to update specific loading state
  const updateLoadingState = useCallback((operation: keyof LoadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [operation]: isLoading }));
    operationInProgress.current = isLoading;
  }, []);

  // Helper to handle API errors consistently
  const handleError = useCallback((errorType: UserManagementError, originalError: any) => {
    console.error(`User management error (${errorType}):`, originalError);
    setError(createErrorInfo(errorType, originalError));
  }, []);

  /**
   * Fetch all users from the API
   */
  const fetchUsers = useCallback(async (): Promise<void> => {
    if (isOperationInProgress) return;

    updateLoadingState('fetching', true);
    setError(null);

    try {
      const response = await apiService.getUsers();
      // Handle API response format (assuming it might be wrapped)
      const userData = Array.isArray(response) ? response : response?.data || [];
      setUsers(userData);
    } catch (err: any) {
      handleError(UserManagementError.FETCH_FAILED, err);
    } finally {
      updateLoadingState('fetching', false);
    }
  }, [isOperationInProgress, updateLoadingState, handleError]);

  /**
   * Create a new user
   */
  const createUser = useCallback(async (userData: UserFormData): Promise<void> => {
    if (isOperationInProgress) return;

    updateLoadingState('creating', true);
    setError(null);

    try {
      await apiService.createUser(userData);
      await fetchUsers(); // Refresh the user list
    } catch (err: any) {
      handleError(UserManagementError.CREATE_FAILED, err);
    } finally {
      updateLoadingState('creating', false);
    }
  }, [isOperationInProgress, updateLoadingState, handleError, fetchUsers]);

  /**
   * Update an existing user
   */
  const updateUser = useCallback(async (id: number, userData: Partial<UserFormData>): Promise<void> => {
    if (isOperationInProgress) return;

    updateLoadingState('updating', true);
    setError(null);

    try {
      await apiService.updateUser(String(id), userData);
      await fetchUsers(); // Refresh the user list
    } catch (err: any) {
      handleError(UserManagementError.UPDATE_FAILED, err);
    } finally {
      updateLoadingState('updating', false);
    }
  }, [isOperationInProgress, updateLoadingState, handleError, fetchUsers]);

  /**
   * Delete a user
   */
  const deleteUser = useCallback(async (id: number): Promise<void> => {
    if (isOperationInProgress) return;

    updateLoadingState('deleting', true);
    setError(null);

    try {
      await apiService.deleteUser(String(id));
      await fetchUsers(); // Refresh the user list
      
      // Clear selection if deleted user was selected
      if (selectedUser?.id === id) {
        setSelectedUser(null);
      }
    } catch (err: any) {
      handleError(UserManagementError.DELETE_FAILED, err);
    } finally {
      updateLoadingState('deleting', false);
    }
  }, [isOperationInProgress, updateLoadingState, handleError, fetchUsers, selectedUser]);

  /**
   * Select a user for detailed operations
   */
  const selectUser = useCallback((user: User | null): void => {
    setSelectedUser(user);
  }, []);

  /**
   * Clear the current error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Refresh the users list (alias for fetchUsers)
   */
  const refreshUsers = useCallback(async (): Promise<void> => {
    await fetchUsers();
  }, [fetchUsers]);

  return {
    users: Object.freeze(users) as readonly User[],
    loading,
    loadingStates: Object.freeze(loadingStates),
    error,
    selectedUser,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    selectUser,
    clearError,
    refreshUsers,
    isOperationInProgress
  };
};