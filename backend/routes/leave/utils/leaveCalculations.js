/**
 * Helper function to calculate annual leave entitlement based on hire date
 * @param {Date|string} hireDate - Employee hire date
 * @returns {number} - Annual leave entitlement in days
 */
const calculateAnnualLeaveEntitlement = (hireDate) => {
  const now = new Date();
  const hire = new Date(hireDate);
  
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
};

/**
 * Helper function to get carry-over leave from previous year
 * @param {Object} db - Database instance
 * @param {ObjectId} userId - User ID
 * @param {number} currentYear - Current year
 * @returns {number} - Carry-over leave days
 */
const getCarryOverLeave = async (db, userId, currentYear) => {
  try {
    // Get carry-over adjustments for current year
    const carryOverAdjustments = await db.collection('leaveAdjustments').aggregate([
      {
        $match: {
          userId: userId,
          year: currentYear,
          adjustmentType: 'carry_over'
        }
      },
      {
        $group: {
          _id: null,
          totalCarryOver: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const manualCarryOver = carryOverAdjustments.length > 0 ? carryOverAdjustments[0].totalCarryOver : 0;

    // 자동 carry-over 계산 비활성화
    // 앞으로는 수동으로만 carry-over 추가하도록 함
    // 프로그램 시작 시에는 현재 년도 기본 연차만 계산
    
    return manualCarryOver;
  } catch (error) {
    console.error('Error calculating carry-over leave:', error);
    return 0;
  }
};

/**
 * Helper function to calculate business days based on policy
 * @param {Object} db - Database instance
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {Array} personalOffDays - Array of personal off days (YYYY-MM-DD format)
 * @returns {number} - Number of business days
 */
const calculateBusinessDaysWithPolicy = async (db, startDate, endDate, personalOffDays = []) => {
  const policy = await getCurrentPolicy(db);
  const start = new Date(startDate);
  const end = new Date(endDate);
  let daysCount = 0;
  let currentDate = new Date(start);
  let weekendDaysDetail = [];
  let personalOffDaysDetail = [];
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Check if it's a personal off day first
    if (personalOffDays.includes(dateString)) {
      personalOffDaysDetail.push(`Personal off day ${dateString}: 0 days`);
      // Personal off days don't count as leave days
    } else if (dayOfWeek === 0) { 
      // Sunday - use policy value
      const sundayValue = policy.specialRules.sundayLeave || 0;
      daysCount += sundayValue;
      if (sundayValue > 0) {
        weekendDaysDetail.push(`Sunday ${dateString}: ${sundayValue} days`);
      }
    } else if (dayOfWeek === 6) { 
      // Saturday - use policy value  
      const saturdayValue = policy.specialRules.saturdayLeave || 0.5;
      daysCount += saturdayValue;
      if (saturdayValue > 0) {
        weekendDaysDetail.push(`Saturday ${dateString}: ${saturdayValue} days`);
      }
    } else { 
      // Monday-Friday - 1 day
      daysCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Add debug logging
  if (personalOffDaysDetail.length > 0) {
    console.log(`👤 [DEBUG] 개인 오프일 계산 상세:`, personalOffDaysDetail);
  }
  if (weekendDaysDetail.length > 0) {
    console.log(`🔍 [DEBUG] 주말 일수 계산 상세:`, weekendDaysDetail);
    console.log(`🔍 [DEBUG] 주말 정책: 토요일=${policy.specialRules.saturdayLeave || 0.5}일, 일요일=${policy.specialRules.sundayLeave || 0}일`);
  }
  
  return Math.max(daysCount, 0);
};

/**
 * Helper function to get current leave policy
 * @param {Object} db - Database instance
 * @returns {Object} - Current leave policy
 */
const getCurrentPolicy = async (db) => {
  try {
    const policy = await db.collection('leavePolicy').findOne(
      { isActive: true },
      { sort: { createdAt: -1 } }
    );
    
    if (!policy) {
      // Return default policy if none exists
      return {
        specialRules: {
          saturdayLeave: 0.5,
          sundayLeave: 0,
          holidayLeave: 0
        },
        leaveTypes: {
          annual: {
            advanceNotice: 3,
            maxConsecutive: 15
          },
          family: {
            managerApproval: true,
            documentRequired: true
          },
          personal: {
            yearlyLimit: 3,
            paid: false
          }
        },
        businessRules: {
          minAdvanceDays: 3,
          maxConcurrentRequests: 3
        },
        carryOverRules: {
          maxCarryOverDays: 5,
          carryOverDeadline: '02-28'
        }
      };
    }
    
    return policy;
  } catch (error) {
    console.error('Error fetching leave policy:', error);
    // Return default values if error
    return {
      specialRules: {
        saturdayLeave: 0.5,
        sundayLeave: 0,
        holidayLeave: 0
      },
      leaveTypes: {
        annual: {
          advanceNotice: 3,
          maxConsecutive: 15
        },
        family: {
          managerApproval: true,
          documentRequired: true
        },
        personal: {
          yearlyLimit: 3,
          paid: false
        }
      },
      businessRules: {
        minAdvanceDays: 3,
        maxConcurrentRequests: 3
      },
      carryOverRules: {
        maxCarryOverDays: 5,
        carryOverDeadline: '02-28'
      }
    };
  }
};

module.exports = {
  calculateAnnualLeaveEntitlement,
  getCarryOverLeave,
  calculateBusinessDaysWithPolicy,
  getCurrentPolicy
};