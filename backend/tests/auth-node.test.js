/**
 * Authentication tests using Node's built-in test runner
 */
const test = require('node:test');
const assert = require('node:assert');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const createApp = require('../app');

let app;
let client;
let db;

test.before(async () => {
  // Setup database connection
  client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  db = client.db('hr_test');
  
  // Ensure test users exist
  const users = await db.collection('users').find({}).toArray();
  if (users.length === 0) {
    const hashedAdminPassword = await bcrypt.hash('admin', 10);
    const hashedUserPassword = await bcrypt.hash('user123', 10);
    
    await db.collection('users').insertMany([
      {
        username: 'admin',
        password: hashedAdminPassword,
        name: 'Test Admin',
        role: 'admin',
        isActive: true,
        department: 'IT'
      },
      {
        username: 'testuser',
        password: hashedUserPassword,
        name: 'Test User',
        role: 'user',
        isActive: true,
        department: 'Sales'
      }
    ]);
  }
  
  // Create app
  app = await createApp({
    mongoUri: 'mongodb://localhost:27017',
    dbName: 'hr_test',
    enableMonitoring: false,
    enableSwagger: false
  });
});

test.after(async () => {
  if (app && app.cleanup) {
    await app.cleanup();
  }
  if (client) {
    await client.close();
  }
});

test('POST /api/auth/login - admin login', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.token);
  assert.strictEqual(response.body.user.username, 'admin');
  assert.strictEqual(response.body.user.role, 'admin');
});

test('POST /api/auth/login - user login', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'testuser',
      password: 'user123'
    });
    
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.token);
  assert.strictEqual(response.body.user.username, 'testuser');
  assert.strictEqual(response.body.user.role, 'user');
});

test('POST /api/auth/login - invalid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'wrongpassword'
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
  assert.strictEqual(response.body.user.username, 'admin');
});

test('GET /api/auth/check - without token', async () => {
  const response = await request(app)
    .get('/api/auth/check');
    
  assert.strictEqual(response.status, 401);
  assert.strictEqual(response.body.authenticated, false);
});

test('POST /api/auth/logout - with token', async () => {
  // First login to get token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
    
  const token = loginResponse.body.token;
  
  // Logout
  const response = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);
    
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.message);
});