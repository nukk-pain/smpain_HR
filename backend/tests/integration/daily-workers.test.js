/**
 * TEST-02: Daily Workers Management Tests
 * TDD Approach: RED → GREEN → REFACTOR
 * 
 * Tests daily worker CRUD functionality from FEAT-05
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

describe('Daily Workers Management', () => {
  let adminToken;
  let testWorkerId;
  let db, connection;

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'SM_nomu_test';
    
    connection = await MongoClient.connect(uri);
    db = connection.db(dbName);
    app.locals.db = db;

    // Clean up and create admin user for testing
    await db.collection('users').deleteOne({ email: 'admin-daily@test.com' });
    
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const adminUser = {
      userId: 'admin-daily-test',
      username: 'admin-daily-test',
      name: 'Daily Test Admin',
      email: 'admin-daily@test.com',
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
    await db.collection('dailyWorkers').deleteMany({ 
      name: { $regex: /^Test Worker/i }
    });
  });

  describe('Create Daily Worker', () => {
    // Test 1: RED → GREEN → REFACTOR
    test('Should create daily worker record', async () => {
      // RED: Test POST endpoint
      const newWorker = {
        name: 'Test Worker 1',
        workDate: '2025-09-04',
        hoursWorked: 8,
        hourlyRate: 15000,
        totalPay: 120000,
        description: 'Test work',
        month: '202509'
      };

      const response = await request(app)
        .post('/api/dailyWorkers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newWorker);

      // GREEN: Verify creation
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(newWorker.name);
      expect(response.body.totalPay).toBe(newWorker.totalPay);

      // Store ID for later tests
      testWorkerId = response.body._id;

      // REFACTOR: Verify database entry
      const { ObjectId } = require('mongodb');
      const dbWorker = await db.collection('dailyWorkers').findOne({ _id: new ObjectId(testWorkerId) });
      expect(dbWorker).not.toBeNull();
      expect(dbWorker.name).toBe(newWorker.name);
    });

    test('Should validate required fields', async () => {
      // RED: Test with missing fields
      const incompleteWorker = {
        name: 'Test Worker 2'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/dailyWorkers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteWorker);

      // GREEN: Verify validation error
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    test('Should calculate total pay automatically', async () => {
      // RED: Test auto-calculation
      const workerWithoutTotal = {
        name: 'Test Worker 3',
        workDate: '2025-09-04',
        hoursWorked: 10,
        hourlyRate: 20000,
        description: 'Auto calculation test',
        month: '202509'
        // totalPay should be calculated
      };

      const response = await request(app)
        .post('/api/dailyWorkers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(workerWithoutTotal);

      // GREEN: Verify calculation
      expect(response.status).toBe(201);
      expect(response.body.totalPay).toBe(200000); // 10 * 20000
    });

    test('Should prevent duplicate entries', async () => {
      // RED: Test duplicate prevention
      const worker = {
        name: 'Test Worker Duplicate',
        workDate: '2025-09-04',
        hoursWorked: 8,
        hourlyRate: 15000,
        totalPay: 120000,
        month: '202509'
      };

      // First creation
      const first = await request(app)
        .post('/api/dailyWorkers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(worker);

      expect(first.status).toBe(201);

      // Duplicate attempt
      const duplicate = await request(app)
        .post('/api/dailyWorkers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(worker);

      // GREEN: Should prevent or handle duplicate
      expect([400, 409]).toContain(duplicate.status);
    });
  });

  describe('Read Daily Worker Records', () => {
    // Test 2: Read operations
    beforeAll(async () => {
      // Create test data for reading
      const workers = [
        { name: 'Test Worker Sept 1', workDate: '2025-09-01', hoursWorked: 8, hourlyRate: 15000, month: '202509', totalPay: 120000 },
        { name: 'Test Worker Sept 2', workDate: '2025-09-02', hoursWorked: 6, hourlyRate: 18000, month: '202509', totalPay: 108000 },
        { name: 'Test Worker Aug 1', workDate: '2025-08-15', hoursWorked: 8, hourlyRate: 15000, month: '202508', totalPay: 120000 }
      ];

      await db.collection('dailyWorkers').insertMany(workers);
    });

    test('Should list daily workers by month', async () => {
      // RED: Test GET endpoint with month filter
      const response = await request(app)
        .get('/api/dailyWorkers?month=202509')
        .set('Authorization', `Bearer ${adminToken}`);

      // GREEN: Verify listing
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Should only include September workers
      const septWorkers = response.body.filter(w => 
        w.name && w.name.includes('Sept')
      );
      expect(septWorkers.length).toBeGreaterThanOrEqual(2);

      // Should not include August workers
      const augWorkers = response.body.filter(w => 
        w.name && w.name.includes('Aug')
      );
      expect(augWorkers.length).toBe(0);
    });

    test('Should get all daily workers without month filter', async () => {
      // RED: Test GET all workers
      const response = await request(app)
        .get('/api/dailyWorkers')
        .set('Authorization', `Bearer ${adminToken}`);

      // GREEN: Verify all workers returned
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('Should get single daily worker by ID', async () => {
      // RED: Test GET by ID
      const response = await request(app)
        .get(`/api/dailyWorkers/${testWorkerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // GREEN: Verify single worker
      expect(response.status).toBe(200);
      expect(response.body._id).toBe(testWorkerId);
      expect(response.body.name).toBe('Test Worker 1');
    });

    test('Should return 404 for non-existent worker', async () => {
      // RED: Test with invalid ID
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/dailyWorkers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // GREEN: Verify 404
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Update Daily Worker', () => {
    // Test 3: Update operations
    test('Should update daily worker', async () => {
      // RED: Test PUT endpoint
      const updates = {
        hoursWorked: 10,
        hourlyRate: 18000,
        totalPay: 180000,
        description: 'Updated work description'
      };

      const response = await request(app)
        .put(`/api/dailyWorkers/${testWorkerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      // GREEN: Verify update
      expect(response.status).toBe(200);
      expect(response.body.hoursWorked).toBe(10);
      expect(response.body.hourlyRate).toBe(18000);
      expect(response.body.totalPay).toBe(180000);
      expect(response.body.description).toBe('Updated work description');

      // REFACTOR: Verify in database
      const { ObjectId } = require('mongodb');
      const dbWorker = await db.collection('dailyWorkers').findOne({ _id: new ObjectId(testWorkerId) });
      expect(dbWorker.hoursWorked).toBe(10);
    });

    test('Should handle partial updates', async () => {
      // RED: Test partial update
      const partialUpdate = {
        description: 'Only description updated'
      };

      const response = await request(app)
        .put(`/api/dailyWorkers/${testWorkerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate);

      // GREEN: Verify partial update
      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Only description updated');
      // Other fields should remain unchanged
      expect(response.body.hoursWorked).toBe(10);
      expect(response.body.hourlyRate).toBe(18000);
    });

    test('Should validate update data', async () => {
      // RED: Test with invalid data
      const invalidUpdate = {
        hoursWorked: -5, // Invalid negative hours
        hourlyRate: 'not-a-number'
      };

      const response = await request(app)
        .put(`/api/dailyWorkers/${testWorkerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate);

      // GREEN: Verify validation error
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('validation');
    });

    test('Should return 404 for updating non-existent worker', async () => {
      // RED: Test update on fake ID
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/dailyWorkers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Test update' });

      // GREEN: Verify 404
      expect(response.status).toBe(404);
    });
  });

  describe('Delete Daily Worker', () => {
    // Test 4: Delete operations
    let deleteTestId;

    beforeAll(async () => {
      // Create worker specifically for deletion test
      const worker = {
        name: 'Test Worker To Delete',
        workDate: '2025-09-04',
        hoursWorked: 8,
        hourlyRate: 15000,
        totalPay: 120000,
        month: '202509'
      };
      const result = await db.collection('dailyWorkers').insertOne(worker);
      deleteTestId = result.insertedId.toString();
    });

    test('Should delete daily worker', async () => {
      // RED: Test DELETE endpoint
      const response = await request(app)
        .delete(`/api/dailyWorkers/${deleteTestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // GREEN: Verify deletion
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // REFACTOR: Verify removal from database
      const { ObjectId } = require('mongodb');
      const dbWorker = await db.collection('dailyWorkers').findOne({ _id: new ObjectId(deleteTestId) });
      expect(dbWorker).toBeNull();
    });

    test('Should return 404 for deleting non-existent worker', async () => {
      // RED: Test delete on already deleted ID
      const response = await request(app)
        .delete(`/api/dailyWorkers/${deleteTestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // GREEN: Verify 404
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    test('Should handle invalid ID format', async () => {
      // RED: Test with invalid ID format
      const response = await request(app)
        .delete('/api/dailyWorkers/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      // GREEN: Verify error handling
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Authorization Tests', () => {
    let userToken;

    beforeAll(async () => {
      // Create regular user
      const hashedPassword = await bcrypt.hash('Test123!', 10);
      const regularUser = {
        userId: 'user-daily-test',
        username: 'user-daily-test',
        name: 'Regular User',
        email: 'user-daily@test.com',
        password: hashedPassword,
        role: 'User',
        isActive: true,
        createdAt: new Date()
      };
      await db.collection('users').insertOne(regularUser);

      userToken = jwt.sign(
        { userId: regularUser.userId, role: 'User' },
        process.env.JWT_SECRET || 'test-secret'
      );
    });

    test('Should block non-admin from creating daily workers', async () => {
      const response = await request(app)
        .post('/api/dailyWorkers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Worker',
          workDate: '2025-09-04',
          hoursWorked: 8,
          hourlyRate: 15000
        });

      expect(response.status).toBe(403);
    });

    test('Should block non-admin from updating daily workers', async () => {
      const response = await request(app)
        .put(`/api/dailyWorkers/${testWorkerId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: 'Unauthorized update' });

      expect(response.status).toBe(403);
    });

    test('Should block non-admin from deleting daily workers', async () => {
      const response = await request(app)
        .delete(`/api/dailyWorkers/${testWorkerId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    test('Should block non-admin from viewing daily workers', async () => {
      const response = await request(app)
        .get('/api/dailyWorkers')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    afterAll(async () => {
      if (db) {
        await db.collection('users').deleteOne({ userId: 'user-daily-test' });
      }
    });
  });

  // REFACTOR: Extract helper functions
  const createWorker = async (data) => {
    return request(app)
      .post('/api/dailyWorkers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(data);
  };

  const getWorkersByMonth = async (month) => {
    return request(app)
      .get(`/api/dailyWorkers?month=${month}`)
      .set('Authorization', `Bearer ${adminToken}`);
  };

  describe('Refactored Tests with Helpers', () => {
    test('Helper: Batch create workers', async () => {
      const workers = [
        { name: 'Batch Worker 1', workDate: '2025-09-05', hoursWorked: 8, hourlyRate: 15000, month: '202509' },
        { name: 'Batch Worker 2', workDate: '2025-09-05', hoursWorked: 6, hourlyRate: 18000, month: '202509' }
      ];

      const results = await Promise.all(
        workers.map(w => createWorker(w))
      );

      results.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
      });
    });

    test('Helper: Monthly summary', async () => {
      const response = await getWorkersByMonth('202509');
      
      expect(response.status).toBe(200);
      
      // Calculate monthly total
      const monthlyTotal = response.body.reduce(
        (sum, worker) => sum + (worker.totalPay || 0), 
        0
      );
      
      expect(monthlyTotal).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    // Cleanup all test data
    if (db) {
      await db.collection('dailyWorkers').deleteMany({ 
        name: { $regex: /^Test Worker|^Batch Worker/i }
      });
      await db.collection('users').deleteMany({ 
        userId: { $in: ['admin-daily-test', 'user-daily-test'] }
      });
    }
    if (connection) {
      await connection.close();
    }
  });
});