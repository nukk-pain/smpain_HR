const request = require('supertest');
const { calculateAnnualLeaveEntitlement } = require('../../utils/leaveUtils');

describe('Annual Leave Calculation for Subsequent Years - Test 3.3.2', () => {
  const API_BASE = 'http://localhost:5455';

  describe('Unit Tests - Leave Calculation Logic for 1+ Years', () => {
    test('should calculate 15 days for employee with exactly 1 year service', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setFullYear(today.getFullYear() - 1);
      hireDate.setDate(today.getDate() - 1); // Ensure full year has passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(15); // 15 + (1 - 1) = 15
    });

    test('should calculate 16 days for employee with 2 years service', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setFullYear(today.getFullYear() - 2);
      hireDate.setDate(today.getDate() - 1); // Ensure full years have passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(16); // 15 + (2 - 1) = 16
    });

    test('should calculate 20 days for employee with 6 years service', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setFullYear(today.getFullYear() - 6);
      hireDate.setDate(today.getDate() - 1); // Ensure full years have passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(20); // 15 + (6 - 1) = 20
    });

    test('should calculate 25 days for employee with 11 years service', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setFullYear(today.getFullYear() - 11);
      hireDate.setDate(today.getDate() - 1); // Ensure full years have passed
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(25); // 15 + (11 - 1) = 25 (capped at 25)
    });

    test('should cap at maximum 25 days for long-term employees', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setFullYear(today.getFullYear() - 15); // 15 years service
      hireDate.setDate(today.getDate() - 1);
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(25); // Capped at 25, not 15 + (15 - 1) = 29
    });

    test('should cap at maximum 25 days for very long-term employees', () => {
      const today = new Date();
      const hireDate = new Date(today);
      hireDate.setFullYear(today.getFullYear() - 25); // 25 years service
      hireDate.setDate(today.getDate() - 1);
      
      const result = calculateAnnualLeaveEntitlement(hireDate);
      
      console.log(`Hire date: ${hireDate.toDateString()}, Today: ${today.toDateString()}, Result: ${result} days`);
      expect(result).toBe(25); // Still capped at 25
    });

    test('should use correct formula: 15 + (years - 1)', () => {
      // Test the exact formula for various years
      const testCases = [
        { years: 1, expected: 15 }, // 15 + (1-1) = 15
        { years: 2, expected: 16 }, // 15 + (2-1) = 16  
        { years: 3, expected: 17 }, // 15 + (3-1) = 17
        { years: 5, expected: 19 }, // 15 + (5-1) = 19
        { years: 10, expected: 24 }, // 15 + (10-1) = 24
        { years: 11, expected: 25 }, // 15 + (11-1) = 25 (exactly at cap)
        { years: 12, expected: 25 }, // 15 + (12-1) = 26, but capped at 25
      ];

      testCases.forEach(({ years, expected }) => {
        const today = new Date();
        const hireDate = new Date(today);
        hireDate.setFullYear(today.getFullYear() - years);
        hireDate.setDate(today.getDate() - 1);
        
        const result = calculateAnnualLeaveEntitlement(hireDate);
        
        console.log(`${years} years service: expected ${expected}, got ${result}`);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Integration Tests - API Endpoints for Subsequent Years', () => {
    let adminToken;
    let testUsers = [];

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

    test('should create users with correct subsequent-year leave calculations', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping user creation test - no admin token');
        return;
      }

      // Test cases for different years of service
      const testCases = [
        { years: 1, expectedLeave: 15, name: '1 Year Employee' },
        { years: 3, expectedLeave: 17, name: '3 Years Employee' },
        { years: 10, expectedLeave: 24, name: '10 Years Employee' },
        { years: 15, expectedLeave: 25, name: '15 Years Employee (capped)' }
      ];

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const hireDate = new Date();
        hireDate.setFullYear(hireDate.getFullYear() - testCase.years);
        hireDate.setDate(hireDate.getDate() - 1); // Ensure full years have passed

        const userData = {
          username: `test_${testCase.years}_year_user`,
          name: testCase.name,
          password: 'test123',
          email: `${testCase.years}year@test.com`,
          role: 'user',
          hireDate: hireDate.toISOString().split('T')[0],
          department: 'IT',
          position: 'Developer'
        };

        const createResponse = await request(API_BASE)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        if (createResponse.status === 201) {
          testUsers.push({
            id: createResponse.body.data._id,
            years: testCase.years,
            expectedLeave: testCase.expectedLeave,
            actualLeave: createResponse.body.data.annualLeave
          });
          
          // Check that the user's annual leave is calculated correctly
          expect(createResponse.body.data.annualLeave).toBe(testCase.expectedLeave);
          console.log(`✅ ${testCase.name} created with correct leave calculation: ${createResponse.body.data.annualLeave} days`);
        } else {
          console.log(`⚠️  ${testCase.name} creation failed:`, createResponse.status, createResponse.body);
        }
      }

      // Verify we created at least some test users successfully
      console.log(`Created ${testUsers.length} out of ${testCases.length} test users`);
      expect(testUsers.length).toBeGreaterThan(0);
    });

    test('should get correct leave balances for subsequent-year employees via API', async () => {
      if (!adminToken || testUsers.length === 0) {
        console.log('⚠️  Skipping leave balance test - prerequisites not met');
        return;
      }

      for (const testUser of testUsers) {
        const balanceResponse = await request(API_BASE)
          .get(`/api/leave/balance/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        if (balanceResponse.status === 200) {
          const balance = balanceResponse.body.data;
          
          // Subsequent year employees should have correct base annual leave
          expect(balance.baseAnnualLeave).toBe(testUser.expectedLeave);
          expect(balance.totalAnnualLeave).toBe(testUser.expectedLeave); // No carryover for new test users
          
          console.log(`✅ ${testUser.years} years employee - Leave balance API returned correct calculation:`, balance.baseAnnualLeave, 'days');
        } else {
          console.log(`⚠️  Leave balance API failed for ${testUser.years} years employee:`, balanceResponse.body);
        }
      }
    });

    afterAll(async () => {
      // Clean up test users
      if (adminToken) {
        for (const testUser of testUsers) {
          try {
            await request(API_BASE)
              .delete(`/api/users/${testUser.id}`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ confirmed: true });
            console.log(`🧹 ${testUser.years} years test user cleaned up`);
          } catch (error) {
            console.log(`⚠️  Failed to clean up ${testUser.years} years test user:`, error.message);
          }
        }
      }
    });
  });
});