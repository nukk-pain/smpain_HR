/**
 * Direct Auth Test - Test routes directly without full app
 */
const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const createAuthRoutes = require('../routes/auth');

let app;
let client;
let db;

test.before(async () => {
  // Create minimal Express app
  app = express();
  app.use(express.json());
  
  // Connect to test database
  client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  db = client.db('hr_test');
  
  // Add auth routes
  app.use('/api/auth', createAuthRoutes(db));
  
  // Ensure test admin exists
  const admin = await db.collection('users').findOne({ username: 'admin' });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin', 10);
    await db.collection('users').insertOne({
      username: 'admin',
      password: hashedPassword,
      name: 'Test Admin',
      role: 'admin',
      isActive: true,
      department: 'IT'
    });
  }
});

test.after(async () => {
  if (client) {
    await client.close();
  }
});

test('POST /api/auth/login - successful admin login', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.token, 'Should return a token');
  assert.strictEqual(response.body.user.username, 'admin');
  assert.strictEqual(response.body.user.role, 'admin');
  assert.ok(response.body.success);
});

test('POST /api/auth/login - invalid password', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'wrongpassword'
    });
    
  assert.strictEqual(response.status, 401);
  assert.ok(response.body.error);
  assert.strictEqual(response.body.error, 'Invalid credentials');
});

test('POST /api/auth/login - non-existent user', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'nonexistent',
      password: 'password'
    });
    
  assert.strictEqual(response.status, 401);
  assert.ok(response.body.error);
});

test('GET /api/auth/check - with valid token', async () => {
  // First login to get token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  const token = loginResponse.body.token;
  
  // Check auth status
  const response = await request(app)
    .get('/api/auth/check')
    .set('Authorization', `Bearer ${token}`);
    
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.authenticated, true);
  assert.ok(response.body.user);
  assert.strictEqual(response.body.user.username, 'admin');
});

test('GET /api/auth/check - without token', async () => {
  const response = await request(app)
    .get('/api/auth/check');
    
  assert.strictEqual(response.status, 401);
  assert.strictEqual(response.body.authenticated, false);
});

test('POST /api/auth/logout - successful logout with valid token', async () => {
  // First login to get token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  const token = loginResponse.body.token;
  
  // Logout with token
  const response = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);
    
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
  assert.ok(response.body.message.includes('Logout successful'));
});

test('POST /api/auth/logout - fails without token', async () => {
  const response = await request(app)
    .post('/api/auth/logout');
    
  assert.strictEqual(response.status, 401);
  assert.ok(response.body.error);
});

test('POST /api/auth/verify-password - successful verification', async () => {
  // First login to get token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  const token = loginResponse.body.token;
  
  // Verify password with correct password
  const response = await request(app)
    .post('/api/auth/verify-password')
    .set('Authorization', `Bearer ${token}`)
    .send({
      password: 'admin'
    });
    
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.success, true);
  assert.ok(response.body.message.includes('Password verified'));
});

test('POST /api/auth/verify-password - fails with wrong password', async () => {
  // First login to get token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  const token = loginResponse.body.token;
  
  // Verify with wrong password
  const response = await request(app)
    .post('/api/auth/verify-password')
    .set('Authorization', `Bearer ${token}`)
    .send({
      password: 'wrongpassword'
    });
    
  assert.strictEqual(response.status, 401);
  assert.ok(response.body.error);
  assert.strictEqual(response.body.error, 'Invalid password');
});

test('POST /api/auth/verify-password - fails without token', async () => {
  const response = await request(app)
    .post('/api/auth/verify-password')
    .send({
      password: 'admin'
    });
    
  assert.strictEqual(response.status, 401);
  assert.ok(response.body.error);
});

test('POST /api/auth/verify-password - fails without password', async () => {
  // First login to get token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  const token = loginResponse.body.token;
  
  // Try without password
  const response = await request(app)
    .post('/api/auth/verify-password')
    .set('Authorization', `Bearer ${token}`)
    .send({});
    
  assert.strictEqual(response.status, 400);
  assert.ok(response.body.error);
  assert.strictEqual(response.body.error, 'Password is required');
});