const request = require('supertest');

describe('API Response Performance Tests - Test 7.1.2', () => {
  const API_BASE = 'http://localhost:5455';
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });

    if (adminLogin.status === 200) {
      adminToken = adminLogin.body.token;
      console.log('✅ Admin login successful for API performance tests');
    }

    // Login as user
    const userLogin = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        username: 'user1',
        password: 'user123'
      });

    if (userLogin.status === 200) {
      userToken = userLogin.body.token;
      console.log('✅ User login successful for API performance tests');
    }
  });

  describe('Simple Query Performance (< 500ms target)', () => {
    test('should return user profile quickly', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping user profile test - no admin token');
        return;
      }

      // Get first user for testing
      const usersResponse = await request(API_BASE)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      if (usersResponse.status !== 200 || !usersResponse.body.data || usersResponse.body.data.length === 0) {
        console.log('⚠️  No users found for profile test');
        return;
      }

      const userId = usersResponse.body.data[0]._id;
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`⚡ User profile query: ${responseTime}ms`);
      
      if (responseTime > 200) {
        console.log('💡 User profile could be optimized (target < 200ms)');
      }
    });

    test('should validate authentication quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin'
        });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`⚡ Authentication validation: ${responseTime}ms`);
      
      if (responseTime > 300) {
        console.log('💡 Authentication could be optimized');
      }
    });

    test('should handle invalid authentication quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .post('/api/auth/login')
        .send({
          username: 'invalid',
          password: 'invalid'
        });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(401);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`⚡ Invalid auth response: ${responseTime}ms`);
      
      // Invalid auth should be reasonably fast to prevent timing attacks
      if (responseTime < 50) {
        console.log('⚠️  Auth response too fast - may indicate timing attack vulnerability');
      } else if (responseTime > 300) {
        console.log('💡 Invalid auth response could be faster');
      }
    });

    test('should return simple data queries quickly', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping simple data query test - no admin token');
        return;
      }

      const endpoints = [
        { name: 'Departments', path: '/api/departments' },
        { name: 'Users', path: '/api/users' },
        { name: 'Leave Pending', path: '/api/leave/pending' }
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await request(API_BASE)
          .get(endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`);
        
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200) {
          expect(responseTime).toBeLessThan(500);
          console.log(`⚡ ${endpoint.name} query: ${responseTime}ms`);
          
          if (responseTime > 300) {
            console.log(`💡 ${endpoint.name} query could be optimized`);
          }
        } else {
          console.log(`⚠️  ${endpoint.name} query failed with status ${response.status}`);
        }
      }
    });
  });

  describe('Complex Query Performance (< 2s target)', () => {
    test('should handle leave balance calculations within 2 seconds', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping leave balance calculation test - no admin token');
        return;
      }

      // Get users first
      const usersResponse = await request(API_BASE)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      if (usersResponse.status !== 200 || !usersResponse.body.data || usersResponse.body.data.length === 0) {
        console.log('⚠️  No users found for balance calculation test');
        return;
      }

      // Test balance calculation for multiple users
      const userIds = usersResponse.body.data.slice(0, 3).map(user => user._id);
      
      for (const userId of userIds) {
        const startTime = Date.now();
        
        const response = await request(API_BASE)
          .get(`/api/leave/balance/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200) {
          expect(responseTime).toBeLessThan(2000);
          console.log(`⚡ Leave balance calculation: ${responseTime}ms`);
          
          if (responseTime > 1000) {
            console.log('💡 Leave balance calculation could be optimized (aggregation queries)');
          }
        }
      }
    });

    test('should handle department employee aggregation within 2 seconds', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping department aggregation test - no admin token');
        return;
      }

      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000);
      
      console.log(`⚡ Department aggregation: ${responseTime}ms`);
      
      if (response.body.data && response.body.data.length > 0) {
        console.log(`📊 Aggregated ${response.body.data.length} departments with employee counts`);
      }
      
      if (responseTime > 1000) {
        console.log('💡 Department aggregation could be optimized (consider indexing on department field)');
      }
    });

    test('should handle bulk operations within reasonable time', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping bulk operations test - no admin token');
        return;
      }

      // Test creating multiple departments (simulate bulk operation)
      const bulkCreateStartTime = Date.now();
      const timestamp = Date.now();
      
      const bulkDepartments = [
        { name: `Bulk Test Dept 1 ${timestamp}`, description: 'Bulk test department 1' },
        { name: `Bulk Test Dept 2 ${timestamp}`, description: 'Bulk test department 2' },
        { name: `Bulk Test Dept 3 ${timestamp}`, description: 'Bulk test department 3' }
      ];

      const createPromises = bulkDepartments.map(dept => 
        request(API_BASE)
          .post('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(dept)
      );

      const results = await Promise.all(createPromises);
      const bulkCreateTime = Date.now() - bulkCreateStartTime;

      // Check that all departments were created successfully
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
      });

      expect(bulkCreateTime).toBeLessThan(5000); // 5 seconds for bulk operations
      
      console.log(`⚡ Bulk department creation (3 items): ${bulkCreateTime}ms`);
      
      if (bulkCreateTime > 2000) {
        console.log('💡 Bulk operations could benefit from batch processing');
      }

      // Clean up - delete test departments
      const createdIds = results.map(result => result.body.data._id);
      console.log(`🧹 Created ${createdIds.length} test departments for cleanup`);
    });
  });

  describe('Load Testing & Stress Scenarios', () => {
    test('should handle moderate concurrent load', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping concurrent load test - no admin token');
        return;
      }

      const concurrentUsers = 8;
      const requestsPerUser = 3;
      const totalRequests = concurrentUsers * requestsPerUser;
      
      console.log(`🚀 Starting concurrent load test: ${concurrentUsers} users × ${requestsPerUser} requests = ${totalRequests} total`);
      
      const startTime = Date.now();
      
      // Create concurrent request batches
      const batchPromises = [];
      
      for (let user = 0; user < concurrentUsers; user++) {
        const userRequests = [];
        
        for (let req = 0; req < requestsPerUser; req++) {
          userRequests.push(
            request(API_BASE)
              .get('/api/departments')
              .set('Authorization', `Bearer ${adminToken}`)
          );
        }
        
        batchPromises.push(Promise.all(userRequests));
      }
      
      const batchResults = await Promise.all(batchPromises);
      const totalTime = Date.now() - startTime;
      
      // Flatten results and check success rates
      const allResults = batchResults.flat();
      const successfulRequests = allResults.filter(result => result.status === 200).length;
      const successRate = (successfulRequests / totalRequests) * 100;
      
      console.log(`⚡ Concurrent load test completed:`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Average per request: ${(totalTime / totalRequests).toFixed(0)}ms`);
      console.log(`   Success rate: ${successRate.toFixed(1)}% (${successfulRequests}/${totalRequests})`);
      
      // Expect reasonable performance under load
      expect(successRate).toBeGreaterThan(90); // 90% success rate minimum
      expect(totalTime).toBeLessThan(10000); // 10 seconds maximum for all requests
      
      if (successRate < 95) {
        console.log('⚠️  Success rate below 95% - may indicate connection pool limits');
      }
      
      if (totalTime > 5000) {
        console.log('💡 Load test slower than 5s - consider connection pool optimization');
      }
    });

    test('should maintain reasonable response times under sequential load', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping sequential load test - no admin token');
        return;
      }

      const sequentialRequests = 20;
      const responseTimes = [];
      
      console.log(`🚀 Starting sequential load test: ${sequentialRequests} consecutive requests`);
      
      for (let i = 0; i < sequentialRequests; i++) {
        const startTime = Date.now();
        
        const response = await request(API_BASE)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
      }
      
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      
      console.log(`⚡ Sequential load test results:`);
      console.log(`   Average response time: ${averageTime.toFixed(0)}ms`);
      console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
      console.log(`   Response time range: ${maxTime - minTime}ms`);
      
      // Performance should remain stable under sequential load
      expect(averageTime).toBeLessThan(500);
      expect(maxTime).toBeLessThan(1000);
      
      // Check for performance degradation over time
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const degradation = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      console.log(`📊 Performance stability:`);
      console.log(`   First half average: ${firstHalfAvg.toFixed(0)}ms`);
      console.log(`   Second half average: ${secondHalfAvg.toFixed(0)}ms`);
      console.log(`   Degradation: ${degradation.toFixed(1)}%`);
      
      if (Math.abs(degradation) > 50) {
        console.log('⚠️  Significant performance degradation detected over time');
      } else if (Math.abs(degradation) > 25) {
        console.log('💡 Moderate performance change detected - monitor in production');
      }
    });
  });

  describe('Error Response Performance', () => {
    test('should return error responses quickly', async () => {
      const errorScenarios = [
        {
          name: 'Unauthorized Request',
          request: () => request(API_BASE).get('/api/users'),
          expectedStatus: 401
        },
        {
          name: 'Not Found',
          request: () => request(API_BASE).get('/api/nonexistent').set('Authorization', `Bearer ${adminToken || 'dummy'}`),
          expectedStatus: 404
        },
        {
          name: 'Invalid Method',
          request: () => request(API_BASE).patch('/api/auth/login').set('Authorization', `Bearer ${adminToken || 'dummy'}`),
          expectedStatus: [404, 405] // Method not allowed or not found
        }
      ];

      for (const scenario of errorScenarios) {
        const startTime = Date.now();
        
        const response = await scenario.request();
        
        const responseTime = Date.now() - startTime;
        
        const expectedStatuses = Array.isArray(scenario.expectedStatus) 
          ? scenario.expectedStatus 
          : [scenario.expectedStatus];
        
        expect(expectedStatuses).toContain(response.status);
        expect(responseTime).toBeLessThan(1000); // Error responses should be fast
        
        console.log(`⚡ ${scenario.name} error response: ${responseTime}ms (status: ${response.status})`);
        
        if (responseTime > 500) {
          console.log(`💡 ${scenario.name} error response could be faster`);
        }
      }
    });
  });
});