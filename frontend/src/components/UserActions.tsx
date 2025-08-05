/**
 * UserActions Component - Simplified Version
 * 
 * Temporary simplified version to debug the build issue.
 */

import React, { memo } from 'react';
import { Box, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { User } from '../types';

export interface UserActionsProps {
  currentUser: User;
  users?: User[];
  selectedUsers?: User[];
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onRefresh?: () => void;
  onBulkDelete?: (users: User[]) => void;
}

export const UserActions: React.FC<UserActionsProps> = memo(({
  onAdd,
  loading = false,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={onAdd}
        disabled={loading}
      >
        사용자 추가
      </Button>
    </Box>
  );
});

// Display name for debugging
UserActions.displayName = 'UserActions';