// AI-HEADER
// Intent: Test-driven development of PayrollDocumentRepository for managing payroll-related documents
// Domain Meaning: Document management for payroll files like payslips, tax statements, certificates
// Misleading Names: document vs file - document is metadata, file is the actual binary content
// Data Contracts: Must include payrollId, userId, year, month, documentType, file metadata
// PII: Contains sensitive payroll documents and file paths
// Invariants: Document must be linked to valid payroll record, file paths must be secure
// RAG Keywords: payroll document test, file management, payslip repository, document metadata

const { ObjectId } = require('mongodb');
const { getDatabase } = require('../../utils/database');
const PayrollDocumentRepository = require('../../repositories/PayrollDocumentRepository');

describe('PayrollDocumentRepository', () => {
  let db;
  let payrollDocumentRepository;

  beforeAll(async () => {
    // Use real database connection for testing
    db = await getDatabase();
    payrollDocumentRepository = new PayrollDocumentRepository();
  });

  afterAll(async () => {
    // Clean up test data
    await db.collection('payroll_documents').deleteMany({ _testData: true });
  });

  beforeEach(async () => {
    // Clear test document records before each test
    await db.collection('payroll_documents').deleteMany({ _testData: true });
  });

  describe('PayrollDocument Schema and Operations', () => {
    it('should create payroll document with complete metadata', async () => {
      const payrollId = new ObjectId();
      const userId = new ObjectId();
      const uploadedById = new ObjectId();
      
      const documentData = {
        payrollId: payrollId,
        userId: userId,
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'payslip_2025_01_john_doe.pdf',
        originalFileName: 'January 2025 Payslip.pdf',
        filePath: '/uploads/payslips/2025/01/payslip_2025_01_john_doe.pdf',
        fileSize: 256789,
        mimeType: 'application/pdf',
        uploadedBy: uploadedById,
        _testData: true
      };

      const result = await payrollDocumentRepository.createDocument(documentData);

      expect(result).toBeDefined();
      expect(result.payrollId).toEqual(payrollId);
      expect(result.userId).toEqual(userId);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.documentType).toBe('payslip');
      expect(result.fileName).toBe('payslip_2025_01_john_doe.pdf');
      expect(result.originalFileName).toBe('January 2025 Payslip.pdf');
      expect(result.filePath).toBe('/uploads/payslips/2025/01/payslip_2025_01_john_doe.pdf');
      expect(result.fileSize).toBe(256789);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.uploadedBy).toEqual(uploadedById);
      expect(result.uploadedAt).toBeInstanceOf(Date);
      expect(result.status).toBe('active');
      
      // Check security fields
      expect(result.isSecure).toBe(true);
      expect(result.accessLevel).toBe('restricted');
    });

    it('should handle different document types correctly', async () => {
      const testDocuments = [
        {
          documentType: 'payslip',
          fileName: 'payslip_test.pdf',
          mimeType: 'application/pdf',
          expectedCategory: 'payroll'
        },
        {
          documentType: 'tax_statement',
          fileName: 'tax_statement_test.pdf',
          mimeType: 'application/pdf',
          expectedCategory: 'tax'
        },
        {
          documentType: 'bonus_certificate',
          fileName: 'bonus_cert_test.pdf',
          mimeType: 'application/pdf',
          expectedCategory: 'bonus'
        },
        {
          documentType: 'salary_certificate',
          fileName: 'salary_cert_test.pdf',
          mimeType: 'application/pdf',
          expectedCategory: 'certificate'
        }
      ];

      for (const docData of testDocuments) {
        const result = await payrollDocumentRepository.createDocument({
          payrollId: new ObjectId(),
          userId: new ObjectId(),
          year: 2025,
          month: 1,
          ...docData,
          filePath: `/uploads/${docData.fileName}`,
          fileSize: 100000,
          uploadedBy: new ObjectId(),
          _testData: true
        });

        expect(result.documentType).toBe(docData.documentType);
        expect(result.category).toBe(docData.expectedCategory);
        expect(result.mimeType).toBe(docData.mimeType);
      }
    });

    it('should find documents by user and period', async () => {
      const userId = new ObjectId();
      const year = 2025;
      const month = 1;

      // Create multiple documents for the user and period
      await payrollDocumentRepository.createDocument({
        payrollId: new ObjectId(),
        userId: userId,
        year: year,
        month: month,
        documentType: 'payslip',
        fileName: 'payslip_1.pdf',
        filePath: '/uploads/payslip_1.pdf',
        fileSize: 100000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      await payrollDocumentRepository.createDocument({
        payrollId: new ObjectId(),
        userId: userId,
        year: year,
        month: month,
        documentType: 'tax_statement',
        fileName: 'tax_statement_1.pdf',
        filePath: '/uploads/tax_statement_1.pdf',
        fileSize: 150000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      // Create document for different user (should not be returned)
      await payrollDocumentRepository.createDocument({
        payrollId: new ObjectId(),
        userId: new ObjectId(),
        year: year,
        month: month,
        documentType: 'payslip',
        fileName: 'other_user_payslip.pdf',
        filePath: '/uploads/other_user_payslip.pdf',
        fileSize: 120000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      const userDocuments = await payrollDocumentRepository.findByUserAndPeriod(userId, year, month);

      expect(userDocuments).toHaveLength(2);
      expect(userDocuments[0].userId).toEqual(userId);
      expect(userDocuments[1].userId).toEqual(userId);
      expect(userDocuments.find(doc => doc.documentType === 'payslip')).toBeDefined();
      expect(userDocuments.find(doc => doc.documentType === 'tax_statement')).toBeDefined();
    });

    it('should find documents by payroll ID with details', async () => {
      const payrollId = new ObjectId();
      const userId = new ObjectId();

      await payrollDocumentRepository.createDocument({
        payrollId: payrollId,
        userId: userId,
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'payslip_with_details.pdf',
        filePath: '/uploads/payslip_with_details.pdf',
        fileSize: 200000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      const documents = await payrollDocumentRepository.findByPayrollId(payrollId);

      expect(documents).toHaveLength(1);
      expect(documents[0].payrollId).toEqual(payrollId);
      expect(documents[0].documentType).toBe('payslip');
      expect(documents[0].status).toBe('active');
    });

    it('should update document status and track changes', async () => {
      const document = await payrollDocumentRepository.createDocument({
        payrollId: new ObjectId(),
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'status_test.pdf',
        filePath: '/uploads/status_test.pdf',
        fileSize: 100000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      const updatedById = new ObjectId();
      const updated = await payrollDocumentRepository.updateStatus(document._id, 'archived', updatedById);

      expect(updated.status).toBe('archived');
      expect(updated.statusUpdatedBy).toEqual(updatedById);
      expect(updated.statusUpdatedAt).toBeInstanceOf(Date);
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('should soft delete document by marking as deleted', async () => {
      const document = await payrollDocumentRepository.createDocument({
        payrollId: new ObjectId(),
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'delete_test.pdf',
        filePath: '/uploads/delete_test.pdf',
        fileSize: 100000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      const deletedById = new ObjectId();
      const deleted = await payrollDocumentRepository.softDeleteDocument(document._id, deletedById);

      expect(deleted.status).toBe('deleted');
      expect(deleted.deletedBy).toEqual(deletedById);
      expect(deleted.deletedAt).toBeInstanceOf(Date);
      
      // Verify it doesn't appear in active documents
      const activeDocuments = await payrollDocumentRepository.findActiveDocuments();
      const foundDocument = activeDocuments.find(doc => doc._id.toString() === document._id.toString());
      expect(foundDocument).toBeUndefined();
    });

    it('should validate file size and mime type restrictions', async () => {
      // Test oversized file
      const oversizedDocument = {
        payrollId: new ObjectId(),
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'oversized.pdf',
        filePath: '/uploads/oversized.pdf',
        fileSize: 50 * 1024 * 1024, // 50MB - exceeds typical 5MB limit
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      };

      await expect(payrollDocumentRepository.createDocument(oversizedDocument))
        .rejects.toThrow('File size exceeds maximum allowed limit');

      // Test invalid mime type
      const invalidMimeDocument = {
        payrollId: new ObjectId(),
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'invalid.exe',
        filePath: '/uploads/invalid.exe',
        fileSize: 100000,
        mimeType: 'application/x-msdownload',
        uploadedBy: new ObjectId(),
        _testData: true
      };

      await expect(payrollDocumentRepository.createDocument(invalidMimeDocument))
        .rejects.toThrow('File type not allowed');
    });

    it('should generate secure download URLs with expiration', async () => {
      const document = await payrollDocumentRepository.createDocument({
        payrollId: new ObjectId(),
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'secure_download_test.pdf',
        filePath: '/uploads/secure_download_test.pdf',
        fileSize: 100000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      const requesterId = new ObjectId();
      const downloadUrl = await payrollDocumentRepository.generateSecureDownloadUrl(document._id, requesterId, '1h');

      expect(downloadUrl).toBeDefined();
      expect(downloadUrl).toMatch(/^\/api\/documents\/download\/[a-f0-9]{24}\?token=.+&expires=\d+$/);
      
      // Check that access is logged (includes creation event + download request)
      const accessLogs = await payrollDocumentRepository.getAccessHistory(document._id);
      expect(accessLogs).toHaveLength(2);
      expect(accessLogs[0].action).toBe('download_requested'); // Most recent first
      expect(accessLogs[0].requestedBy).toEqual(requesterId);
      expect(accessLogs[1].action).toBe('created'); // Creation event
    });

    it('should track document access history', async () => {
      const document = await payrollDocumentRepository.createDocument({
        payrollId: new ObjectId(),
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        documentType: 'payslip',
        fileName: 'access_history_test.pdf',
        filePath: '/uploads/access_history_test.pdf',
        fileSize: 100000,
        mimeType: 'application/pdf',
        uploadedBy: new ObjectId(),
        _testData: true
      });

      const userId1 = new ObjectId();
      const userId2 = new ObjectId();

      // Log multiple access events
      await payrollDocumentRepository.logAccess(document._id, userId1, 'view');
      await payrollDocumentRepository.logAccess(document._id, userId2, 'download');
      await payrollDocumentRepository.logAccess(document._id, userId1, 'print');

      const accessHistory = await payrollDocumentRepository.getAccessHistory(document._id);

      expect(accessHistory).toHaveLength(4); // Including creation event
      
      // Find specific actions regardless of order (since we're not guaranteed the exact timing order)
      const printAction = accessHistory.find(log => log.action === 'print');
      const downloadAction = accessHistory.find(log => log.action === 'download');
      const viewAction = accessHistory.find(log => log.action === 'view');
      const createdAction = accessHistory.find(log => log.action === 'created');
      
      expect(printAction).toBeDefined();
      expect(printAction.accessedBy).toEqual(userId1);
      expect(downloadAction).toBeDefined();
      expect(downloadAction.accessedBy).toEqual(userId2);
      expect(viewAction).toBeDefined();
      expect(viewAction.accessedBy).toEqual(userId1);
      expect(createdAction).toBeDefined();
    });
  });
});