const request = require('supertest');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// Test configuration
const API_BASE = 'http://localhost:5455';
const JWT_SECRET = 'sm_hr_jwt_secret_key_2024_development_ultra_secure_key_do_not_use_in_production';

// Generate test token
function generateTestToken(userId, role = 'admin', permissions = []) {
  return jwt.sign(
    {
      id: userId,
      username: 'testuser',
      name: 'Test User',
      role: role,
      permissions: permissions.length > 0 ? permissions : 
        (role === 'admin' ? ['leave:view', 'leave:manage'] : ['leave:view'])
    },
    JWT_SECRET,
    { expiresIn: '1h', issuer: 'hr-system', audience: 'hr-frontend' }
  );
}

describe('Employee Leave Log Routes', () => {
  let adminToken;
  let supervisorToken;
  let db;
  let client;
  let testEmployee;

  beforeAll(async () => {
    // Connect to test database
    client = new MongoClient('mongodb://localhost:27017/SM_nomu');
    await client.connect();
    db = client.db();
    
    // Get an admin user for testing
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    if (adminUser) {
      adminToken = generateTestToken(adminUser._id.toString(), 'admin');
    } else {
      // Create a test admin user if none exists
      const result = await db.collection('users').insertOne({
        username: 'testadmin',
        name: 'Test Admin',
        role: 'admin',
        department: 'Test Dept',
        position: 'Manager',
        employeeId: 'TEST001',
        isActive: true,
        createdAt: new Date()
      });
      adminToken = generateTestToken(result.insertedId.toString(), 'admin');
    }
    
    // Get a supervisor for testing
    const supervisorUser = await db.collection('users').findOne({ role: 'supervisor' });
    if (supervisorUser) {
      supervisorToken = generateTestToken(supervisorUser._id.toString(), 'supervisor', ['leave:manage']);
    } else {
      supervisorToken = adminToken; // Use admin token if no supervisor exists
    }
    
    // Get a non-admin employee for testing
    testEmployee = await db.collection('users').findOne({ 
      role: { $ne: 'admin' },
      employeeId: { $exists: true }
    });
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /api/leave/employee/:employeeId/log', () => {
    it('should return employee leave log via new route', async () => {
      if (!testEmployee) {
        console.log('No test employee found, skipping test');
        return;
      }
      
      const response = await request(API_BASE)
        .get(`/api/leave/employee/${testEmployee.employeeId}/log`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ year: 2025 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check response structure
      expect(response.body.data).toHaveProperty('employee');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('leaveHistory');
      expect(response.body.data).toHaveProperty('summary');
      
      // Check employee data
      expect(response.body.data.employee).toHaveProperty('id');
      expect(response.body.data.employee).toHaveProperty('name');
      expect(response.body.data.employee).toHaveProperty('employeeId');
      expect(response.body.data.employee).toHaveProperty('department');
      
      // Check balance data
      expect(response.body.data.balance).toHaveProperty('totalAnnualLeave');
      expect(response.body.data.balance).toHaveProperty('usedAnnualLeave');
      expect(response.body.data.balance).toHaveProperty('remainingAnnualLeave');
      expect(response.body.data.balance).toHaveProperty('pendingAnnualLeave');
      
      // Check leave history is an array
      expect(Array.isArray(response.body.data.leaveHistory)).toBe(true);
    });

    it('should work with MongoDB ObjectId as well', async () => {
      if (!testEmployee) {
        console.log('No test employee found, skipping test');
        return;
      }
      
      const response = await request(API_BASE)
        .get(`/api/leave/employee/${testEmployee._id.toString()}/log`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ year: 2025 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.employee.id.toString()).toBe(testEmployee._id.toString());
    });

    it('should require leave:manage permission', async () => {
      if (!testEmployee) {
        console.log('No test employee found, skipping test');
        return;
      }
      
      // Create a token without leave:manage permission
      const userToken = generateTestToken('someUserId', 'user', ['leave:view']);
      
      const response = await request(API_BASE)
        .get(`/api/leave/employee/${testEmployee.employeeId}/log`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ year: 2025 });
      
      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(API_BASE)
        .get('/api/leave/employee/NONEXISTENT999/log')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ year: 2025 });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Employee not found');
    });
  });
});