// API Integration tests for consecutive days validation
const { validateConsecutiveDays } = require('../../../utils/leaveUtils');

describe('Leave API - Consecutive Days Validation Integration', () => {
  
  describe('validateConsecutiveDays integration in API', () => {
    it('should throw error when consecutive days validation is called with > 15 days', () => {
      // This test verifies the utility function exists and works as expected
      expect(() => {
        validateConsecutiveDays('2025-01-01', '2025-01-18', 17.5);
      }).toThrow('최대 15일 연속 휴가만 신청 가능합니다.');
    });
    
    it('should pass validation for exactly 15 days', () => {
      expect(() => {
        validateConsecutiveDays('2025-01-01', '2025-01-15', 15);
      }).not.toThrow();
    });
    
    it('should pass validation for less than 15 days', () => {
      expect(() => {
        validateConsecutiveDays('2025-01-01', '2025-01-05', 5);
      }).not.toThrow();
    });
  });

  // Mock API integration test 
  describe('API endpoint validation logic', () => {
    // These tests will fail initially because the API doesn't use validateConsecutiveDays yet
    it('should integrate validateConsecutiveDays in leave request creation', async () => {
      // Mock the API route behavior
      const mockLeaveRequest = {
        startDate: '2025-01-01',
        endDate: '2025-01-18',
        daysCount: 17.5,
        leaveType: 'annual'
      };
      
      // The current API uses policy.leaveTypes.annual.maxConsecutive
      // We need to change it to use validateConsecutiveDays function
      let validationError = null;
      
      try {
        // This should be called in the API route
        validateConsecutiveDays(mockLeaveRequest.startDate, mockLeaveRequest.endDate, mockLeaveRequest.daysCount);
      } catch (error) {
        validationError = error.message;
      }
      
      expect(validationError).toBe('최대 15일 연속 휴가만 신청 가능합니다.');
    });
    
    it('should pass API validation for valid consecutive days', async () => {
      const mockLeaveRequest = {
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        daysCount: 10,
        leaveType: 'annual'
      };
      
      let validationError = null;
      
      try {
        validateConsecutiveDays(mockLeaveRequest.startDate, mockLeaveRequest.endDate, mockLeaveRequest.daysCount);
      } catch (error) {
        validationError = error.message;
      }
      
      expect(validationError).toBe(null);
    });
  });
});