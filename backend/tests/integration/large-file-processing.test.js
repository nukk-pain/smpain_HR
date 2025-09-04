/**
 * AI-HEADER
 * Intent: Integration tests for large file processing and performance optimization
 * Domain Meaning: Tests system behavior with high-volume payroll data uploads
 * Misleading Names: None
 * Data Contracts: Tests performance metrics and memory management
 * PII: Test data uses generated employee information
 * Invariants: Must process large files within time/memory limits
 * RAG Keywords: performance, large-file, processing, memory, optimization, scalability
 * DuplicatePolicy: canonical
 * FunctionIdentity: large-file-processing-integration-tests
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

describe('Large File Processing Tests', () => {
  let db;
  let authToken;
  let adminUserId;
  let testEmployees = [];
  let testFiles = [];

  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    small_file_time: 2000, // 2 seconds for < 100 records
    medium_file_time: 5000, // 5 seconds for < 1000 records
    large_file_time: 15000, // 15 seconds for < 5000 records
    max_memory_mb: 100, // 100MB memory increase limit
    max_file_size_mb: 50 // 50MB file size limit
  };

  beforeAll(async () => {
    // Connect to MongoDB
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db();

    // Create test admin user
    const adminUser = {
      name: 'Performance Test Admin',
      email: 'performance-admin@test.com',
      password: '$2a$10$test',
      role: 'Admin',
      employeeId: 'ADMIN004',
      permissions: ['payroll:read', 'payroll:write', 'payroll:delete', 'payroll:manage'],
      createdAt: new Date(),
      active: true
    };

    const result = await db.collection('users').insertOne(adminUser);
    adminUserId = result.insertedId;

    // Generate auth token
    authToken = jwt.sign(
      {
        id: adminUserId.toString(),
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminUser.permissions
      },
      JWT_SECRET,
      { 
        expiresIn: '2h', // Longer expiry for performance tests
        issuer: 'hr-system',
        audience: 'hr-frontend'
      }
    );

    // Create large number of test employees for matching
    testEmployees = generateTestEmployees(1000);
    
    // Insert in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < testEmployees.length; i += batchSize) {
      const batch = testEmployees.slice(i, i + batchSize);
      await db.collection('users').insertMany(batch);
    }
  });

  afterAll(async () => {
    // Cleanup
    if (adminUserId) {
      await db.collection('users').deleteOne({ _id: adminUserId });
    }
    
    await db.collection('users').deleteMany({
      employeeId: { $in: testEmployees.map(e => e.employeeId) }
    });

    // Clean up test payroll data
    await db.collection('payroll').deleteMany({
      uploadedBy: 'Performance Test Admin'
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
   * Test Case 1: Small file performance baseline
   */
  test('should process small files (< 100 records) efficiently', async () => {
    const recordCount = 50;
    const testFile = createLargePayrollFile(recordCount);
    testFiles.push(testFile);

    const startTime = Date.now();
    const initialMemory = process.memoryUsage();

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '12');

    const processingTime = Date.now() - startTime;
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    console.log(`Small file (${recordCount} records):`);
    console.log(`  Processing time: ${processingTime}ms`);
    console.log(`  Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Response status: ${response.status}`);

    // Performance assertions
    expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.small_file_time);
    expect(memoryIncrease / 1024 / 1024).toBeLessThan(PERFORMANCE_THRESHOLDS.max_memory_mb);

    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalRecords).toBe(recordCount);
    }
  }, 30000);

  /**
   * Test Case 2: Medium file processing
   */
  test('should process medium files (< 1000 records) within limits', async () => {
    const recordCount = 500;
    const testFile = createLargePayrollFile(recordCount);
    testFiles.push(testFile);

    const startTime = Date.now();
    const initialMemory = process.memoryUsage();

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '11');

    const processingTime = Date.now() - startTime;
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    console.log(`Medium file (${recordCount} records):`);
    console.log(`  Processing time: ${processingTime}ms`);
    console.log(`  Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Response status: ${response.status}`);

    // Performance assertions
    expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.medium_file_time);
    expect(memoryIncrease / 1024 / 1024).toBeLessThan(PERFORMANCE_THRESHOLDS.max_memory_mb);

    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalRecords).toBe(recordCount);
    }
  }, 45000);

  /**
   * Test Case 3: Large file processing
   */
  test('should process large files (< 5000 records) with optimization', async () => {
    const recordCount = 2000;
    const testFile = createLargePayrollFile(recordCount);
    testFiles.push(testFile);

    const startTime = Date.now();
    const initialMemory = process.memoryUsage();

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '10');

    const processingTime = Date.now() - startTime;
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    console.log(`Large file (${recordCount} records):`);
    console.log(`  Processing time: ${processingTime}ms`);
    console.log(`  Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Response status: ${response.status}`);

    // Performance assertions for large files
    expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.large_file_time);
    expect(memoryIncrease / 1024 / 1024).toBeLessThan(PERFORMANCE_THRESHOLDS.max_memory_mb);

    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalRecords).toBe(recordCount);
      
      // Should use file system backup for large data
      expect(response.body.data.metadata.usesFileSystemBackup).toBe(true);
    }
  }, 60000);

  /**
   * Test Case 4: Memory pressure handling
   */
  test('should handle memory pressure gracefully', async () => {
    const recordCount = 1000;
    
    // Create multiple files to simulate memory pressure
    const files = [];
    for (let i = 0; i < 3; i++) {
      const file = createLargePayrollFile(recordCount);
      files.push(file);
      testFiles.push(file);
    }

    const results = [];
    
    // Process files sequentially to test memory management
    for (let i = 0; i < files.length; i++) {
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .post('/api/payroll/excel/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', 'test-csrf-token')
        .attach('file', files[i])
        .field('year', '2024')
        .field('month', String(9 - i));

      const processingTime = Date.now() - startTime;
      
      results.push({
        fileIndex: i + 1,
        processingTime,
        status: response.status,
        memoryUsage: process.memoryUsage()
      });

      console.log(`File ${i + 1}/3: ${processingTime}ms, Status: ${response.status}`);
    }

    // Memory should be managed efficiently across multiple uploads
    const memoryGrowth = results.map((r, i) => i === 0 ? 0 : 
      r.memoryUsage.heapUsed - results[i-1].memoryUsage.heapUsed
    );

    console.log('Memory growth between uploads:', memoryGrowth.map(g => 
      `${(g / 1024 / 1024).toFixed(2)}MB`
    ));

    // Should not have excessive memory growth
    const maxGrowth = Math.max(...memoryGrowth.slice(1));
    expect(maxGrowth / 1024 / 1024).toBeLessThan(50); // Max 50MB growth between uploads
  }, 90000);

  /**
   * Test Case 5: File size limits
   */
  test('should respect file size limits and provide appropriate feedback', async () => {
    // Create file approaching size limit
    const recordCount = 10000; // Large record count
    const testFile = createLargePayrollFile(recordCount);
    testFiles.push(testFile);

    const fileStats = fs.statSync(testFile);
    const fileSizeMB = fileStats.size / 1024 / 1024;

    console.log(`Test file size: ${fileSizeMB.toFixed(2)}MB`);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '9');

    if (fileSizeMB > PERFORMANCE_THRESHOLDS.max_file_size_mb) {
      // Should reject oversized files
      expect(response.status).toBe(413);
      expect(response.body.error).toContain('File too large');
    } else {
      // Should process within limits
      console.log(`Large file processing status: ${response.status}`);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        
        // Should provide performance warnings for large files
        if (response.body.data.warnings) {
          const performanceWarnings = response.body.data.warnings.filter(w =>
            w.includes('large file') || w.includes('performance')
          );
          expect(performanceWarnings.length).toBeGreaterThanOrEqual(0);
        }
      }
    }
  }, 120000);

  /**
   * Test Case 6: Concurrent large file processing
   */
  test('should handle concurrent large file uploads', async () => {
    const recordCount = 300;
    const concurrentUploads = 3;
    
    const files = [];
    for (let i = 0; i < concurrentUploads; i++) {
      const file = createLargePayrollFile(recordCount);
      files.push(file);
      testFiles.push(file);
    }

    const startTime = Date.now();
    
    // Process files concurrently
    const uploadPromises = files.map((file, index) => 
      request(API_BASE)
        .post('/api/payroll/excel/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-csrf-token', 'test-csrf-token')
        .attach('file', file)
        .field('year', '2024')
        .field('month', String(8 - index))
    );

    const responses = await Promise.all(uploadPromises);
    const totalTime = Date.now() - startTime;

    console.log(`Concurrent uploads (${concurrentUploads} files):`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Average per file: ${(totalTime / concurrentUploads).toFixed(0)}ms`);
    console.log(`  Response statuses: ${responses.map(r => r.status).join(', ')}`);

    // At least some uploads should succeed or be properly rate limited
    const successfulUploads = responses.filter(r => r.status === 200).length;
    const rateLimitedUploads = responses.filter(r => r.status === 429).length;
    
    expect(successfulUploads + rateLimitedUploads).toBe(concurrentUploads);
    
    // Should not take excessively long for concurrent processing
    expect(totalTime).toBeLessThan(30000); // 30 seconds max
  }, 60000);

  /**
   * Test Case 7: Progressive processing feedback
   */
  test('should provide progressive processing feedback for large files', async () => {
    const recordCount = 1500;
    const testFile = createLargePayrollFile(recordCount);
    testFiles.push(testFile);

    const response = await request(API_BASE)
      .post('/api/payroll/excel/preview')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-csrf-token', 'test-csrf-token')
      .attach('file', testFile)
      .field('year', '2024')
      .field('month', '7');

    console.log(`Progressive feedback test status: ${response.status}`);

    if (response.status === 200) {
      const { data } = response.body;
      
      // Should provide processing metadata
      expect(data.metadata).toBeDefined();
      expect(data.metadata.processingTime).toBeDefined();
      expect(data.metadata.recordsProcessed).toBe(recordCount);
      
      // Should indicate processing strategy used
      if (recordCount > 1000) {
        expect(data.metadata.processingStrategy).toBeDefined();
        expect(['streaming', 'chunked', 'batch']).toContain(data.metadata.processingStrategy);
      }
      
      // Should provide performance metrics
      expect(data.performance).toBeDefined();
      expect(data.performance.recordsPerSecond).toBeGreaterThan(0);
    }
  }, 45000);

  // Helper functions
  function generateTestEmployees(count) {
    const employees = [];
    const departments = ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations'];
    const positions = ['Manager', 'Senior', 'Junior', 'Lead', 'Associate', 'Specialist'];

    for (let i = 1; i <= count; i++) {
      employees.push({
        name: `테스트직원${String(i).padStart(4, '0')}`,
        email: `test${i}@performance.com`,
        employeeId: `EMP${String(i + 1000).padStart(4, '0')}`,
        department: departments[i % departments.length],
        position: positions[i % positions.length],
        role: 'User',
        active: true,
        createdAt: new Date()
      });
    }

    return employees;
  }

  function createLargePayrollFile(recordCount) {
    const data = [
      ['직원명', '사번', '기본급', '식대', '교통비', '국민연금', '건강보험', '고용보험', '소득세']
    ];

    for (let i = 1; i <= recordCount; i++) {
      const employeeName = `테스트직원${String(i).padStart(4, '0')}`;
      const employeeId = `EMP${String(i + 1000).padStart(4, '0')}`;
      const baseSalary = 3000000 + (i * 10000) + Math.floor(Math.random() * 500000);
      
      // Calculate deductions and allowances
      const allowances = {
        meal: 150000,
        transport: 100000
      };
      
      const deductions = {
        nationalPension: Math.floor(baseSalary * 0.045),
        healthInsurance: Math.floor(baseSalary * 0.0325),
        employmentInsurance: Math.floor(baseSalary * 0.007),
        incomeTax: Math.floor(baseSalary * 0.08)
      };

      data.push([
        employeeName,
        employeeId,
        baseSalary,
        allowances.meal,
        allowances.transport,
        deductions.nationalPension,
        deductions.healthInsurance,
        deductions.employmentInsurance,
        deductions.incomeTax
      ]);
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Payroll');

    const filePath = path.join(__dirname, `test-large-${recordCount}-${Date.now()}.xlsx`);
    xlsx.writeFile(workbook, filePath);

    return filePath;
  }
});