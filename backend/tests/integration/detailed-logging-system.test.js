/*
 * AI-HEADER
 * Intent: Test detailed logging system for payroll operations tracking
 * Domain Meaning: System-wide logging for audit trails and debugging
 * Misleading Names: None
 * Data Contracts: Admin role required for log access, structured log format
 * PII: Logs may contain user actions but PII data is masked
 * Invariants: All critical operations must be logged, logs must be immutable
 * RAG Keywords: logging system, audit trail, operation tracking, system monitoring
 */

const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

/**
 * Detailed Logging System Tests
 * DomainMeaning: Test suite for system-wide logging and audit trail functionality
 * MisleadingNames: None
 * SideEffects: Creates test log entries in database
 * Invariants: Admin authentication required for log access
 * RAG_Keywords: logging, audit trail, system monitoring, operation tracking
 * DuplicatePolicy: canonical - primary logging system test suite
 * FunctionIdentity: hash_logging_system_test_001
 */
describe('Detailed Logging System Tests', () => {
  const API_BASE = 'http://localhost:5455';
  let client;
  let db;
  let adminToken;

  beforeAll(async () => {
    // Connect to test database
    client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    db = client.db('SM_nomu');

    // Login as admin
    const adminLogin = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin'
      });

    if (adminLogin.status === 200) {
      adminToken = adminLogin.body.token;
      console.log('✅ Admin login successful for logging system tests');
    } else {
      console.log('⚠️  Admin login failed for logging tests');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.collection('system_logs').deleteMany({ source: 'test_logging' });
    await client.close();
  });

  describe('GET /api/admin/logs/query', () => {
    /**
     * Test Case 1: Query logs with filters
     * DomainMeaning: Verify log querying with various filter options
     */
    test('should query logs with filters', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create test log entries
      const testLogs = [
        {
          timestamp: new Date(),
          level: 'info',
          source: 'test_logging',
          operation: 'payroll_preview',
          userId: 'admin',
          message: 'Payroll preview initiated',
          metadata: {
            fileSize: 1024,
            rowCount: 50
          }
        },
        {
          timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
          level: 'warning',
          source: 'test_logging',
          operation: 'payroll_confirm',
          userId: 'admin',
          message: 'Duplicate entries detected',
          metadata: {
            duplicateCount: 3
          }
        },
        {
          timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
          level: 'error',
          source: 'test_logging',
          operation: 'payroll_cleanup',
          userId: 'admin',
          message: 'Cleanup failed',
          metadata: {
            error: 'Database connection timeout'
          }
        }
      ];

      await db.collection('system_logs').insertMany(testLogs);

      // Query logs with filters
      const response = await request(API_BASE)
        .get('/api/admin/logs/query')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          level: 'error',
          operation: 'payroll_cleanup',
          limit: 10
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('filters');
      
      // Verify filtered results
      expect(response.body.data.logs).toBeInstanceOf(Array);
      expect(response.body.data.logs.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.logs[0].level).toBe('error');
      expect(response.body.data.logs[0].operation).toBe('payroll_cleanup');
    });

    /**
     * Test Case 2: Query logs with date range
     * DomainMeaning: Verify log querying within specific time periods
     */
    test('should query logs within date range', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .get('/api/admin/logs/query')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          endDate: new Date().toISOString(),
          source: 'test_logging'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeInstanceOf(Array);
      
      // All logs should be within the date range
      response.body.data.logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        expect(logDate.getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
        expect(logDate.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    /**
     * Test Case 3: Unauthenticated access denied
     * DomainMeaning: Verify authentication required for log access
     */
    test('should require authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/logs/query')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/auth/i);
    });
  });

  describe('GET /api/admin/logs/stats', () => {
    /**
     * Test Case 4: Get logging statistics
     * DomainMeaning: Verify log statistics and analytics functionality
     */
    test('should return logging statistics', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .get('/api/admin/logs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('levelDistribution');
      expect(response.body.data).toHaveProperty('operationFrequency');
      expect(response.body.data).toHaveProperty('recentErrors');
      expect(response.body.data).toHaveProperty('hourlyActivity');

      // Verify summary statistics
      expect(response.body.data.summary).toHaveProperty('totalLogs');
      expect(response.body.data.summary).toHaveProperty('errorCount');
      expect(response.body.data.summary).toHaveProperty('warningCount');
      expect(response.body.data.summary).toHaveProperty('uniqueOperations');
      expect(response.body.data.summary).toHaveProperty('activeUsers');

      // Verify level distribution
      expect(response.body.data.levelDistribution).toHaveProperty('info');
      expect(response.body.data.levelDistribution).toHaveProperty('warning');
      expect(response.body.data.levelDistribution).toHaveProperty('error');
      expect(response.body.data.levelDistribution).toHaveProperty('debug');
    });
  });

  describe('POST /api/admin/logs/export', () => {
    /**
     * Test Case 5: Export logs for analysis
     * DomainMeaning: Verify log export functionality for external analysis
     */
    test('should export logs in specified format', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .post('/api/admin/logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'json',
          filters: {
            source: 'test_logging',
            level: 'error'
          },
          includeMetadata: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('exportId');
      expect(response.body.data).toHaveProperty('format');
      expect(response.body.data).toHaveProperty('recordCount');
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.message).toMatch(/export.*ready/i);
    });

    /**
     * Test Case 6: Invalid export format rejected
     * DomainMeaning: Verify validation of export format
     */
    test('should reject invalid export format', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .post('/api/admin/logs/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'invalid_format'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/format|invalid/i);
    });
  });

  describe('POST /api/admin/logs/cleanup', () => {
    /**
     * Test Case 7: Cleanup old logs
     * DomainMeaning: Verify old log cleanup functionality
     */
    test('should cleanup old logs based on retention policy', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create old test logs
      const oldLogs = [
        {
          timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
          level: 'info',
          source: 'test_logging',
          operation: 'old_operation',
          message: 'Old log entry'
        }
      ];

      await db.collection('system_logs').insertMany(oldLogs);

      const response = await request(API_BASE)
        .post('/api/admin/logs/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          retentionDays: 30,
          dryRun: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('removedCount');
      expect(response.body.data).toHaveProperty('freedSpaceKB');
      expect(response.body.data.removedCount).toBeGreaterThanOrEqual(1);

      // Verify old logs were removed
      const remainingOldLogs = await db.collection('system_logs').countDocuments({
        operation: 'old_operation'
      });
      expect(remainingOldLogs).toBe(0);
    });
  });
});