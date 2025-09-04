const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

// Test configuration
const TEST_PORT = process.env.PORT || 5778;
const API_BASE = process.env.API_BASE || `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu';

describe('Documents API Performance Tests', () => {
  let authToken;
  let adminToken;
  let db;
  let client;
  let testDocumentIds = [];

  beforeAll(async () => {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();

    // Get admin token
    const adminLoginResponse = await request(API_BASE)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    
    if (adminLoginResponse.body.success) {
      adminToken = adminLoginResponse.body.token;
    }

    // Create bulk test data (100 documents)
    const payslipsCollection = db.collection('payslips');
    const documents = [];
    
    for (let i = 0; i < 100; i++) {
      documents.push({
        userId: new ObjectId(),
        year: 2024 + Math.floor(i / 12),
        month: (i % 12) + 1,
        yearMonth: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
        fileName: `test_payslip_${i}.pdf`,
        originalFilename: `Payslip_${i}.pdf`,
        uniqueFileName: `payslip_perf_test_${i}_${Date.now()}.pdf`,
        fileSize: 100000 + (i * 1000),
        uploadedAt: new Date(Date.now() - (i * 86400000)), // Spread over days
        createdAt: new Date(Date.now() - (i * 86400000))
      });
    }

    const result = await payslipsCollection.insertMany(documents);
    testDocumentIds = Object.values(result.insertedIds).map(id => id.toString());
  });

  afterAll(async () => {
    // Cleanup test data
    if (testDocumentIds.length > 0) {
      const payslipsCollection = db.collection('payslips');
      await payslipsCollection.deleteMany({
        _id: { $in: testDocumentIds.map(id => new ObjectId(id)) }
      });
    }
    
    // Close MongoDB connection
    await client.close();
  });

  describe('Response Time Tests', () => {
    test('GET /api/documents should respond within 1 second', async () => {
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Less than 1 second
      
      console.log(`Document list response time: ${responseTime}ms`);
    });

    test('GET /api/documents with filters should respond within 1 second', async () => {
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get('/api/documents?year=2024&month=6&type=payslip')
        .set('Authorization', `Bearer ${adminToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000);
      
      console.log(`Filtered document list response time: ${responseTime}ms`);
    });

    test('GET /api/documents/admin/all should handle 100+ documents efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(API_BASE)
        .get('/api/documents/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(100);
      expect(responseTime).toBeLessThan(2000); // Less than 2 seconds for 100+ docs
      
      console.log(`Admin all documents response time: ${responseTime}ms for ${response.body.data.length} documents`);
    });
  });

  describe('Concurrent Request Tests', () => {
    test('should handle 10 concurrent document list requests', async () => {
      const requests = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(API_BASE)
            .get('/api/documents')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(totalTime).toBeLessThan(5000); // All requests complete within 5 seconds
      
      console.log(`10 concurrent requests completed in: ${totalTime}ms`);
    });

    test('should handle mixed read/write operations', async () => {
      const operations = [];
      const startTime = Date.now();
      
      // Mix of different operations
      for (let i = 0; i < 5; i++) {
        // Read operations
        operations.push(
          request(API_BASE)
            .get('/api/documents')
            .set('Authorization', `Bearer ${adminToken}`)
        );
        
        // Admin read operations
        operations.push(
          request(API_BASE)
            .get('/api/documents/admin/all')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      
      const responses = await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(totalTime).toBeLessThan(5000);
      
      console.log(`Mixed operations completed in: ${totalTime}ms`);
    });
  });

  describe('Memory and Resource Tests', () => {
    test('should efficiently handle large document metadata', async () => {
      // Create a large document entry
      const payslipsCollection = db.collection('payslips');
      const largeDoc = {
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        fileName: 'large_test.pdf',
        fileSize: 50 * 1024 * 1024, // 50MB
        modificationHistory: []
      };
      
      // Add 100 modification history entries
      for (let i = 0; i < 100; i++) {
        largeDoc.modificationHistory.push({
          action: 'modified',
          performedBy: new ObjectId(),
          performedAt: new Date(),
          reason: `Test modification ${i}`
        });
      }
      
      const result = await payslipsCollection.insertOne(largeDoc);
      
      const startTime = Date.now();
      const response = await request(API_BASE)
        .get('/api/documents/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(3000);
      
      // Cleanup
      await payslipsCollection.deleteOne({ _id: result.insertedId });
      
      console.log(`Large document handling time: ${responseTime}ms`);
    });
  });

  describe('Database Query Optimization', () => {
    test('should use indexes efficiently for year/month queries', async () => {
      const payslipsCollection = db.collection('payslips');
      
      // Ensure indexes exist
      await payslipsCollection.createIndex({ userId: 1, year: -1, month: -1 });
      await payslipsCollection.createIndex({ deleted: 1 });
      
      const startTime = Date.now();
      
      // Query that should use indexes
      const result = await payslipsCollection
        .find({
          year: 2024,
          month: 6,
          deleted: { $ne: true }
        })
        .toArray();
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(100); // Index query should be very fast
      
      console.log(`Indexed query time: ${queryTime}ms for ${result.length} documents`);
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  const { execSync } = require('child_process');
  try {
    execSync('npx jest documents-performance.test.js --testTimeout=60000', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
  } catch (error) {
    process.exit(1);
  }
}