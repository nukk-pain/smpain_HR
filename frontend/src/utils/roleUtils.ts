import { UserRole } from '../types';

/**
 * Get display name for user role
 */
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '관리자';
    case 'supervisor':
      return '감독자';
    case 'user':
      return '사용자';
    default:
      return role;
  }
};

/**
 * Get role color for Material-UI components
 */
export const getRoleColor = (role: UserRole): 'error' | 'warning' | 'primary' | 'secondary' => {
  switch (role) {
    case 'admin':
      return 'error';
    case 'supervisor':
      return 'warning';
    case 'user':
      return 'primary';
    default:
      return 'secondary';
  }
};

/**
 * Check if role has supervisor privileges
 */
export const isSupervisorRole = (role: UserRole): boolean => {
  return role === 'supervisor' || role === 'admin';
};

/**
 * Check if role has admin privileges
 */
export const isAdminRole = (role: UserRole): boolean => {
  return role === 'admin';
};