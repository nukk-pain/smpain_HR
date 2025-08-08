// User deactivation utilities to eliminate code duplication
// Type definitions are available in userDeactivation.d.ts

/**
 * Creates deactivation update data object
 * @param {string} deactivatedBy - ID of the user performing the deactivation
 * @param {string|null} [reason=null] - Reason for deactivation (optional)
 * @returns {DeactivationData} Update data for deactivation
 */
function createDeactivationData(deactivatedBy, reason = null) {
  return {
    isActive: false,
    deactivatedAt: new Date(),
    deactivatedBy: deactivatedBy,
    deactivationReason: reason,
    updatedAt: new Date()
  };
}

/**
 * Creates reactivation update data object
 * @returns {ReactivationData} Update data for reactivation
 */
function createReactivationData() {
  return {
    isActive: true,
    deactivatedAt: null,
    deactivatedBy: null,
    deactivationReason: null,
    updatedAt: new Date()
  };
}

/**
 * Validates if a user can be deactivated
 * @param {UserDocument|null} user - User object from database
 * @param {string} requestingUserId - ID of user making the request
 * @returns {ValidationResult} { valid: boolean, error?: string }
 */
function validateDeactivation(user, requestingUserId) {
  if (!user) {
    return { valid: false, error: 'User not found' };
  }
  
  if (user.isActive === false) {
    return { valid: false, error: 'User is already deactivated' };
  }
  
  if (user._id.toString() === requestingUserId || user._id === requestingUserId) {
    return { valid: false, error: 'You cannot deactivate your own account' };
  }
  
  return { valid: true };
}

/**
 * Validates if a user can be reactivated
 * @param {UserDocument|null} user - User object from database
 * @returns {ValidationResult} { valid: boolean, error?: string }
 */
function validateReactivation(user) {
  if (!user) {
    return { valid: false, error: 'User not found' };
  }
  
  if (user.isActive !== false) {
    return { valid: false, error: 'User is already active' };
  }
  
  return { valid: true };
}

/**
 * Creates a test user with deactivation fields for testing purposes
 * @param {Object} baseUserData - Base user data
 * @param {boolean} [isActive=true] - Whether user should be active
 * @param {string|null} [deactivatedBy=null] - ID of deactivator (if inactive)
 * @param {string|null} [reason=null] - Deactivation reason (if inactive)
 * @returns {TestUserData} User data with deactivation fields
 */
function createTestUserData(baseUserData, isActive = true, deactivatedBy = null, reason = null) {
  return {
    ...baseUserData,
    isActive: isActive,
    deactivatedAt: isActive ? null : new Date(),
    deactivatedBy: isActive ? null : deactivatedBy,
    deactivationReason: isActive ? null : reason
  };
}

/**
 * Filter query builders for user status
 */
const QueryFilters = {
  /**
   * Get filter for active users only
   * @returns {UserStatusFilter} MongoDB filter object
   */
  activeOnly() {
    return { isActive: { $ne: false } };
  },
  
  /**
   * Get filter for inactive users only
   * @returns {UserStatusFilter} MongoDB filter object
   */
  inactiveOnly() {
    return { isActive: false };
  },
  
  /**
   * Get filter based on status parameter
   * @param {string} [status] - 'active', 'inactive', or 'all'
   * @param {boolean} [includeInactive=false] - Legacy parameter
   * @returns {UserStatusFilter} MongoDB filter object
   */
  byStatus(status, includeInactive = false) {
    if (status === 'inactive') {
      return this.inactiveOnly();
    } else if (status === 'active') {
      return { isActive: true };
    } else if (includeInactive || status === 'all') {
      return {}; // No filter - include all
    } else {
      return this.activeOnly(); // Default
    }
  }
};

module.exports = {
  createDeactivationData,
  createReactivationData,
  validateDeactivation,
  validateReactivation,
  createTestUserData,
  QueryFilters
};