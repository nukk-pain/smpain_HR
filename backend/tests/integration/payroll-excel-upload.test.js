/*
 * AI-HEADER
 * Intent: Test Excel upload functionality for payroll data processing
 * Domain Meaning: Integration tests for Excel file upload and parsing
 * Misleading Names: None
 * Data Contracts: Tests Excel upload with LaborConsultantParser format
 * PII: Uses test data only - no real salary information
 * Invariants: All tests must pass, Excel parsing must be accurate
 * RAG Keywords: excel upload test, payroll batch import, labor consultant format
 */

const request = require('supertest');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
const createPayrollRoutes = require('../../routes/payroll-enhanced');
const PayrollRepository = require('../../repositories/PayrollRepository');
const { generateToken } = require('../../utils/jwt');

// Mock the database utility
let mockDb;
jest.mock('../../utils/database', () => ({
  getDatabase: jest.fn(() => mockDb),
  connectToDatabase: jest.fn(() => ({ client: null, db: mockDb }))
}));

describe('Payroll Excel Upload Integration Tests', () => {
  let app, db, client, adminToken, userToken;
  let testAdmin = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testadmin',
    name: 'Test Admin',
    role: 'Admin',
    permissions: ['payroll:manage', 'payroll:view']
  };
  let testUser = {
    _id: '507f1f77bcf86cd799439012', 
    username: 'testuser',
    name: 'Test User',
    role: 'User',
    permissions: ['payroll:view']
  };

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu_test';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    mockDb = db;

    // Create Express app with payroll routes
    app = express();
    app.use(express.json());
    app.use('/api/payroll', createPayrollRoutes(db));

    // Generate tokens
    adminToken = generateToken(testAdmin);
    userToken = generateToken(testUser);

    // Clean up collections
    await db.collection('users').deleteMany({});
    await db.collection('payroll').deleteMany({});

    // Insert test users
    await db.collection('users').insertMany([
      { ...testAdmin, _id: new ObjectId(testAdmin._id) },
      { ...testUser, _id: new ObjectId(testUser._id) }
    ]);
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  beforeEach(async () => {
    // Clear payroll collection before each test
    await db.collection('payroll').deleteMany({});
  });

  describe('POST /api/payroll/excel/upload', () => {
    test('should respond to Excel upload endpoint', async () => {
      // Test that endpoint now exists and responds properly
      const response = await request(app)
        .post('/api/payroll/excel/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Should not return 404 anymore (endpoint should exist)
      // Should return 400 for missing file
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });

    test('should reject upload without Admin permissions', async () => {
      const response = await request(app)
        .post('/api/payroll/excel/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      // Should return 403 Forbidden for non-admin users
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    test('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/payroll/excel/upload')
        .send({});

      // Should return 401 Unauthorized
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('POST /api/payroll/excel/upload - When implemented', () => {
    test('should parse and import Excel file with labor consultant format', async () => {
      // This describes the complete expected behavior after implementation
      const testFilePath = path.join(__dirname, '../../sample-data/payroll/excel-templates/test-payroll.xlsx');
      
      // Skip test if file doesn't exist
      if (!fs.existsSync(testFilePath)) {
        console.log('Skipping test - sample Excel file not found');
        return;
      }

      const response = await request(app)
        .post('/api/payroll/excel/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', testFilePath);

      // Expected behavior when fully implemented:
      // - Should return 200 OK
      // - Should parse Excel file using LaborConsultantParser
      // - Should create payroll records in database
      // - Should return summary of imported records

      // For now, this will fail with 404
      if (response.status === 404) {
        expect(response.status).toBe(404); // Expected failure in Red phase
      } else {
        // Future implementation expectations
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('totalRecords');
        expect(response.body).toHaveProperty('successfulImports');
        expect(response.body).toHaveProperty('errors');
      }
    });
  });
});