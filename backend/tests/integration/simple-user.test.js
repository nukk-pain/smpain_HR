/**
 * Simple test for user API with JWT auth
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

describe('Simple User API Test', () => {
  let adminToken;
  
  beforeAll(() => {
    // Generate admin token
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
    adminToken = jwt.sign(
      { 
        id: '507f1f77bcf86cd799439011',
        username: 'admin',
        name: 'Test Admin',
        role: 'Admin',
        permissions: ['users:view', 'users:manage', 'users:delete']
      },
      secret,
      { 
        expiresIn: '24h',
        issuer: 'hr-system',
        audience: 'hr-frontend'
      }
    );
  });

  afterAll((done) => {
    // Close server to prevent hanging
    if (app && app.server) {
      app.server.close(done);
    } else {
      done();
    }
  });

  test('Should get users list with valid token', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    expect(response.body).toBeDefined();
    console.log('✅ Users API working with JWT auth!');
  });
});