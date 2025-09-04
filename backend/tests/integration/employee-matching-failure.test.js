/**
 * AI-HEADER
 * Intent: Integration tests for employee matching failure scenarios
 * Domain Meaning: Tests system behavior when employees cannot be matched during upload
 * Misleading Names: None
 * Data Contracts: Tests employee matching logic with real data
 * PII: Test data uses anonymized employee information
 * Invariants: Must handle unmatched employees gracefully with proper warnings
 * RAG Keywords: employee, matching, failure, integration, upload, validation
 * DuplicatePolicy: canonical
 * FunctionIdentity: employee-matching-failure-integration-tests
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

describe('Employee Matching Failure Tests', () => {
  let db;
  let authToken;
  let adminUserId;
  let testEmployees = [];
  let testFiles = [];

  beforeAll(async () => {
    // Connect to MongoDB
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db();

    // Create test admin user
    const adminUser = {
      name: 'Integration Test Admin',
      email: 'integration-admin@test.com',
      password: '$2a$10$test',
      role: 'Admin',
      employeeId: 'ADMIN002',
      permissions: ['payroll:read', 'payroll:write', 'payroll:delete', 'payroll:manage'],
      createdAt: new Date(),
      active: true
    };

    const result = await db.collection('users').insertOne(adminUser);
    adminUserId = result.insertedId;

    // Generate auth token with proper format
    authToken = jwt.sign(
      {
        id: adminUserId.toString(),
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminUser.permissions
      },
      JWT_SECRET,
      { 
        expiresIn: '1h',
        issuer: 'hr-system',
        audience: 'hr-frontend'
      }
    );

    // Create known test employees
    testEmployees = [
      {
        name: '김현우',
        email: 'kim.hw@test.com',
        employeeId: 'EMP201',
        department: 'Engineering',
        position: 'Developer',
        role: 'User',
        active: true,
        createdAt: new Date()
      },
      {
        name: '박서연',
        email: 'park.sy@test.com',
        employeeId: 'EMP202',
        department: 'Marketing',
        position: 'Manager',
        role: 'User',
        active: true,
        createdAt: new Date()
      }
    ];

    await db.collection('users').insertMany(testEmployees);
  });

  afterAll(async () => {
    // Cleanup
    if (adminUserId) {
      await db.collection('users').deleteOne({ _id: adminUserId });
    }
    
    await db.collection('users').deleteMany({
      employeeId: { $in: testEmployees.map(e => e.employeeId) }
    });

    // Remove test files
    testFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    if (db) {
      await db.client.close();
    }
  });

  /**
   * Test Case 1: Unknown employee names
   */
  test('should handle unknown employee names with warnings', async () => {
    const testFile = createExcelWithUnknownEmployees();
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));

    // Should succeed but with warnings
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const { data } = response.body;
    
    // Check for unmatched employees
    const unmatchedRecords = data.records.filter(r => !r.matchedUser.found);
    expect(unmatchedRecords.length).toBeGreaterThan(0);

    // Check warning counts
    expect(data.summary.warningRecords).toBeGreaterThan(0);
    
    // Verify specific unmatched employee
    const unknownEmployee = unmatchedRecords.find(r => r.employeeName === '홍길동');
    expect(unknownEmployee).toBeDefined();
    expect(unknownEmployee.matchedUser.found).toBe(false);
    expect(unknownEmployee.status).toBe('warning');
  }, 15000);

  /**
   * Test Case 2: Mismatched employee IDs
   */
  test('should handle employee ID mismatches', async () => {
    const testFile = createExcelWithMismatchedIds();
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    expect(response.status).toBe(200);
    
    const { data } = response.body;
    
    // Should have matching warnings
    const warningRecords = data.records.filter(r => r.warnings && r.warnings.length > 0);
    expect(warningRecords.length).toBeGreaterThan(0);

    // Check for ID mismatch warning
    const idMismatchRecord = warningRecords.find(r => 
      r.warnings.some(w => w.includes('ID mismatch') || w.includes('사번 불일치'))
    );
    expect(idMismatchRecord).toBeDefined();
  }, 15000);

  /**
   * Test Case 3: Inactive employees
   */
  test('should handle inactive employees appropriately', async () => {
    // Create an inactive employee
    const inactiveEmployee = {
      name: '이정민',
      email: 'lee.jm@test.com',
      employeeId: 'EMP203',
      department: 'Sales',
      position: 'Representative',
      role: 'User',
      active: false, // Inactive
      createdAt: new Date(),
      deactivatedAt: new Date()
    };

    const inactiveResult = await db.collection('users').insertOne(inactiveEmployee);
    
    const testFile = createExcelWithInactiveEmployee();
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    expect(response.status).toBe(200);
    
    const { data } = response.body;
    
    // Should find inactive employee with warnings
    const inactiveRecord = data.records.find(r => r.employeeName === '이정민');
    expect(inactiveRecord).toBeDefined();
    expect(inactiveRecord.status).toBe('warning');
    expect(inactiveRecord.warnings.some(w => 
      w.includes('inactive') || w.includes('비활성')
    )).toBe(true);

    // Cleanup
    await db.collection('users').deleteOne({ _id: inactiveResult.insertedId });
  }, 15000);

  /**
   * Test Case 4: Duplicate employee entries in Excel
   */
  test('should handle duplicate employees in same file', async () => {
    const testFile = createExcelWithDuplicateEmployees();
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    expect(response.status).toBe(200);
    
    const { data } = response.body;
    
    // Should detect duplicate entries
    expect(data.summary.warningRecords).toBeGreaterThan(0);
    
    // Check for duplicate warnings
    const duplicateWarnings = data.records.filter(r => 
      r.warnings && r.warnings.some(w => 
        w.includes('duplicate') || w.includes('중복')
      )
    );
    expect(duplicateWarnings.length).toBeGreaterThan(0);
  }, 15000);

  /**
   * Test Case 5: Fuzzy matching suggestions
   */
  test('should provide fuzzy matching suggestions for similar names', async () => {
    const testFile = createExcelWithSimilarNames();
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    expect(response.status).toBe(200);
    
    const { data } = response.body;
    
    // Should provide suggestions for similar names
    const recordsWithSuggestions = data.records.filter(r => 
      r.matchedUser.suggestions && r.matchedUser.suggestions.length > 0
    );
    
    expect(recordsWithSuggestions.length).toBeGreaterThan(0);
    
    // Verify suggestion format
    const suggestionRecord = recordsWithSuggestions[0];
    expect(suggestionRecord.matchedUser.suggestions[0]).toHaveProperty('name');
    expect(suggestionRecord.matchedUser.suggestions[0]).toHaveProperty('employeeId');
    expect(suggestionRecord.matchedUser.suggestions[0]).toHaveProperty('similarity');
  }, 15000);

  /**
   * Test Case 6: Department mismatch detection
   */
  test('should detect department mismatches', async () => {
    const testFile = createExcelWithDepartmentMismatch();
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    expect(response.status).toBe(200);
    
    const { data } = response.body;
    
    // Should detect department mismatches
    const mismatchRecords = data.records.filter(r => 
      r.warnings && r.warnings.some(w => 
        w.includes('department') || w.includes('부서')
      )
    );
    
    expect(mismatchRecords.length).toBeGreaterThan(0);
  }, 15000);

  /**
   * Test Case 7: Error recovery and partial processing
   */
  test('should handle mixed valid and invalid employees', async () => {
    const testFile = createExcelWithMixedEmployees();
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    expect(response.status).toBe(200);
    
    const { data } = response.body;
    
    // Should have both valid and invalid records
    expect(data.summary.validRecords).toBeGreaterThan(0);
    expect(data.summary.warningRecords).toBeGreaterThan(0);
    
    // Total should match
    const total = data.summary.validRecords + data.summary.warningRecords + data.summary.invalidRecords;
    expect(total).toBe(data.summary.totalRecords);
  }, 15000);

  // Helper functions for creating test Excel files
  function createExcelWithUnknownEmployees() {
    const data = [
      ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
      ['김현우', 'EMP201', 3500000, 150000, 100000, 157500, 113750, 24500, 350000], // Known
      ['홍길동', 'EMP999', 3000000, 150000, 100000, 135000, 97500, 21000, 300000], // Unknown
      ['박서연', 'EMP202', 3200000, 150000, 100000, 144000, 104000, 22400, 320000] // Known
    ];

    return createExcelFile(data, 'unknown-employees');
  }

  function createExcelWithMismatchedIds() {
    const data = [
      ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
      ['김현우', 'EMP999', 3500000, 150000, 100000, 157500, 113750, 24500, 350000], // Wrong ID
      ['박서연', 'EMP202', 3200000, 150000, 100000, 144000, 104000, 22400, 320000] // Correct
    ];

    return createExcelFile(data, 'mismatched-ids');
  }

  function createExcelWithInactiveEmployee() {
    const data = [
      ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
      ['이정민', 'EMP203', 2800000, 150000, 100000, 126000, 91000, 19600, 280000] // Inactive
    ];

    return createExcelFile(data, 'inactive-employee');
  }

  function createExcelWithDuplicateEmployees() {
    const data = [
      ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
      ['김현우', 'EMP201', 3500000, 150000, 100000, 157500, 113750, 24500, 350000],
      ['김현우', 'EMP201', 3500000, 150000, 100000, 157500, 113750, 24500, 350000] // Duplicate
    ];

    return createExcelFile(data, 'duplicate-employees');
  }

  function createExcelWithSimilarNames() {
    const data = [
      ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
      ['김현우', 'EMP201', 3500000, 150000, 100000, 157500, 113750, 24500, 350000], // Exact match
      ['김현', 'EMP999', 3000000, 150000, 100000, 135000, 97500, 21000, 300000] // Similar to 김현우
    ];

    return createExcelFile(data, 'similar-names');
  }

  function createExcelWithDepartmentMismatch() {
    const data = [
      ['직원명', '사번', '부서', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
      ['김현우', 'EMP201', 'Finance', 3500000, 150000, 100000, 157500, 113750, 24500, 350000] // Wrong dept
    ];

    return createExcelFile(data, 'department-mismatch');
  }

  function createExcelWithMixedEmployees() {
    const data = [
      ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세'],
      ['김현우', 'EMP201', 3500000, 150000, 100000, 157500, 113750, 24500, 350000], // Valid
      ['홍길동', 'EMP999', 3000000, 150000, 100000, 135000, 97500, 21000, 300000], // Invalid
      ['박서연', 'EMP202', 3200000, 150000, 100000, 144000, 104000, 22400, 320000], // Valid
      ['', 'EMP888', 2500000, 150000, 100000, 112500, 81250, 17500, 250000] // Empty name
    ];

    return createExcelFile(data, 'mixed-employees');
  }

  function createExcelFile(data, suffix) {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Payroll');

    const filePath = path.join(__dirname, `test-${suffix}-${Date.now()}.xlsx`);
    xlsx.writeFile(workbook, filePath);

    return filePath;
  }
});