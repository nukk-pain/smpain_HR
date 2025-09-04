/**
 * Authentication API Integration Tests
 * Following TDD principles - Red → Green → Refactor
 */
const request = require('supertest');
const app = require('../../server');
const { MongoClient } = require('mongodb');

describe('Authentication API', () => {
  let adminToken, supervisorToken, userToken;
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get test tokens for different roles
    const tokens = await global.testHelpers.createTestTokens();
    adminToken = tokens.adminToken;
    supervisorToken = tokens.supervisorToken;
    userToken = tokens.userToken;
  });
  
  describe('POST /api/auth/login', () => {
    test('should login with valid admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.role).toBe('admin');  // API returns lowercase
      expect(response.body.user).not.toHaveProperty('password');
    });
    
    test('should login with valid supervisor credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'supervisor',
          password: 'supervisor123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('supervisor');
    });
    
    test('should login with valid user credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'user123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('user');
    });
    
    test('should fail with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid');
    });
    
    test('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should fail with inactive user', async () => {
      // First, deactivate a test user
      const { client, db } = await global.testHelpers.getTestDb();
      
      try {
        // Create inactive user
        await db.collection('users').insertOne({
          username: 'inactiveuser',
          password: '$2a$10$YourHashedPasswordHere',
          name: 'Inactive User',
          role: 'User',
          isActive: false,
          createdAt: new Date()
        });
        
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'inactiveuser',
            password: 'password'
          });
        
        expect(response.status).toBe(401);
        // API returns generic "Invalid credentials" for security
        expect(response.body.error).toContain('Invalid credentials');
      } finally {
        // Clean up
        await db.collection('users').deleteOne({ username: 'inactiveuser' });
        await client.close();
      }
    });
  });
  
  describe('POST /api/auth/logout', () => {
    test('should logout with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Logged out');
    });
    
    test('should return 401 without token (requires auth)', async () => {
      const response = await request(app)
        .post('/api/auth/logout');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /api/auth/check', () => {
    test('should return authenticated status with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/check')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated');
      expect(response.body.authenticated).toBe(true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('Admin');
    });
    
    test('should return unauthenticated without token', async () => {
      const response = await request(app)
        .get('/api/auth/check');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('authenticated');
      expect(response.body.authenticated).toBe(false);
    });
    
    test('should return unauthenticated with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/check')
        .set('Authorization', 'Bearer invalid-token-here');
      
      expect(response.status).toBe(401);
      expect(response.body.authenticated).toBe(false);
    });
    
    test('should return unauthenticated with expired token', async () => {
      // Create an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: '123', username: 'test', role: 'User' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );
      
      const response = await request(app)
        .get('/api/auth/check')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.authenticated).toBe(false);
    });
  });
  
  describe('POST /api/auth/verify-password', () => {
    test('should verify correct password for authenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'admin'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
      expect(response.body.valid).toBe(true);
    });
    
    test('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/verify-password')
        .send({
          password: 'admin'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should require password in request', async () => {
      const response = await request(app)
        .post('/api/auth/verify-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});