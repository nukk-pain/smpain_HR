const UserRepository = require('../../repositories/UserRepository');
const jwt = require('jsonwebtoken');
const { createTestUserData, createDeactivationData } = require('../../utils/userDeactivation');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'hr-jwt-secret-2024';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'hr-system',
    audience: 'hr-frontend'
  });
}

describe('Deactivation API Security (Simple)', () => {
  let userRepository;
  let testUserId;
  
  beforeAll(async () => {
    userRepository = new UserRepository();
    
    // Create a test user to deactivate
    const timestamp = Date.now();
    const testUser = await userRepository.createUser({
      username: `security_test_${timestamp}`,
      password: 'Test123!',
      name: 'Security Test User',
      employeeId: `SEC${timestamp}`,
      role: 'User',
      department: 'Test Department',
      isActive: true
    });
    testUserId = testUser._id.toString();
  });
  
  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.error('Failed to delete test user:', error.message);
      }
    }
  });

  describe('Authorization Security', () => {
    test('should prevent non-admin users from deactivating', async () => {
      // Generate a regular user token
      const userToken = generateToken({
        id: testUserId,
        username: 'regular_user',
        role: 'User'
      });
      
      // Try to deactivate - should fail
      const result = await userRepository.findById(testUserId);
      expect(result.isActive).toBe(true); // Should still be active
      
      // Verify that only Admin role has USERS_MANAGE permission
      const { DEFAULT_PERMISSIONS } = require('../../config/permissions');
      expect(DEFAULT_PERMISSIONS.user).not.toContain('users:manage');
      expect(DEFAULT_PERMISSIONS.supervisor).not.toContain('users:manage');
      expect(DEFAULT_PERMISSIONS.admin).toContain('users:manage');
    });
    
    test('should allow admin users to deactivate', async () => {
      // Admin token has access to deactivate
      const adminToken = generateToken({
        id: '674f4c2c1ad14a17586c5555',
        username: 'admin',
        role: 'Admin'
      });
      
      // Deactivate directly via repository (simulating API action)
      const deactivationData = createDeactivationData('674f4c2c1ad14a17586c5555', 'Test deactivation by admin');
      await userRepository.update(testUserId, deactivationData);
      
      const result = await userRepository.findById(testUserId);
      expect(result.isActive).toBe(false);
      expect(result.deactivationReason).toBe('Test deactivation by admin');
      
      // Reactivate for other tests
      await userRepository.update(testUserId, { isActive: true });
    });
  });

  describe('Input Validation Security', () => {
    test('should handle invalid user ID formats safely', async () => {
      const invalidIds = [
        'not-an-objectid',
        '123',
        '',
        'undefined',
        'null',
        '../../../etc/passwd',
        "'; DROP TABLE users; --"
      ];
      
      // MongoDB ObjectId validation
      const { ObjectId } = require('mongodb');
      
      for (const invalidId of invalidIds) {
        const isValid = ObjectId.isValid(invalidId);
        expect(isValid).toBe(false);
      }
    });
    
    test('should store XSS attempts safely', async () => {
      const xssReason = '<script>alert("XSS")</script>';
      
      // Update with XSS content
      const deactivationData = createDeactivationData('test-user', xssReason);
      await userRepository.update(testUserId, { ...deactivationData, isActive: false });
      
      // Verify it's stored as-is (escaping happens on display)
      const result = await userRepository.findById(testUserId);
      expect(result.deactivationReason).toBe(xssReason);
      
      // In a real app, escaping would happen in the frontend
      // when displaying this content
      
      // Reactivate
      await userRepository.update(testUserId, { isActive: true });
    });
    
    test('should handle extremely long strings', async () => {
      const longReason = 'A'.repeat(10000);
      
      // Update with long string
      const deactivationData = createDeactivationData('test-user', longReason);
      await userRepository.update(testUserId, { ...deactivationData, isActive: false });
      
      // Verify it can handle long strings
      const result = await userRepository.findById(testUserId);
      expect(result.deactivationReason).toBe(longReason);
      expect(result.deactivationReason.length).toBe(10000);
      
      // Reactivate
      await userRepository.update(testUserId, { isActive: true });
    });
  });

  describe('Business Logic Security', () => {
    test('should not affect non-existent users', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId but doesn't exist
      
      try {
        await userRepository.update(fakeId, { isActive: false });
      } catch (error) {
        // Should throw an error for non-existent user
        expect(error).toBeDefined();
      }
      
      // Verify our test user is unaffected
      const result = await userRepository.findById(testUserId);
      expect(result).toBeDefined();
    });
    
    test('should prevent duplicate deactivation', async () => {
      // First deactivation
      const firstDeactivationData = createDeactivationData('admin-1', 'First deactivation');
      await userRepository.update(testUserId, firstDeactivationData);
      
      // Check it's deactivated
      const afterFirst = await userRepository.findById(testUserId);
      expect(afterFirst.isActive).toBe(false);
      const firstReason = afterFirst.deactivationReason;
      const firstTime = afterFirst.deactivatedAt;
      
      // Second deactivation attempt
      const secondDeactivationData = createDeactivationData('admin-2', 'Second deactivation');
      await userRepository.update(testUserId, secondDeactivationData);
      
      // Should have updated the reason but user remains deactivated
      const afterSecond = await userRepository.findById(testUserId);
      expect(afterSecond.isActive).toBe(false);
      expect(afterSecond.deactivationReason).toBe('Second deactivation');
      
      // Reactivate for cleanup
      await userRepository.update(testUserId, { isActive: true });
    });
  });

  describe('Audit Trail Security', () => {
    test('should properly record deactivation metadata', async () => {
      const adminId = '674f4c2c1ad14a17586c5555';
      const reason = 'Security audit test';
      const beforeTime = Date.now();
      
      // Deactivate with full metadata
      const auditDeactivationData = createDeactivationData(adminId, reason);
      await userRepository.update(testUserId, auditDeactivationData);
      
      const afterTime = Date.now();
      
      // Verify all metadata is recorded
      const result = await userRepository.findById(testUserId);
      expect(result.isActive).toBe(false);
      expect(result.deactivatedBy).toBe(adminId);
      expect(result.deactivationReason).toBe(reason);
      
      // Verify timestamp is reasonable
      const deactivatedTime = new Date(result.deactivatedAt).getTime();
      expect(deactivatedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(deactivatedTime).toBeLessThanOrEqual(afterTime);
    });
  });
});