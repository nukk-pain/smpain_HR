/**
 * UserManagement - Refactored wrapper component
 * 
 * This component now acts as a lightweight wrapper around the modular
 * UserManagementContainer, maintaining backward compatibility while
 * providing improved architecture with separated concerns.
 */

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { User } from '../types';
import { useAuth } from './AuthProvider';
import { UserManagementContainer } from './UserManagementContainer';

export interface UserManagementProps {
  currentUser?: User;
}

/**
 * UserManagement Component
 * 
 * Main entry point for user management functionality.
 * Acts as a wrapper that provides authentication context and
 * delegates to UserManagementContainer for actual functionality.
 * 
 * Features:
 * - Backward compatibility with existing usage
 * - Automatic current user resolution via auth context
 * - Semantic HTML structure with proper ARIA labels
 * - Performance optimization with React.memo
 * 
 * @param currentUser - Optional user override (defaults to authenticated user)
 */
export const UserManagement: React.FC<UserManagementProps> = memo(({ currentUser: propCurrentUser }) => {
  const { user: authCurrentUser } = useAuth();
  const currentUser = propCurrentUser || authCurrentUser;
  
  if (!currentUser) {
    return (
      <Box 
        component="main" 
        role="main" 
        aria-label="사용자 관리 - 로그인 필요"
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3
        }}
      >
        <Box>로그인이 필요합니다.</Box>
      </Box>
    );
  }
  
  return (
    <Box component="main" role="main" aria-label="사용자 관리">
      <UserManagementContainer currentUser={currentUser} />
    </Box>
  );
});

// Display name for debugging
UserManagement.displayName = 'UserManagement';

// Default export for compatibility
export default UserManagement;