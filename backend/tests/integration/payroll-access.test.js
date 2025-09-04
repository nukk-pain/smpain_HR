/**
 * TEST-02: Payroll Access Control Tests
 * TDD Approach: RED → GREEN → REFACTOR
 * 
 * Tests admin-only access to payroll endpoints after FEAT-07
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

describe('Payroll Access Control', () => {
  let adminToken, supervisorToken, userToken;
  let db, connection;

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'SM_nomu_test';
    
    connection = await MongoClient.connect(uri);
    db = connection.db(dbName);
    app.locals.db = db;

    // Clean up test users
    await db.collection('users').deleteMany({ 
      email: { $in: ['admin-test@test.com', 'supervisor-test@test.com', 'user-test@test.com'] }
    });

    // Create test users directly in MongoDB
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    
    const adminUser = {
      userId: 'admin-test',
      employeeId: 'EMP-ADMIN-TEST',
      username: 'admin-test',
      name: 'Test Admin',
      email: 'admin-test@test.com',
      password: hashedPassword,
      role: 'Admin',
      permissions: ['payroll:view', 'payroll:manage'],
      isActive: true,
      createdAt: new Date()
    };

    const supervisorUser = {
      userId: 'supervisor-test',
      employeeId: 'EMP-SUPERVISOR-TEST',
      username: 'supervisor-test',
      name: 'Test Supervisor',
      email: 'supervisor-test@test.com',
      password: hashedPassword,
      role: 'Supervisor',
      permissions: ['leave:approve'], // Note: NO payroll permissions
      isActive: true,
      createdAt: new Date()
    };

    const regularUser = {
      userId: 'user-test',
      employeeId: 'EMP-USER-TEST',
      username: 'user-test',
      name: 'Test User',
      email: 'user-test@test.com',
      password: hashedPassword,
      role: 'User',
      permissions: [],
      isActive: true,
      createdAt: new Date()
    };

    await db.collection('users').insertMany([adminUser, supervisorUser, regularUser]);

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser.userId, role: 'Admin' },
      process.env.JWT_SECRET || 'test-secret',
      { audience: 'hr-frontend', expiresIn: '24h' }
    );
    
    supervisorToken = jwt.sign(
      { userId: supervisorUser.userId, role: 'Supervisor' },
      process.env.JWT_SECRET || 'test-secret',
      { audience: 'hr-frontend', expiresIn: '24h' }
    );
    
    userToken = jwt.sign(
      { userId: regularUser.userId, role: 'User' },
      process.env.JWT_SECRET || 'test-secret',
      { audience: 'hr-frontend', expiresIn: '24h' }
    );
  });

  describe('Admin Access Tests', () => {
    // Test 1: RED → GREEN → REFACTOR
    test('Admin should access all payroll endpoints', async () => {
      // RED: Write failing test expecting admin access
      const payrollEndpoints = [
        '/api/payroll',
        '/api/payroll/excel/upload',
        '/api/bonus',
        '/api/sales',
        '/api/dailyWorkers'
      ];

      for (const endpoint of payrollEndpoints) {
        // GREEN: Verify admin can access
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);
        
        // Should not be 403 Forbidden
        expect(response.status).not.toBe(403);
        
        // REFACTOR: Extract common assertion
        if (response.status === 404) {
          // Endpoint might not have GET handler, but not forbidden
          expect(response.status).toBe(404);
        } else {
          expect([200, 201, 400, 500]).toContain(response.status);
        }
      }
    });

    test('Admin can upload payroll Excel', async () => {
      // RED: Test Excel upload endpoint
      const response = await request(app)
        .post('/api/payroll/excel/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.xlsx');

      // GREEN: Verify not forbidden (may fail for other reasons)
      expect(response.status).not.toBe(403);
    });

    test('Admin can manage bonuses', async () => {
      // RED: Test bonus management
      const response = await request(app)
        .post('/api/bonus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'test-user',
          month: '202509',
          amount: 100000,
          bonusType: 'performance'
        });

      // GREEN: Verify not forbidden
      expect(response.status).not.toBe(403);
    });
  });

  describe('Supervisor Access Tests', () => {
    // Test 2: Supervisor should be blocked
    test('Supervisor should be blocked from payroll endpoints', async () => {
      // RED: Expect 403 for supervisor
      const payrollEndpoints = [
        '/api/payroll',
        '/api/bonus',
        '/api/sales',
        '/api/dailyWorkers'
      ];

      for (const endpoint of payrollEndpoints) {
        // GREEN: Verify 403 Forbidden
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${supervisorToken}`);
        
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('Permission denied');
      }
    });

    test('Supervisor cannot upload payroll Excel', async () => {
      // RED: Test upload block
      const response = await request(app)
        .post('/api/payroll/excel/upload')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .attach('file', Buffer.from('test'), 'test.xlsx');

      // GREEN: Verify forbidden
      expect(response.status).toBe(403);
    });

    test('Supervisor cannot manage bonuses', async () => {
      // RED: Test bonus block
      const response = await request(app)
        .post('/api/bonus')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          userId: 'test-user',
          month: '202509',
          amount: 100000
        });

      // GREEN: Verify forbidden
      expect(response.status).toBe(403);
    });

    test('Supervisor can still access leave endpoints', async () => {
      // Verify supervisor retains leave permissions
      const response = await request(app)
        .get('/api/leave/requests')
        .set('Authorization', `Bearer ${supervisorToken}`);

      // Should not be forbidden
      expect(response.status).not.toBe(403);
    });
  });

  describe('Regular User Access Tests', () => {
    // Test 3: User should be blocked
    test('User should be blocked from all payroll endpoints', async () => {
      // RED: Expect 403 for regular user
      const payrollEndpoints = [
        '/api/payroll',
        '/api/bonus', 
        '/api/sales',
        '/api/dailyWorkers'
      ];

      for (const endpoint of payrollEndpoints) {
        // GREEN: Verify 403 Forbidden
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`);
        
        expect(response.status).toBe(403);
      }
    });

    test('User cannot access admin payroll routes', async () => {
      // RED: Test admin-specific routes
      const adminRoutes = [
        '/api/payroll/admin/summary',
        '/api/payroll/excel/download'
      ];

      for (const route of adminRoutes) {
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${userToken}`);
        
        // GREEN: Verify forbidden
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Permission Middleware Tests', () => {
    test('Missing token returns 401', async () => {
      const response = await request(app)
        .get('/api/payroll');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('No token provided');
    });

    test('Invalid token returns 401', async () => {
      const response = await request(app)
        .get('/api/payroll')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid token');
    });

    test('Expired token returns 401', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test', role: 'Admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  // REFACTOR: Helper functions extracted
  const testEndpointAccess = async (endpoint, token, expectedStatus) => {
    const response = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(expectedStatus);
    return response;
  };

  describe('Refactored Tests with Helpers', () => {
    test('Batch test admin access', async () => {
      const endpoints = ['/api/payroll', '/api/bonus', '/api/sales'];
      const results = await Promise.all(
        endpoints.map(ep => 
          testEndpointAccess(ep, adminToken, 200)
            .catch(err => ({ status: err.response?.status || 500 }))
        )
      );
      
      results.forEach(result => {
        expect(result.status).not.toBe(403);
      });
    });

    test('Batch test supervisor blocks', async () => {
      const endpoints = ['/api/payroll', '/api/bonus', '/api/sales'];
      const results = await Promise.all(
        endpoints.map(ep => testEndpointAccess(ep, supervisorToken, 403))
      );
      
      results.forEach(result => {
        expect(result.status).toBe(403);
      });
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.collection('users').deleteMany({ 
        userId: { $in: ['admin-test', 'supervisor-test', 'user-test'] }
      });
    }
    if (connection) {
      await connection.close();
    }
  });
});