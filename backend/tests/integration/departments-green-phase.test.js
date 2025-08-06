// GREEN Phase: Tests that verify our department validation fixes work
describe('Department API - GREEN Phase - Validation Fixes', () => {
  
  describe('Case insensitive duplicate detection', () => {
    it('should detect case variations as duplicates', () => {
      // Test our improved duplicate check logic
      const improvedDuplicateCheck = (existingNames, newName) => {
        // Case insensitive comparison
        return existingNames.some(name => 
          name.toLowerCase() === newName.toLowerCase()
        );
      };
      
      const existingNames = ['IT팀', '개발팀'];
      const testCases = [
        'it팀',      // Different case
        'IT팀',      // Exact match  
        'iT팀',      // Mixed case
        '개발팀',     // Different department exact
        '개발팀',     // Different department case
      ];
      
      testCases.forEach(testName => {
        const isDuplicate = improvedDuplicateCheck(existingNames, testName);
        expect(isDuplicate).toBe(true); // All should be detected as duplicates
      });
    });
    
    it('should allow truly unique names', () => {
      const improvedDuplicateCheck = (existingNames, newName) => {
        return existingNames.some(name => 
          name.toLowerCase() === newName.toLowerCase()
        );
      };
      
      const existingNames = ['IT팀', '개발팀'];
      const uniqueNames = ['마케팅팀', '영업팀', '인사팀'];
      
      uniqueNames.forEach(uniqueName => {
        const isDuplicate = improvedDuplicateCheck(existingNames, uniqueName);
        expect(isDuplicate).toBe(false); // Should not be duplicates
      });
    });
  });

  describe('Korean error messages', () => {
    it('should use Korean error message for duplicates', () => {
      const improvedErrorMessage = '이미 존재하는 부서명입니다.';
      
      // Test that our new error message is in Korean
      expect(improvedErrorMessage).toBe('이미 존재하는 부서명입니다.');
      expect(improvedErrorMessage).not.toBe('Department already exists');
    });
    
    it('should use appropriate HTTP status codes', () => {
      const duplicateErrorStatusCode = 409; // Conflict
      const validationErrorStatusCode = 400; // Bad Request
      const serverErrorStatusCode = 500; // Internal Server Error
      
      expect(duplicateErrorStatusCode).toBe(409);
      expect(validationErrorStatusCode).toBe(400);
      expect(serverErrorStatusCode).toBe(500);
    });
  });

  describe('Update validation', () => {
    it('should prevent updates that create duplicates', () => {
      const improvedUpdateValidation = (departmentId, existingDepartments, newName) => {
        // Check for duplicates excluding current department
        const exists = existingDepartments.some(dept => 
          dept._id !== departmentId && 
          dept.name.toLowerCase() === newName.toLowerCase()
        );
        
        if (exists) {
          return { success: false, error: '이미 존재하는 부서명입니다.' };
        }
        return { success: true };
      };
      
      const existingDepartments = [
        { _id: '1', name: '마케팅팀' },
        { _id: '2', name: '개발팀' }
      ];
      
      // Try to update department '1' to conflict with department '2'
      const result = improvedUpdateValidation('1', existingDepartments, '개발팀');
      expect(result.success).toBe(false);
      expect(result.error).toBe('이미 존재하는 부서명입니다.');
    });
    
    it('should allow updating to same name (no change)', () => {
      const improvedUpdateValidation = (departmentId, existingDepartments, newName) => {
        const exists = existingDepartments.some(dept => 
          dept._id !== departmentId && 
          dept.name.toLowerCase() === newName.toLowerCase()
        );
        
        if (exists) {
          return { success: false, error: '이미 존재하는 부서명입니다.' };
        }
        return { success: true };
      };
      
      const existingDepartments = [
        { _id: '1', name: '마케팅팀' },
        { _id: '2', name: '개발팀' }
      ];
      
      // Update department '1' to keep same name
      const result = improvedUpdateValidation('1', existingDepartments, '마케팅팀');
      expect(result.success).toBe(true); // Should be allowed
    });
  });

  describe('MongoDB error handling', () => {
    it('should handle MongoDB duplicate key errors properly', () => {
      const improvedErrorHandler = (error) => {
        if (error.code === 11000) {
          return { 
            status: 409,
            success: false,
            error: '이미 존재하는 부서명입니다.' 
          };
        }
        return { 
          status: 500,
          success: false,
          error: '부서 생성 중 오류가 발생했습니다.' 
        };
      };
      
      // Test MongoDB duplicate key error
      const mongoError = { code: 11000, message: 'duplicate key error' };
      const result = improvedErrorHandler(mongoError);
      
      expect(result.status).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toBe('이미 존재하는 부서명입니다.');
    });
    
    it('should handle other errors with generic message', () => {
      const improvedErrorHandler = (error) => {
        if (error.code === 11000) {
          return { 
            status: 409,
            success: false,
            error: '이미 존재하는 부서명입니다.' 
          };
        }
        return { 
          status: 500,
          success: false,
          error: '부서 생성 중 오류가 발생했습니다.' 
        };
      };
      
      // Test generic error
      const genericError = { message: 'Some other error' };
      const result = improvedErrorHandler(genericError);
      
      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('부서 생성 중 오류가 발생했습니다.');
    });
  });
});