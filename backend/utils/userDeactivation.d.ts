// Type definitions for user deactivation utilities

/**
 * Deactivation data structure
 */
export interface DeactivationData {
  isActive: false;
  deactivatedAt: Date;
  deactivatedBy: string;
  deactivationReason: string | null;
  updatedAt: Date;
}

/**
 * Reactivation data structure
 */
export interface ReactivationData {
  isActive: true;
  deactivatedAt: null;
  deactivatedBy: null;
  deactivationReason: null;
  updatedAt: Date;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * User document structure for deactivation operations
 */
export interface UserDocument {
  _id: string | ObjectId;
  isActive: boolean;
  deactivatedAt?: Date | null;
  deactivatedBy?: string | null;
  deactivationReason?: string | null;
  [key: string]: any;
}

/**
 * Test user data structure
 */
export interface TestUserData {
  isActive: boolean;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
  deactivationReason: string | null;
  [key: string]: any;
}

/**
 * MongoDB filter query structure
 */
export interface UserStatusFilter {
  isActive?: boolean | { $ne: boolean };
}

/**
 * Creates deactivation update data object
 */
export function createDeactivationData(
  deactivatedBy: string,
  reason?: string | null
): DeactivationData;

/**
 * Creates reactivation update data object
 */
export function createReactivationData(): ReactivationData;

/**
 * Validates if a user can be deactivated
 */
export function validateDeactivation(
  user: UserDocument | null,
  requestingUserId: string
): ValidationResult;

/**
 * Validates if a user can be reactivated
 */
export function validateReactivation(
  user: UserDocument | null
): ValidationResult;

/**
 * Creates a test user with deactivation fields for testing purposes
 */
export function createTestUserData(
  baseUserData: Record<string, any>,
  isActive?: boolean,
  deactivatedBy?: string | null,
  reason?: string | null
): TestUserData;

/**
 * Query filter utility functions
 */
export const QueryFilters: {
  /**
   * Get filter for active users only
   */
  activeOnly(): UserStatusFilter;
  
  /**
   * Get filter for inactive users only
   */
  inactiveOnly(): UserStatusFilter;
  
  /**
   * Get filter based on status parameter
   */
  byStatus(status?: string, includeInactive?: boolean): UserStatusFilter;
};