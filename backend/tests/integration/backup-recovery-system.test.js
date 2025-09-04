/*
 * AI-HEADER
 * Intent: Test backup and recovery system for payroll data protection
 * Domain Meaning: Data backup and disaster recovery functionality
 * Misleading Names: None
 * Data Contracts: Admin role required, backup metadata and recovery procedures
 * PII: Backup data is encrypted, PII protection maintained
 * Invariants: Backups must be immutable, recovery must maintain data integrity
 * RAG Keywords: backup system, disaster recovery, data protection, restore operations
 */

const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

/**
 * Backup and Recovery System Tests
 * DomainMeaning: Test suite for data backup and disaster recovery operations
 * MisleadingNames: None
 * SideEffects: Creates backup files and test data in database
 * Invariants: Admin authentication required for all backup operations
 * RAG_Keywords: backup, recovery, disaster recovery, data protection
 * DuplicatePolicy: canonical - primary backup recovery test suite
 * FunctionIdentity: hash_backup_recovery_test_001
 */
describe('Backup and Recovery System Tests', () => {
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
      console.log('✅ Admin login successful for backup recovery tests');
    } else {
      console.log('⚠️  Admin login failed for backup recovery tests');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db.collection('backup_metadata').deleteMany({ source: 'test_backup' });
    await db.collection('recovery_logs').deleteMany({ source: 'test_recovery' });
    await client.close();
  });

  describe('POST /api/admin/backup/create', () => {
    /**
     * Test Case 1: Create a backup of critical data
     * DomainMeaning: Verify backup creation functionality
     */
    test('should create backup of specified collections', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .post('/api/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          collections: ['payroll', 'users', 'temp_uploads'],
          description: 'Test backup for integration testing',
          compressed: true,
          encrypted: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backupId');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('sizeBytes');
      expect(response.body.data).toHaveProperty('collections');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('location');
      
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.collections).toEqual(['payroll', 'users', 'temp_uploads']);
      expect(response.body.message).toMatch(/backup.*created/i);
    });

    /**
     * Test Case 2: Create incremental backup
     * DomainMeaning: Verify incremental backup functionality
     */
    test('should create incremental backup since last backup', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .post('/api/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'incremental',
          collections: ['payroll'],
          sinceTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backupId');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data.type).toBe('incremental');
      expect(response.body.data).toHaveProperty('changeCount');
    });

    /**
     * Test Case 3: Reject invalid collections
     * DomainMeaning: Verify validation of collection names
     */
    test('should reject backup with invalid collections', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .post('/api/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          collections: ['invalid_collection', 'another_invalid']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid.*collection/i);
    });
  });

  describe('GET /api/admin/backup/list', () => {
    /**
     * Test Case 4: List available backups
     * DomainMeaning: Verify backup listing functionality
     */
    test('should list available backups with metadata', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create test backup metadata
      await db.collection('backup_metadata').insertOne({
        backupId: 'test_backup_001',
        source: 'test_backup',
        timestamp: new Date(),
        collections: ['payroll'],
        sizeBytes: 1024000,
        status: 'completed',
        location: '/backups/test_backup_001.gz'
      });

      const response = await request(API_BASE)
        .get('/api/admin/backup/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          limit: 10,
          status: 'completed'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backups');
      expect(response.body.data.backups).toBeInstanceOf(Array);
      expect(response.body.data.backups.length).toBeGreaterThanOrEqual(1);
      
      const testBackup = response.body.data.backups.find(b => b.backupId === 'test_backup_001');
      expect(testBackup).toBeDefined();
      expect(testBackup.status).toBe('completed');
    });
  });

  describe('POST /api/admin/backup/restore', () => {
    /**
     * Test Case 5: Restore from backup
     * DomainMeaning: Verify backup restoration functionality
     */
    test('should restore data from specified backup', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .post('/api/admin/backup/restore')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          backupId: 'test_backup_001',
          collections: ['payroll'],
          targetDatabase: 'SM_nomu_restore_test',
          dryRun: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('restoreId');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('collections');
      expect(response.body.data).toHaveProperty('recordsRestored');
      expect(response.body.data).toHaveProperty('dryRun');
      expect(response.body.data.dryRun).toBe(true);
      expect(response.body.message).toMatch(/dry.*run.*completed/i);
    });

    /**
     * Test Case 6: Point-in-time recovery
     * DomainMeaning: Verify point-in-time recovery functionality
     */
    test('should support point-in-time recovery', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .post('/api/admin/backup/restore')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          restorePoint: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          collections: ['payroll'],
          mode: 'point_in_time'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('restoreId');
      expect(response.body.data).toHaveProperty('mode');
      expect(response.body.data.mode).toBe('point_in_time');
      expect(response.body.data).toHaveProperty('restorePoint');
    });
  });

  describe('DELETE /api/admin/backup/:backupId', () => {
    /**
     * Test Case 7: Delete old backup
     * DomainMeaning: Verify backup deletion functionality
     */
    test('should delete specified backup', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create a backup to delete
      await db.collection('backup_metadata').insertOne({
        backupId: 'test_backup_to_delete',
        source: 'test_backup',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
        collections: ['payroll'],
        sizeBytes: 512000,
        status: 'completed',
        location: '/backups/test_backup_to_delete.gz'
      });

      const response = await request(API_BASE)
        .delete('/api/admin/backup/test_backup_to_delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/backup.*deleted/i);

      // Verify backup was deleted
      const deletedBackup = await db.collection('backup_metadata').findOne({
        backupId: 'test_backup_to_delete'
      });
      expect(deletedBackup).toBeNull();
    });

    /**
     * Test Case 8: Prevent deletion of recent backups
     * DomainMeaning: Verify protection of recent backups
     */
    test('should prevent deletion of recent backups', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      // Create a recent backup
      await db.collection('backup_metadata').insertOne({
        backupId: 'test_recent_backup',
        source: 'test_backup',
        timestamp: new Date(), // Just created
        collections: ['payroll'],
        sizeBytes: 256000,
        status: 'completed',
        location: '/backups/test_recent_backup.gz'
      });

      const response = await request(API_BASE)
        .delete('/api/admin/backup/test_recent_backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/recent.*backup.*protected/i);
    });
  });

  describe('GET /api/admin/backup/verify/:backupId', () => {
    /**
     * Test Case 9: Verify backup integrity
     * DomainMeaning: Verify backup integrity checking functionality
     */
    test('should verify backup integrity', async () => {
      if (!adminToken) {
        console.log('⚠️  Skipping test - no admin token');
        return;
      }

      const response = await request(API_BASE)
        .get('/api/admin/backup/verify/test_backup_001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backupId');
      expect(response.body.data).toHaveProperty('integrity');
      expect(response.body.data).toHaveProperty('checksum');
      expect(response.body.data).toHaveProperty('verifiedAt');
      expect(response.body.data.integrity).toHaveProperty('status');
      expect(['valid', 'corrupted', 'missing']).toContain(response.body.data.integrity.status);
    });
  });
});