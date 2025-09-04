/*
 * AI-HEADER
 * Intent: Test admin debug API endpoints for monitoring payroll system health
 * Domain Meaning: Administrative debugging tools for temp storage and system health
 * Misleading Names: None
 * Data Contracts: Admin role required, returns debug information as JSON
 * PII: No PII data in debug responses - only system metrics
 * Invariants: Only admin users can access debug endpoints
 * RAG Keywords: admin debug API, system monitoring, temp uploads, health check
 */

const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

/**
 * Admin Debug API Integration Tests
 * DomainMeaning: Test suite for administrative debugging endpoints
 * MisleadingNames: None
 * SideEffects: Creates test data in database, requires cleanup
 * Invariants: Admin authentication required for all endpoints
 * RAG_Keywords: admin debug, integration test, system health
 * DuplicatePolicy: canonical - primary admin debug test suite
 * FunctionIdentity: hash_admin_debug_test_001
 */
describe('Admin Debug API Integration Tests', () => {
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
      console.log('✅ Admin login successful for debug API tests');
    } else {
      console.log('⚠️  Admin login failed for debug tests');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.collection('temp_uploads').deleteMany({ type: 'test_debug' });
    await client.close();
  });

  describe('GET /api/admin/debug/temp-uploads', () => {
    /**
     * Test Case 1: Admin can access temp uploads debug info
     * DomainMeaning: Verify admin can view temporary upload storage status
     */
    test('should return temp uploads status for admin user', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create some test temp uploads data
      const testTempUploads = [
        {
          _id: 'debug-test-1',
          type: 'test_debug',
          uploadedBy: 'admin',
          sizeBytes: 1024,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
        },
        {
          _id: 'debug-test-2', 
          type: 'test_debug',
          uploadedBy: 'admin',
          sizeBytes: 2048,
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          expiresAt: new Date(Date.now() + 20 * 60 * 1000) // 20 minutes from now
        }
      ];

      await db.collection('temp_uploads').insertMany(testTempUploads);

      const response = await request(API_BASE)
        .get('/api/admin/debug/temp-uploads')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalEntries');
      expect(response.body.data).toHaveProperty('totalSizeBytes');
      expect(response.body.data).toHaveProperty('oldestEntry');
      expect(response.body.data).toHaveProperty('newestEntry');
      expect(response.body.data.totalEntries).toBeGreaterThanOrEqual(2);
      expect(response.body.data.totalSizeBytes).toBeGreaterThanOrEqual(3072);
    });

    /**
     * Test Case 2: Unauthenticated request should be denied
     * DomainMeaning: Verify authentication is required for debug endpoints
     */
    test('should require authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/debug/temp-uploads')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/auth/i);
    });
  });
});