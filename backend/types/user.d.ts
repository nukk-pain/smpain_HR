// Common type definitions for user-related operations

import { ObjectId } from 'mongodb';

/**
 * User roles in the system
 */
export type UserRole = 'Admin' | 'Supervisor' | 'User';

/**
 * User status for filtering
 */
export type UserStatus = 'active' | 'inactive' | 'all';

/**
 * Base user interface
 */
export interface User {
  _id: string | ObjectId;
  username: string;
  password?: string; // Should be excluded in responses
  name: string;
  employeeId: string;
  role: UserRole;
  department: string;
  email?: string;
  phoneNumber?: string;
  hireDate?: Date | string;
  birthDate?: Date | string;
  position?: string;
  baseSalary?: number;
  leaveBalance?: number;
  permissions?: string[];
  isActive: boolean;
  terminationDate?: Date | string | null;
  managerId?: string | ObjectId | null;
  contractType?: string;
  accountNumber?: string | null;
  incentiveFormula?: string | null;
  visibleTeams?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with deactivation metadata
 */
export interface DeactivatableUser extends User {
  deactivatedAt?: Date | null;
  deactivatedBy?: string | ObjectId | null;
  deactivationReason?: string | null;
}

/**
 * User creation data (excludes system-generated fields)
 */
export interface CreateUserData {
  username: string;
  password: string;
  name: string;
  employeeId: string;
  role: UserRole;
  department: string;
  email?: string;
  phoneNumber?: string;
  hireDate?: Date | string;
  birthDate?: Date | string;
  position?: string;
  baseSalary?: number;
  leaveBalance?: number;
  permissions?: string[];
  isActive?: boolean;
  managerId?: string | ObjectId | null;
  contractType?: string;
  accountNumber?: string | null;
  incentiveFormula?: string | null;
  visibleTeams?: string[];
}

/**
 * User update data (all fields optional)
 */
export interface UpdateUserData extends Partial<CreateUserData> {
  terminationDate?: Date | string | null;
  deactivatedAt?: Date | null;
  deactivatedBy?: string | ObjectId | null;
  deactivationReason?: string | null;
}

/**
 * User filter parameters
 */
export interface UserFilterParams {
  status?: UserStatus;
  includeInactive?: boolean;
  department?: string;
  role?: UserRole;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * User list response structure
 */
export interface UserListResponse {
  success: boolean;
  data: DeactivatableUser[];
  meta: {
    total: number;
    filter: {
      includeInactive: boolean;
      status: string;
      appliedFilter: Record<string, any>;
    };
  };
}

/**
 * Single user response structure
 */
export interface UserResponse {
  success: boolean;
  data: DeactivatableUser;
  message?: string;
}

/**
 * Deactivation request data
 */
export interface DeactivationRequest {
  reason?: string;
}

/**
 * User statistics
 */
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
}

/**
 * JWT user payload
 */
export interface JWTUserPayload {
  id: string;
  username: string;
  role: UserRole;
  userId?: string; // Legacy field for compatibility
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Authentication context
 */
export interface AuthContext {
  user: JWTUserPayload;
  permissions: string[];
}

/**
 * User permissions
 */
export type UserPermission = 
  | 'users:view'
  | 'users:manage'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'leave:view'
  | 'leave:manage'
  | 'payroll:view'
  | 'payroll:manage'
  | 'reports:view'
  | 'files:view'
  | 'files:manage'
  | 'departments:view'
  | 'departments:manage'
  | 'admin:permissions';

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  user: JWTUserPayload;
  permission: UserPermission;
};