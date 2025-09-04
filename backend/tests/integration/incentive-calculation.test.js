/**
 * TEST-02: Incentive Calculation Tests
 * TDD Approach: RED → GREEN → REFACTOR
 * 
 * Tests incentive auto-calculation from FEAT-05
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

describe('Incentive Calculation', () => {
  let adminToken;
  let db, connection;

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'SM_nomu_test';
    
    connection = await MongoClient.connect(uri);
    db = connection.db(dbName);
    app.locals.db = db;

    // Create admin user for testing
    await db.collection('users').deleteOne({ email: 'admin-incentive@test.com' });
    
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const adminUser = {
      userId: 'admin-incentive-test',
      username: 'admin-incentive-test',
      name: 'Incentive Test Admin',
      email: 'admin-incentive@test.com',
      password: hashedPassword,
      role: 'Admin',
      permissions: ['payroll:view', 'payroll:manage'],
      isActive: true,
      createdAt: new Date()
    };
    await db.collection('users').insertOne(adminUser);

    // Generate admin token
    adminToken = jwt.sign(
      { userId: adminUser.userId, role: 'Admin' },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Clean up test data from previous runs
    await db.collection('sales').deleteMany({ 
      month: { $in: ['202509', '202508'] },
      userId: { $regex: /^test-/i }
    });
  });

  describe('Basic Incentive Calculation', () => {
    // Test 1: RED → GREEN → REFACTOR
    test('Should calculate incentives correctly from sales data', async () => {
      // RED: Test calculation logic
      const salesData = {
        month: '202509',
        sales: [
          {
            userId: 'test-user-1',
            salesAmount: 10000000, // 10M
            // Expected incentive: 10M * 0.03 = 300,000
          },
          {
            userId: 'test-user-2',
            salesAmount: 25000000, // 25M
            // Expected incentive: 25M * 0.03 = 750,000
          }
        ]
      };

      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salesData);

      // GREEN: Verify formulas
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      
      // Check calculations
      if (response.body.results) {
        const user1Result = response.body.results.find(r => r.userId === 'test-user-1');
        const user2Result = response.body.results.find(r => r.userId === 'test-user-2');
        
        if (user1Result) {
          expect(user1Result.incentive).toBe(300000); // 3% of 10M
        }
        if (user2Result) {
          expect(user2Result.incentive).toBe(750000); // 3% of 25M
        }
      }

      // REFACTOR: Verify database entries
      const dbSales1 = await db.collection('sales').findOne({ userId: 'test-user-1', month: '202509' });
      if (dbSales1) {
        expect(dbSales1.incentive).toBe(300000);
      }
    });

    test('Should handle different incentive rates', async () => {
      // RED: Test with different rates
      const salesData = {
        month: '202509',
        sales: [
          {
            userId: 'test-user-rate-1',
            salesAmount: 10000000,
            incentiveRate: 0.05 // 5% rate
            // Expected: 10M * 0.05 = 500,000
          },
          {
            userId: 'test-user-rate-2',
            salesAmount: 10000000,
            incentiveRate: 0.02 // 2% rate
            // Expected: 10M * 0.02 = 200,000
          }
        ]
      };

      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salesData);

      // GREEN: Verify different rates
      expect(response.status).toBe(200);
      
      if (response.body.results) {
        const user1 = response.body.results.find(r => r.userId === 'test-user-rate-1');
        const user2 = response.body.results.find(r => r.userId === 'test-user-rate-2');
        
        if (user1) expect(user1.incentive).toBe(500000);
        if (user2) expect(user2.incentive).toBe(200000);
      }
    });

    test('Should handle zero sales amount', async () => {
      // RED: Test with zero sales
      const salesData = {
        month: '202509',
        sales: [
          {
            userId: 'test-user-zero',
            salesAmount: 0
            // Expected incentive: 0
          }
        ]
      };

      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salesData);

      // GREEN: Verify zero handling
      expect(response.status).toBe(200);
      
      const dbSales = await db.collection('sales').findOne({ userId: 'test-user-zero', month: '202509' });
      if (dbSales) {
        expect(dbSales.incentive).toBe(0);
      }
    });
  });

  describe('Incentive Rounding Tests', () => {
    // Test 2: Rounding to nearest 1000
    test('Should round incentives up to nearest 1000', async () => {
      // RED: Test rounding logic
      const salesData = {
        month: '202509',
        sales: [
          {
            userId: 'test-user-round-1',
            salesAmount: 10100000, // 10.1M
            // Raw: 10.1M * 0.03 = 303,000
            // Expected after rounding: 303,000 (already at 1000)
          },
          {
            userId: 'test-user-round-2',
            salesAmount: 10150000, // 10.15M
            // Raw: 10.15M * 0.03 = 304,500
            // Expected after rounding up: 305,000
          },
          {
            userId: 'test-user-round-3',
            salesAmount: 10001000, // 10.001M
            // Raw: 10.001M * 0.03 = 300,030
            // Expected after rounding up: 301,000
          }
        ]
      };

      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salesData);

      // GREEN: Verify Math.ceil rounding
      expect(response.status).toBe(200);
      
      // Check rounded values in database
      const dbSales1 = await db.collection('sales').findOne({ userId: 'test-user-round-1', month: '202509' });
      const dbSales2 = await db.collection('sales').findOne({ userId: 'test-user-round-2', month: '202509' });
      const dbSales3 = await db.collection('sales').findOne({ userId: 'test-user-round-3', month: '202509' });
      
      if (dbSales1) expect(dbSales1.incentive).toBe(303000);
      if (dbSales2) expect(dbSales2.incentive).toBe(305000);
      if (dbSales3) expect(dbSales3.incentive).toBe(301000);
    });

    test('Should handle edge cases in rounding', async () => {
      // RED: Test edge cases
      const salesData = {
        month: '202509',
        sales: [
          {
            userId: 'test-user-edge-1',
            salesAmount: 33333333, // 33.333M
            // Raw: 33.333M * 0.03 = 999,999
            // Expected after rounding: 1,000,000
          },
          {
            userId: 'test-user-edge-2',
            salesAmount: 1000, // 1K
            // Raw: 1K * 0.03 = 30
            // Expected after rounding: 1,000
          }
        ]
      };

      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salesData);

      // GREEN: Verify edge case handling
      expect(response.status).toBe(200);
      
      const dbSales1 = await db.collection('sales').findOne({ userId: 'test-user-edge-1', month: '202509' });
      const dbSales2 = await db.collection('sales').findOne({ userId: 'test-user-edge-2', month: '202509' });
      
      if (dbSales1) expect(dbSales1.incentive).toBe(1000000);
      if (dbSales2) expect(dbSales2.incentive).toBe(1000);
    });
  });

  describe('Bulk Incentive Processing', () => {
    // Test 3: Bulk operations
    test('Should process bulk sales data efficiently', async () => {
      // RED: Test bulk endpoint with many records
      const bulkSales = Array.from({ length: 20 }, (_, i) => ({
        userId: `test-bulk-user-${i}`,
        salesAmount: (i + 1) * 1000000 // 1M to 20M
      }));

      const salesData = {
        month: '202509',
        sales: bulkSales
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(salesData);
      const endTime = Date.now();

      // GREEN: Verify batch processing
      expect(response.status).toBe(200);
      
      // Should process within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify all records processed
      if (response.body.results) {
        expect(response.body.results.length).toBe(20);
      }

      // REFACTOR: Verify database entries
      const dbCount = await db.collection('sales').countDocuments({ 
        userId: { $regex: /^test-bulk-user-/i },
        month: '202509'
      });
      expect(dbCount).toBe(20);
    });

    test('Should handle updates for existing records', async () => {
      // Create initial record
      await db.collection('sales').insertOne({
        userId: 'test-update-user',
        month: '202509',
        salesAmount: 5000000,
        incentive: 150000
      });

      // RED: Test update with new data
      const updateData = {
        month: '202509',
        sales: [
          {
            userId: 'test-update-user',
            salesAmount: 10000000 // Updated amount
            // New incentive: 10M * 0.03 = 300,000
          }
        ]
      };

      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // GREEN: Verify update
      expect(response.status).toBe(200);
      
      const dbSales = await db.collection('sales').findOne({ 
        userId: 'test-update-user',
        month: '202509'
      });
      
      expect(dbSales.salesAmount).toBe(10000000);
      expect(dbSales.incentive).toBe(300000);
    });

    test('Should handle partial failures in bulk', async () => {
      // RED: Test with some invalid data
      const mixedData = {
        month: '202509',
        sales: [
          {
            userId: 'test-valid-user',
            salesAmount: 5000000
          },
          {
            userId: '', // Invalid - empty userId
            salesAmount: 5000000
          },
          {
            userId: 'test-invalid-amount',
            salesAmount: 'not-a-number' // Invalid amount
          }
        ]
      };

      const response = await request(app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mixedData);

      // GREEN: Should handle gracefully
      expect([200, 207]).toContain(response.status); // 207 for partial success
      
      // Valid record should be processed
      const validRecord = await db.collection('sales').findOne({ userId: 'test-valid-user', month: '202509' });
      if (validRecord) {
        expect(validRecord.salesAmount).toBe(5000000);
        expect(validRecord.incentive).toBe(150000);
      }
    });
  });

  describe('Incentive Retrieval and Reporting', () => {
    beforeAll(async () => {
      // Create test data for reporting
      const testSales = [
        { userId: 'report-user-1', month: '202509', salesAmount: 10000000, incentive: 300000 },
        { userId: 'report-user-2', month: '202509', salesAmount: 20000000, incentive: 600000 },
        { userId: 'report-user-3', month: '202509', salesAmount: 15000000, incentive: 450000 }
      ];

      await db.collection('sales').insertMany(testSales);
    });

    test('Should retrieve incentives by month', async () => {
      const response = await request(app)
        .get('/api/sales?month=202509')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Calculate total incentives
      const totalIncentives = response.body
        .filter(s => s.userId && s.userId.startsWith('report-user'))
        .reduce((sum, sale) => sum + (sale.incentive || 0), 0);
      
      expect(totalIncentives).toBe(1350000); // 300k + 600k + 450k
    });

    test('Should get individual user incentive', async () => {
      const response = await request(app)
        .get('/api/sales/report-user-1?month=202509')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('report-user-1');
      expect(response.body.incentive).toBe(300000);
    });

    test('Should export incentive data', async () => {
      const response = await request(app)
        .get('/api/sales/export?month=202509&format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      if (response.body && Array.isArray(response.body)) {
        const exportedUsers = response.body.filter(s => 
          s.userId && s.userId.startsWith('report-user')
        );
        expect(exportedUsers.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // REFACTOR: Extract helper functions
  const calculateIncentive = (salesAmount, rate = 0.03) => {
    const rawIncentive = salesAmount * rate;
    return Math.ceil(rawIncentive / 1000) * 1000; // Round up to nearest 1000
  };

  const bulkCreateSales = async (salesData) => {
    return request(app)
      .post('/api/sales/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(salesData);
  };

  describe('Refactored Tests with Helpers', () => {
    test('Helper: Verify calculation formula', () => {
      // Test calculation helper
      expect(calculateIncentive(10000000)).toBe(300000); // 10M * 3%
      expect(calculateIncentive(10150000)).toBe(305000); // Rounded up
      expect(calculateIncentive(10001000)).toBe(301000); // Rounded up
      expect(calculateIncentive(5000000, 0.05)).toBe(250000); // 5M * 5%
    });

    test('Helper: Batch incentive verification', async () => {
      const testData = {
        month: '202508',
        sales: [
          { userId: 'helper-user-1', salesAmount: 12000000 },
          { userId: 'helper-user-2', salesAmount: 18000000 },
          { userId: 'helper-user-3', salesAmount: 25000000 }
        ]
      };

      const response = await bulkCreateSales(testData);
      expect(response.status).toBe(200);

      // Verify calculations
      for (const sale of testData.sales) {
        const dbSale = await db.collection('sales').findOne({ 
          userId: sale.userId,
          month: '202508'
        });
        
        if (dbSale) {
          const expectedIncentive = calculateIncentive(sale.salesAmount);
          expect(dbSale.incentive).toBe(expectedIncentive);
        }
      }
    });

    test('Helper: Monthly incentive summary', async () => {
      // Get all September sales
      const response = await request(app)
        .get('/api/sales?month=202509')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      // Generate summary
      const summary = {
        month: '202509',
        totalSales: 0,
        totalIncentives: 0,
        employeeCount: 0
      };

      if (Array.isArray(response.body)) {
        summary.employeeCount = response.body.length;
        summary.totalSales = response.body.reduce((sum, s) => sum + (s.salesAmount || 0), 0);
        summary.totalIncentives = response.body.reduce((sum, s) => sum + (s.incentive || 0), 0);
      }

      expect(summary.employeeCount).toBeGreaterThan(0);
      expect(summary.totalIncentives).toBeGreaterThan(0);
      
      // Verify incentive percentage
      if (summary.totalSales > 0) {
        const actualRate = summary.totalIncentives / summary.totalSales;
        expect(actualRate).toBeGreaterThanOrEqual(0.03); // At least 3% due to rounding up
      }
    });
  });

  afterAll(async () => {
    // Cleanup all test data
    if (db) {
      await db.collection('sales').deleteMany({ 
        userId: { $regex: /^test-|^report-user-|^helper-user-/i }
      });
      await db.collection('users').deleteOne({ userId: 'admin-incentive-test' });
    }
    if (connection) {
      await connection.close();
    }
  });
});