/**
 * AI-HEADER
 * @intent: Test payroll API permission restrictions for Admin-only access
 * @domain_meaning: Ensure payroll endpoints deny Supervisor/User access
 * @misleading_names: None
 * @data_contracts: JWT tokens for auth, 403 for unauthorized
 * @pii: No real user data in tests
 * @invariants: Only Admin role can access payroll APIs
 * @rag_keywords: payroll permission test, admin only test, role based access
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

describe('Payroll API Permission Tests', () => {
  let db;
  let connection;

  beforeAll(async () => {
    // Connect to test database
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu_test';
    connection = await MongoClient.connect(url);
    db = connection.db();
    app.locals.db = db;
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
  });

  // Helper function to create test tokens
  const createToken = (role, userId = '507f1f77bcf86cd799439011') => {
    return jwt.sign(
      { 
        id: userId, 
        role: role,
        email: `${role.toLowerCase()}@test.com`
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  };

  describe('GET /api/payroll/', () => {
    test('should deny Supervisor access to payroll list', async () => {
      const supervisorToken = createToken('Supervisor');
      
      const response = await request(app)
        .get('/api/payroll/')
        .set('Authorization', `Bearer ${supervisorToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/admin|permission|denied/i);
    });

    test('should deny User access to payroll list', async () => {
      const userToken = createToken('User');
      
      const response = await request(app)
        .get('/api/payroll/')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/admin|permission|denied/i);
    });

    test('should allow Admin access to payroll list', async () => {
      const adminToken = createToken('Admin');
      
      const response = await request(app)
        .get('/api/payroll/')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // Should not return 403
      expect(response.status).not.toBe(403);
      // Could be 200 with data or 404 if no data exists
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/payroll/monthly', () => {
    test('should deny Supervisor access to create payroll', async () => {
      const supervisorToken = createToken('Supervisor');
      
      const response = await request(app)
        .post('/api/payroll/monthly')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          userId: '507f1f77bcf86cd799439011',
          yearMonth: '2025-09',
          baseSalary: 3000000
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/admin|permission|denied/i);
    });

    test('should allow Admin access to create payroll', async () => {
      const adminToken = createToken('Admin');
      
      const response = await request(app)
        .post('/api/payroll/monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: '507f1f77bcf86cd799439011',
          yearMonth: '2025-09',
          baseSalary: 3000000
        });
      
      // Should not return 403
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/bonus/:yearMonth', () => {
    test('should deny Supervisor access to bonus list', async () => {
      const supervisorToken = createToken('Supervisor');
      
      const response = await request(app)
        .get('/api/bonus/2025-09')
        .set('Authorization', `Bearer ${supervisorToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/admin|permission|denied/i);
    });

    test('should allow Admin access to bonus list', async () => {
      const adminToken = createToken('Admin');
      
      const response = await request(app)
        .get('/api/bonus/2025-09')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/sales/company/:yearMonth', () => {
    test('should deny Supervisor access to sales data', async () => {
      const supervisorToken = createToken('Supervisor');
      
      const response = await request(app)
        .get('/api/sales/company/2025-09')
        .set('Authorization', `Bearer ${supervisorToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/admin|permission|denied/i);
    });

    test('should allow Admin access to sales data', async () => {
      const adminToken = createToken('Admin');
      
      const response = await request(app)
        .get('/api/sales/company/2025-09')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/daily-workers/:yearMonth', () => {
    test('should deny Supervisor access to daily workers', async () => {
      const supervisorToken = createToken('Supervisor');
      
      const response = await request(app)
        .get('/api/daily-workers/2025-09')
        .set('Authorization', `Bearer ${supervisorToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/admin|permission|denied/i);
    });

    test('should allow Admin access to daily workers', async () => {
      const adminToken = createToken('Admin');
      
      const response = await request(app)
        .get('/api/daily-workers/2025-09')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).not.toBe(403);
    });
  });

  describe('POST /api/sales/bulk', () => {
    test('should deny Supervisor access to bulk sales upload', async () => {
      const supervisorToken = createToken('Supervisor');
      
      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          yearMonth: '2025-09',
          companySales: { totalAmount: 100000000 },
          individualSales: []
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/admin|permission|denied/i);
    });

    test('should allow Admin access to bulk sales upload', async () => {
      const adminToken = createToken('Admin');
      
      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          yearMonth: '2025-09',
          companySales: { totalAmount: 100000000 },
          individualSales: []
        });
      
      expect(response.status).not.toBe(403);
    });
  });
});