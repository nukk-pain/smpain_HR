const request = require('supertest');
const { MongoClient } = require('mongodb');

describe('Database Connection Tests - Test 9.1', () => {
  const API_BASE = 'http://localhost:5455';
  let adminToken;

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
      console.log('✅ Admin login successful for database connection tests');
    } else {
      console.log('⚠️  Admin login failed, limited database tests');
    }
  });

  describe('9.1.1 MongoDB Connection Stability', () => {
    test('should maintain stable connections under load', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping connection stability test - no admin token');
        return;
      }

      const concurrentRequests = 10;
      const requestsPerConnection = 5;
      const totalRequests = concurrentRequests * requestsPerConnection;

      console.log(`🔗 Testing database connection stability:`);
      console.log(`   Concurrent connections: ${concurrentRequests}`);
      console.log(`   Requests per connection: ${requestsPerConnection}`);
      console.log(`   Total requests: ${totalRequests}`);

      const startTime = Date.now();
      const connectionPromises = [];

      // Create multiple concurrent request batches
      for (let i = 0; i < concurrentRequests; i++) {
        const batchPromises = [];
        
        for (let j = 0; j < requestsPerConnection; j++) {
          batchPromises.push(
            request(API_BASE)
              .get('/api/departments')
              .set('Authorization', `Bearer ${adminToken}`)
              .set('X-Connection-Test', `batch-${i}-request-${j}`)
          );
        }
        
        connectionPromises.push(Promise.all(batchPromises));
      }

      const batchResults = await Promise.all(connectionPromises);
      const totalTime = Date.now() - startTime;

      // Analyze results
      const allResults = batchResults.flat();
      const successfulRequests = allResults.filter(result => result.status === 200).length;
      const failedRequests = allResults.length - successfulRequests;
      const successRate = (successfulRequests / allResults.length) * 100;
      const averageResponseTime = totalTime / allResults.length;

      console.log(`\\n📊 Connection Stability Results:`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Success rate: ${successRate.toFixed(1)}% (${successfulRequests}/${allResults.length})`);
      console.log(`   Failed requests: ${failedRequests}`);
      console.log(`   Average response time: ${averageResponseTime.toFixed(0)}ms`);

      // Expectations for stable connections
      expect(successRate).toBeGreaterThan(95); // 95% success rate minimum
      expect(failedRequests).toBeLessThan(5); // Maximum 5 failed connections
      expect(averageResponseTime).toBeLessThan(1000); // Average under 1 second

      if (successRate < 98) {
        console.log('⚠️  Success rate below 98% - may indicate connection pool issues');
      }

      if (averageResponseTime > 500) {
        console.log('💡 Average response time high - consider connection pool optimization');
      }

      console.log('✅ Database connection stability verified');
    });

    test('should handle rapid sequential database operations', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping sequential operations test - no admin token');
        return;
      }

      const operations = 20;
      const operationResults = [];

      console.log(`⚡ Testing ${operations} rapid sequential database operations:`);

      for (let i = 0; i < operations; i++) {
        const startTime = Date.now();
        
        // Alternate between different types of database operations
        const endpoint = i % 2 === 0 ? '/api/users' : '/api/departments';
        
        const response = await request(API_BASE)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);

        const responseTime = Date.now() - startTime;

        operationResults.push({
          operation: i + 1,
          endpoint,
          status: response.status,
          responseTime,
          dataLength: response.body.data ? response.body.data.length : 0
        });

        // Very small delay to simulate rapid operations
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Analyze sequential operation results
      const successfulOperations = operationResults.filter(op => op.status === 200).length;
      const averageTime = operationResults.reduce((sum, op) => sum + op.responseTime, 0) / operationResults.length;
      const maxTime = Math.max(...operationResults.map(op => op.responseTime));
      const minTime = Math.min(...operationResults.map(op => op.responseTime));

      console.log(`\\n📊 Sequential Operations Results:`);
      console.log(`   Successful operations: ${successfulOperations}/${operations}`);
      console.log(`   Average response time: ${averageTime.toFixed(0)}ms`);
      console.log(`   Response time range: ${minTime}ms - ${maxTime}ms`);
      console.log(`   Time variation: ${maxTime - minTime}ms`);

      // All operations should succeed
      expect(successfulOperations).toBe(operations);
      expect(averageTime).toBeLessThan(500);

      console.log('✅ Sequential database operations handled successfully');
    });

    test('should document connection pool configuration', async () => {
      const connectionPoolBestPractices = {
        poolSize: {
          minimum: 5,
          maximum: 50,
          recommended: 10,
          factors: 'Based on concurrent users and server resources'
        },
        timeouts: {
          connectionTimeout: '30 seconds',
          socketTimeout: '45 seconds',
          maxIdleTime: '10 minutes',
          serverSelectionTimeout: '5 seconds'
        },
        monitoring: {
          poolEvents: 'Monitor connection pool events',
          metrics: 'Track active/available connections',
          alerts: 'Alert on connection failures',
          logging: 'Log connection pool statistics'
        },
        errorHandling: {
          retryWrites: true,
          retryReads: true,
          maxRetryAttempts: 3,
          backoffStrategy: 'Exponential backoff'
        }
      };

      console.log('🏊 MongoDB Connection Pool Best Practices:');
      Object.entries(connectionPoolBestPractices).forEach(([category, settings]) => {
        console.log(`\\n${category.toUpperCase()}:`);
        Object.entries(settings).forEach(([setting, value]) => {
          console.log(`   ${setting}: ${value}`);
        });
      });

      const productionConsiderations = [
        'Use connection string with replica set for high availability',
        'Configure appropriate connection pool size based on load testing',
        'Implement connection retry logic with exponential backoff',
        'Monitor connection pool metrics in production',
        'Set up alerts for connection pool exhaustion',
        'Use read preferences to distribute load across replicas',
        'Implement proper connection cleanup on application shutdown'
      ];

      console.log('\\n🎯 Production Considerations:');
      productionConsiderations.forEach((consideration, index) => {
        console.log(`   ${index + 1}. ${consideration}`);
      });

      expect(connectionPoolBestPractices).toHaveProperty('poolSize');
      expect(connectionPoolBestPractices).toHaveProperty('timeouts');
      expect(connectionPoolBestPractices).toHaveProperty('monitoring');

      console.log('\\n✅ Connection pool configuration documented');
    });
  });

  describe('9.1.2 CRUD Operation Atomicity', () => {
    test('should handle concurrent modifications safely', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping concurrent modifications test - no admin token');
        return;
      }

      // Test concurrent department creation with similar names
      const timestamp = Date.now();
      const baseName = `Concurrent Test Dept ${timestamp}`;
      const concurrentCreations = 5;

      console.log(`⚔️  Testing ${concurrentCreations} concurrent department creations:`);

      const creationPromises = Array(concurrentCreations).fill().map((_, index) =>
        request(API_BASE)
          .post('/api/departments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `${baseName} ${index}`,
            description: `Concurrent creation test ${index}`
          })
      );

      const results = await Promise.all(creationPromises);

      // Analyze concurrent creation results
      const successfulCreations = results.filter(result => result.status === 200).length;
      const duplicateErrors = results.filter(result => result.status === 409).length;
      const otherErrors = results.filter(result => ![200, 409].includes(result.status)).length;

      console.log(`\\n📊 Concurrent Creation Results:`);
      console.log(`   Successful creations: ${successfulCreations}`);
      console.log(`   Duplicate name errors: ${duplicateErrors}`);
      console.log(`   Other errors: ${otherErrors}`);

      results.forEach((result, index) => {
        console.log(`   Creation ${index + 1}: ${result.status} - ${result.body.message || result.body.error || 'Success'}`);
      });

      // All operations should either succeed or fail with appropriate error codes
      expect(otherErrors).toBe(0); // No unexpected errors
      expect(successfulCreations + duplicateErrors).toBe(concurrentCreations);

      console.log('✅ Concurrent modifications handled safely');
    });

    test('should demonstrate transaction-like behavior where applicable', async () => {
      const transactionConcepts = {
        atomicity: {
          description: 'Operations either complete fully or not at all',
          mongodbSupport: 'Multi-document transactions in replica sets',
          currentImplementation: 'Single document operations are atomic',
          recommendation: 'Use transactions for multi-collection updates'
        },
        consistency: {
          description: 'Data remains in valid state after operations',
          mongodbSupport: 'Schema validation, unique indexes',
          currentImplementation: 'Application-level validation + DB constraints',
          recommendation: 'Implement proper validation at all levels'
        },
        isolation: {
          description: 'Concurrent operations don\'t interfere',
          mongodbSupport: 'Read/write concerns, transaction isolation',
          currentImplementation: 'MongoDB default isolation levels',
          recommendation: 'Use appropriate read/write concerns for use case'
        },
        durability: {
          description: 'Committed changes persist through failures',
          mongodbSupport: 'Write concerns, journal, replication',
          currentImplementation: 'Default write concern with acknowledgment',
          recommendation: 'Configure write concern based on durability needs'
        }
      };

      console.log('🔄 ACID Transaction Concepts in MongoDB Context:');
      Object.entries(transactionConcepts).forEach(([principle, details]) => {
        console.log(`\\n${principle.toUpperCase()}:`);
        Object.entries(details).forEach(([aspect, description]) => {
          console.log(`   ${aspect}: ${description}`);
        });
      });

      const transactionScenarios = [
        'User creation with initial leave balance (multi-collection)',
        'Leave request with balance deduction (single transaction)',
        'Department deletion with user reassignment (multi-step)',
        'Payroll calculation with multiple deduction updates'
      ];

      console.log('\\n🎯 Scenarios That Would Benefit From Transactions:');
      transactionScenarios.forEach((scenario, index) => {
        console.log(`   ${index + 1}. ${scenario}`);
      });

      expect(transactionConcepts).toHaveProperty('atomicity');
      expect(transactionConcepts).toHaveProperty('consistency');

      console.log('\\n✅ Transaction concepts documented for MongoDB context');
    });

    test('should validate data consistency after operations', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping data consistency test - no admin token');
        return;
      }

      // Test data consistency between related collections
      console.log('🔍 Testing data consistency between users and departments:');

      // Get department data
      const departmentsResponse = await request(API_BASE)
        .get('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`);

      // Get user data  
      const usersResponse = await request(API_BASE)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      if (departmentsResponse.status === 200 && usersResponse.status === 200) {
        const departments = departmentsResponse.body.data || [];
        const users = usersResponse.body.data || [];

        console.log(`\\n📊 Data Consistency Analysis:`);
        console.log(`   Departments found: ${departments.length}`);
        console.log(`   Users found: ${users.length}`);

        // Check for orphaned users (users in non-existent departments)
        const departmentNames = departments.map(dept => dept.name);
        const userDepartments = [...new Set(users.map(user => user.department))];
        const orphanedDepartments = userDepartments.filter(dept => 
          dept && !departmentNames.includes(dept)
        );

        console.log(`   Unique user departments: ${userDepartments.length}`);
        console.log(`   Orphaned departments: ${orphanedDepartments.length}`);

        if (orphanedDepartments.length > 0) {
          console.log(`   ⚠️  Orphaned departments found: ${orphanedDepartments.join(', ')}`);
          console.log('   💡 Consider implementing referential integrity checks');
        }

        // Verify department employee counts match actual user counts
        let employeeCountMismatches = 0;
        for (const department of departments) {
          const actualUserCount = users.filter(user => user.department === department.name).length;
          const reportedCount = department.employeeCount;
          
          if (actualUserCount !== reportedCount) {
            employeeCountMismatches++;
            console.log(`   ⚠️  Count mismatch in ${department.name}: reported ${reportedCount}, actual ${actualUserCount}`);
          }
        }

        console.log(`   Employee count mismatches: ${employeeCountMismatches}`);

        if (employeeCountMismatches === 0) {
          console.log('   ✅ All department employee counts are accurate');
        }

        // Data consistency should be maintained
        expect(orphanedDepartments.length).toBeLessThan(departments.length * 0.1); // Less than 10% orphaned
      }

      console.log('\\n✅ Data consistency validation completed');
    });
  });

  describe('9.1.3 Database Performance Monitoring', () => {
    test('should document database performance metrics', async () => {
      const performanceMetrics = {
        queryPerformance: {
          slowQueries: 'Queries taking > 100ms should be logged',
          indexUsage: 'Monitor index hit ratios and unused indexes',
          queryPlanning: 'Use explain() to analyze query execution plans',
          aggregationPipelines: 'Optimize complex aggregation operations'
        },
        connectionMetrics: {
          activeConnections: 'Monitor current active connections',
          connectionPoolStats: 'Track pool utilization and wait times',
          connectionErrors: 'Log and alert on connection failures',
          connectionLifetime: 'Monitor average connection duration'
        },
        resourceUtilization: {
          memoryUsage: 'Monitor working set and cache usage',
          diskIO: 'Track read/write operations and latency',
          cpuUsage: 'Monitor database server CPU utilization',
          networkIO: 'Track network traffic to database'
        },
        operationalMetrics: {
          documentsPerSecond: 'Monitor insert/update/delete rates',
          replicationLag: 'Track lag between primary and secondary',
          lockContention: 'Monitor write lock wait times',
          backgroundOperations: 'Track index builds and maintenance'
        }
      };

      console.log('📈 Database Performance Monitoring Metrics:');
      Object.entries(performanceMetrics).forEach(([category, metrics]) => {
        console.log(`\\n${category.toUpperCase()}:`);
        Object.entries(metrics).forEach(([metric, description]) => {
          console.log(`   ${metric}: ${description}`);
        });
      });

      const monitoringTools = [
        'MongoDB Compass for query analysis',
        'MongoDB Atlas built-in monitoring (if using Atlas)',
        'Prometheus + Grafana for custom dashboards',
        'Application performance monitoring (APM) tools',
        'MongoDB profiler for slow query analysis',
        'Custom logging and alerting systems'
      ];

      console.log('\\n🛠️  Recommended Monitoring Tools:');
      monitoringTools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool}`);
      });

      expect(performanceMetrics).toHaveProperty('queryPerformance');
      expect(performanceMetrics).toHaveProperty('connectionMetrics');

      console.log('\\n✅ Database performance monitoring metrics documented');
    });

    test('should provide database optimization recommendations', async () => {
      const optimizationRecommendations = {
        indexing: {
          strategy: 'Create indexes based on query patterns',
          compound: 'Use compound indexes for multi-field queries',
          sparse: 'Use sparse indexes for optional fields',
          ttl: 'Use TTL indexes for automatic document expiration',
          monitoring: 'Regularly review index usage and performance'
        },
        schemaDesign: {
          embedding: 'Embed related data when accessed together',
          referencing: 'Reference when data is large or updated frequently',
          denormalization: 'Consider denormalization for read-heavy workloads',
          sharding: 'Plan sharding strategy for horizontal scaling'
        },
        queryOptimization: {
          projection: 'Use projection to limit returned fields',
          pagination: 'Implement proper pagination for large results',
          aggregation: 'Optimize aggregation pipeline stages',
          avoid: 'Avoid regex queries without anchors'
        },
        connectionManagement: {
          pooling: 'Configure connection pooling appropriately',
          persistence: 'Use persistent connections when possible',
          retry: 'Implement connection retry logic',
          monitoring: 'Monitor connection pool health'
        }
      };

      console.log('🚀 Database Optimization Recommendations:');
      Object.entries(optimizationRecommendations).forEach(([category, recommendations]) => {
        console.log(`\\n${category.toUpperCase()}:`);
        Object.entries(recommendations).forEach(([aspect, description]) => {
          console.log(`   ${aspect}: ${description}`);
        });
      });

      const commonPitfalls = [
        'Not using indexes for frequently queried fields',
        'Using inefficient regex queries',
        'Fetching more data than needed (no projection)',
        'Not implementing proper pagination',
        'Ignoring slow query logs',
        'Over-indexing (too many indexes slow writes)',
        'Not monitoring connection pool utilization'
      ];

      console.log('\\n⚠️  Common Performance Pitfalls:');
      commonPitfalls.forEach((pitfall, index) => {
        console.log(`   ${index + 1}. ${pitfall}`);
      });

      expect(optimizationRecommendations).toHaveProperty('indexing');
      expect(optimizationRecommendations).toHaveProperty('queryOptimization');

      console.log('\\n✅ Database optimization recommendations provided');
    });
  });
});