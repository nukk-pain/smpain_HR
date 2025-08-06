// RED Phase: Test that shows API doesn't use validateConsecutiveDays function yet
const { validateConsecutiveDays } = require('../../utils/leaveUtils');

describe('Leave API Validation Integration - RED Phase', () => {
  
  describe('API should use validateConsecutiveDays function', () => {
    it('should fail - API currently uses policy-based validation, not validateConsecutiveDays function', () => {
      // This test documents that the current API implementation 
      // uses policy.leaveTypes.annual.maxConsecutive (lines 55-60 in leaveRequests.js)
      // instead of our validateConsecutiveDays function
      
      // Mock current API validation logic (what's actually happening)
      const mockCurrentApiValidation = (daysCount) => {
        const policyMaxConsecutive = 15; // From policy.leaveTypes.annual.maxConsecutive
        if (daysCount > policyMaxConsecutive) {
          throw new Error(`연차는 최대 ${policyMaxConsecutive}일까지 연속으로 사용할 수 있습니다.`);
        }
        return true;
      };
      
      // Mock desired API validation logic (what we want)
      const mockDesiredApiValidation = (startDate, endDate, daysCount) => {
        return validateConsecutiveDays(startDate, endDate, daysCount);
      };
      
      // Current error message format
      const currentErrorMessage = '연차는 최대 15일까지 연속으로 사용할 수 있습니다.';
      
      // Desired error message format from our function
      const desiredErrorMessage = '최대 15일 연속 휴가만 신청 가능합니다.';
      
      // Test that current and desired implementations have different error messages
      let currentError = null;
      let desiredError = null;
      
      try {
        mockCurrentApiValidation(17.5);
      } catch (error) {
        currentError = error.message;
      }
      
      try {
        mockDesiredApiValidation('2025-01-01', '2025-01-18', 17.5);
      } catch (error) {
        desiredError = error.message;
      }
      
      // This test should FAIL initially to show the API isn't using our function yet
      expect(currentError).toBe(desiredError); // This will fail - different error messages
    });
    
    it('should fail - API validation should call validateConsecutiveDays directly', () => {
      // Mock what the API should do vs what it currently does
      let validateConsecutiveDaysCalled = false;
      
      // Mock the function to track if it's called
      const originalValidateConsecutiveDays = validateConsecutiveDays;
      const mockValidateConsecutiveDays = jest.fn((...args) => {
        validateConsecutiveDaysCalled = true;
        return originalValidateConsecutiveDays(...args);
      });
      
      // Simulate current API behavior (doesn't call validateConsecutiveDays)
      const simulateCurrentApiBehavior = (daysCount) => {
        // Current implementation checks policy directly
        const policyMaxConsecutive = 15;
        if (daysCount > policyMaxConsecutive) {
          throw new Error('연차는 최대 15일까지 연속으로 사용할 수 있습니다.');
        }
        // Notice: validateConsecutiveDays is NOT called
      };
      
      // Run current API simulation
      try {
        simulateCurrentApiBehavior(17.5);
      } catch (error) {
        // Expected error
      }
      
      // This test should FAIL initially because validateConsecutiveDays is not called in current API
      expect(validateConsecutiveDaysCalled).toBe(true); // Will fail - function not called
    });
  });
});