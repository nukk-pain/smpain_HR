/**
 * User permissions hook
 * 
 * Provides comprehensive role-based permission checking and filtering
 * for user management operations with optimized performance and caching.
 */

import { useMemo, useCallback } from 'react';
import { User } from '../types';
import { USER_ROLES, UserRole } from '../constants/userRoles';

// Permission summary interface
export interface PermissionSummary {
  canManageUsers: boolean;
  canManageDepartments: boolean;
  canViewReports: boolean;
  canManagePayroll: boolean;
  canViewAllLeaves: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isUser: boolean;
  roleLevel: number;
}

// Action types for granular permissions
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';
export type PermissionResource = 'user' | 'department' | 'payroll' | 'leave' | 'report';

// Permission context for specific checks
export interface PermissionContext {
  targetUser?: User;
  department?: string;
  resource?: PermissionResource;
  action?: PermissionAction;
}

// Hook return interface
export interface UseUserPermissionsReturn {
  readonly canCreateUser: boolean;
  readonly canUpdateUser: (user: User) => boolean;
  readonly canDeleteUser: (user: User) => boolean;
  readonly canViewUser: (user: User) => boolean;
  readonly visibleUsers: readonly User[];
  readonly editableUsers: readonly User[];
  readonly deletableUsers: readonly User[];
  readonly hasHigherRole: (user: User) => boolean;
  readonly canAccessDepartment: (department: string) => boolean;
  readonly canPerformAction: (action: PermissionAction, resource: PermissionResource, context?: PermissionContext) => boolean;
  readonly getPermissionReason: (action: PermissionAction, resource: PermissionResource, context?: PermissionContext) => string;
  readonly permissions: PermissionSummary;
}

// Role hierarchy for comparison (higher number = higher privilege)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.SUPERVISOR]: 2,
  [USER_ROLES.USER]: 1
};

// Permission reasons for better UX
const PERMISSION_REASONS = {
  INSUFFICIENT_ROLE: '권한이 부족합니다.',
  DIFFERENT_DEPARTMENT: '다른 부서의 사용자는 관리할 수 없습니다.',
  CANNOT_DELETE_HIGHER_ROLE: '상위 권한자는 삭제할 수 없습니다.',
  CANNOT_MODIFY_SELF: '자신의 정보는 이 방법으로 수정할 수 없습니다.',
  SUCCESS: '권한이 있습니다.'
};

// Helper function to check role-based permissions
const hasRolePermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Helper function to check department access
const hasDepartmentAccess = (currentUser: User, targetDepartment: string): boolean => {
  if (currentUser.role === USER_ROLES.ADMIN) return true;
  return currentUser.department === targetDepartment;
};

/**
 * Custom hook for user permissions management
 */
export const useUserPermissions = (
  currentUser: User,
  users: User[]
): UseUserPermissionsReturn => {
  const currentUserRole = currentUser.role as UserRole;
  const currentRoleLevel = ROLE_HIERARCHY[currentUserRole] || 0;

  // Memoized role check functions for performance
  const canCreateUser = useMemo(() => {
    return hasRolePermission(currentUserRole, USER_ROLES.SUPERVISOR);
  }, [currentUserRole]);

  const canUpdateUser = useCallback((user: User): boolean => {
    if (user._id === currentUser._id) return false; // Cannot modify self through this interface
    if (currentUserRole === USER_ROLES.ADMIN) return true;
    if (currentUserRole === USER_ROLES.SUPERVISOR) {
      return hasDepartmentAccess(currentUser, user.department || '');
    }
    return false;
  }, [currentUserRole, currentUser]);

  const canDeleteUser = useCallback((user: User): boolean => {
    if (user._id === currentUser._id) return false; // Cannot delete self
    if (currentUserRole === USER_ROLES.ADMIN) {
      // Admin cannot delete other admins
      return user.role !== USER_ROLES.ADMIN;
    }
    return false; // Only admins can delete users
  }, [currentUserRole, currentUser]);

  const canViewUser = useCallback((user: User): boolean => {
    return true; // All users can view other users (basic info)
  }, []);

  // Enhanced role comparison with caching
  const hasHigherRole = useCallback((user: User): boolean => {
    const userRoleLevel = ROLE_HIERARCHY[user.role as UserRole] || 0;
    return currentRoleLevel > userRoleLevel;
  }, [currentRoleLevel]);

  // Department access with optimization
  const canAccessDepartment = useCallback((department: string): boolean => {
    return hasDepartmentAccess(currentUser, department);
  }, [currentUser]);

  // Generic permission checker
  const canPerformAction = useCallback((
    action: PermissionAction,
    resource: PermissionResource,
    context?: PermissionContext
  ): boolean => {
    // Admin has all permissions except self-modification restrictions
    if (currentUserRole === USER_ROLES.ADMIN) {
      if (resource === 'user' && context?.targetUser?._id === currentUser._id) {
        return action !== 'delete'; // Admin cannot delete themselves
      }
      return true;
    }

    // Supervisor permissions
    if (currentUserRole === USER_ROLES.SUPERVISOR) {
      switch (resource) {
        case 'user':
          if (action === 'delete') return false; // Supervisors cannot delete users
          if (context?.targetUser) {
            return hasDepartmentAccess(currentUser, context.targetUser.department || '');
          }
          return action === 'create' || action === 'read';
        case 'department':
          return action === 'read' && hasDepartmentAccess(currentUser, context?.department || '');
        case 'report':
          return action === 'read';
        case 'leave':
          return action === 'read' || action === 'update';
        case 'payroll':
          return action === 'read';
        default:
          return false;
      }
    }

    // Regular user permissions
    if (currentUserRole === USER_ROLES.USER) {
      switch (resource) {
        case 'user':
          return action === 'read'; // Can only view users
        case 'leave':
          return context?.targetUser?._id === currentUser._id; // Can only manage own leave
        default:
          return false;
      }
    }

    return false;
  }, [currentUserRole, currentUser]);

  // Permission reason provider for better UX
  const getPermissionReason = useCallback((
    action: PermissionAction,
    resource: PermissionResource,
    context?: PermissionContext
  ): string => {
    if (canPerformAction(action, resource, context)) {
      return PERMISSION_REASONS.SUCCESS;
    }

    if (context?.targetUser?._id === currentUser._id && action === 'delete') {
      return PERMISSION_REASONS.CANNOT_MODIFY_SELF;
    }

    if (currentUserRole === USER_ROLES.SUPERVISOR && resource === 'user') {
      if (context?.targetUser && !hasDepartmentAccess(currentUser, context.targetUser.department || '')) {
        return PERMISSION_REASONS.DIFFERENT_DEPARTMENT;
      }
      if (action === 'delete') {
        return PERMISSION_REASONS.CANNOT_DELETE_HIGHER_ROLE;
      }
    }

    return PERMISSION_REASONS.INSUFFICIENT_ROLE;
  }, [canPerformAction, currentUserRole, currentUser]);

  // Optimized filtered user lists with memoization
  const visibleUsers = useMemo(() => {
    return users; // All users can see all users (basic info)
  }, [users]);

  const editableUsers = useMemo(() => {
    if (currentUserRole === USER_ROLES.ADMIN) {
      return users.filter(user => user._id !== currentUser._id); // Admin cannot edit self
    }
    if (currentUserRole === USER_ROLES.SUPERVISOR) {
      return users.filter(user => 
        user._id !== currentUser._id && 
        hasDepartmentAccess(currentUser, user.department || '')
      );
    }
    return [];
  }, [users, currentUserRole, currentUser]);

  const deletableUsers = useMemo(() => {
    if (currentUserRole === USER_ROLES.ADMIN) {
      return users.filter(user => 
        user._id !== currentUser._id && 
        user.role !== USER_ROLES.ADMIN
      );
    }
    return []; // Only admins can delete users
  }, [users, currentUserRole, currentUser]);

  // Enhanced permission summary
  const permissions = useMemo((): PermissionSummary => ({
    canManageUsers: hasRolePermission(currentUserRole, USER_ROLES.SUPERVISOR),
    canManageDepartments: hasRolePermission(currentUserRole, USER_ROLES.ADMIN),
    canViewReports: hasRolePermission(currentUserRole, USER_ROLES.SUPERVISOR),
    canManagePayroll: hasRolePermission(currentUserRole, USER_ROLES.ADMIN),
    canViewAllLeaves: hasRolePermission(currentUserRole, USER_ROLES.SUPERVISOR),
    isAdmin: currentUserRole === USER_ROLES.ADMIN,
    isSupervisor: currentUserRole === USER_ROLES.SUPERVISOR,
    isUser: currentUserRole === USER_ROLES.USER,
    roleLevel: currentRoleLevel
  }), [currentUserRole, currentRoleLevel]);

  return {
    canCreateUser,
    canUpdateUser,
    canDeleteUser,
    canViewUser,
    visibleUsers: Object.freeze(visibleUsers) as readonly User[],
    editableUsers: Object.freeze(editableUsers) as readonly User[],
    deletableUsers: Object.freeze(deletableUsers) as readonly User[],
    hasHigherRole,
    canAccessDepartment,
    canPerformAction,
    getPermissionReason,
    permissions
  };
};