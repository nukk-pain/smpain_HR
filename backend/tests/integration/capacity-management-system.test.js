/*
 * AI-HEADER
 * Intent: Test capacity management system for temp upload storage
 * Domain Meaning: Automated storage capacity monitoring and cleanup system
 * Misleading Names: None
 * Data Contracts: Admin role required, manages storage limits and cleanup policies
 * PII: No PII data - only system capacity metrics and management operations
 * Invariants: Storage limits must be enforced, cleanup policies must be followed
 * RAG Keywords: capacity management, storage limits, cleanup policies, system administration
 */

const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

/**
 * Capacity Management System Tests
 * DomainMeaning: Test suite for storage capacity monitoring and management
 * MisleadingNames: None
 * SideEffects: Creates and manages test data in database for capacity testing
 * Invariants: Admin authentication required for all capacity management operations
 * RAG_Keywords: capacity management, storage limits, cleanup automation, system health
 * DuplicatePolicy: canonical - primary capacity management test suite
 * FunctionIdentity: hash_capacity_management_test_001
 */
describe('Capacity Management System Tests', () => {
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
      console.log('✅ Admin login successful for capacity management tests');
    } else {
      console.log('⚠️  Admin login failed for capacity management tests');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.collection('temp_uploads').deleteMany({ type: 'capacity_test' });
    await db.collection('capacity_policies').deleteMany({ createdBy: 'test_admin' });
    await client.close();
  });

  describe('GET /api/admin/capacity/status', () => {
    /**
     * Test Case 1: Admin can view current capacity status
     * DomainMeaning: Verify capacity monitoring provides comprehensive system status
     */
    test('should return current capacity status', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create test data to simulate capacity usage
      const testData = [
        {
          _id: 'capacity-test-1',
          type: 'capacity_test',
          uploadedBy: 'admin',
          sizeBytes: 5 * 1024 * 1024, // 5MB
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min from now
        },
        {
          _id: 'capacity-test-2',
          type: 'capacity_test',
          uploadedBy: 'admin',
          sizeBytes: 15 * 1024 * 1024, // 15MB
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min from now
        }
      ];

      await db.collection('temp_uploads').insertMany(testData);

      const response = await request(API_BASE)
        .get('/api/admin/capacity/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('currentUsage');
      expect(response.body.data).toHaveProperty('limits');
      expect(response.body.data).toHaveProperty('healthStatus');
      expect(response.body.data).toHaveProperty('recommendations');

      // Verify current usage metrics
      expect(response.body.data.currentUsage).toHaveProperty('totalSizeMB');
      expect(response.body.data.currentUsage).toHaveProperty('totalEntries');
      expect(response.body.data.currentUsage).toHaveProperty('memoryUsageMB');
      expect(response.body.data.currentUsage).toHaveProperty('utilizationPercentage');

      // Verify limits configuration
      expect(response.body.data.limits).toHaveProperty('maxSizeMB');
      expect(response.body.data.limits).toHaveProperty('maxEntries');
      expect(response.body.data.limits).toHaveProperty('warningThresholdPercent');
      expect(response.body.data.limits).toHaveProperty('criticalThresholdPercent');

      // Verify health status assessment
      expect(response.body.data.healthStatus).toHaveProperty('status');
      expect(response.body.data.healthStatus).toHaveProperty('message');
      expect(['healthy', 'warning', 'critical']).toContain(response.body.data.healthStatus.status);

      // Verify recommendations are provided
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
    });

    /**
     * Test Case 2: Unauthenticated access denied
     * DomainMeaning: Verify authentication required for capacity management
     */
    test('should require authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/capacity/status')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/auth/i);
    });
  });

  describe('POST /api/admin/capacity/cleanup', () => {
    /**
     * Test Case 3: Admin can trigger manual cleanup
     * DomainMeaning: Verify manual cleanup functionality works correctly
     */
    test('should allow manual capacity cleanup', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create expired test data that should be cleaned up
      const expiredData = [
        {
          _id: 'cleanup-expired-1',
          type: 'capacity_test',
          uploadedBy: 'admin',
          sizeBytes: 2 * 1024 * 1024, // 2MB
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          expiresAt: new Date(Date.now() - 30 * 60 * 1000) // Expired 30 min ago
        },
        {
          _id: 'cleanup-expired-2',
          type: 'capacity_test',
          uploadedBy: 'admin',
          sizeBytes: 3 * 1024 * 1024, // 3MB
          createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
          expiresAt: new Date(Date.now() - 15 * 60 * 1000) // Expired 15 min ago
        }
      ];

      await db.collection('temp_uploads').insertMany(expiredData);

      const response = await request(API_BASE)
        .post('/api/admin/capacity/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          policy: 'expired_only', // Only cleanup expired entries
          dryRun: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cleanupResults');
      expect(response.body.data).toHaveProperty('summary');

      // Verify cleanup results
      expect(response.body.data.cleanupResults).toHaveProperty('removedEntries');
      expect(response.body.data.cleanupResults).toHaveProperty('freedSpaceMB');
      expect(response.body.data.cleanupResults).toHaveProperty('cleanupDurationMs');

      // Verify summary information
      expect(response.body.data.summary).toHaveProperty('beforeCleanup');
      expect(response.body.data.summary).toHaveProperty('afterCleanup');

      // Verify that expired entries were actually removed
      const remainingExpired = await db.collection('temp_uploads').countDocuments({
        _id: { $in: ['cleanup-expired-1', 'cleanup-expired-2'] }
      });
      expect(remainingExpired).toBe(0);
    });

    /**
     * Test Case 4: Dry run mode works correctly
     * DomainMeaning: Verify dry run shows what would be cleaned without actually cleaning
     */
    test('should support dry run mode', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create expired test data
      const expiredData = [
        {
          _id: 'dryrun-expired-1',
          type: 'capacity_test',
          uploadedBy: 'admin',
          sizeBytes: 1 * 1024 * 1024, // 1MB
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 30 * 60 * 1000) // Expired
        }
      ];

      await db.collection('temp_uploads').insertMany(expiredData);

      const response = await request(API_BASE)
        .post('/api/admin/capacity/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          policy: 'expired_only',
          dryRun: true // Dry run mode
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dryRunResults');
      expect(response.body.data.dryRunResults).toHaveProperty('wouldRemoveEntries');
      expect(response.body.data.dryRunResults).toHaveProperty('wouldFreeSpaceMB');

      // Verify that no actual cleanup happened in dry run
      const stillExists = await db.collection('temp_uploads').countDocuments({
        _id: 'dryrun-expired-1'
      });
      expect(stillExists).toBe(1); // Should still exist since it's a dry run
    });
  });

  describe('POST /api/admin/capacity/policy', () => {
    /**
     * Test Case 5: Admin can configure capacity policies
     * DomainMeaning: Verify capacity management policies can be updated
     */
    test('should allow updating capacity policies', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const newPolicy = {
        maxSizeMB: 100,
        maxEntries: 50,
        warningThresholdPercent: 75,
        criticalThresholdPercent: 90,
        autoCleanupEnabled: true,
        autoCleanupIntervalMinutes: 10,
        cleanupPolicies: {
          removeExpired: true,
          removeOldestWhenFull: true,
          maxAgeHours: 4
        }
      };

      const response = await request(API_BASE)
        .post('/api/admin/capacity/policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newPolicy)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('policyId');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.message).toMatch(/policy.*updated/i);

      // Verify the policy was stored in database
      const storedPolicy = await db.collection('capacity_policies').findOne({
        policyId: response.body.data.policyId
      });
      expect(storedPolicy).toBeTruthy();
      expect(storedPolicy.maxSizeMB).toBe(100);
      expect(storedPolicy.maxEntries).toBe(50);
    });

    /**
     * Test Case 6: Invalid policy values are rejected
     * DomainMeaning: Verify policy validation prevents invalid configurations
     */
    test('should reject invalid policy values', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const invalidPolicy = {
        maxSizeMB: -10, // Invalid negative value
        maxEntries: 'invalid', // Invalid non-numeric value
        warningThresholdPercent: 150, // Invalid percentage > 100
        criticalThresholdPercent: 50, // Invalid: critical < warning
      };

      const response = await request(API_BASE)
        .post('/api/admin/capacity/policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPolicy)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|validation/i);
    });
  });
});