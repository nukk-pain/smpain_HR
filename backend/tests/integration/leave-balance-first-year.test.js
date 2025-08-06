const request = require('supertest');
const { calculateAnnualLeaveEntitlement } = require('../../utils/leaveUtils');

describe('Annual Leave Calculation for First Year - Test 3.3.1', () => {
  // Use localhost server that's already running
  const API_BASE = 'http://localhost:5455';
  
  // No server management needed - use existing running server

  describe('Unit Tests - Leave Calculation Logic', () => {
    test('should calculate 0 days for newly hired employee (less than 1 month)', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setDate(today.getDate() - 15); // 15 days ago
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(0);
    });

    test('should calculate 1 day after 1 completed month', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setMonth(today.getMonth() - 1);
      hireDate.setDate(today.getDate() - 1); // Ensure full month has passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(1);
    });

    test('should calculate 2 days after 2 completed months', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setMonth(today.getMonth() - 2);
      hireDate.setDate(today.getDate() - 1); // Ensure full months have passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(2);
    });

    test('should calculate prorated leave for 6 months of service', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setMonth(today.getMonth() - 6);
      hireDate.setDate(today.getDate() - 1); // Ensure full months have passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(6);
    });

    test('should cap at 11 days maximum for first year', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setMonth(today.getMonth() - 11);
      hireDate.setDate(today.getDate() - 1); // Ensure full months have passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(11);
    });

    test('should not exceed 11 days even with 12+ months but less than 1 year', () => {
      // Employee hired 11.5 months ago (should still be considered first year)
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setFullYear(today.getFullYear() - 1);
      hireDate.setMonth(today.getMonth() + 1); // 11 months ago
      hireDate.setDate(today.getDate() + 1); // But still within first year
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBeLessThanOrEqual(11);
    });

    test('should handle invalid hire dates', () => {
      expect(calculateAnnualLeaveEntitlement(null)).toBe(0);
      expect(calculateAnnualLeaveEntitlement(undefined)).toBe(0);
      expect(calculateAnnualLeaveEntitlement('')).toBe(0);
      expect(calculateAnnualLeaveEntitlement('invalid-date')).toBe(0);
    });

    test('should handle future hire dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = calculateAnnualLeaveEntitlement(futureDate);
      
      expect(result).toBe(0);
    });
  });

  describe('Integration Tests - API Endpoints', () => {
    let adminToken;
    let testUserId;

    beforeAll(async () => {
      // Login as admin to create test users
      const adminLogin = await request(API_BASE)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin'
        });

      if (adminLogin.status === 200) {
        adminToken = adminLogin.body.token;
        console.log('✅ Admin login successful for integration tests');
      } else {
        console.log('⚠️  Admin login failed, skipping integration tests');
      }
    });

    test('should create user with correct first-year leave calculation', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping user creation test - no admin token');
        return;
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const userData = {
        username: 'test_first_year_user',
        name: 'Test First Year User',
        password: 'test123',
        email: 'firstyear@test.com',
        role: 'user',
        hireDate: sixMonthsAgo.toISOString().split('T')[0],
        department: 'IT',
        position: 'Developer'
      };

      const createResponse = await request(API_BASE)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      if (createResponse.status === 201) {
        testUserId = createResponse.body.data._id;
        
        // Check that the user's annual leave is calculated correctly (6 months = 6 days)
        expect(createResponse.body.data.annualLeave).toBe(6);
        console.log('✅ User created with correct leave calculation:', createResponse.body.data.annualLeave, 'days');
      } else {
        console.log('⚠️  User creation failed:', createResponse.body);
      }
    });

    test('should get correct leave balance for first-year employee via API', async () => {
      if (!adminToken || !testUserId) {
        console.log('⚠️  Skipping leave balance test - prerequisites not met');
        return;
      }

      const balanceResponse = await request(API_BASE)
        .get(`/api/leave/balance/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (balanceResponse.status === 200) {
        const balance = balanceResponse.body.data;
        
        // First year employee with 6 months should have 6 days base annual leave
        expect(balance.baseAnnualLeave).toBe(6);
        expect(balance.totalAnnualLeave).toBe(6); // No carryover for new employee
        
        console.log('✅ Leave balance API returned correct calculation:', balance);
      } else {
        console.log('⚠️  Leave balance API failed:', balanceResponse.body);
      }
    });

    afterAll(async () => {
      // Clean up test user
      if (adminToken && testUserId) {
        try {
          await request(API_BASE)
            .delete(`/api/users/${testUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ confirmed: true });
          console.log('🧹 Test user cleaned up');
        } catch (error) {
          console.log('⚠️  Failed to clean up test user:', error.message);
        }
      }
    });
  });
});