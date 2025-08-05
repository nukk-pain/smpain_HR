/**
 * UserActions Component
 * 
 * Provides user action buttons functionality.
 */

import React, { memo } from 'react';
import { Box, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { User } from '../types';

export interface UserActionsProps {
  onCreateUser?: () => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
  onExportUsers?: () => void;
  onImportUsers?: () => void;
  onRefreshUsers?: () => void;
  selectedUser?: User | null;
  loading?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  canImport?: boolean;
  userCount?: number;
}

export const UserActions: React.FC<UserActionsProps> = memo(({
  onCreateUser,
  loading = false,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={onCreateUser}
        disabled={loading}
      >
        사용자 추가
      </Button>
    </Box>
  );
});

UserActions.displayName = 'UserActions';