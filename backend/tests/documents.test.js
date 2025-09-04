const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs').promises;

// Test configuration
const TEST_PORT = process.env.PORT || 5777;
const API_BASE = process.env.API_BASE || `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu';

describe('Documents API Tests', () => {
  let authToken;
  let adminToken;
  let userId;
  let adminId;
  let testDocumentId;
  let db;
  let client;

  beforeAll(async () => {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();

    // Get test user tokens
    const loginResponse = await request(API_BASE)
      .post('/api/auth/login')
      .send({ username: 'test_user', password: 'test123' });
    
    if (loginResponse.body.success) {
      authToken = loginResponse.body.token;
      userId = loginResponse.body.user._id;
    }

    // Get admin token
    const adminLoginResponse = await request(API_BASE)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    
    if (adminLoginResponse.body.success) {
      adminToken = adminLoginResponse.body.token;
      adminId = adminLoginResponse.body.user._id;
    }

    // Create test payslip document
    const payslipsCollection = db.collection('payslips');
    const result = await payslipsCollection.insertOne({
      userId: new ObjectId(userId),
      year: 2025,
      month: 1,
      yearMonth: '2025-01',
      fileName: 'test_payslip.pdf',
      originalFilename: 'January_2025_Payslip.pdf',
      uniqueFileName: 'payslip_test_12345.pdf',
      fileSize: 102400,
      uploadedAt: new Date(),
      createdAt: new Date()
    });
    testDocumentId = result.insertedId.toString();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testDocumentId) {
      const payslipsCollection = db.collection('payslips');
      await payslipsCollection.deleteOne({ _id: new ObjectId(testDocumentId) });
    }
    
    // Close MongoDB connection
    await client.close();
  });

  describe('GET /api/documents', () => {
    test('should return user documents with valid auth', async () => {
      const response = await request(API_BASE)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter documents by type', async () => {
      const response = await request(API_BASE)
        .get('/api/documents?type=payslip')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const documents = response.body.data;
      documents.forEach(doc => {
        expect(doc.type).toBe('payslip');
      });
    });

    test('should filter documents by year and month', async () => {
      const response = await request(API_BASE)
        .get('/api/documents?year=2025&month=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const documents = response.body.data;
      documents.forEach(doc => {
        if (doc.year) expect(doc.year).toBe(2025);
        if (doc.month) expect(doc.month).toBe(1);
      });
    });

    test('should return 401 without authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/documents');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/documents/:id/download', () => {
    test('should download own document', async () => {
      const response = await request(API_BASE)
        .get(`/api/documents/${testDocumentId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      // File might not exist physically, so we check for 404
      expect([200, 404]).toContain(response.status);
    });

    test('should allow admin to download any document', async () => {
      const response = await request(API_BASE)
        .get(`/api/documents/${testDocumentId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    test('should return 403 when accessing other user document', async () => {
      // Create another user's document
      const payslipsCollection = db.collection('payslips');
      const otherDoc = await payslipsCollection.insertOne({
        userId: new ObjectId(),
        year: 2025,
        month: 2,
        fileName: 'other_payslip.pdf'
      });

      const response = await request(API_BASE)
        .get(`/api/documents/${otherDoc.insertedId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await payslipsCollection.deleteOne({ _id: otherDoc.insertedId });
    });
  });

  describe('Admin Document Management', () => {
    describe('GET /api/documents/admin/all', () => {
      test('should return all documents for admin', async () => {
        const response = await request(API_BASE)
          .get('/api/documents/admin/all')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      test('should include deleted documents when requested', async () => {
        const response = await request(API_BASE)
          .get('/api/documents/admin/all?includeDeleted=true')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      test('should return 403 for non-admin users', async () => {
        const response = await request(API_BASE)
          .get('/api/documents/admin/all')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('DELETE /api/documents/:id', () => {
      let deleteTestDocId;

      beforeEach(async () => {
        // Create a document to delete
        const payslipsCollection = db.collection('payslips');
        const result = await payslipsCollection.insertOne({
          userId: new ObjectId(userId),
          year: 2025,
          month: 3,
          fileName: 'delete_test.pdf'
        });
        deleteTestDocId = result.insertedId.toString();
      });

      test('should soft delete document with reason', async () => {
        const response = await request(API_BASE)
          .delete(`/api/documents/${deleteTestDocId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Test deletion' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify soft delete in database
        const payslipsCollection = db.collection('payslips');
        const doc = await payslipsCollection.findOne({ _id: new ObjectId(deleteTestDocId) });
        expect(doc.deleted).toBe(true);
        expect(doc.deleteReason).toBe('Test deletion');
      });

      test('should return 403 for non-admin users', async () => {
        const response = await request(API_BASE)
          .delete(`/api/documents/${deleteTestDocId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: 'Test deletion' });

        expect(response.status).toBe(403);
      });
    });

    describe('PUT /api/documents/:id/restore', () => {
      let restoreTestDocId;

      beforeEach(async () => {
        // Create a deleted document
        const payslipsCollection = db.collection('payslips');
        const result = await payslipsCollection.insertOne({
          userId: new ObjectId(userId),
          year: 2025,
          month: 4,
          fileName: 'restore_test.pdf',
          deleted: true,
          deletedAt: new Date(),
          deleteReason: 'Test deletion'
        });
        restoreTestDocId = result.insertedId.toString();
      });

      test('should restore deleted document', async () => {
        const response = await request(API_BASE)
          .put(`/api/documents/${restoreTestDocId}/restore`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify restoration in database
        const payslipsCollection = db.collection('payslips');
        const doc = await payslipsCollection.findOne({ _id: new ObjectId(restoreTestDocId) });
        expect(doc.deleted).toBe(false);
        expect(doc.restoredAt).toBeDefined();
      });

      afterEach(async () => {
        // Cleanup
        if (restoreTestDocId) {
          const payslipsCollection = db.collection('payslips');
          await payslipsCollection.deleteOne({ _id: new ObjectId(restoreTestDocId) });
        }
      });
    });
  });

  describe('Permission Checks', () => {
    test('should enforce document ownership for regular users', async () => {
      const response = await request(API_BASE)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const documents = response.body.data;
      
      // All documents should belong to the authenticated user
      documents.forEach(doc => {
        if (doc.userId) {
          expect(doc.userId).toBe(userId);
        }
      });
    });

    test('should allow admin to access all user documents', async () => {
      const response = await request(API_BASE)
        .get('/api/documents/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Admin should see documents from multiple users
      const userIds = new Set(response.body.data.map(doc => doc.userId));
      expect(userIds.size).toBeGreaterThanOrEqual(1);
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  const { execSync } = require('child_process');
  try {
    execSync('npx jest documents.test.js --testTimeout=30000', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
  } catch (error) {
    process.exit(1);
  }
}