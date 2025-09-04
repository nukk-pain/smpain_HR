const UnifiedDocumentRepository = require('../../repositories/UnifiedDocumentRepository');
const { MongoClient, ObjectId } = require('mongodb');

describe('UnifiedDocumentRepository', () => {
  let repository;
  let db;
  let client;
  
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu_test';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
    repository = new UnifiedDocumentRepository();
  });
  
  afterAll(async () => {
    // Clean up test data
    await db.collection('unified_documents').deleteMany({ testData: true });
    await client.close();
  });
  
  describe('Document Creation', () => {
    it('should create a payslip document with all required fields', async () => {
      const testUserId = new ObjectId();
      const doc = await repository.createDocument({
        userId: testUserId,
        documentType: 'payslip',
        temporal: { year: 2025, month: 1 },
        file: { 
          path: '/test/file.pdf',
          originalName: 'test.pdf',
          size: 1024
        },
        userInfo: {
          name: 'Test User',
          employeeId: 'EMP001'
        },
        testData: true
      });
      
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
      expect(doc.documentType).toBe('payslip');
      expect(doc.temporal.year).toBe(2025);
      expect(doc.status.current).toBe('active');
      expect(doc.system.schemaVersion).toBe(2);
      expect(doc.file.uniqueId).toBeDefined();
      expect(doc.file.hash).toBeDefined();
    });
    
    it('should prevent duplicate payslips for same user/year/month', async () => {
      const testUserId = new ObjectId();
      const payslipData = {
        userId: testUserId,
        documentType: 'payslip',
        temporal: { year: 2025, month: 2 },
        file: { path: '/test/file.pdf' },
        testData: true
      };
      
      // Create first payslip
      await repository.createDocument(payslipData);
      
      // Try to create duplicate
      await expect(repository.createDocument(payslipData))
        .rejects.toThrow(/already exists/);
    });
    
    it('should allow multiple non-payslip documents', async () => {
      const testUserId = new ObjectId();
      
      const doc1 = await repository.createDocument({
        userId: testUserId,
        documentType: 'certificate',
        file: { path: '/test/cert1.pdf' },
        testData: true
      });
      
      const doc2 = await repository.createDocument({
        userId: testUserId,
        documentType: 'certificate',
        file: { path: '/test/cert2.pdf' },
        testData: true
      });
      
      expect(doc1._id).not.toEqual(doc2._id);
    });
  });
  
  describe('Document Queries', () => {
    let testUserId;
    
    beforeAll(async () => {
      testUserId = new ObjectId();
      
      // Create test documents
      const docs = [
        { userId: testUserId, documentType: 'payslip', temporal: { year: 2025, month: 3 }, testData: true },
        { userId: testUserId, documentType: 'payslip', temporal: { year: 2025, month: 4 }, testData: true },
        { userId: testUserId, documentType: 'certificate', temporal: { year: 2025 }, testData: true },
        { userId: testUserId, documentType: 'contract', testData: true }
      ];
      
      for (const doc of docs) {
        await repository.createDocument({
          ...doc,
          file: { path: `/test/${doc.documentType}.pdf` }
        });
      }
    });
    
    it('should find user documents', async () => {
      const docs = await repository.findUserDocuments(testUserId);
      
      expect(docs.length).toBeGreaterThanOrEqual(4);
      docs.forEach(doc => {
        expect(doc.userId.toString()).toBe(testUserId.toString());
      });
    });
    
    it('should filter by document type', async () => {
      const payslips = await repository.findUserDocuments(testUserId, {
        documentType: 'payslip'
      });
      
      expect(payslips.length).toBeGreaterThanOrEqual(2);
      payslips.forEach(doc => {
        expect(doc.documentType).toBe('payslip');
      });
    });
    
    it('should filter by year and month', async () => {
      const docs = await repository.findUserDocuments(testUserId, {
        year: 2025,
        month: 3
      });
      
      expect(docs.length).toBeGreaterThanOrEqual(1);
      expect(docs[0].temporal.year).toBe(2025);
      expect(docs[0].temporal.month).toBe(3);
    });
  });
  
  describe('Soft Delete and Restore', () => {
    it('should soft delete a document', async () => {
      const testUserId = new ObjectId();
      const adminUserId = new ObjectId();
      
      // Create document
      const doc = await repository.createDocument({
        userId: testUserId,
        documentType: 'certificate',
        file: { path: '/test/delete.pdf' },
        testData: true
      });
      
      // Soft delete
      const deleted = await repository.softDelete(doc._id, adminUserId, 'Test deletion');
      
      expect(deleted.status.current).toBe('deleted');
      expect(deleted.status.isDeleted).toBe(true);
      expect(deleted.status.deletedBy.toString()).toBe(adminUserId.toString());
      expect(deleted.status.deleteReason).toBe('Test deletion');
      expect(deleted.history).toHaveLength(2);
      expect(deleted.history[1].action).toBe('deleted');
    });
    
    it('should restore a deleted document', async () => {
      const testUserId = new ObjectId();
      const adminUserId = new ObjectId();
      
      // Create and delete document
      const doc = await repository.createDocument({
        userId: testUserId,
        documentType: 'certificate',
        file: { path: '/test/restore.pdf' },
        testData: true
      });
      
      await repository.softDelete(doc._id, adminUserId, 'Test deletion');
      
      // Restore
      const restored = await repository.restoreDocument(doc._id, adminUserId);
      
      expect(restored.status.current).toBe('active');
      expect(restored.status.isDeleted).toBe(false);
      expect(restored.status.restoredBy.toString()).toBe(adminUserId.toString());
      expect(restored.history).toHaveLength(3);
      expect(restored.history[2].action).toBe('restored');
    });
  });
  
  describe('Access Logging', () => {
    it('should log document access', async () => {
      const testUserId = new ObjectId();
      
      // Create document
      const doc = await repository.createDocument({
        userId: testUserId,
        documentType: 'payslip',
        temporal: { year: 2025, month: 5 },
        file: { path: '/test/access.pdf' },
        testData: true
      });
      
      // Log access
      await repository.logAccess(doc._id, testUserId, 'view', {
        userName: 'Test User',
        ipAddress: '127.0.0.1'
      });
      
      await repository.logAccess(doc._id, testUserId, 'download', {
        userName: 'Test User',
        ipAddress: '127.0.0.1'
      });
      
      // Check updated document
      const updated = await repository.findById(doc._id);
      
      expect(updated.accessCount.views).toBe(1);
      expect(updated.accessCount.downloads).toBe(1);
      expect(updated.recentAccess).toHaveLength(2);
      expect(updated.recentAccess[0].action).toBe('view');
      expect(updated.recentAccess[1].action).toBe('download');
    });
  });
  
  describe('Statistics', () => {
    it('should generate document statistics', async () => {
      const stats = await repository.getDocumentStatistics({ testData: true });
      
      expect(stats).toBeDefined();
      expect(stats.byType).toBeInstanceOf(Array);
      expect(stats.byYear).toBeInstanceOf(Array);
      expect(stats.totals).toBeDefined();
      expect(stats.totals.totalDocuments).toBeGreaterThan(0);
    });
  });
});

// Run tests if called directly
if (require.main === module) {
  const jest = require('jest');
  jest.run(['--testPathPattern=UnifiedDocumentRepository\\.test\\.js']);
}