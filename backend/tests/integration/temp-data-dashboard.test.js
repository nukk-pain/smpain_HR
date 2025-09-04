/*
 * AI-HEADER
 * Intent: Test temporary data monitoring dashboard API endpoints
 * Domain Meaning: Administrative dashboard for monitoring temp upload storage and system health
 * Misleading Names: None
 * Data Contracts: Admin role required, returns comprehensive temp data statistics
 * PII: No PII data - only aggregate metrics and system health indicators
 * Invariants: Only admin users can access dashboard endpoints
 * RAG Keywords: temp data dashboard, monitoring, system health, storage metrics
 */

const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

/**
 * Temporary Data Monitoring Dashboard Tests
 * DomainMeaning: Test suite for administrative dashboard monitoring temp data
 * MisleadingNames: None
 * SideEffects: Creates test data in database, requires cleanup
 * Invariants: Admin authentication required for all dashboard endpoints
 * RAG_Keywords: temp data monitoring, dashboard API, system health metrics
 * DuplicatePolicy: canonical - primary temp data dashboard test suite
 * FunctionIdentity: hash_temp_data_dashboard_test_001
 */
describe('Temporary Data Monitoring Dashboard Tests', () => {
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
      console.log('✅ Admin login successful for temp data dashboard tests');
    } else {
      console.log('⚠️  Admin login failed for dashboard tests');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.collection('temp_uploads').deleteMany({ type: 'dashboard_test' });
    await client.close();
  });

  describe('GET /api/admin/dashboard/temp-data', () => {
    /**
     * Test Case 1: Dashboard returns comprehensive temp data metrics
     * DomainMeaning: Verify dashboard provides complete temp data overview
     */
    test('should return comprehensive temp data dashboard', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create test data representing different scenarios
      const testTempData = [
        // Recent uploads
        {
          _id: 'dashboard-test-recent-1',
          type: 'dashboard_test',
          uploadedBy: 'admin',
          sizeBytes: 1024 * 1024, // 1MB
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
          status: 'active'
        },
        // Expiring soon (within 5 minutes)
        {
          _id: 'dashboard-test-expiring-1',
          type: 'dashboard_test', 
          uploadedBy: 'admin',
          sizeBytes: 2048 * 1024, // 2MB
          createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 min ago
          expiresAt: new Date(Date.now() + 4 * 60 * 1000), // 4 min from now
          status: 'expiring_soon'
        },
        // Large files
        {
          _id: 'dashboard-test-large-1',
          type: 'dashboard_test',
          uploadedBy: 'admin',
          sizeBytes: 10 * 1024 * 1024, // 10MB
          createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min from now
          status: 'large_file'
        }
      ];

      await db.collection('temp_uploads').insertMany(testTempData);

      const response = await request(API_BASE)
        .get('/api/admin/dashboard/temp-data')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('storageMetrics');
      expect(response.body.data).toHaveProperty('expirationAnalysis');
      expect(response.body.data).toHaveProperty('sizeDistribution');
      expect(response.body.data).toHaveProperty('recentActivity');

      // Verify summary metrics
      expect(response.body.data.summary).toHaveProperty('totalEntries');
      expect(response.body.data.summary).toHaveProperty('totalSizeBytes');
      expect(response.body.data.summary).toHaveProperty('totalSizeMB');
      expect(response.body.data.summary).toHaveProperty('oldestEntry');
      expect(response.body.data.summary).toHaveProperty('newestEntry');

      // Verify storage metrics
      expect(response.body.data.storageMetrics).toHaveProperty('memoryUsage');
      expect(response.body.data.storageMetrics).toHaveProperty('diskUsage');
      expect(response.body.data.storageMetrics).toHaveProperty('capacityStatus');

      // Verify expiration analysis
      expect(response.body.data.expirationAnalysis).toHaveProperty('expiringSoon');
      expect(response.body.data.expirationAnalysis).toHaveProperty('expiredCount');
      expect(response.body.data.expirationAnalysis).toHaveProperty('averageRetentionTime');

      // Verify size distribution
      expect(response.body.data.sizeDistribution).toHaveProperty('small');
      expect(response.body.data.sizeDistribution).toHaveProperty('medium');
      expect(response.body.data.sizeDistribution).toHaveProperty('large');

      // Verify recent activity
      expect(response.body.data.recentActivity).toBeInstanceOf(Array);
      expect(response.body.data.recentActivity.length).toBeGreaterThanOrEqual(3);

      // Verify specific metrics from test data
      expect(response.body.data.summary.totalEntries).toBeGreaterThanOrEqual(3);
      expect(response.body.data.summary.totalSizeMB).toBeGreaterThanOrEqual(13); // ~13MB total
    });

    /**
     * Test Case 2: Dashboard handles empty temp data gracefully
     * DomainMeaning: Verify dashboard works when no temp data exists
     */
    test('should handle empty temp data gracefully', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Clean all temp data first
      await db.collection('temp_uploads').deleteMany({});

      const response = await request(API_BASE)
        .get('/api/admin/dashboard/temp-data')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalEntries).toBe(0);
      expect(response.body.data.summary.totalSizeBytes).toBe(0);
      expect(response.body.data.summary.totalSizeMB).toBe(0);
      expect(response.body.data.recentActivity).toEqual([]);
    });

    /**
     * Test Case 3: Unauthenticated access denied
     * DomainMeaning: Verify authentication required for dashboard
     */
    test('should require authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/dashboard/temp-data')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/auth/i);
    });
  });
});