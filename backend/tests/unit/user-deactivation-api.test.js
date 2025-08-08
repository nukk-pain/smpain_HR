const request = require('supertest');
const app = require('../../server');
const UserRepository = require('../../repositories/UserRepository');
const { connectToDatabase, closeDatabaseConnection } = require('../../utils/database');
const jwt = require('jsonwebtoken');

describe('User Deactivation API', () => {
  let userRepository;
  let testUser;
  let adminUser;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await connectToDatabase();
    userRepository = new UserRepository();
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  beforeEach(async () => {
    // Clean up test data
    const collection = await userRepository.getCollection();
    await collection.deleteMany({ username: { $regex: /^test_api_/ } });

    // Create test admin user
    adminUser = await userRepository.createUser({
      username: 'test_api_admin',
      name: 'Test Admin',
      role: 'Admin',
      employeeId: 'TEST_API_ADMIN_001',
      password: 'admin123'
    });

    // Create test regular user
    testUser = await userRepository.createUser({
      username: 'test_api_user',
      name: 'Test User',
      role: 'User',
      employeeId: 'TEST_API_USER_001',
      password: 'user123'
    });

    // Create JWT tokens
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
    adminToken = jwt.sign(
      { 
        id: adminUser._id.toString(),
        username: adminUser.username,
        name: adminUser.name,
        role: adminUser.role,
        permissions: ['users:manage', 'users:view', 'admin:permissions']
      },
      jwtSecret,
      { 
        expiresIn: '1h',
        issuer: 'hr-system',
        audience: 'hr-frontend'
      }
    );

    userToken = jwt.sign(
      {
        id: testUser._id.toString(),
        username: testUser.username,
        name: testUser.name,
        role: testUser.role,
        permissions: ['leave:view']
      },
      jwtSecret,
      { 
        expiresIn: '1h',
        issuer: 'hr-system',
        audience: 'hr-frontend'
      }
    );
  });

  describe('PUT /api/users/:id/deactivate', () => {
    test('should exist endpoint', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test deactivation' });

      // Endpoint should exist (not return 404)
      expect(response.status).not.toBe(404);
    });

    test('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser._id}/deactivate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Test deactivation' });

      expect(response.status).toBe(403);
    });

    test('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/users/${fakeId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test deactivation' });

      expect(response.status).toBe(404);
    });

    test('should deactivate user successfully', async () => {
      const reason = '테스트 비활성화';
      const response = await request(app)
        .put(`/api/users/${testUser._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
      expect(response.body.deactivationReason).toBe(reason);
      expect(response.body.deactivatedBy).toBe(adminUser._id.toString());
      expect(response.body.deactivatedAt).toBeDefined();
    });

    test('should set deactivation metadata correctly', async () => {
      const reason = '퇴사로 인한 비활성화';
      const beforeDeactivation = new Date();
      
      await request(app)
        .put(`/api/users/${testUser._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason });

      const deactivatedUser = await userRepository.findById(testUser._id.toString());
      const afterDeactivation = new Date();

      expect(deactivatedUser.isActive).toBe(false);
      expect(deactivatedUser.deactivationReason).toBe(reason);
      expect(deactivatedUser.deactivatedBy.toString()).toBe(adminUser._id.toString());
      expect(new Date(deactivatedUser.deactivatedAt)).toBeInstanceOf(Date);
      expect(new Date(deactivatedUser.deactivatedAt).getTime()).toBeGreaterThanOrEqual(beforeDeactivation.getTime());
      expect(new Date(deactivatedUser.deactivatedAt).getTime()).toBeLessThanOrEqual(afterDeactivation.getTime());
    });
  });
});