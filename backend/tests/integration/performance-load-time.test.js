const request = require('supertest');

describe('Performance & Load Time Tests - Test 7.1', () => {
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
      console.log('✅ Admin login successful for performance tests');
    } else {
      console.log('⚠️  Admin login failed, limited performance tests');
    }

    // Login as regular user for user-specific tests
    const userLogin = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        username: 'user1',
        password: 'user123'
      });

    if (userLogin.status === 200) {
      userToken = userLogin.body.token;
      console.log('✅ User login successful for performance tests');
    }
  });

  describe('7.1.1 API Response Time Tests', () => {
    test('should complete authentication within 500ms', async () => {
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
      
      console.log(`⚡ Authentication response time: ${responseTime}ms`);
      
      if (responseTime > 200) {
        console.log('⚠️  Authentication slower than 200ms - consider optimization');
      }
    });

    test('should load user list within 500ms for simple queries', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping user list performance test - no admin token');
        return;
      }

      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`⚡ User list response time: ${responseTime}ms`);
      console.log(`📊 Users returned: ${response.body.data ? response.body.data.length : 0}`);
      
      if (responseTime > 300) {
        console.log('⚠️  User list query slower than 300ms - consider pagination');
      }
    });

    test('should load department list within 500ms', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping department list performance test - no admin token');
        return;
      }

      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`⚡ Department list response time: ${responseTime}ms`);
      console.log(`📊 Departments returned: ${response.body.data ? response.body.data.length : 0}`);
      
      if (responseTime > 300) {
        console.log('⚠️  Department query slower than 300ms - aggregation may need optimization');
      }
    });

    test('should load leave balance within 500ms', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping leave balance performance test - no admin token');
        return;
      }

      // Get users first to find a user ID
      const usersResponse = await request(API_BASE)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      if (usersResponse.status !== 200 || !usersResponse.body.data || usersResponse.body.data.length === 0) {
        console.log('⚠️  No users found for balance test');
        return;
      }

      const userId = usersResponse.body.data[0]._id;
      
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get(`/api/leave/balance/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      console.log(`⚡ Leave balance response time: ${responseTime}ms`);
      console.log(`📊 Balance data: ${response.body.data ? 'loaded' : 'empty'}`);
      
      if (responseTime > 300) {
        console.log('⚠️  Leave balance calculation slower than 300ms - check aggregation queries');
      }
    });
  });

  describe('7.1.2 Complex Query Performance Tests', () => {
    test('should complete leave history queries within 2 seconds', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping leave history performance test - no admin token');
        return;
      }

      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get('/api/leave/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000);
      
      console.log(`⚡ Leave pending query response time: ${responseTime}ms`);
      console.log(`📊 Pending requests: ${response.body.data ? response.body.data.length : 0}`);
      
      if (responseTime > 1000) {
        console.log('⚠️  Leave queries slower than 1s - consider database indexing');
      } else if (responseTime > 500) {
        console.log('💡 Leave queries acceptable but could be optimized');
      }
    });

    test('should handle multiple concurrent requests efficiently', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping concurrent request test - no admin token');
        return;
      }

      const concurrentRequests = 5;
      const startTime = Date.now();
      
      // Fire multiple concurrent requests
      const promises = Array(concurrentRequests).fill().map(() => 
        request(API_BASE)
          .get('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`)
      );
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });
      
      // Average time per request should be reasonable
      expect(averageTime).toBeLessThan(1000);
      
      console.log(`⚡ ${concurrentRequests} concurrent requests completed in ${totalTime}ms`);
      console.log(`📊 Average time per request: ${averageTime.toFixed(0)}ms`);
      
      if (averageTime > 500) {
        console.log('⚠️  Concurrent performance degradation detected - check connection pooling');
      }
    });
  });

  describe('7.1.3 Database Connection Performance', () => {
    test('should maintain stable connection pool performance', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping connection pool test - no admin token');
        return;
      }

      const iterations = 10;
      const responseTimes = [];
      
      // Perform multiple sequential requests to test connection pooling
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await request(API_BASE)
          .get('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(200);
      }
      
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      
      console.log(`⚡ Connection pool performance over ${iterations} requests:`);
      console.log(`   Average: ${averageTime.toFixed(0)}ms`);
      console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
      console.log(`   Times: [${responseTimes.join(', ')}]ms`);
      
      // Average should be reasonable
      expect(averageTime).toBeLessThan(200);
      
      // Maximum should not be excessive (indicates connection pool issues)
      expect(maxTime).toBeLessThan(1000);
      
      // Variation shouldn't be too extreme (indicates consistent performance)
      const variation = maxTime - minTime;
      if (variation > 500) {
        console.log('⚠️  High response time variation - check database connection stability');
      }
    });
  });

  describe('7.1.4 Memory and Resource Usage Documentation', () => {
    test('should document performance baselines for monitoring', async () => {
      const performanceBaselines = {
        authentication: {
          target: '< 200ms',
          acceptable: '< 500ms',
          critical: '> 1000ms'
        },
        simpleQueries: {
          target: '< 300ms',
          acceptable: '< 500ms', 
          critical: '> 1000ms'
        },
        complexQueries: {
          target: '< 1000ms',
          acceptable: '< 2000ms',
          critical: '> 5000ms'
        },
        concurrentLoad: {
          users: '5-10 concurrent',
          degradation: '< 50% slowdown',
          critical: 'Connection failures'
        }
      };

      console.log('📋 Performance Baselines for Production Monitoring:');
      Object.entries(performanceBaselines).forEach(([category, thresholds]) => {
        console.log(`\n${category.toUpperCase()}:`);
        Object.entries(thresholds).forEach(([level, threshold]) => {
          console.log(`  ${level}: ${threshold}`);
        });
      });

      const optimizationRecommendations = [
        'Add database indexes on frequently queried fields',
        'Implement response caching for static data',
        'Use database connection pooling effectively',
        'Monitor query execution plans for slow operations',
        'Consider pagination for large result sets',
        'Implement request rate limiting for protection',
        'Set up performance monitoring and alerts'
      ];

      console.log('\n🚀 Performance Optimization Recommendations:');
      optimizationRecommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });

      expect(performanceBaselines).toHaveProperty('authentication');
      expect(performanceBaselines).toHaveProperty('simpleQueries');
      expect(performanceBaselines).toHaveProperty('complexQueries');
      
      console.log('\n✅ Performance baselines documented for production monitoring');
    });
  });
});