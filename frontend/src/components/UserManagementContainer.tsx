/**
 * UserManagementContainer Component
 * 
 * Main container component that orchestrates all user management functionality.
 * Extracted from UserManagement component to follow SRP with proper separation of concerns.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  Typography,
  Paper
} from '@mui/material';
import { User } from '../types';
import { UserFilters } from './UserFilters';
import { UserActions } from './UserActions';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';
import { useUserFilters } from '../hooks/useUserFilters';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { 
  useStableCallback, 
  useBatchedUpdates, 
  usePerformanceMonitor,
  useArrayComparison
} from '../utils/performanceOptimizations';

import { apiService } from '../services/api';

// Component props interface
export interface UserManagementContainerProps {
  currentUser: User;
}

// UI state interface
interface UIState {
  selectedUser: User | null;
  isFormOpen: boolean;
  isDetailsOpen: boolean;
  editingUser: User | null;
  loading: boolean;
  error: string | null;
  snackbarMessage: string | null;
  snackbarSeverity: 'success' | 'error' | 'warning' | 'info';
}

// Initial UI state
const initialUIState: UIState = {
  selectedUser: null,
  isFormOpen: false,
  isDetailsOpen: false,
  editingUser: null,
  loading: true,
  error: null,
  snackbarMessage: null,
  snackbarSeverity: 'info'
};

/**
 * UserManagementContainer - Main orchestrator component
 */
export const UserManagementContainer: React.FC<UserManagementContainerProps> = memo(({
  currentUser
}) => {
  // Performance monitoring
  usePerformanceMonitor('UserManagementContainer');
  
  // State management with performance optimizations
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [uiState, setUIState] = useState<UIState>(initialUIState);
  
  // Batched state updates
  const batchUpdates = useBatchedUpdates();
  
  // Optimized array comparisons
  const stableUsers = useArrayComparison(users);
  const stableDepartments = useArrayComparison(departments);
  const stableRoles = useArrayComparison(roles);
  const stableSupervisors = useArrayComparison(supervisors);

  // Hooks with stable references
  const {
    filteredUsers,
    sortBy,
    sortOrder,
    searchTerm,
    filters,
    handleSearch,
    handleFiltersChange,
    handleSort,
    clearFilters
  } = useUserFilters(stableUsers, {
    debounceMs: 300,
    defaultSort: { field: 'name', order: 'asc' }
  });

  const {
    canCreateUser,
    canEditUser,
    canDeleteUser,
    canViewUser,
    canExportUsers,
    canImportUsers
  } = useUserPermissions(currentUser, stableUsers);

  // Memoized values
  const isLoading = useMemo(() => uiState.loading, [uiState.loading]);
  const hasError = useMemo(() => Boolean(uiState.error), [uiState.error]);
  const userCount = useMemo(() => filteredUsers.length, [filteredUsers.length]);

  // UI state helpers
  const updateUIState = useCallback((updates: Partial<UIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);

  const showMessage = useCallback((message: string, severity: UIState['snackbarSeverity'] = 'info') => {
    updateUIState({ snackbarMessage: message, snackbarSeverity: severity });
  }, [updateUIState]);

  const clearMessage = useCallback(() => {
    updateUIState({ snackbarMessage: null });
  }, [updateUIState]);

  // Data fetching
  const fetchUsers = useCallback(async () => {
    try {
      updateUIState({ loading: true, error: null });
      const response = await apiService.getUsers();
      const fetchedUsers = response.success ? response.data : [];
      setUsers(fetchedUsers);
      
      // Update supervisors list (users with supervisor or admin role)
      const supervisorUsers = fetchedUsers.filter(user => 
        user.role === 'supervisor' || user.role === 'admin'
      );
      setSupervisors(supervisorUsers);
      
      updateUIState({ loading: false });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      updateUIState({ 
        loading: false, 
        error: '사용자 목록을 불러오는데 실패했습니다.' 
      });
    }
  }, [updateUIState]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await apiService.getDepartments();
      const fetchedDepartments = response.success ? response.data : [];
      setDepartments(fetchedDepartments.map(dept => dept.name));
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      // Define available roles directly
      const availableRoles = ['admin', 'supervisor', 'user'];
      setRoles(availableRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  // Stable callback implementations
  const handleCreateUser = useStableCallback(() => {
    batchUpdates(() => {
      updateUIState({
        isFormOpen: true,
        editingUser: null,
        isDetailsOpen: false
      });
    });
  }, [updateUIState]);

  const handleEditUser = useStableCallback((user: User) => {
    batchUpdates(() => {
      updateUIState({
        isFormOpen: true,
        editingUser: user,
        isDetailsOpen: false
      });
    });
  }, [updateUIState]);

  const handleDeleteUser = useCallback(async (user: User) => {
    const confirmed = window.confirm('정말로 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      updateUIState({ loading: true });
      const response = await apiService.deleteUser(user._id, false);
      if (response.success) {
        await fetchUsers();
        showMessage('사용자가 성공적으로 삭제되었습니다.', 'success');
        updateUIState({ 
          selectedUser: null, 
          isDetailsOpen: false,
          loading: false 
        });
      } else {
        throw new Error(response.error || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      updateUIState({ loading: false });
      showMessage('사용자 삭제에 실패했습니다.', 'error');
    }
  }, [updateUIState, fetchUsers, showMessage]);

  const handleFormSubmit = useCallback(async (userData: any) => {
    try {
      updateUIState({ loading: true });
      
      if (uiState.editingUser) {
        // Update existing user
        const response = await apiService.updateUser(uiState.editingUser._id, userData);
        if (response.success) {
          showMessage('사용자가 성공적으로 수정되었습니다.', 'success');
        } else {
          throw new Error(response.error || 'Update failed');
        }
      } else {
        // Create new user
        const response = await apiService.createUser(userData);
        if (response.success) {
          showMessage('사용자가 성공적으로 생성되었습니다.', 'success');
        } else {
          throw new Error(response.error || 'Creation failed');
        }
      }

      await fetchUsers();
      updateUIState({ 
        isFormOpen: false, 
        editingUser: null,
        loading: false 
      });
    } catch (error: any) {
      console.error('Failed to save user:', error);
      updateUIState({ loading: false });
      
      const errorMessage = uiState.editingUser 
        ? '사용자 수정에 실패했습니다.'
        : '사용자 생성에 실패했습니다.';
      showMessage(errorMessage, 'error');
    }
  }, [uiState.editingUser, updateUIState, fetchUsers, showMessage]);

  const handleFormCancel = useCallback(() => {
    updateUIState({
      isFormOpen: false,
      editingUser: null
    });
  }, [updateUIState]);

  // User selection and details
  const handleUserSelect = useCallback((user: User) => {
    updateUIState({
      selectedUser: user,
      isDetailsOpen: true,
      isFormOpen: false
    });
  }, [updateUIState]);

  const handleDetailsClose = useCallback(() => {
    updateUIState({
      isDetailsOpen: false,
      selectedUser: null
    });
  }, [updateUIState]);

  const handleDetailsEdit = useCallback((user: User) => {
    updateUIState({
      isFormOpen: true,
      editingUser: user,
      isDetailsOpen: false
    });
  }, [updateUIState]);

  const handleDetailsDelete = useCallback((user: User) => {
    handleDeleteUser(user);
  }, [handleDeleteUser]);

  // List actions
  const handleUserView = useCallback((user: User) => {
    handleUserSelect(user);
  }, [handleUserSelect]);

  const handleUserEdit = useCallback((user: User) => {
    handleEditUser(user);
  }, [handleEditUser]);

  const handleUserDelete = useCallback((user: User) => {
    handleDeleteUser(user);
  }, [handleDeleteUser]);

  // Other actions
  const handleRefreshUsers = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleExportUsers = useCallback(() => {
    // Implementation for user export
    showMessage('사용자 내보내기 기능은 준비 중입니다.', 'info');
  }, [showMessage]);

  const handleImportUsers = useCallback(() => {
    // Implementation for user import
    showMessage('사용자 가져오기 기능은 준비 중입니다.', 'info');
  }, [showMessage]);

  // Effects
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchUsers(),
        fetchDepartments(),
        fetchRoles()
      ]);
    };

    initializeData();
  }, [fetchUsers, fetchDepartments, fetchRoles]);

  // Permission checks for selected user
  const selectedUserPermissions = useMemo(() => {
    if (!uiState.selectedUser) return { canEdit: false, canDelete: false, canView: false };
    
    return {
      canEdit: canEditUser(uiState.selectedUser),
      canDelete: canDeleteUser(uiState.selectedUser),
      canView: canViewUser(uiState.selectedUser)
    };
  }, [uiState.selectedUser, canEditUser, canDeleteUser, canViewUser]);

  // Loading state
  if (isLoading && users.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          minHeight="400px"
          gap={2}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" color="text.secondary">
            사용자 목록을 불러오는 중...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (hasError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {uiState.error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Main Content */}
      <Box display="flex" flexDirection="column" gap={2}>
        {/* Actions Bar */}
        <UserActions
          onCreateUser={handleCreateUser}
          onEditUser={handleUserEdit}
          onDeleteUser={handleUserDelete}
          onExportUsers={handleExportUsers}
          onImportUsers={handleImportUsers}
          onRefreshUsers={handleRefreshUsers}
          selectedUser={uiState.selectedUser}
          loading={isLoading}
          canCreate={canCreateUser}
          canEdit={canEditUser(uiState.selectedUser)}
          canDelete={canDeleteUser(uiState.selectedUser)}
          canExport={canExportUsers}
          canImport={canImportUsers}
          userCount={userCount}
        />

        {/* Filters */}
        <UserFilters
          searchTerm={searchTerm}
          filters={filters}
          sortBy={sortBy}
          sortOrder={sortOrder}
          departments={departments}
          roles={roles}
          onSearch={handleSearch}
          onFiltersChange={handleFiltersChange}
          onSort={handleSort}
          onClearFilters={clearFilters}
          loading={isLoading}
          totalCount={users.length}
          filteredCount={userCount}
        />

        {/* User List */}
        <Paper elevation={1}>
          <UserList
            users={filteredUsers}
            loading={isLoading}
            selectedUser={uiState.selectedUser}
            sortBy={sortBy}
            sortOrder={sortOrder}
            currentUser={currentUser}
            onUserSelect={handleUserSelect}
            onUserEdit={handleUserEdit}
            onUserDelete={handleUserDelete}
            onUserView={handleUserView}
            onSort={handleSort}
            canEdit={canEditUser}
            canDelete={canDeleteUser}
            canView={canViewUser}
            emptyMessage="등록된 사용자가 없습니다"
            error={uiState.error}
          />
        </Paper>
      </Box>

      {/* User Form Dialog */}
      <UserForm
        user={uiState.editingUser}
        isOpen={uiState.isFormOpen}
        isSubmitting={isLoading}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        departments={departments}
        roles={roles}
        supervisors={supervisors}
      />

      {/* User Details Dialog */}
      <UserDetails
        user={uiState.selectedUser}
        isOpen={uiState.isDetailsOpen}
        onClose={handleDetailsClose}
        onEdit={handleDetailsEdit}
        onDelete={handleDetailsDelete}
        canEdit={selectedUserPermissions.canEdit}
        canDelete={selectedUserPermissions.canDelete}
        loading={isLoading}
      />

      {/* Snackbar for messages */}
      <Snackbar
        open={Boolean(uiState.snackbarMessage)}
        autoHideDuration={4000}
        onClose={clearMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={clearMessage} 
          severity={uiState.snackbarSeverity}
          variant="filled"
        >
          {uiState.snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
});

// Display name for debugging
UserManagementContainer.displayName = 'UserManagementContainer';