/**
 * User role constants and utilities
 * 
 * Centralized role management for the HR system with type safety
 * and permission mapping functionality.
 */

// Immutable role constants
export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  USER: 'user'
} as const;

// Type-safe user role type
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Available roles as array for iteration
export const USER_ROLE_VALUES = Object.values(USER_ROLES);

/**
 * Type guard to check if a value is a valid UserRole
 */
export const isValidRole = (role: unknown): role is UserRole => {
  return typeof role === 'string' && USER_ROLE_VALUES.includes(role as UserRole);
};

// Korean display names for roles
const ROLE_DISPLAY_NAMES: Readonly<Record<UserRole, string>> = {
  [USER_ROLES.ADMIN]: '관리자',
  [USER_ROLES.SUPERVISOR]: '수퍼바이저',
  [USER_ROLES.USER]: '사용자'
} as const;

/**
 * Get localized display name for a role
 */
export const getRoleDisplayName = (role: UserRole): string => {
  return ROLE_DISPLAY_NAMES[role] ?? '';
};

// Base permissions
const BASE_PERMISSIONS = {
  USERS: ['users:view', 'users:create', 'users:update', 'users:delete'] as const,
  DEPARTMENTS: ['departments:view', 'departments:manage'] as const,
  LEAVE: ['leave:view', 'leave:manage'] as const,
  PAYROLL: ['payroll:view', 'payroll:manage'] as const,
  REPORTS: ['reports:view'] as const,
  FILES: ['files:view', 'files:manage'] as const,
  ADMIN: ['admin:permissions'] as const
} as const;

// Role-based permission mapping
const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly string[]>> = {
  [USER_ROLES.ADMIN]: [
    ...BASE_PERMISSIONS.USERS,
    ...BASE_PERMISSIONS.DEPARTMENTS,
    ...BASE_PERMISSIONS.LEAVE,
    ...BASE_PERMISSIONS.PAYROLL,
    ...BASE_PERMISSIONS.REPORTS,
    ...BASE_PERMISSIONS.FILES,
    ...BASE_PERMISSIONS.ADMIN
  ],
  [USER_ROLES.SUPERVISOR]: [
    'users:view', 'users:update',
    ...BASE_PERMISSIONS.DEPARTMENTS,
    ...BASE_PERMISSIONS.LEAVE,
    ...BASE_PERMISSIONS.PAYROLL,
    ...BASE_PERMISSIONS.REPORTS,
    ...BASE_PERMISSIONS.FILES
  ],
  [USER_ROLES.USER]: [
    'leave:view'
  ]
} as const;

/**
 * Get permissions array for a specific role
 */
export const getRolePermissions = (role: UserRole): readonly string[] => {
  return ROLE_PERMISSIONS[role] ?? [];
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: UserRole, permission: string): boolean => {
  return getRolePermissions(role).includes(permission);
};