const { ObjectId } = require('mongodb');

// Mock the approval logic for unit testing
describe('Leave Approval Validation - Unit Test', () => {
  
  const mockValidateRejectionReason = (action, comment) => {
    // This mirrors the logic we added to the approval endpoints
    if (action === 'reject' && (!comment || comment.trim().length === 0)) {
      return {
        isValid: false,
        error: 'Rejection reason is required',
        message: 'Please provide a reason for rejecting this leave request'
      };
    }
    return { isValid: true };
  };

  test('should allow approval without comment', () => {
    const result = mockValidateRejectionReason('approve', '');
    expect(result.isValid).toBe(true);
  });

  test('should allow approval with comment', () => {
    const result = mockValidateRejectionReason('approve', 'Looks good');
    expect(result.isValid).toBe(true);
  });

  test('should allow rejection with valid comment', () => {
    const result = mockValidateRejectionReason('reject', 'Not enough coverage');
    expect(result.isValid).toBe(true);
  });

  test('should reject rejection without comment', () => {
    const result = mockValidateRejectionReason('reject', '');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Rejection reason is required');
  });

  test('should reject rejection with only whitespace comment', () => {
    const result = mockValidateRejectionReason('reject', '   \n\t   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Rejection reason is required');
  });

  test('should reject rejection with null comment', () => {
    const result = mockValidateRejectionReason('reject', null);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Rejection reason is required');
  });

  test('should reject rejection with undefined comment', () => {
    const result = mockValidateRejectionReason('reject', undefined);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Rejection reason is required');
  });
});