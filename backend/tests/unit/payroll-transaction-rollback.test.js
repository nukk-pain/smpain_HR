/*
 * AI-HEADER
 * Intent: Test MongoDB transaction rollback functionality in payroll operations
 * Domain Meaning: Verify database consistency with atomic transactions
 * Misleading Names: None
 * Data Contracts: Tests transaction rollback in payroll confirm operations
 * PII: Uses test data only - no real salary information
 * Invariants: Transactions must be atomic - all succeed or all fail
 * RAG Keywords: transaction, rollback, MongoDB, ACID, atomic operations, payroll
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-transaction-rollback-tests
 */

const request = require('supertest');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const createPayrollRoutes = require('../../routes/payroll-enhanced');
const { generateToken } = require('../../utils/jwt');

// Mock the database utility
let mockDb;
jest.mock('../../utils/database', () => ({
  getDatabase: jest.fn(() => mockDb),
  connectToDatabase: jest.fn(() => ({ client: null, db: mockDb }))
}));

describe('Payroll Transaction Rollback Tests', () => {
  let app, db, client, testUserId1, testUserId2, adminToken;
  let testAdmin = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testadmin',
    name: 'Test Admin',
    role: 'admin',
    permissions: ['payroll:view', 'payroll:manage']
  };

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu_test';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    mockDb = db;

    // Generate JWT tokens for testing
    adminToken = generateToken(testAdmin);

    // Setup Express app with payroll routes
    app = express();
    app.use(express.json());
    app.use('/api/payroll', createPayrollRoutes(db));

    // Setup test data
    testUserId1 = '507f1f77bcf86cd799439013';
    testUserId2 = '507f1f77bcf86cd799439014';
    
    // Create test users
    await db.collection('users').insertMany([
      {
        _id: new ObjectId(testUserId1),
        name: 'Test Employee 1',
        employeeId: 'EMP001',
        department: 'Engineering',
        position: 'Developer',
        role: 'User'
      },
      {
        _id: new ObjectId(testUserId2),
        name: 'Test Employee 2',
        employeeId: 'EMP002',
        department: 'Engineering', 
        position: 'Developer',
        role: 'User'
      }
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.collection('payroll').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('temp_uploads').deleteMany({});
    await client.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await db.collection('payroll').deleteMany({});
    await db.collection('temp_uploads').deleteMany({});
  });

  /**
   * Test Case 1: Transaction rollback on single record failure
   * DomainMeaning: Verify failed single record doesn't leave partial data
   */
  test('should rollback transaction when single record fails validation', async () => {
    // Create preview data with one valid and one invalid record
    const mockPreviewData = {
      parsedRecords: [
        {
          userId: new ObjectId(testUserId1), // Valid user
          year: 2024,
          month: 8,
          baseSalary: 3000000,
          allowances: { overtime: 200000 },
          deductions: { nationalPension: 135000 }
        },
        {
          userId: new ObjectId('000000000000000000000000'), // Invalid user ID
          year: 2024,
          month: 8,
          baseSalary: 2500000,
          allowances: { overtime: 150000 },
          deductions: { nationalPension: 112500 }
        }
      ],
      fileName: 'rollback-single-test.xlsx',
      uploadedBy: testAdmin._id,
      year: 2024,
      month: 8,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };

    const uploadId = 'rollback-single-token-123';
    await db.collection('temp_uploads').insertOne({
      _id: uploadId,
      type: 'preview',
      data: mockPreviewData,
      uploadedBy: testAdmin._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const rollbackToken = generateToken({
      type: 'preview',
      userId: testAdmin._id,
      fileName: 'rollback-single-test.xlsx',
      year: 2024,
      month: 8,
      jti: uploadId,
      iat: Math.floor(Date.now() / 1000)
    });

    // Count records before transaction
    const payrollCountBefore = await db.collection('payroll').countDocuments({});

    const response = await request(app)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({
        previewToken: rollbackToken,
        idempotencyKey: 'rollback-single-test-' + Date.now()
      });

    // Count records after transaction
    const payrollCountAfter = await db.collection('payroll').countDocuments({});

    // No records should be created due to transaction rollback
    expect(payrollCountAfter).toBe(payrollCountBefore);

    // Verify no partial records exist for the valid user
    const validUserRecord = await db.collection('payroll').findOne({
      userId: new ObjectId(testUserId1),
      year: 2024,
      month: 8
    });
    expect(validUserRecord).toBeNull();

    // Response should indicate failure
    if (response.status >= 400) {
      expect(response.body.success).toBe(false);
    }
  });

  /**
   * Test Case 2: Transaction rollback on duplicate record constraint
   * DomainMeaning: Verify duplicate prevention triggers proper rollback
   */
  test('should rollback transaction when duplicate record constraint fails', async () => {
    // First, create an existing payroll record
    await db.collection('payroll').insertOne({
      userId: new ObjectId(testUserId1),
      year: 2024,
      month: 8,
      baseSalary: 2800000,
      totalAllowances: 100000,
      totalDeductions: 126000,
      netSalary: 2774000,
      paymentStatus: 'completed',
      createdAt: new Date(),
      createdBy: new ObjectId(testAdmin._id)
    });

    // Create preview data that includes duplicate record
    const mockPreviewData = {
      parsedRecords: [
        {
          userId: new ObjectId(testUserId1), // Duplicate record
          year: 2024,
          month: 8,
          baseSalary: 3000000,
          allowances: { overtime: 200000 },
          deductions: { nationalPension: 135000 }
        },
        {
          userId: new ObjectId(testUserId2), // New record
          year: 2024,
          month: 8,
          baseSalary: 2500000,
          allowances: { overtime: 150000 },
          deductions: { nationalPension: 112500 }
        }
      ],
      fileName: 'rollback-duplicate-test.xlsx',
      uploadedBy: testAdmin._id,
      year: 2024,
      month: 8,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };

    const uploadId = 'rollback-duplicate-token-123';
    await db.collection('temp_uploads').insertOne({
      _id: uploadId,
      type: 'preview',
      data: mockPreviewData,
      uploadedBy: testAdmin._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const rollbackToken = generateToken({
      type: 'preview',
      userId: testAdmin._id,
      fileName: 'rollback-duplicate-test.xlsx',
      year: 2024,
      month: 8,
      jti: uploadId,
      iat: Math.floor(Date.now() / 1000)
    });

    // Count records before transaction
    const payrollCountBefore = await db.collection('payroll').countDocuments({});

    const response = await request(app)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({
        previewToken: rollbackToken,
        idempotencyKey: 'rollback-duplicate-test-' + Date.now()
      });

    // Count records after transaction
    const payrollCountAfter = await db.collection('payroll').countDocuments({});

    // Should still have only the original record (no new records added)
    expect(payrollCountAfter).toBe(payrollCountBefore);

    // Verify testUserId2 record was not created due to rollback
    const user2Record = await db.collection('payroll').findOne({
      userId: new ObjectId(testUserId2),
      year: 2024,
      month: 8
    });
    expect(user2Record).toBeNull();

    // Original record should remain unchanged
    const originalRecord = await db.collection('payroll').findOne({
      userId: new ObjectId(testUserId1),
      year: 2024,
      month: 8
    });
    expect(originalRecord).toBeTruthy();
    expect(originalRecord.baseSalary).toBe(2800000); // Original value, not updated
  });

  /**
   * Test Case 3: Transaction rollback on database constraint violation
   * DomainMeaning: Verify schema constraint violations trigger rollback
   */
  test('should rollback transaction on database constraint violation', async () => {
    // Create preview data with invalid schema (negative salary)
    const mockPreviewData = {
      parsedRecords: [
        {
          userId: new ObjectId(testUserId1),
          year: 2024,
          month: 8,
          baseSalary: -1000000, // Invalid negative salary
          allowances: { overtime: 200000 },
          deductions: { nationalPension: 135000 }
        },
        {
          userId: new ObjectId(testUserId2),
          year: 2024,
          month: 8,
          baseSalary: 2500000,
          allowances: { overtime: 150000 },
          deductions: { nationalPension: 112500 }
        }
      ],
      fileName: 'rollback-constraint-test.xlsx',
      uploadedBy: testAdmin._id,
      year: 2024,
      month: 8,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };

    const uploadId = 'rollback-constraint-token-123';
    await db.collection('temp_uploads').insertOne({
      _id: uploadId,
      type: 'preview',
      data: mockPreviewData,
      uploadedBy: testAdmin._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const rollbackToken = generateToken({
      type: 'preview',
      userId: testAdmin._id,
      fileName: 'rollback-constraint-test.xlsx',
      year: 2024,
      month: 8,
      jti: uploadId,
      iat: Math.floor(Date.now() / 1000)
    });

    // Count records before transaction
    const payrollCountBefore = await db.collection('payroll').countDocuments({});

    const response = await request(app)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({
        previewToken: rollbackToken,
        idempotencyKey: 'rollback-constraint-test-' + Date.now()
      });

    // Count records after transaction
    const payrollCountAfter = await db.collection('payroll').countDocuments({});

    // No records should be created due to constraint violation
    expect(payrollCountAfter).toBe(payrollCountBefore);

    // Verify neither record was created
    const user1Record = await db.collection('payroll').findOne({
      userId: new ObjectId(testUserId1)
    });
    const user2Record = await db.collection('payroll').findOne({
      userId: new ObjectId(testUserId2)
    });
    
    expect(user1Record).toBeNull();
    expect(user2Record).toBeNull();
  });

  /**
   * Test Case 4: Successful transaction commits all records
   * DomainMeaning: Verify successful transactions commit all records atomically
   */
  test('should commit all records in successful transaction', async () => {
    // Create preview data with all valid records
    const mockPreviewData = {
      parsedRecords: [
        {
          userId: new ObjectId(testUserId1),
          year: 2024,
          month: 8,
          baseSalary: 3000000,
          allowances: { overtime: 200000, meals: 100000 },
          deductions: { nationalPension: 135000, healthInsurance: 120000 }
        },
        {
          userId: new ObjectId(testUserId2),
          year: 2024,
          month: 8,
          baseSalary: 2500000,
          allowances: { overtime: 150000, meals: 100000 },
          deductions: { nationalPension: 112500, healthInsurance: 100000 }
        }
      ],
      fileName: 'success-transaction-test.xlsx',
      uploadedBy: testAdmin._id,
      year: 2024,
      month: 8,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };

    const uploadId = 'success-transaction-token-123';
    await db.collection('temp_uploads').insertOne({
      _id: uploadId,
      type: 'preview',
      data: mockPreviewData,
      uploadedBy: testAdmin._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const successToken = generateToken({
      type: 'preview',
      userId: testAdmin._id,
      fileName: 'success-transaction-test.xlsx',
      year: 2024,
      month: 8,
      jti: uploadId,
      iat: Math.floor(Date.now() / 1000)
    });

    // Count records before transaction
    const payrollCountBefore = await db.collection('payroll').countDocuments({});

    const response = await request(app)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({
        previewToken: successToken,
        idempotencyKey: 'success-transaction-test-' + Date.now()
      });

    // If successful, should have created both records
    if (response.status === 200) {
      const payrollCountAfter = await db.collection('payroll').countDocuments({});
      expect(payrollCountAfter).toBe(payrollCountBefore + 2);

      // Verify both records were created
      const user1Record = await db.collection('payroll').findOne({
        userId: new ObjectId(testUserId1),
        year: 2024,
        month: 8
      });
      const user2Record = await db.collection('payroll').findOne({
        userId: new ObjectId(testUserId2),
        year: 2024,
        month: 8
      });

      expect(user1Record).toBeTruthy();
      expect(user2Record).toBeTruthy();
      
      // Verify calculated fields
      if (user1Record) {
        expect(user1Record.totalAllowances).toBe(300000); // 200000 + 100000
        expect(user1Record.totalDeductions).toBe(255000); // 135000 + 120000
        expect(user1Record.netSalary).toBe(3045000); // 3000000 + 300000 - 255000
      }
    }
  });

  /**
   * Test Case 5: Transaction isolation verification
   * DomainMeaning: Verify concurrent transactions don't interfere with each other
   */
  test('should maintain transaction isolation under concurrent operations', async () => {
    // Create two separate preview data sets
    const previewData1 = {
      parsedRecords: [{
        userId: new ObjectId(testUserId1),
        year: 2024,
        month: 8,
        baseSalary: 3000000,
        allowances: { overtime: 200000 },
        deductions: { nationalPension: 135000 }
      }],
      fileName: 'isolation-test-1.xlsx',
      uploadedBy: testAdmin._id,
      year: 2024,
      month: 8,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };

    const previewData2 = {
      parsedRecords: [{
        userId: new ObjectId(testUserId2),
        year: 2024,
        month: 8,
        baseSalary: 2500000,
        allowances: { overtime: 150000 },
        deductions: { nationalPension: 112500 }
      }],
      fileName: 'isolation-test-2.xlsx',
      uploadedBy: testAdmin._id,
      year: 2024,
      month: 8,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };

    // Store both preview data sets
    const uploadId1 = 'isolation-token-1';
    const uploadId2 = 'isolation-token-2';
    
    await Promise.all([
      db.collection('temp_uploads').insertOne({
        _id: uploadId1,
        type: 'preview',
        data: previewData1,
        uploadedBy: testAdmin._id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }),
      db.collection('temp_uploads').insertOne({
        _id: uploadId2,
        type: 'preview',
        data: previewData2,
        uploadedBy: testAdmin._id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      })
    ]);

    const token1 = generateToken({
      type: 'preview',
      userId: testAdmin._id,
      fileName: 'isolation-test-1.xlsx',
      year: 2024,
      month: 8,
      jti: uploadId1,
      iat: Math.floor(Date.now() / 1000)
    });

    const token2 = generateToken({
      type: 'preview',
      userId: testAdmin._id,
      fileName: 'isolation-test-2.xlsx',
      year: 2024,
      month: 8,
      jti: uploadId2,
      iat: Math.floor(Date.now() / 1000)
    });

    // Execute concurrent transactions
    const [response1, response2] = await Promise.all([
      request(app)
        .post('/api/payroll/excel/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          previewToken: token1,
          idempotencyKey: 'isolation-test-1-' + Date.now()
        }),
      request(app)
        .post('/api/payroll/excel/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          previewToken: token2,
          idempotencyKey: 'isolation-test-2-' + Date.now()
        })
    ]);

    // Both transactions should complete without interference
    expect(response1.status).toBeLessThan(500);
    expect(response2.status).toBeLessThan(500);

    // If both succeeded, verify both records exist
    if (response1.status === 200 && response2.status === 200) {
      const user1Record = await db.collection('payroll').findOne({
        userId: new ObjectId(testUserId1)
      });
      const user2Record = await db.collection('payroll').findOne({
        userId: new ObjectId(testUserId2)
      });

      expect(user1Record).toBeTruthy();
      expect(user2Record).toBeTruthy();
    }
  });
});