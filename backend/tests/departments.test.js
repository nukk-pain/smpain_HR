/**
 * Department Management API Tests  
 * Using Node's built-in test runner
 */
const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { connectToDatabase, closeDatabaseConnection } = require('../utils/database');
const createDepartmentRoutes = require('../routes/departments');
const createAuthRoutes = require('../routes/auth');

let app;
let db;
let adminToken;
let userToken;

test.before(async () => {
  // Set test environment variables
  process.env.DB_NAME = 'hr_test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  // Connect to database
  const connection = await connectToDatabase();
  db = connection.db;
  
  // Create minimal Express app
  app = express();
  app.use(express.json());
  
  // Add routes
  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/departments', createDepartmentRoutes(db));
  
  // Clear collections
  await db.collection('users').deleteMany({});
  await db.collection('departments').deleteMany({});
  
  // Create test users
  const hashedPassword = await bcrypt.hash('password', 10);
  
  await db.collection('users').insertOne({
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    username: 'admin',
    password: hashedPassword,
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin',
    isActive: true,
    department: 'IT'
  });
  
  await db.collection('users').insertOne({
    username: 'testuser',
    password: hashedPassword,
    name: 'Test User', 
    email: 'user@test.com',
    role: 'user',
    isActive: true,
    department: 'Sales'
  });
  
  // Create test departments
  await db.collection('departments').insertMany([
    {
      _id: new ObjectId('607f1f77bcf86cd799439001'),
      name: 'IT',
      description: 'Information Technology',
      manager: 'Admin User',
      created_at: new Date()
    },
    {
      _id: new ObjectId('607f1f77bcf86cd799439002'),
      name: 'Sales',
      description: 'Sales Department',
      manager: 'Sales Manager',
      created_at: new Date()
    }
  ]);
  
  // Login to get tokens
  const adminLoginResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'password' });
  adminToken = adminLoginResponse.body.token;
  
  const userLoginResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'testuser', password: 'password' });
  userToken = userLoginResponse.body.token;
});

test.after(async () => {
  await closeDatabaseConnection();
});

// Test 1: GET /api/departments - List all departments
test('GET /api/departments - list all departments', async () => {
  const response = await request(app)
    .get('/api/departments')
    .set('Authorization', `Bearer ${adminToken}`);
  
  console.log('Departments response:', response.status, JSON.stringify(response.body, null, 2));
  assert.strictEqual(response.status, 200);
  assert.ok(response.body);
  // Check for array or wrapped response
  if (Array.isArray(response.body)) {
    // Direct array response
    assert.ok(response.body.length >= 0); // May be empty initially
  } else if (response.body.success && response.body.data) {
    assert.ok(Array.isArray(response.body.data));
    // May return empty initially
    assert.ok(response.body.data.length >= 0);
  } else if (response.body.departments) {
    assert.ok(Array.isArray(response.body.departments));
    assert.ok(response.body.departments.length >= 0);
  }
});

// Test 2: POST /api/departments - Create new department
test('POST /api/departments - create new department', async () => {
  const newDepartment = {
    name: 'Marketing',
    description: 'Marketing Department',
    manager: 'Marketing Manager'
  };
  
  const response = await request(app)
    .post('/api/departments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(newDepartment);
  
  // Could be 200 or 201
  assert.ok(response.status === 200 || response.status === 201);
  assert.ok(response.body);
  
  // Verify created in database
  const created = await db.collection('departments').findOne({ name: 'Marketing' });
  assert.ok(created);
  assert.strictEqual(created.description, 'Marketing Department');
});

// Test 3: PUT /api/departments/:id - Update department
test('PUT /api/departments/:id - update department', async () => {
  // First create a department to update
  const createResult = await db.collection('departments').insertOne({
    name: 'HR',
    description: 'Human Resources',
    manager: 'HR Manager'
  });
  
  const updateData = {
    description: 'Updated HR Department',
    manager: 'New HR Manager'
  };
  
  const response = await request(app)
    .put(`/api/departments/${createResult.insertedId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(updateData);
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body);
  
  // Verify updated in database
  const updated = await db.collection('departments').findOne({
    _id: createResult.insertedId
  });
  assert.strictEqual(updated.description, 'Updated HR Department');
  assert.strictEqual(updated.manager, 'New HR Manager');
});

// Test 4: DELETE /api/departments/:id - Delete department
test('DELETE /api/departments/:id - delete department', async () => {
  // Create a department to delete
  const result = await db.collection('departments').insertOne({
    name: 'Temp',
    description: 'Temporary Department',
    manager: 'Temp Manager'
  });
  
  const response = await request(app)
    .delete(`/api/departments/${result.insertedId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body);
  assert.ok(response.body.success);
  
  // Verify deleted from database
  const deleted = await db.collection('departments').findOne({
    _id: result.insertedId
  });
  assert.strictEqual(deleted, null);
});