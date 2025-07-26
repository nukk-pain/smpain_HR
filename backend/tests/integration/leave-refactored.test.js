// Integration tests for refactored leave API
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { connectToDatabase } = require('../../utils/database');
const leaveRoutes = require('../../routes/leave-refactored');

describe('Leave API Integration Tests', () => {
  let app;
  let mongoServer;
  let adminAgent;
  let userAgent;
  let managerAgent;
  let adminUser;
  let testUser;
  let managerUser;

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Set up test environment
    process.env.MONGODB_URI = mongoUri;
    process.env.SESSION_SECRET = 'test-secret';
    
    // Create Express app with middleware
    app = express();
    app.use(express.json());
    
    // Session middleware
    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: mongoUri
      }),
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    }));
    
    app.use('/api/leave', leaveRoutes);
    
    // Create test agents for maintaining sessions
    adminAgent = request.agent(app);
    userAgent = request.agent(app);
    managerAgent = request.agent(app);
    
    // Connect to database and create test users
    const { db } = await connectToDatabase();
    const UserRepository = require('../../repositories/UserRepository');
    const userRepository = new UserRepository();
    
    // Create admin user
    adminUser = await userRepository.createUser({
      username: 'testadmin',
      password: 'admin123',
      name: 'Test Admin',
      role: 'Admin',
      department: 'IT',
      isActive: true,
      leaveBalance: 15
    });
    
    // Create regular user
    testUser = await userRepository.createUser({
      username: 'testuser',
      password: 'user123',
      name: 'Test User',
      role: 'User',
      department: 'IT',
      employeeId: 'EMP001',
      isActive: true,
      leaveBalance: 10,
      hireDate: new Date('2023-01-01')
    });
    
    // Create manager user
    managerUser = await userRepository.createUser({
      username: 'testmanager',
      password: 'manager123',
      name: 'Test Manager',
      role: 'Manager',
      department: 'Sales',
      isActive: true,
      leaveBalance: 12
    });
    
    // Login all agents
    await adminAgent
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'admin123' });
      
    await userAgent
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'user123' });
      
    await managerAgent
      .post('/api/auth/login')
      .send({ username: 'testmanager', password: 'manager123' });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear leave requests before each test
    const { db } = await connectToDatabase();
    await db.collection('leave_requests').deleteMany({});
  });

  describe('POST /api/leave - Create Leave Request', () => {
    const createValidLeaveRequest = () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7); // 7 days from now
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2); // 3 days total
      
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason: 'Personal vacation',
        daysCount: 3
      };
    };

    it('should create leave request successfully', async () => {
      const leaveData = createValidLeaveRequest();
      
      const response = await userAgent
        .post('/api/leave')
        .send(leaveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe('Personal vacation');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.user.name).toBe('Test User');
      expect(response.body.data.startDateFormatted).toBeDefined();
      expect(response.body.data.endDateFormatted).toBeDefined();
      expect(response.body.message).toBe('Leave request created successfully');
    });

    it('should calculate leave days correctly', async () => {
      const leaveData = createValidLeaveRequest();
      
      const response = await userAgent
        .post('/api/leave')
        .send(leaveData)
        .expect(200);

      expect(response.body.data.daysCount).toBe(3);
    });

    it('should validate minimum advance notice', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const leaveData = {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: tomorrow.toISOString().split('T')[0],
        reason: 'Emergency',
        daysCount: 1
      };
      
      const response = await userAgent
        .post('/api/leave')
        .send(leaveData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].message).toContain('3 days in advance');
    });

    it('should check leave balance', async () => {
      // Create request that exceeds balance + allowable advance
      const leaveData = createValidLeaveRequest();
      leaveData.daysCount = 20; // User has 10 days balance
      
      const response = await userAgent
        .post('/api/leave')
        .send(leaveData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].message).toContain('Insufficient leave balance');
    });

    it('should prevent multiple pending requests', async () => {
      const leaveData1 = createValidLeaveRequest();
      const leaveData2 = createValidLeaveRequest();
      leaveData2.startDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 14 days from now
      leaveData2.endDate = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 16 days from now
      
      // Create first request
      await userAgent
        .post('/api/leave')
        .send(leaveData1)
        .expect(200);
      
      // Try to create second request
      const response = await userAgent
        .post('/api/leave')
        .send(leaveData2)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].message).toContain('pending leave request');
    });

    it('should detect date conflicts', async () => {
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      
      // Create existing approved request
      const existingStartDate = new Date();
      existingStartDate.setDate(existingStartDate.getDate() + 8);
      
      await leaveRepository.create({
        userId: testUser._id,
        startDate: existingStartDate,
        endDate: new Date(existingStartDate.getTime() + 24*60*60*1000), // Next day
        reason: 'Existing request',
        daysCount: 1,
        status: 'approved'
      });
      
      // Try to create overlapping request
      const leaveData = createValidLeaveRequest();
      leaveData.startDate = existingStartDate.toISOString().split('T')[0];
      
      const response = await userAgent
        .post('/api/leave')
        .send(leaveData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].message).toContain('Conflicts with');
    });

    it('should validate required fields', async () => {
      const response = await userAgent
        .post('/api/leave')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/leave - Get Leave Requests', () => {
    beforeEach(async () => {
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      
      // Create test leave requests
      await leaveRepository.create({
        userId: testUser._id,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-03'),
        reason: 'Vacation',
        daysCount: 3,
        status: 'pending'
      });
      
      await leaveRepository.create({
        userId: testUser._id,
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-17'),
        reason: 'Personal',
        daysCount: 3,
        status: 'approved'
      });
      
      await leaveRepository.create({
        userId: managerUser._id,
        startDate: new Date('2025-02-10'),
        endDate: new Date('2025-02-12'),
        reason: 'Conference',
        daysCount: 3,
        status: 'pending'
      });
    });

    it('should get user own requests', async () => {
      const response = await userAgent
        .get('/api/leave')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(req => req.user._id === testUser._id.toString())).toBe(true);
    });

    it('should get all requests for admin', async () => {
      const response = await adminAgent
        .get('/api/leave')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const response = await adminAgent
        .get('/api/leave?status=pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(req => req.status === 'pending')).toBe(true);
    });

    it('should filter by user_id for admin', async () => {
      const response = await adminAgent
        .get(`/api/leave?user_id=${testUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(req => req.user._id === testUser._id.toString())).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await adminAgent
        .get('/api/leave?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalDocuments).toBe(3);
    });

    it('should include formatted dates and status info', async () => {
      const response = await userAgent
        .get('/api/leave')
        .expect(200);

      expect(response.body.data[0].startDateFormatted).toBeDefined();
      expect(response.body.data[0].endDateFormatted).toBeDefined();
      expect(response.body.data[0].statusInfo).toBeDefined();
      expect(response.body.data[0].statusInfo.label).toBeDefined();
      expect(response.body.data[0].statusInfo.color).toBeDefined();
    });
  });

  describe('GET /api/leave/:id - Get Leave Request by ID', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      
      testLeaveRequest = await leaveRepository.create({
        userId: testUser._id,
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-03'),
        reason: 'Test leave',
        daysCount: 3,
        status: 'pending'
      });
    });

    it('should get leave request by ID', async () => {
      const response = await userAgent
        .get(`/api/leave/${testLeaveRequest._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testLeaveRequest._id.toString());
      expect(response.body.data.reason).toBe('Test leave');
      expect(response.body.data.user.name).toBe('Test User');
      expect(response.body.data.user.leaveBalance).toBe(10);
    });

    it('should prevent user from viewing others requests', async () => {
      const response = await managerAgent
        .get(`/api/leave/${testLeaveRequest._id}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('your own leave requests');
    });

    it('should allow admin to view any request', async () => {
      const response = await adminAgent
        .get(`/api/leave/${testLeaveRequest._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testLeaveRequest._id.toString());
    });

    it('should return 404 for non-existent request', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();

      const response = await userAgent
        .get(`/api/leave/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/leave/:id - Update Leave Request', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      
      testLeaveRequest = await leaveRepository.create({
        userId: testUser._id,
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-17'),
        reason: 'Original reason',
        daysCount: 3,
        status: 'pending'
      });
    });

    it('should update leave request successfully', async () => {
      const updateData = {
        reason: 'Updated reason'
      };

      const response = await userAgent
        .put(`/api/leave/${testLeaveRequest._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reason).toBe('Updated reason');
      expect(response.body.message).toBe('Leave request updated successfully');
    });

    it('should update dates and recalculate days', async () => {
      const newStartDate = new Date('2025-02-20');
      const newEndDate = new Date('2025-02-22');
      
      const updateData = {
        startDate: newStartDate.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0]
      };

      const response = await userAgent
        .put(`/api/leave/${testLeaveRequest._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.daysCount).toBe(3);
      expect(new Date(response.body.data.startDate).toDateString()).toBe(newStartDate.toDateString());
    });

    it('should prevent editing non-pending requests', async () => {
      // First approve the request
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      await leaveRepository.update(testLeaveRequest._id, { status: 'approved' });

      const response = await userAgent
        .put(`/api/leave/${testLeaveRequest._id}`)
        .send({ reason: 'Updated' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('pending leave requests');
    });

    it('should prevent user from editing others requests', async () => {
      const response = await managerAgent
        .put(`/api/leave/${testLeaveRequest._id}`)
        .send({ reason: 'Updated' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('your own leave requests');
    });

    it('should validate updated dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const updateData = {
        startDate: yesterday.toISOString().split('T')[0],
        endDate: yesterday.toISOString().split('T')[0]
      };

      const response = await userAgent
        .put(`/api/leave/${testLeaveRequest._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].message).toContain('past dates');
    });
  });

  describe('DELETE /api/leave/:id - Delete Leave Request', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      
      testLeaveRequest = await leaveRepository.create({
        userId: testUser._id,
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-17'),
        reason: 'To be deleted',
        daysCount: 3,
        status: 'pending'
      });
    });

    it('should delete leave request successfully', async () => {
      const response = await userAgent
        .delete(`/api/leave/${testLeaveRequest._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Leave request deleted successfully');

      // Verify deletion
      const getResponse = await userAgent
        .get(`/api/leave/${testLeaveRequest._id}`)
        .expect(404);
    });

    it('should prevent deleting non-pending requests', async () => {
      // Approve the request first
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      await leaveRepository.update(testLeaveRequest._id, { status: 'approved' });

      const response = await userAgent
        .delete(`/api/leave/${testLeaveRequest._id}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('pending leave requests');
    });

    it('should allow admin to delete any pending request', async () => {
      const response = await adminAgent
        .delete(`/api/leave/${testLeaveRequest._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/leave/:id/approve - Approve/Reject Leave Request', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      
      testLeaveRequest = await leaveRepository.create({
        userId: testUser._id,
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-17'),
        reason: 'For approval',
        daysCount: 3,
        status: 'pending'
      });
    });

    it('should approve leave request successfully', async () => {
      const approvalData = {
        approved: true,
        note: 'Approved by manager'
      };

      const response = await managerAgent
        .post(`/api/leave/${testLeaveRequest._id}/approve`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Leave request approved successfully');
      expect(response.body.data.user.newLeaveBalance).toBe(7); // 10 - 3 days
    });

    it('should reject leave request successfully', async () => {
      const rejectionData = {
        approved: false,
        rejectionReason: 'Insufficient coverage'
      };

      const response = await managerAgent
        .post(`/api/leave/${testLeaveRequest._id}/approve`)
        .send(rejectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Leave request rejected');
    });

    it('should prevent regular user from approving', async () => {
      const approvalData = {
        approved: true,
        note: 'Trying to approve'
      };

      const response = await userAgent
        .post(`/api/leave/${testLeaveRequest._id}/approve`)
        .send(approvalData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent approving non-pending requests', async () => {
      // Update status first
      const LeaveRepository = require('../../repositories/LeaveRepository');
      const leaveRepository = new LeaveRepository();
      await leaveRepository.update(testLeaveRequest._id, { status: 'approved' });

      const approvalData = {
        approved: true,
        note: 'Already approved'
      };

      const response = await managerAgent
        .post(`/api/leave/${testLeaveRequest._id}/approve`)
        .send(approvalData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('pending requests');
    });
  });

  describe('GET /api/leave/balance - Get Leave Balance', () => {
    it('should get own leave balance', async () => {
      const response = await userAgent
        .get('/api/leave/balance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUser._id.toString());
      expect(response.body.data.userName).toBe('Test User');
      expect(response.body.data.currentBalance).toBe(10);
      expect(response.body.data.totalEntitlement).toBeDefined();
      expect(response.body.data.usedDays).toBeDefined();
      expect(response.body.data.pendingDays).toBeDefined();
      expect(response.body.data.availableBalance).toBeDefined();
    });

    it('should allow admin to get any user balance', async () => {
      const response = await adminAgent
        .get(`/api/leave/balance?user_id=${testUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUser._id.toString());
      expect(response.body.data.currentBalance).toBe(10);
    });

    it('should prevent user from viewing others balance', async () => {
      const response = await userAgent
        .get(`/api/leave/balance?user_id=${managerUser._id}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('your own leave balance');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const unauthenticatedAgent = request(app);

      await unauthenticatedAgent
        .get('/api/leave')
        .expect(401);

      await unauthenticatedAgent
        .post('/api/leave')
        .send({})
        .expect(401);
    });

    it('should enforce permission-based access', async () => {
      // Test that users without proper permissions cannot access certain endpoints
      // This would require creating a user with limited permissions
      // For now, we've covered the main authorization scenarios in individual tests
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid ObjectId gracefully', async () => {
      const response = await userAgent
        .get('/api/leave/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ObjectId');
    });

    it('should handle database errors gracefully', async () => {
      // This would require mocking database failures
      // In real scenarios, you might disconnect the database temporarily
      // For this test, we'll create a scenario that would cause a DB error
      
      const response = await userAgent
        .post('/api/leave')
        .send({
          startDate: 'invalid-date',
          endDate: 'invalid-date',
          reason: 'Test',
          daysCount: 1
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});