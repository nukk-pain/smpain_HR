const request = require('supertest');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// Test configuration
const API_BASE = 'http://localhost:5455';
const JWT_SECRET = 'sm_hr_jwt_secret_key_2024_development_ultra_secure_key_do_not_use_in_production';

// Generate test token
function generateTestToken(userId, role = 'admin') {
  return jwt.sign(
    {
      id: userId,
      username: 'testuser',
      name: 'Test User',
      role: role,
      permissions: role === 'admin' ? ['leave:view', 'leave:manage'] : ['leave:view']
    },
    JWT_SECRET,
    { expiresIn: '1h', issuer: 'hr-system', audience: 'hr-frontend' }
  );
}

describe('Department Stats Routes', () => {
  let token;
  let db;
  let client;

  beforeAll(async () => {
    // Connect to test database
    client = new MongoClient('mongodb://localhost:27017/SM_nomu');
    await client.connect();
    db = client.db();
    
    // Get an admin user for testing
    const adminUser = await db.collection('users').findOne({ role: 'admin' });
    if (adminUser) {
      token = generateTestToken(adminUser._id.toString());
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
      token = generateTestToken(result.insertedId.toString());
    }
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /api/leave/team-status/department-stats', () => {
    it('should return department statistics with onLeave count', async () => {
      const response = await request(API_BASE)
        .get('/api/leave/team-status/department-stats')
        .set('Authorization', `Bearer ${token}`)
        .query({ year: 2025 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Check that department stats have required fields including onLeave
      if (response.body.data.length > 0) {
        const dept = response.body.data[0];
        expect(dept).toHaveProperty('department');
        expect(dept).toHaveProperty('totalMembers');
        expect(dept).toHaveProperty('onLeave');
        expect(dept).toHaveProperty('avgLeaveUsage');
        expect(dept).toHaveProperty('pendingRequests');
        
        // onLeave should be a number >= 0
        expect(typeof dept.onLeave).toBe('number');
        expect(dept.onLeave).toBeGreaterThanOrEqual(0);
        expect(dept.onLeave).toBeLessThanOrEqual(dept.totalMembers);
      }
    });

    it('should calculate onLeave correctly based on current date', async () => {
      // First, let's check if there are any approved leaves for today
      const today = new Date().toISOString().split('T')[0];
      
      // Get approved leave requests that include today
      const approvedLeaves = await db.collection('leaveRequests').find({
        status: 'approved',
        startDate: { $lte: today },
        endDate: { $gte: today }
      }).toArray();
      
      console.log(`Found ${approvedLeaves.length} approved leaves for today (${today})`);
      
      // Now get the department stats
      const response = await request(API_BASE)
        .get('/api/leave/team-status/department-stats')
        .set('Authorization', `Bearer ${token}`)
        .query({ year: new Date().getFullYear() });
      
      expect(response.status).toBe(200);
      
      // Sum up all onLeave counts from all departments
      const totalOnLeave = response.body.data.reduce((sum, dept) => sum + dept.onLeave, 0);
      
      // The total onLeave should match the number of people on leave today
      // (excluding admins since department stats exclude admin users)
      const nonAdminUsersOnLeave = await Promise.all(
        approvedLeaves.map(async (leave) => {
          const user = await db.collection('users').findOne({ _id: leave.userId });
          return user && user.role !== 'admin';
        })
      );
      const expectedOnLeave = nonAdminUsersOnLeave.filter(Boolean).length;
      
      console.log(`Expected ${expectedOnLeave} non-admin users on leave, got ${totalOnLeave}`);
      expect(totalOnLeave).toBe(expectedOnLeave);
    });
  });
});