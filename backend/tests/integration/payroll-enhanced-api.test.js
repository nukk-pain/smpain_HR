/*
 * AI-HEADER
 * Intent: Test enhanced payroll API endpoints with TDD approach
 * Domain Meaning: Integration tests for payroll CRUD operations
 * Misleading Names: None
 * Data Contracts: Tests payroll API with allowances/deductions structure
 * PII: Uses test data only - no real salary information
 * Invariants: All tests must pass, API must return correct status codes
 * RAG Keywords: payroll API test, TDD, integration test, CRUD operations
 */

const request = require('supertest');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const createPayrollRoutes = require('../../routes/payroll');
const PayrollRepository = require('../../repositories/PayrollRepository');
const { generateToken } = require('../../utils/jwt');
const { generateCsrfToken } = require('../../utils/payrollUtils');

// Mock the database utility
let mockDb;
jest.mock('../../utils/database', () => ({
  getDatabase: jest.fn(() => mockDb),
  connectToDatabase: jest.fn(() => ({ client: null, db: mockDb }))
}));

describe('Enhanced Payroll API Integration Tests', () => {
  let app, db, client, testUserId, adminToken, userToken;
  let testAdmin = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testadmin',
    name: 'Test Admin',
    role: 'Admin',
    permissions: ['payroll:view', 'payroll:manage']
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
    mockDb = db; // Set the mock database

    // Generate JWT tokens for testing
    adminToken = generateToken(testAdmin);
    userToken = generateToken(testUser);

    // Setup Express app with payroll routes
    app = express();
    app.use(express.json());
    app.use('/api/payroll', createPayrollRoutes(db));

    // Setup test data
    testUserId = '507f1f77bcf86cd799439013';
    
    // Create test user
    await db.collection('users').insertOne({
      _id: new ObjectId(testUserId),
      name: 'Test Employee',
      employeeId: 'EMP001',
      department: 'Engineering',
      position: 'Developer',
      role: 'User'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.collection('payroll').deleteMany({});
    await db.collection('users').deleteMany({});
    await client.close();
  });

  beforeEach(async () => {
    // Clear payroll collection before each test
    await db.collection('payroll').deleteMany({});
  });

  /**
   * Test Case 1: POST /api/payroll/enhanced - Create new payroll record
   * DomainMeaning: Verify payroll creation with allowances and deductions
   */
  test('should create new payroll record with allowances and deductions', async () => {
    const payrollData = {
      userId: testUserId,
      year: 2024,
      month: 8,
      baseSalary: 3000000,
      allowances: {
        overtime: 200000,
        position: 100000,
        meal: 150000,
        transportation: 50000,
        other: 0
      },
      deductions: {
        nationalPension: 135000,
        healthInsurance: 120000,
        employmentInsurance: 27000,
        incomeTax: 180000,
        localIncomeTax: 18000,
        other: 0
      }
    };

    const response = await request(app)
      .post('/api/payroll/enhanced')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payrollData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('_id');
    expect(response.body.data.baseSalary).toBe(3000000);
    expect(response.body.data.totalAllowances).toBe(500000); // Sum of allowances
    expect(response.body.data.totalDeductions).toBe(480000); // Sum of deductions
    expect(response.body.data.netSalary).toBe(3020000); // 3000000 + 500000 - 480000
    expect(response.body.data.paymentStatus).toBe('pending');
  });

  /**
   * Test Case 2: POST /api/payroll/enhanced - Prevent duplicate payroll records
   */
  test('should prevent duplicate payroll records for same user and period', async () => {
    const payrollData = {
      userId: testUserId,
      year: 2024,
      month: 8,
      baseSalary: 3000000,
      allowances: { overtime: 100000 },
      deductions: { nationalPension: 135000 }
    };

    // Create first record
    await request(app)
      .post('/api/payroll/enhanced')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payrollData)
      .expect(201);

    // Attempt to create duplicate
    const response = await request(app)
      .post('/api/payroll/enhanced')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payrollData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('already exists');
  });

  /**
   * Test Case 3: GET /api/payroll/enhanced - List payroll records with pagination
   */
  test('should retrieve payroll records with user information', async () => {
    // Create test payroll record
    const payrollRepo = new PayrollRepository();
    
    await payrollRepo.createPayroll({
      userId: new ObjectId(testUserId),
      year: 2024,
      month: 8,
      baseSalary: 3000000,
      allowances: { overtime: 200000, meal: 150000 },
      deductions: { nationalPension: 135000, incomeTax: 180000 },
      createdBy: new ObjectId(testAdmin._id)
    });

    const response = await request(app)
      .get('/api/payroll/enhanced')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toHaveProperty('user');
    expect(response.body.data[0].user.name).toBe('Test Employee');
    expect(response.body.pagination.total).toBe(1);
  });

  /**
   * Test Case 4: GET /api/payroll/enhanced - Role-based access control
   */
  test('should restrict user access to own payroll records only', async () => {
    // Create payroll for test user
    const payrollRepo = new PayrollRepository();
    
    const userPayroll = await payrollRepo.createPayroll({
      userId: new ObjectId(testUser._id),
      year: 2024,
      month: 8,
      baseSalary: 2500000,
      allowances: { meal: 100000 },
      deductions: { nationalPension: 112500 },
      createdBy: new ObjectId(testAdmin._id)
    });

    // Create payroll for another user
    await payrollRepo.createPayroll({
      userId: new ObjectId(testUserId),
      year: 2024,
      month: 8,
      baseSalary: 3000000,
      allowances: { meal: 150000 },
      deductions: { nationalPension: 135000 },
      createdBy: new ObjectId(testAdmin._id)
    });

    // User should only see their own record
    const response = await request(app)
      .get('/api/payroll/enhanced')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe(testUser._id);
  });

  /**
   * Test Case 5: GET /api/payroll/enhanced/:id - Get specific payroll record
   */
  test('should retrieve specific payroll record with details', async () => {
    // Create test payroll
    const payrollRepo = new PayrollRepository();
    
    const payrollRecord = await payrollRepo.createPayroll({
      userId: new ObjectId(testUserId),
      year: 2024,
      month: 8,
      baseSalary: 3000000,
      allowances: { overtime: 200000, position: 100000 },
      deductions: { nationalPension: 135000, healthInsurance: 120000 },
      createdBy: new ObjectId(testAdmin._id)
    });

    const response = await request(app)
      .get(`/api/payroll/enhanced/${payrollRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(payrollRecord._id.toString());
    expect(response.body.data.allowances.overtime).toBe(200000);
    expect(response.body.data.deductions.nationalPension).toBe(135000);
  });

  /**
   * Test Case 6: PUT /api/payroll/enhanced/:id - Update payroll record
   */
  test('should update payroll record and recalculate totals', async () => {
    // Create test payroll
    const payrollRepo = new PayrollRepository();
    
    const payrollRecord = await payrollRepo.createPayroll({
      userId: new ObjectId(testUserId),
      year: 2024,
      month: 8,
      baseSalary: 3000000,
      allowances: { overtime: 100000 },
      deductions: { nationalPension: 135000 },
      createdBy: new ObjectId(testAdmin._id)
    });

    const updateData = {
      baseSalary: 3500000,
      allowances: {
        overtime: 200000,
        meal: 150000
      },
      deductions: {
        nationalPension: 157500,
        healthInsurance: 140000
      }
    };

    const response = await request(app)
      .put(`/api/payroll/enhanced/${payrollRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify updated record
    const updatedRecord = await payrollRepo.findById(payrollRecord._id);
    expect(updatedRecord.baseSalary).toBe(3500000);
    expect(updatedRecord.totalAllowances).toBe(350000); // 200000 + 150000
    expect(updatedRecord.totalDeductions).toBe(297500); // 157500 + 140000
    expect(updatedRecord.netSalary).toBe(3552500); // 3500000 + 350000 - 297500
  });

  /**
   * Test Case 7: DELETE /api/payroll/enhanced/:id - Soft delete payroll record
   */
  test('should soft delete payroll record', async () => {
    // Create test payroll
    const payrollRepo = new PayrollRepository();
    
    const payrollRecord = await payrollRepo.createPayroll({
      userId: new ObjectId(testUserId),
      year: 2024,
      month: 8,
      baseSalary: 3000000,
      allowances: { overtime: 100000 },
      deductions: { nationalPension: 135000 },
      createdBy: new ObjectId(testAdmin._id)
    });

    const response = await request(app)
      .delete(`/api/payroll/enhanced/${payrollRecord._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify record is soft deleted
    const deletedRecord = await payrollRepo.findById(payrollRecord._id);
    expect(deletedRecord.isDeleted).toBe(true);
    expect(deletedRecord.paymentStatus).toBe('cancelled');
    expect(deletedRecord).toHaveProperty('deletedAt');
  });

  /**
   * Test Case 8: Authorization tests
   */
  test('should require authentication for all endpoints', async () => {
    await request(app)
      .get('/api/payroll/enhanced')
      .expect(401);

    await request(app)
      .post('/api/payroll/enhanced')
      .send({ userId: testUserId, year: 2024, month: 8, baseSalary: 3000000 })
      .expect(401);
  });

  test('should require appropriate permissions', async () => {
    // User without manage permission cannot create
    await request(app)
      .post('/api/payroll/enhanced')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: testUserId, year: 2024, month: 8, baseSalary: 3000000 })
      .expect(403);
  });
});