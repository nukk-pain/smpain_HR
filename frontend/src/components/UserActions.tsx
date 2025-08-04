/**
 * UserActions Component
 * 
 * Provides user action buttons and bulk operations functionality.
 * Extracted from UserManagement component to follow SRP with performance enhancements.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Paper,
  Chip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  FileDownload,
  FileUpload,
  MoreVert,
  DeleteSweep
} from '@mui/icons-material';
import { User } from '../types';

// Component props interface
export interface UserActionsProps {
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onExportUsers: () => void;
  onImportUsers: () => void;
  onRefreshUsers: () => void;
  selectedUser?: User | null;
  selectedUsers?: User[];
  loading?: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  userCount: number;
  onBulkDelete?: (users: User[]) => void;
}

/**
 * Optimized UserActions component with React.memo and responsive design
 */
export const UserActions: React.FC<UserActionsProps> = memo(({
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onExportUsers,
  onImportUsers,
  onRefreshUsers,
  selectedUser,
  selectedUsers = [],
  loading = false,
  canCreate,
  canEdit,
  canDelete,
  canExport,
  canImport,
  userCount,
  onBulkDelete
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  // Memoized event handlers
  const handleCreateUser = useCallback(() => {
    onCreateUser();
  }, [onCreateUser]);

  const handleEditUser = useCallback(() => {
    if (selectedUser) {
      onEditUser(selectedUser);
    }
  }, [selectedUser, onEditUser]);

  const handleDeleteUser = useCallback(() => {
    if (selectedUser) {
      const confirmed = window.confirm('정말로 삭제하시겠습니까?');
      if (confirmed) {
        onDeleteUser(selectedUser);
      }
    }
  }, [selectedUser, onDeleteUser]);

  const handleBulkDelete = useCallback(() => {
    if (selectedUsers.length > 0 && onBulkDelete) {
      const confirmed = window.confirm(`선택된 ${selectedUsers.length}명의 사용자를 삭제하시겠습니까?`);
      if (confirmed) {
        onBulkDelete(selectedUsers);
      }
    }
  }, [selectedUsers, onBulkDelete]);

  const handleRefresh = useCallback(() => {
    onRefreshUsers();
  }, [onRefreshUsers]);

  const handleExport = useCallback(() => {
    onExportUsers();
  }, [onExportUsers]);

  const handleImport = useCallback(() => {
    onImportUsers();
  }, [onImportUsers]);

  const handleMobileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuAnchor(null);
  }, []);

  // Memoized computed values
  const hasSelectedUser = useMemo(() => Boolean(selectedUser), [selectedUser]);
  const hasBulkSelection = useMemo(() => selectedUsers.length > 0, [selectedUsers.length]);
  const canEditSelected = useMemo(() => hasSelectedUser && canEdit, [hasSelectedUser, canEdit]);
  const canDeleteSelected = useMemo(() => hasSelectedUser && canDelete, [hasSelectedUser, canDelete]);

  // Main action buttons for desktop
  const mainActions = useMemo(() => (
    <Box display="flex" gap={1} alignItems="center">
      {canCreate && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleCreateUser}
          disabled={loading}
          aria-label="사용자 추가"
          title="새 사용자 추가"
        >
          사용자 추가
        </Button>
      )}
      
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} role="progressbar" /> : <Refresh />}
        onClick={handleRefresh}
        disabled={loading}
        aria-label="새로고침"
        title="사용자 목록 새로고침"
      >
        새로고침
      </Button>

      {canExport && (
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={handleExport}
          disabled={loading}
          aria-label="내보내기"
          title="사용자 목록 내보내기"
        >
          내보내기
        </Button>
      )}

      {canImport && (
        <Button
          variant="outlined"
          startIcon={<FileUpload />}
          onClick={handleImport}
          disabled={loading}
          aria-label="가져오기"
          title="사용자 목록 가져오기"
        >
          가져오기
        </Button>
      )}
    </Box>
  ), [canCreate, canExport, canImport, loading, handleCreateUser, handleRefresh, handleExport, handleImport]);

  // Selected user actions
  const selectedUserActions = useMemo(() => {
    if (!hasSelectedUser) return null;

    return (
      <Box display="flex" gap={1} alignItems="center">
        {canEditSelected && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Edit />}
            onClick={handleEditUser}
            disabled={loading}
            aria-label="수정"
            title="선택된 사용자 수정"
          >
            수정
          </Button>
        )}

        {canDeleteSelected && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteUser}
            disabled={loading}
            aria-label="삭제"
            title="선택된 사용자 삭제"
          >
            삭제
          </Button>
        )}
      </Box>
    );
  }, [hasSelectedUser, canEditSelected, canDeleteSelected, loading, handleEditUser, handleDeleteUser]);

  // Bulk actions
  const bulkActions = useMemo(() => {
    if (!hasBulkSelection || !onBulkDelete) return null;

    return (
      <Box display="flex" gap={1} alignItems="center">
        <Chip
          label={`${selectedUsers.length}명 선택됨`}
          color="primary"
          variant="outlined"
          size="small"
        />
        
        {canDelete && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweep />}
            onClick={handleBulkDelete}
            disabled={loading}
            aria-label="일괄 삭제"
            title="선택된 사용자들 일괄 삭제"
          >
            일괄 삭제
          </Button>
        )}
      </Box>
    );
  }, [hasBulkSelection, selectedUsers.length, canDelete, loading, handleBulkDelete, onBulkDelete]);

  // Mobile menu items
  const mobileMenuItems = useMemo(() => (
    <Menu
      anchorEl={mobileMenuAnchor}
      open={Boolean(mobileMenuAnchor)}
      onClose={handleMobileMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      {canCreate && (
        <MenuItem onClick={() => { handleCreateUser(); handleMobileMenuClose(); }}>
          <Add sx={{ mr: 1 }} />
          사용자 추가
        </MenuItem>
      )}
      
      <MenuItem onClick={() => { handleRefresh(); handleMobileMenuClose(); }}>
        <Refresh sx={{ mr: 1 }} />
        새로고침
      </MenuItem>

      {canExport && (
        <MenuItem onClick={() => { handleExport(); handleMobileMenuClose(); }}>
          <FileDownload sx={{ mr: 1 }} />
          내보내기
        </MenuItem>
      )}

      {canImport && (
        <MenuItem onClick={() => { handleImport(); handleMobileMenuClose(); }}>
          <FileUpload sx={{ mr: 1 }} />
          가져오기
        </MenuItem>
      )}

      {hasSelectedUser && (
        <>
          <Divider />
          {canEditSelected && (
            <MenuItem onClick={() => { handleEditUser(); handleMobileMenuClose(); }}>
              <Edit sx={{ mr: 1 }} />
              수정
            </MenuItem>
          )}
          {canDeleteSelected && (
            <MenuItem onClick={() => { handleDeleteUser(); handleMobileMenuClose(); }}>
              <Delete sx={{ mr: 1 }} />
              삭제
            </MenuItem>
          )}
        </>
      )}

      {hasBulkSelection && onBulkDelete && canDelete && (
        <>
          <Divider />
          <MenuItem onClick={() => { handleBulkDelete(); handleMobileMenuClose(); }}>
            <DeleteSweep sx={{ mr: 1 }} />
            일괄 삭제 ({selectedUsers.length}명)
          </MenuItem>
        </>
      )}
    </Menu>
  ), [
    mobileMenuAnchor, 
    canCreate, canExport, canImport, hasSelectedUser, canEditSelected, canDeleteSelected,
    hasBulkSelection, onBulkDelete, canDelete, selectedUsers.length,
    handleCreateUser, handleRefresh, handleExport, handleImport, 
    handleEditUser, handleDeleteUser, handleBulkDelete, handleMobileMenuClose
  ]);

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1
      }}
    >
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center"
        flexWrap="wrap"
        gap={2}
      >
        {/* Left side - Title and count */}
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" component="h2">
            사용자 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            총 {userCount}명
          </Typography>
        </Box>

        {/* Right side - Actions */}
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {/* Bulk actions */}
          {bulkActions}
          
          {/* Selected user actions */}
          {selectedUserActions}

          {/* Main actions - Desktop */}
          {!isMobile && mainActions}

          {/* Mobile menu trigger */}
          {isMobile && (
            <Tooltip title="더 많은 작업">
              <IconButton
                onClick={handleMobileMenuOpen}
                aria-label="더 많은 작업"
                aria-controls="mobile-actions-menu"
                aria-haspopup="true"
              >
                <MoreVert />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Mobile menu */}
      {isMobile && mobileMenuItems}
    </Paper>
  );
});

// Display name for debugging
UserActions.displayName = 'UserActions';