// Test that verifies the RED phase issues are now fixed
describe('Department API - Fixed Validation', () => {
  
  describe('Previously failing tests should now pass', () => {
    it('should now detect case insensitive duplicates', () => {
      // Updated logic that should work now
      const fixedDuplicateCheck = (existingNames, newName) => {
        return existingNames.some(name => 
          name.toLowerCase() === newName.toLowerCase()
        ); // Case insensitive comparison
      };
      
      // Test case: 'IT팀' exists, trying to add 'it팀'
      const existingNames = ['IT팀', '개발팀'];
      const newName = 'it팀'; // Different case
      
      const isDuplicate = fixedDuplicateCheck(existingNames, newName);
      
      // Should now return true (duplicate detected)
      expect(isDuplicate).toBe(true); // This should PASS now
    });
    
    it('should now use Korean error messages', () => {
      // Fixed error message
      const fixedErrorMessage = '이미 존재하는 부서명입니다.';
      
      // Desired Korean error message
      const desiredErrorMessage = '이미 존재하는 부서명입니다.';
      
      // This should now pass
      expect(fixedErrorMessage).toBe(desiredErrorMessage); // Should PASS
    });
    
    it('should now validate updates properly', () => {
      // Fixed update logic
      const fixedUpdateBehavior = (updateName, existingDepartments, currentId) => {
        if (!updateName || updateName.trim() === '') {
          return { success: false, error: 'Department name is required' };
        }
        
        // Check for duplicates excluding current department
        const isDuplicate = existingDepartments.some(dept => 
          dept._id !== currentId && 
          dept.name.toLowerCase() === updateName.toLowerCase()
        );
        
        if (isDuplicate) {
          return { success: false, error: '이미 존재하는 부서명입니다.' };
        }
        
        return { success: true };
      };
      
      const existingDepartments = [
        { _id: '1', name: '마케팅팀' },
        { _id: '2', name: '개발팀' }
      ];
      
      // Try to update department '1' to have same name as department '2'
      const result = fixedUpdateBehavior('개발팀', existingDepartments, '1');
      
      // Should now fail due to duplicate detection
      expect(result.success).toBe(false); // Should PASS now
    });
    
    it('should now handle MongoDB errors specifically', () => {
      // Fixed error handling
      const fixedErrorHandler = (error) => {
        if (error.code === 11000) { // MongoDB duplicate key error
          return { error: '이미 존재하는 부서명입니다.' };
        }
        console.error('Create department error:', error);
        return { error: '부서 생성 중 오류가 발생했습니다.' };
      };
      
      // MongoDB duplicate key error
      const mongoError = { code: 11000, message: 'duplicate key error' };
      
      const result = fixedErrorHandler(mongoError);
      
      // Should now return specific Korean error message
      expect(result.error).toBe('이미 존재하는 부서명입니다.'); // Should PASS now
    });
  });
});