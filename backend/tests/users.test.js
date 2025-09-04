/**
 * User Management API Tests
 * Using Node's built-in test runner
 */
const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createUserRoutes = require('../routes/users');
const createAuthRoutes = require('../routes/auth');
const { connectToDatabase, closeDatabaseConnection } = require('../utils/database');

let app;
let client;
let db;
let adminToken;
let userToken;

test.before(async () => {
  // Set test environment variables
  process.env.DB_NAME = 'hr_test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  // Connect to database using the utility (this sets up the global db connection)
  const connection = await connectToDatabase();
  db = connection.db;
  client = connection.client;
  
  // Create minimal Express app
  app = express();
  app.use(express.json());
  
  // Add routes
  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/users', createUserRoutes(db));
  
  // Clear users collection
  await db.collection('users').deleteMany({});
  
  // Create test users
  const hashedAdminPassword = await bcrypt.hash('admin', 10);
  const hashedUserPassword = await bcrypt.hash('user123', 10);
  
  await db.collection('users').insertMany([
    {
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      username: 'admin',
      password: hashedAdminPassword,
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin',
      isActive: true,
      department: 'IT',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId('507f1f77bcf86cd799439012'),
      username: 'testuser',
      password: hashedUserPassword,
      name: 'Test User',
      email: 'user@test.com',
      role: 'user',
      isActive: true,
      department: 'Sales',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  
  // Login to get proper tokens
  const adminLoginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin',
      password: 'admin'
    });
  adminToken = adminLoginResponse.body.token;
  
  const userLoginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'testuser',
      password: 'user123'
    });
  userToken = userLoginResponse.body.token;
});

test.after(async () => {
  await closeDatabaseConnection();
});

// Test 1: GET /api/users - List all users (admin only)
test('GET /api/users - admin can list all users', async () => {
  const response = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`);
    
  assert.strictEqual(response.status, 200);
  // The API returns an object with data array
  assert.ok(response.body);
  assert.ok(response.body.success);
  assert.ok(Array.isArray(response.body.data));
  assert.strictEqual(response.body.data.length, 2);
  // Password should not be included
  assert.ok(!response.body.data[0].password);
  assert.ok(!response.body.data[1].password);
});

// Test 2: GET /api/users - Regular user cannot list users
test('GET /api/users - regular user forbidden', async () => {
  const response = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${userToken}`);
    
  assert.strictEqual(response.status, 403);
  assert.ok(response.body.error);
});

// Test 3: GET /api/users/:id - Get specific user
test('GET /api/users/:id - get specific user', async () => {
  const response = await request(app)
    .get('/api/users/507f1f77bcf86cd799439012')
    .set('Authorization', `Bearer ${adminToken}`);
    
  assert.strictEqual(response.status, 200);
  assert.ok(response.body);
  assert.ok(response.body.success);
  assert.ok(response.body.data);
  assert.strictEqual(response.body.data.username, 'testuser');
  assert.strictEqual(response.body.data.name, 'Test User');
  assert.ok(!response.body.data.password);
});

// Test 4: POST /api/users - Create new user (admin only)
test('POST /api/users - admin can create user', async () => {
  const newUser = {
    username: 'newuser',
    password: 'newpass123',
    name: 'New User',
    email: 'new@test.com',
    role: 'user',
    department: 'HR'
  };
  
  const response = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(newUser);
    
  // API might return 200 or 201 for successful creation
  assert.ok(response.status === 200 || response.status === 201);
  assert.ok(response.body);
  assert.ok(response.body.success);
  // Check if user exists in response or fetch it
  if (response.body.user) {
    assert.strictEqual(response.body.user.username, 'newuser');
  }
  
  // Verify user was created in database
  const created = await db.collection('users').findOne({ username: 'newuser' });
  assert.ok(created);
  assert.strictEqual(created.name, 'New User');
});

// Test 5: PUT /api/users/:id - Update user
test('PUT /api/users/:id - update user details', async () => {
  const updates = {
    name: 'Updated User',
    department: 'Marketing'
  };
  
  const response = await request(app)
    .put('/api/users/507f1f77bcf86cd799439012')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(updates);
    
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.message);
  
  // Verify update in database
  const updated = await db.collection('users').findOne({ 
    _id: new ObjectId('507f1f77bcf86cd799439012') 
  });
  assert.strictEqual(updated.name, 'Updated User');
  assert.strictEqual(updated.department, 'Marketing');
});

// Test 6: DELETE /api/users/:id - Delete user (or deactivate)
test('DELETE /api/users/:id - deactivate user', async () => {
  // Create a user to delete
  const result = await db.collection('users').insertOne({
    username: 'todelete',
    password: 'pass',
    name: 'To Delete',
    email: 'delete@test.com',
    role: 'user',
    isActive: true,
    department: 'Temp'
  });
  
  const response = await request(app)
    .delete(`/api/users/${result.insertedId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ confirmed: true });
    
  assert.strictEqual(response.status, 200);
  
  // Verify user is deactivated (soft delete)
  const deleted = await db.collection('users').findOne({ 
    _id: result.insertedId 
  });
  
  // Check if actually deleted or just deactivated
  if (deleted) {
    assert.strictEqual(deleted.isActive, false);
  } else {
    // Hard delete case
    assert.ok(!deleted);
  }
});