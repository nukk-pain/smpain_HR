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

describe('Team Status Routes', () => {
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

  describe('GET /api/leave/team-status', () => {
    it('should return team members from new leaveTeamStatus router', async () => {
      const response = await request(API_BASE)
        .get('/api/leave/team-status')
        .set('Authorization', `Bearer ${token}`)
        .query({ year: 2025 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.members).toBeDefined();
      expect(Array.isArray(response.body.data.members)).toBe(true);
      
      // Check that team member has required fields
      if (response.body.data.members.length > 0) {
        const member = response.body.data.members[0];
        expect(member).toHaveProperty('_id');
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('department');
        expect(member).toHaveProperty('position');
        expect(member).toHaveProperty('leaveBalance');
        expect(member).toHaveProperty('currentStatus');
      }
    });

    it('should filter by department when provided', async () => {
      const response = await request(API_BASE)
        .get('/api/leave/team-status')
        .set('Authorization', `Bearer ${token}`)
        .query({ year: 2025, department: '간호, 원무' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned members should be from the specified department
      if (response.body.data.members.length > 0) {
        response.body.data.members.forEach(member => {
          expect(member.department).toBe('간호, 원무');
        });
      }
    });
  });
});