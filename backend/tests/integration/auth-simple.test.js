/**
 * Simple Auth Test - Minimal test to verify setup
 */
const request = require('supertest');
const createApp = require('../../app');

describe('Simple Auth Test', () => {
  let app;
  
  beforeAll(async () => {
    // Create app with test configuration
    app = await createApp({
      mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: process.env.DB_NAME || 'hr_test',
      enableMonitoring: false,
      enableSwagger: false
    });
  });
  
  afterAll(async () => {
    if (app && app.cleanup) {
      await app.cleanup();
    }
  });
  
  test('should login with admin credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.username).toBe('admin');
    expect(response.body.user.role).toBe('admin');
  });
});