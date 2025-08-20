/*
 * AI-HEADER
 * Intent: Test Excel export functionality for leave overview data
 * Domain Meaning: Integration tests for leave data Excel file generation and download
 * Misleading Names: None
 * Data Contracts: Tests Excel export with leave balance and request data format
 * PII: Uses test data only - no real employee information
 * Invariants: All tests must pass, Excel generation must be accurate
 * RAG Keywords: leave excel export test, leave overview export, unified leave export
 */

const request = require('supertest');
const express = require('express');
const { MongoClient } = require('mongodb');
const { generateToken } = require('../utils/jwt');

// Mock the database utility
let mockDb;
jest.mock('../utils/database', () => ({
  getDatabase: jest.fn(() => mockDb),
  connectToDatabase: jest.fn(() => ({ client: null, db: mockDb }))
}));

describe('Leave Excel Export API', () => {
  let app, db, client, adminToken, userToken, supervisorToken;
  let testAdmin = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testadmin',
    name: 'Test Admin',
    role: 'Admin',
    permissions: ['leave:manage', 'leave:view']
  };
  let testUser = {
    _id: '507f1f77bcf86cd799439012', 
    username: 'testuser',
    name: 'Test User',
    role: 'User',
    permissions: ['leave:view']
  };
  let testSupervisor = {
    _id: '507f1f77bcf86cd799439013',
    username: 'testsupervisor',
    name: 'Test Supervisor',
    role: 'Supervisor',
    permissions: ['leave:view', 'leave:approve']
  };

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu_test';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    mockDb = db;

    // Generate tokens
    adminToken = generateToken(testAdmin);
    userToken = generateToken(testUser);
    supervisorToken = generateToken(testSupervisor);

    // Create Express app
    app = express();
    app.use(express.json());

    // Import routes (need to create the routes with db parameter)
    const createLeaveAdminRoutes = require('../routes/admin/leaveAdmin');
    const leaveAdminRoutes = createLeaveAdminRoutes(db);
    app.use('/api/leave/admin', leaveAdminRoutes);
  });

  afterAll(async () => {
    await client.close();
  });

  describe('GET /api/leave/admin/export/excel', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/leave/admin/export/excel')
        .expect(401);
        
      expect(response.body.error).toBe('Authentication required - No token provided');
    });

    it('should return 403 when user is not admin', async () => {
      const response = await request(app)
        .get('/api/leave/admin/export/excel')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
        
      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 200 when user is admin', async () => {
      const response = await request(app)
        .get('/api/leave/admin/export/excel?view=overview&year=2025')
        .set('Authorization', `Bearer ${adminToken}`)
        .timeout(20000)  // Set request timeout
        .expect(200);
        
      // Should return Excel file, not JSON
      expect(response.headers['content-type']).toMatch(/application\/vnd.openxmlformats/);
    }, 30000); // Increase test timeout to 30 seconds

    it('should return Excel file with correct content type', async () => {
      const response = await request(app)
        .get('/api/leave/admin/export/excel?view=overview&year=2025')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect('Content-Type', /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/);
      
      expect(response.headers['content-disposition']).toMatch(/attachment; filename\*=UTF-8''.*\.xlsx/);
    });
  });
});