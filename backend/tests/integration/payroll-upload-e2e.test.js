/**
 * AI-HEADER
 * Intent: End-to-end tests for complete payroll upload flow
 * Domain Meaning: Tests full preview->confirm workflow with real data
 * Misleading Names: None
 * Data Contracts: Tests actual API contracts and data flow
 * PII: Test data uses anonymized employee information
 * Invariants: Must test complete flow from file upload to database save
 * RAG Keywords: payroll, e2e, integration, upload, preview, confirm
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-upload-e2e-integration-tests
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// Test environment configuration
const API_BASE = process.env.API_BASE || 'http://localhost:5455';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu_test';
const JWT_SECRET = process.env.JWT_SECRET || 'sm_hr_jwt_secret_key_2024_development_ultra_secure_key_do_not_use_in_production';

describe('Payroll Upload E2E Tests', () => {
  let db;
  let authToken;
  let csrfToken;
  let adminUserId;
  let testEmployees = [];
  let testFilePath;

  beforeAll(async () => {
    // Connect to MongoDB
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db();

    // Use existing admin/admin account from development environment
    const loginResponse = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
      console.log('✅ E2E admin login successful');
      
      // Get CSRF token from payroll CSRF endpoint
      const csrfResponse = await request(API_BASE)
        .get('/api/payroll/csrf-token')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (csrfResponse.status === 200) {
        csrfToken = csrfResponse.body.data.csrfToken;
        console.log('✅ CSRF token retrieved successfully');
      } else {
        console.warn('⚠️ Failed to get CSRF token, using default');
        csrfToken = 'test-csrf-token';
      }
      
      // Get admin user ID for cleanup purposes (may not exist in test DB)
      const adminUser = await db.collection('users').findOne({ username: 'admin' });
      adminUserId = adminUser ? adminUser._id : null;
    } else {
      console.error('❌ E2E admin login failed:', loginResponse.body);
      throw new Error('E2E test setup failed - could not authenticate admin user');
    }

    // Create test employees
    testEmployees = [
      {
        name: '김철수',
        email: 'kim@test.com',
        employeeId: 'EMP001',
        department: 'Engineering',
        position: 'Senior Developer',
        role: 'User',
        active: true,
        createdAt: new Date()
      },
      {
        name: '이영희',
        email: 'lee@test.com',
        employeeId: 'EMP002',
        department: 'Marketing',
        position: 'Marketing Manager',
        role: 'User',
        active: true,
        createdAt: new Date()
      },
      {
        name: '박민수',
        email: 'park@test.com',
        employeeId: 'EMP003',
        department: 'Sales',
        position: 'Sales Representative',
        role: 'User',
        active: true,
        createdAt: new Date()
      }
    ];

    await db.collection('users').insertMany(testEmployees);

    // Create test Excel file
    testFilePath = await createTestExcelFile();
  });

  afterAll(async () => {
    // Cleanup test data (don't delete admin user as it's shared)
    await db.collection('users').deleteMany({
      employeeId: { $in: testEmployees.map(e => e.employeeId) }
    });

    await db.collection('payroll').deleteMany({
      $or: [
        { uploadedBy: 'E2E Test Admin' },
        { year: 2024, month: { $in: [6, 7, 8, 9, 10, 11, 12] } }
      ]
    });

    await db.collection('temp_uploads').deleteMany({});

    // Remove test file
    if (testFilePath && fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // Close database connection
    if (db) {
      await db.client.close();
    }
  });

  /**
   * Test Case 1: Complete successful upload flow
   */
  test('should complete full upload flow: preview -> confirm -> save', async () => {
    // Step 1: Upload file for preview
    const previewResponse = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', csrfToken)
      .attach('file', testFilePath)
      .field('year', '2024')
      .field('month', '12');

    expect(previewResponse.status).toBe(200);

    expect(previewResponse.body.success).toBe(true);
    expect(previewResponse.body.previewToken).toBeDefined();
    expect(previewResponse.body.data).toBeDefined();

    const { previewToken, data } = previewResponse.body;

    // Verify preview data
    expect(data.summary.totalRecords).toBe(3);
    expect(data.summary.validRecords).toBe(3);
    expect(data.records).toHaveLength(3);

    // Check employee matching
    const matchedEmployees = data.records.filter(r => r.matchedUser.found);
    expect(matchedEmployees).toHaveLength(3);

    // Step 2: Confirm and save to database
    const confirmResponse = await request(API_BASE)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .send({
        previewToken,
        idempotencyKey: `e2e-test-${Date.now()}`
      })
      .expect(200);

    expect(confirmResponse.body.success).toBe(true);
    expect(confirmResponse.body.summary.saved).toBe(3);

    // Step 3: Verify data was saved to database
    const savedPayrolls = await db.collection('payroll').find({
      year: 2024,
      month: 12
    }).toArray();

    expect(savedPayrolls).toHaveLength(3);

    // Verify payroll data
    const kimPayroll = savedPayrolls.find(p => p.employeeId === 'EMP001');
    expect(kimPayroll).toBeDefined();
    expect(kimPayroll.baseSalary).toBe(3500000);
    expect(kimPayroll.netSalary).toBeGreaterThan(0);

    // Step 4: Verify temp data was cleaned up
    const tempData = await db.collection('temp_uploads').findOne({
      token: previewToken
    });
    expect(tempData).toBeNull();
  }, 30000);

  /**
   * Test Case 2: Handle employee matching failures
   */
  test('should handle employee matching failures gracefully', async () => {
    // Create Excel with unknown employee
    const unknownEmployeeFile = await createExcelWithUnknownEmployee();

    const previewResponse = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', unknownEmployeeFile)
      .field('year', '2024')
      .field('month', '12')
      .expect(200);

    expect(previewResponse.body.success).toBe(true);
    
    const { data } = previewResponse.body;
    
    // Check for unmatched employees
    const unmatchedRecords = data.records.filter(r => !r.matchedUser.found);
    expect(unmatchedRecords.length).toBeGreaterThan(0);

    // Check for warnings
    expect(data.summary.warningRecords).toBeGreaterThan(0);

    // Cleanup
    fs.unlinkSync(unknownEmployeeFile);
  }, 20000);

  /**
   * Test Case 3: Handle duplicate data scenario
   */
  test('should prevent duplicate payroll entries', async () => {
    // First upload
    const firstPreview = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFilePath)
      .field('year', '2024')
      .field('month', '11')
      .expect(200);

    const firstConfirm = await request(API_BASE)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .send({
        previewToken: firstPreview.body.previewToken,
        idempotencyKey: `duplicate-test-1-${Date.now()}`
      })
      .expect(200);

    expect(firstConfirm.body.success).toBe(true);

    // Second upload with same data
    const secondPreview = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFilePath)
      .field('year', '2024')
      .field('month', '11')
      .expect(200);

    // Should show warnings about duplicates
    expect(secondPreview.body.data.warnings.length).toBeGreaterThan(0);
    const hasDuplicateWarning = secondPreview.body.data.warnings.some(
      w => w.includes('duplicate') || w.includes('exists')
    );
    expect(hasDuplicateWarning).toBe(true);
  }, 20000);

  /**
   * Test Case 4: Handle large file processing
   */
  test('should handle large Excel files efficiently', async () => {
    // Create large Excel file (1000 records)
    const largeFile = await createLargeExcelFile(1000);

    const startTime = Date.now();

    const previewResponse = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', largeFile)
      .field('year', '2024')
      .field('month', '12')
      .expect(200);

    const processingTime = Date.now() - startTime;

    // Should process within 5 seconds
    expect(processingTime).toBeLessThan(5000);
    expect(previewResponse.body.success).toBe(true);
    expect(previewResponse.body.data.summary.totalRecords).toBe(1000);

    // Cleanup
    fs.unlinkSync(largeFile);
  }, 10000);

  /**
   * Test Case 5: Handle concurrent upload attempts
   */
  test('should handle concurrent upload operations correctly', async () => {
    // Create multiple test files
    const file1 = await createTestExcelFile();
    const file2 = await createTestExcelFile();

    // Start two uploads concurrently
    const [preview1, preview2] = await Promise.all([
      request(API_BASE)
        .post('/api/payroll/excel/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', 'test-csrf-token')
        .attach('file', file1)
        .field('year', '2024')
        .field('month', '10'),
      
      request(API_BASE)
        .post('/api/payroll/excel/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', 'test-csrf-token')
        .attach('file', file2)
        .field('year', '2024')
        .field('month', '9')
    ]);

    // Both should succeed
    expect(preview1.status).toBe(200);
    expect(preview2.status).toBe(200);

    // Should have different preview tokens
    expect(preview1.body.previewToken).not.toBe(preview2.body.previewToken);

    // Confirm both concurrently
    const [confirm1, confirm2] = await Promise.all([
      request(API_BASE)
        .post('/api/payroll/excel/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', 'test-csrf-token')
        .send({
          previewToken: preview1.body.previewToken,
          idempotencyKey: `concurrent-1-${Date.now()}`
        }),
      
      request(API_BASE)
        .post('/api/payroll/excel/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', 'test-csrf-token')
        .send({
          previewToken: preview2.body.previewToken,
          idempotencyKey: `concurrent-2-${Date.now()}`
        })
    ]);

    expect(confirm1.status).toBe(200);
    expect(confirm2.status).toBe(200);

    // Cleanup
    fs.unlinkSync(file1);
    fs.unlinkSync(file2);
  }, 20000);

  /**
   * Test Case 6: Session expiry and recovery
   */
  test('should handle session expiry gracefully', async () => {
    // Create preview
    const previewResponse = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFilePath)
      .field('year', '2024')
      .field('month', '8')
      .expect(200);

    const { previewToken } = previewResponse.body;

    // Wait for token to expire (simulate by using expired token)
    const expiredToken = jwt.sign(
      { type: 'preview', exp: Math.floor(Date.now() / 1000) - 3600 },
      JWT_SECRET,
      {
        issuer: 'hr-system',
        audience: 'hr-frontend'
      }
    );

    const confirmResponse = await request(API_BASE)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .send({
        previewToken: expiredToken,
        idempotencyKey: `expired-test-${Date.now()}`
      });

    expect(confirmResponse.status).toBe(400);
    expect(confirmResponse.body.error).toContain('expired');
  }, 10000);

  /**
   * Test Case 7: Validate data integrity through full flow
   */
  test('should maintain data integrity through preview and confirm', async () => {
    // Upload for preview
    const previewResponse = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFilePath)
      .field('year', '2024')
      .field('month', '7')
      .expect(200);

    const previewData = previewResponse.body.data;
    const previewSummary = { ...previewData.summary };

    // Confirm
    const confirmResponse = await request(API_BASE)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .send({
        previewToken: previewResponse.body.previewToken,
        idempotencyKey: `integrity-test-${Date.now()}`
      })
      .expect(200);

    // Verify counts match
    expect(confirmResponse.body.summary.saved).toBe(previewSummary.validRecords);

    // Verify saved data matches preview
    const savedData = await db.collection('payroll').find({
      year: 2024,
      month: 7
    }).toArray();

    expect(savedData.length).toBe(previewSummary.validRecords);

    // Verify financial totals
    const totalNetSalary = savedData.reduce((sum, p) => sum + p.netSalary, 0);
    expect(totalNetSalary).toBeGreaterThan(0);
  }, 15000);

  /**
   * Test Case 8: Error recovery and rollback
   */
  test('should rollback on confirmation failure', async () => {
    // Create preview
    const previewResponse = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFilePath)
      .field('year', '2024')
      .field('month', '6')
      .expect(200);

    // Count initial payroll records
    const initialCount = await db.collection('payroll').countDocuments({
      year: 2024,
      month: 6
    });

    // Simulate database error by using invalid data
    const mockToken = jwt.sign(
      {
        type: 'preview',
        data: { records: [{ invalid: 'data' }] }
      },
      JWT_SECRET,
      { 
        expiresIn: '30m',
        issuer: 'hr-system',
        audience: 'hr-frontend'
      }
    );

    const confirmResponse = await request(API_BASE)
      .post('/api/payroll/excel/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .send({
        previewToken: mockToken,
        idempotencyKey: `rollback-test-${Date.now()}`
      });

    // Should fail
    expect(confirmResponse.status).not.toBe(200);

    // Verify no partial data was saved
    const finalCount = await db.collection('payroll').countDocuments({
      year: 2024,
      month: 6
    });

    expect(finalCount).toBe(initialCount);
  }, 10000);
});

// Helper functions
async function createTestExcelFile() {
  const workbook = xlsx.utils.book_new();
  const data = [
    ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
    ['김철수', 'EMP001', 3500000, 150000, 100000, 157500, 113750, 24500, 350000],
    ['이영희', 'EMP002', 3200000, 150000, 100000, 144000, 104000, 22400, 320000],
    ['박민수', 'EMP003', 2800000, 150000, 100000, 126000, 91000, 19600, 280000]
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Payroll');

  const filePath = path.join(__dirname, `test-payroll-${Date.now()}.xlsx`);
  xlsx.writeFile(workbook, filePath);

  return filePath;
}

async function createExcelWithUnknownEmployee() {
  const workbook = xlsx.utils.book_new();
  const data = [
    ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
    ['김철수', 'EMP001', 3500000, 150000, 100000, 157500, 113750, 24500, 350000],
    ['홍길동', 'EMP999', 3000000, 150000, 100000, 135000, 97500, 21000, 300000] // Unknown employee
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Payroll');

  const filePath = path.join(__dirname, `test-unknown-${Date.now()}.xlsx`);
  xlsx.writeFile(workbook, filePath);

  return filePath;
}

async function createLargeExcelFile(recordCount) {
  const workbook = xlsx.utils.book_new();
  const data = [
    ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세']
  ];

  // Generate test records
  for (let i = 1; i <= recordCount; i++) {
    data.push([
      `직원${i}`,
      `EMP${String(i).padStart(4, '0')}`,
      3000000 + (i * 10000),
      150000,
      100000,
      135000,
      97500,
      21000,
      300000
    ]);
  }

  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Payroll');

  const filePath = path.join(__dirname, `test-large-${Date.now()}.xlsx`);
  xlsx.writeFile(workbook, filePath);

  return filePath;
}