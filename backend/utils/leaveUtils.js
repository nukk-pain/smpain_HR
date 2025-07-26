// Leave-related utility functions

/**
 * Calculate annual leave entitlement based on hire date
 * @param {Date|string} hireDate - Employee hire date
 * @returns {number} Annual leave days entitlement
 */
function calculateAnnualLeaveEntitlement(hireDate) {
  // Handle null, undefined, or invalid hire dates
  if (!hireDate || hireDate === null || hireDate === undefined) {
    console.warn('calculateAnnualLeaveEntitlement: Invalid hire date provided:', hireDate);
    return 0; // Return 0 for invalid dates instead of defaulting to max
  }
  
  const now = new Date();
  const hire = new Date(hireDate);
  
  // Check if hire date is valid
  if (isNaN(hire.getTime())) {
    console.warn('calculateAnnualLeaveEntitlement: Invalid hire date format:', hireDate);
    return 0;
  }
  
  // Check if hire date is in the future
  if (hire > now) {
    console.warn('calculateAnnualLeaveEntitlement: Hire date is in the future:', hireDate);
    return 0;
  }
  
  // Calculate years of service
  const yearsOfService = Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 365.25));
  
  if (yearsOfService === 0) {
    // For employees with less than 1 year: 1 day per completed month from hire date
    // 근로기준법: 1개월 개근 시 1일의 유급휴가
    let monthsPassed = 0;
    let checkDate = new Date(hire);
    
    // Count completed months from hire date
    while (true) {
      // Move to the same day next month
      checkDate.setMonth(checkDate.getMonth() + 1);
      
      // If this date hasn't passed yet, break
      if (checkDate > now) {
        break;
      }
      
      monthsPassed++;
    }
    
    return Math.min(monthsPassed, 11); // Maximum 11 days in first year
  } else {
    // For 1+ year employees: 15 + (years - 1), max 25 days
    return Math.min(15 + (yearsOfService - 1), 25);
  }
}

/**
 * Calculate years of service
 * @param {Date|string} hireDate - Employee hire date
 * @returns {number} Years of service
 */
function calculateYearsOfService(hireDate) {
  // Handle null, undefined, or invalid hire dates
  if (!hireDate || hireDate === null || hireDate === undefined) {
    return 0;
  }
  
  const now = new Date();
  const hire = new Date(hireDate);
  
  if (isNaN(hire.getTime())) return 0;
  
  // Check if hire date is in the future
  if (hire > now) return 0;
  
  return Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Check if leave request dates are valid
 * @param {Date|string} startDate - Leave start date
 * @param {Date|string} endDate - Leave end date
 * @returns {Object} Validation result with isValid and error message
 */
function validateLeaveDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  // Reset time parts for date comparison
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  if (start > end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }
  
  if (start < now) {
    return { isValid: false, error: 'Leave cannot be requested for past dates' };
  }
  
  // Check minimum advance notice (3 days)
  const minAdvanceDate = new Date(now);
  minAdvanceDate.setDate(now.getDate() + 3);
  
  if (start < minAdvanceDate) {
    return { isValid: false, error: 'Leave must be requested at least 3 days in advance' };
  }
  
  return { isValid: true };
}

/**
 * Calculate business days between two dates excluding weekends
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {Object} policy - Leave policy configuration
 * @returns {number} Number of leave days
 */
function calculateLeaveDays(startDate, endDate, policy = {}) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  let totalDays = 0;
  const currentDate = new Date(start);
  
  // Default policy values
  const saturdayMultiplier = policy.saturdayMultiplier ?? 0.5;
  const sundayMultiplier = policy.sundayMultiplier ?? 0;
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    
    if (dayOfWeek === 0) { // Sunday
      totalDays += sundayMultiplier;
    } else if (dayOfWeek === 6) { // Saturday
      totalDays += saturdayMultiplier;
    } else { // Monday to Friday
      totalDays += 1;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return totalDays;
}

/**
 * Check if employee has sufficient leave balance
 * @param {number} currentBalance - Current leave balance
 * @param {number} requestedDays - Requested leave days
 * @param {Object} policy - Leave policy configuration
 * @returns {Object} Check result with isValid and remaining balance
 */
function checkLeaveBalance(currentBalance, requestedDays, policy = {}) {
  const maxAdvanceUsage = policy.maxAdvanceUsageDays ?? 3;
  const allowAdvanceUsage = policy.allowAdvanceUsage ?? true;
  
  const remainingBalance = currentBalance - requestedDays;
  
  if (remainingBalance >= 0) {
    return {
      isValid: true,
      remainingBalance,
      isAdvanceUsage: false
    };
  }
  
  if (allowAdvanceUsage && Math.abs(remainingBalance) <= maxAdvanceUsage) {
    return {
      isValid: true,
      remainingBalance,
      isAdvanceUsage: true,
      advanceDays: Math.abs(remainingBalance)
    };
  }
  
  return {
    isValid: false,
    error: `Insufficient leave balance. Current: ${currentBalance}, Requested: ${requestedDays}`,
    remainingBalance
  };
}

/**
 * Get leave status display information
 * @param {string} status - Leave request status
 * @returns {Object} Status display information
 */
function getLeaveStatusInfo(status) {
  const statusMap = {
    'pending': { label: '대기중', color: 'orange', priority: 1 },
    'approved': { label: '승인됨', color: 'green', priority: 2 },
    'rejected': { label: '거부됨', color: 'red', priority: 3 },
    'cancelled': { label: '취소됨', color: 'gray', priority: 4 }
  };
  
  return statusMap[status] || { label: '알 수 없음', color: 'gray', priority: 0 };
}

/**
 * Calculate carry-over leave for year-end processing
 * @param {number} totalEntitlement - Total annual entitlement
 * @param {number} usedDays - Days used during the year
 * @param {Object} policy - Leave policy configuration
 * @returns {number} Days eligible for carry-over
 */
function calculateCarryOverLeave(totalEntitlement, usedDays, policy = {}) {
  const maxCarryOver = policy.maxCarryOverDays ?? 15;
  const remainingDays = totalEntitlement - usedDays;
  
  return Math.min(Math.max(remainingDays, 0), maxCarryOver);
}

/**
 * Check for conflicting leave requests
 * @param {Date|string} startDate - New request start date
 * @param {Date|string} endDate - New request end date
 * @param {Array} existingRequests - Array of existing leave requests
 * @returns {Object} Conflict check result
 */
function checkLeaveConflicts(startDate, endDate, existingRequests) {
  const newStart = new Date(startDate);
  const newEnd = new Date(endDate);
  
  const conflicts = existingRequests.filter(request => {
    if (request.status === 'rejected' || request.status === 'cancelled') {
      return false;
    }
    
    const existingStart = new Date(request.startDate);
    const existingEnd = new Date(request.endDate);
    
    // Check for overlap
    return (newStart <= existingEnd && newEnd >= existingStart);
  });
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    conflictCount: conflicts.length
  };
}

module.exports = {
  calculateAnnualLeaveEntitlement,
  calculateYearsOfService,
  validateLeaveDates,
  calculateLeaveDays,
  checkLeaveBalance,
  getLeaveStatusInfo,
  calculateCarryOverLeave,
  checkLeaveConflicts
};