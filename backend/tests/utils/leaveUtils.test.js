// Unit tests for leaveUtils
const {
  calculateAnnualLeaveEntitlement,
  calculateYearsOfService,
  validateLeaveDates,
  calculateLeaveDays,
  checkLeaveBalance,
  getLeaveStatusInfo,
  calculateCarryOverLeave,
  checkLeaveConflicts,
  validateConsecutiveDays
} = require('../../utils/leaveUtils');

describe('leaveUtils', () => {
  describe('calculateAnnualLeaveEntitlement', () => {
    it('should calculate leave for first year employees (monthly basis)', () => {
      // Employee hired 6 months ago
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const entitlement = calculateAnnualLeaveEntitlement(sixMonthsAgo);
      expect(entitlement).toBe(6);
    });

    it('should cap first year entitlement at 11 days', () => {
      // Employee hired 13 months ago (first year completed)
      const thirteenMonthsAgo = new Date();
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
      
      const entitlement = calculateAnnualLeaveEntitlement(thirteenMonthsAgo);
      expect(entitlement).toBeGreaterThan(11); // Should be calculated as 1+ year employee
    });

    it('should calculate leave for 1+ year employees', () => {
      // Employee hired 2 years ago
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      const entitlement = calculateAnnualLeaveEntitlement(twoYearsAgo);
      expect(entitlement).toBe(16); // 15 + (2-1) = 16
    });

    it('should cap maximum entitlement at 25 days', () => {
      // Employee hired 20 years ago
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
      
      const entitlement = calculateAnnualLeaveEntitlement(twentyYearsAgo);
      expect(entitlement).toBe(25); // Maximum cap
    });

    it('should handle string date input', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const entitlement = calculateAnnualLeaveEntitlement(oneYearAgo.toISOString());
      expect(entitlement).toBe(15); // 15 + (1-1) = 15
    });
  });

  describe('calculateYearsOfService', () => {
    it('should calculate years of service correctly', () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      
      const years = calculateYearsOfService(threeYearsAgo);
      expect(years).toBe(3);
    });

    it('should return 0 for invalid date', () => {
      const years = calculateYearsOfService('invalid-date');
      expect(years).toBe(0);
    });
  });

  describe('validateLeaveDates', () => {
    it('should validate correct leave dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 4); // 4 days from now
      
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 5);
      
      const result = validateLeaveDates(tomorrow, dayAfterTomorrow);
      expect(result.isValid).toBe(true);
    });

    it('should reject past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const today = new Date();
      
      const result = validateLeaveDates(yesterday, today);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('past dates');
    });

    it('should reject start date after end date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 5);
      
      const result = validateLeaveDates(startDate, endDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('before end date');
    });

    it('should enforce minimum advance notice', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      
      const result = validateLeaveDates(tomorrow, dayAfterTomorrow);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('3 days in advance');
    });

    it('should handle invalid date format', () => {
      const result = validateLeaveDates('invalid', 'date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format');
    });
  });

  describe('calculateLeaveDays', () => {
    it('should calculate weekdays correctly', () => {
      // Monday to Friday (5 days)
      const days = calculateLeaveDays('2025-01-06', '2025-01-10');
      expect(days).toBe(5);
    });

    it('should handle Saturday with default multiplier (0.5)', () => {
      // Friday to Saturday (1.5 days: 1 + 0.5)
      const days = calculateLeaveDays('2025-01-10', '2025-01-11');
      expect(days).toBe(1.5);
    });

    it('should handle Sunday with default multiplier (0)', () => {
      // Saturday to Sunday (0.5 days: 0.5 + 0)
      const days = calculateLeaveDays('2025-01-11', '2025-01-12');
      expect(days).toBe(0.5);
    });

    it('should use custom policy multipliers', () => {
      const policy = {
        saturdayMultiplier: 1,
        sundayMultiplier: 0.5
      };
      
      // Saturday to Sunday with custom policy
      const days = calculateLeaveDays('2025-01-11', '2025-01-12', policy);
      expect(days).toBe(1.5); // 1 + 0.5
    });

    it('should handle single day', () => {
      // Single weekday
      const days = calculateLeaveDays('2025-01-06', '2025-01-06');
      expect(days).toBe(1);
    });

    it('should return 0 for invalid dates', () => {
      const days = calculateLeaveDays('invalid', 'date');
      expect(days).toBe(0);
    });
  });

  describe('checkLeaveBalance', () => {
    it('should allow leave within balance', () => {
      const result = checkLeaveBalance(10, 5);
      
      expect(result.isValid).toBe(true);
      expect(result.remainingBalance).toBe(5);
      expect(result.isAdvanceUsage).toBe(false);
    });

    it('should allow advance usage within policy limit', () => {
      const policy = { allowAdvanceUsage: true, maxAdvanceUsageDays: 3 };
      const result = checkLeaveBalance(1, 3, policy);
      
      expect(result.isValid).toBe(true);
      expect(result.remainingBalance).toBe(-2);
      expect(result.isAdvanceUsage).toBe(true);
      expect(result.advanceDays).toBe(2);
    });

    it('should reject excessive advance usage', () => {
      const policy = { allowAdvanceUsage: true, maxAdvanceUsageDays: 3 };
      const result = checkLeaveBalance(0, 5, policy);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Insufficient leave balance');
    });

    it('should reject advance usage when disabled', () => {
      const policy = { allowAdvanceUsage: false };
      const result = checkLeaveBalance(1, 3, policy);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Insufficient leave balance');
    });
  });

  describe('getLeaveStatusInfo', () => {
    it('should return correct status info for pending', () => {
      const info = getLeaveStatusInfo('pending');
      
      expect(info.label).toBe('대기중');
      expect(info.color).toBe('orange');
      expect(info.priority).toBe(1);
    });

    it('should return correct status info for approved', () => {
      const info = getLeaveStatusInfo('approved');
      
      expect(info.label).toBe('승인됨');
      expect(info.color).toBe('green');
      expect(info.priority).toBe(2);
    });

    it('should handle unknown status', () => {
      const info = getLeaveStatusInfo('unknown');
      
      expect(info.label).toBe('알 수 없음');
      expect(info.color).toBe('gray');
      expect(info.priority).toBe(0);
    });
  });

  describe('calculateCarryOverLeave', () => {
    it('should calculate carry-over within policy limit', () => {
      const carryOver = calculateCarryOverLeave(15, 5); // 10 remaining, max 15
      expect(carryOver).toBe(10);
    });

    it('should cap carry-over at policy maximum', () => {
      const carryOver = calculateCarryOverLeave(25, 5); // 20 remaining, max 15
      expect(carryOver).toBe(15);
    });

    it('should return 0 when no days remaining', () => {
      const carryOver = calculateCarryOverLeave(15, 20); // -5 remaining
      expect(carryOver).toBe(0);
    });

    it('should use custom policy limit', () => {
      const policy = { maxCarryOverDays: 20 };
      const carryOver = calculateCarryOverLeave(25, 5, policy);
      expect(carryOver).toBe(20);
    });
  });

  describe('checkLeaveConflicts', () => {
    const existingRequests = [
      {
        startDate: '2025-02-01',
        endDate: '2025-02-03',
        status: 'approved'
      },
      {
        startDate: '2025-02-10',
        endDate: '2025-02-12',
        status: 'pending'
      },
      {
        startDate: '2025-02-20',
        endDate: '2025-02-22',
        status: 'rejected' // Should be ignored
      }
    ];

    it('should detect no conflicts for non-overlapping dates', () => {
      const result = checkLeaveConflicts('2025-02-05', '2025-02-07', existingRequests);
      
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect conflicts with approved requests', () => {
      const result = checkLeaveConflicts('2025-02-02', '2025-02-04', existingRequests);
      
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].status).toBe('approved');
    });

    it('should detect conflicts with pending requests', () => {
      const result = checkLeaveConflicts('2025-02-11', '2025-02-13', existingRequests);
      
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].status).toBe('pending');
    });

    it('should ignore rejected and cancelled requests', () => {
      const result = checkLeaveConflicts('2025-02-21', '2025-02-23', existingRequests);
      
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect multiple conflicts', () => {
      const result = checkLeaveConflicts('2025-01-31', '2025-02-11', existingRequests);
      
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflictCount).toBe(2);
    });

    it('should handle exact date matches', () => {
      const result = checkLeaveConflicts('2025-02-01', '2025-02-03', existingRequests);
      
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });

    it('should handle containing date ranges', () => {
      const result = checkLeaveConflicts('2025-01-30', '2025-02-15', existingRequests);
      
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(2); // Contains both approved and pending
    });
  });

  describe('validateConsecutiveDays', () => {
    it('should throw error when days exceed 15', () => {
      expect(() => {
        validateConsecutiveDays('2025-01-01', '2025-01-18', 17.5);
      }).toThrow('최대 15일 연속 휴가만 신청 가능합니다.');
    });
    
    it('should pass when days are exactly 15', () => {
      expect(() => {
        validateConsecutiveDays('2025-01-01', '2025-01-15', 15);
      }).not.toThrow();
    });
    
    it('should pass when days are less than 15', () => {
      expect(() => {
        validateConsecutiveDays('2025-01-01', '2025-01-05', 5);
      }).not.toThrow();
    });
  });
});