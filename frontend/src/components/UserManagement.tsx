/**
 * UserManagement Component
 * 
 * Code-split version of the user management system with lazy loading
 * for optimal bundle size and loading performance.
 */

import React, { memo, useEffect } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { User } from '../types';
import { useAuth } from './AuthProvider';
import { 
  UserManagementContainerWithSuspense,
  preloadUserManagementComponents
} from './UserManagement.lazy';

// Component props interface
export interface UserManagementProps {
  currentUser?: User;
}

// Main loading fallback component
const MainLoadingFallback = () => (
  <Box 
    component="main" 
    role="main" 
    aria-label="사용자 관리 로딩 중"
    sx={{
      minHeight: '100vh',
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3
    }}
  >
    <CircularProgress size={48} />
    <Typography variant="h6" color="text.secondary">
      사용자 관리 시스템을 불러오는 중...
    </Typography>
    <Typography variant="body2" color="text.secondary">
      잠시만 기다려주세요
    </Typography>
  </Box>
);

/**
 * UserManagement - Code-split wrapper component
 * 
 * Uses lazy loading for optimal performance while maintaining
 * backward compatibility and progressive enhancement.
 */
const UserManagement: React.FC<UserManagementProps> = memo(({ currentUser: propCurrentUser }) => {
  const { user: authCurrentUser } = useAuth();
  const currentUser = propCurrentUser || authCurrentUser;

  // Preload commonly used components for better UX
  useEffect(() => {
    // Preload components that are likely to be used
    const preloadTimer = setTimeout(() => {
      preloadUserManagementComponents().catch(console.warn);
    }, 1000); // Preload after 1 second

    return () => clearTimeout(preloadTimer);
  }, []);

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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 3
        }}
      >
        <Alert severity="warning" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            로그인이 필요합니다
          </Typography>
          <Typography variant="body2">
            사용자 관리 기능을 사용하려면 먼저 로그인해 주세요.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box 
      component="main" 
      role="main" 
      aria-label="사용자 관리"
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}
    >
      <UserManagementContainerWithSuspense currentUser={currentUser} />
    </Box>
  );
});

// Display name for debugging
UserManagement.displayName = 'UserManagement';

// Export for compatibility
export { UserManagement };
export default UserManagement;