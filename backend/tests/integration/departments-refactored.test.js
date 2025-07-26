// Integration tests for refactored departments API
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { connectToDatabase } = require('../../utils/database');
const departmentRoutes = require('../../routes/departments-refactored');

describe('Departments API Integration Tests', () => {
  let app;
  let mongoServer;
  let adminAgent;
  let userAgent;
  let adminUser;
  let testUser;

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
    
    app.use('/api/departments', departmentRoutes);
    
    // Create test agents for maintaining sessions
    adminAgent = request.agent(app);
    userAgent = request.agent(app);
    
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
      isActive: true
    });
    
    // Create regular user
    testUser = await userRepository.createUser({
      username: 'testuser',
      password: 'user123',
      name: 'Test User',
      role: 'User',
      department: 'Sales',
      isActive: true
    });
    
    // Login agents
    await adminAgent
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'admin123' });
      
    await userAgent
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'user123' });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear departments collection before each test
    const { db } = await connectToDatabase();
    await db.collection('departments').deleteMany({});
  });

  describe('GET /api/departments - Get All Departments', () => {
    beforeEach(async () => {
      // Create test departments
      const DepartmentRepository = require('../../repositories/DepartmentRepository');
      const deptRepository = new DepartmentRepository();
      
      await deptRepository.create({
        name: 'Information Technology',
        code: 'IT',
        description: 'IT Department',
        managerId: adminUser._id,
        isActive: true
      });
      
      await deptRepository.create({
        name: 'Sales',
        code: 'SALES',
        description: 'Sales Department',
        isActive: true
      });
      
      await deptRepository.create({
        name: 'Inactive Dept',
        code: 'INACTIVE',
        description: 'Inactive Department',
        isActive: false
      });
    });

    it('should get all departments for admin', async () => {
      const response = await adminAgent
        .get('/api/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.message).toBe('Departments retrieved successfully');
    });

    it('should get only active departments by default', async () => {
      const response = await adminAgent
        .get('/api/departments?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(dept => dept.isActive === true)).toBe(true);
    });

    it('should include manager information', async () => {
      const response = await adminAgent
        .get('/api/departments')
        .expect(200);

      const itDept = response.body.data.find(dept => dept.code === 'IT');
      expect(itDept.manager).toBeDefined();
      expect(itDept.manager.name).toBe('Test Admin');
    });

    it('should include employee count', async () => {
      const response = await adminAgent
        .get('/api/departments')
        .expect(200);

      response.body.data.forEach(dept => {
        expect(dept.employeeCount).toBeDefined();
        expect(typeof dept.employeeCount).toBe('number');
      });
    });

    it('should support pagination', async () => {
      const response = await adminAgent
        .get('/api/departments?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalDocuments).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should allow regular users to view departments', async () => {
      const response = await userAgent
        .get('/api/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('GET /api/departments/:id - Get Department by ID', () => {
    let testDepartment;

    beforeEach(async () => {
      const DepartmentRepository = require('../../repositories/DepartmentRepository');
      const deptRepository = new DepartmentRepository();
      
      testDepartment = await deptRepository.create({
        name: 'Test Department',
        code: 'TEST',
        description: 'Test Department Description',
        managerId: adminUser._id,
        budget: 100000,
        location: 'Building A',
        isActive: true
      });
    });

    it('should get department by ID', async () => {
      const response = await adminAgent
        .get(`/api/departments/${testDepartment._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testDepartment._id.toString());
      expect(response.body.data.name).toBe('Test Department');
      expect(response.body.data.manager.name).toBe('Test Admin');
      expect(response.body.data.employeeCount).toBeDefined();
    });

    it('should return 404 for non-existent department', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();

      const response = await adminAgent
        .get(`/api/departments/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Department not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await adminAgent
        .get('/api/departments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ObjectId');
    });

    it('should allow regular users to view department details', async () => {
      const response = await userAgent
        .get(`/api/departments/${testDepartment._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Department');
    });
  });

  describe('POST /api/departments - Create Department', () => {
    const validDepartmentData = {
      name: 'New Department',
      code: 'NEW',
      description: 'New Department Description',
      managerId: null, // Optional
      budget: 50000,
      location: 'Building B'
    };

    it('should create department successfully', async () => {
      const response = await adminAgent
        .post('/api/departments')
        .send(validDepartmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Department');
      expect(response.body.data.code).toBe('NEW');
      expect(response.body.data.isActive).toBe(true); // Default value
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.message).toBe('Department created successfully');
    });

    it('should create department with manager', async () => {
      const deptData = {
        ...validDepartmentData,
        managerId: adminUser._id.toString()
      };

      const response = await adminAgent
        .post('/api/departments')
        .send(deptData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.manager).toBeDefined();
      expect(response.body.data.manager.name).toBe('Test Admin');
    });

    it('should reject duplicate department code', async () => {
      // Create first department
      await adminAgent
        .post('/api/departments')
        .send(validDepartmentData)
        .expect(201);

      // Try to create duplicate
      const response = await adminAgent
        .post('/api/departments')
        .send(validDepartmentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = { name: 'Test' }; // Missing required fields

      const response = await adminAgent
        .post('/api/departments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate manager exists', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentManagerId = new ObjectId();
      
      const deptData = {
        ...validDepartmentData,
        managerId: nonExistentManagerId.toString()
      };

      const response = await adminAgent
        .post('/api/departments')
        .send(deptData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Manager not found');
    });

    it('should prevent regular users from creating departments', async () => {
      const response = await userAgent
        .post('/api/departments')
        .send(validDepartmentData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/departments/:id - Update Department', () => {
    let testDepartment;

    beforeEach(async () => {
      const DepartmentRepository = require('../../repositories/DepartmentRepository');
      const deptRepository = new DepartmentRepository();
      
      testDepartment = await deptRepository.create({
        name: 'Original Department',
        code: 'ORIG',
        description: 'Original Description',
        isActive: true
      });
    });

    it('should update department successfully', async () => {
      const updateData = {
        name: 'Updated Department',
        description: 'Updated Description',
        budget: 75000,
        location: 'Building C'
      };

      const response = await adminAgent
        .put(`/api/departments/${testDepartment._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Department');
      expect(response.body.data.description).toBe('Updated Description');
      expect(response.body.data.budget).toBe(75000);
      expect(response.body.data.updatedAt).toBeDefined();
      expect(response.body.message).toBe('Department updated successfully');
    });

    it('should update manager', async () => {
      const updateData = {
        managerId: adminUser._id.toString()
      };

      const response = await adminAgent
        .put(`/api/departments/${testDepartment._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.manager).toBeDefined();
      expect(response.body.data.manager.name).toBe('Test Admin');
    });

    it('should remove manager when set to null', async () => {
      // First set a manager
      await adminAgent
        .put(`/api/departments/${testDepartment._id}`)
        .send({ managerId: adminUser._id.toString() });

      // Then remove the manager
      const response = await adminAgent
        .put(`/api/departments/${testDepartment._id}`)
        .send({ managerId: null })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.manager).toBeNull();
    });

    it('should reject duplicate code when updating', async () => {
      // Create another department
      const DepartmentRepository = require('../../repositories/DepartmentRepository');
      const deptRepository = new DepartmentRepository();
      
      await deptRepository.create({
        name: 'Another Department',
        code: 'ANOTHER',
        description: 'Another Description',
        isActive: true
      });

      // Try to update to duplicate code
      const response = await adminAgent
        .put(`/api/departments/${testDepartment._id}`)
        .send({ code: 'ANOTHER' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 404 for non-existent department', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();

      const response = await adminAgent
        .put(`/api/departments/${nonExistentId}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent regular users from updating departments', async () => {
      const response = await userAgent
        .put(`/api/departments/${testDepartment._id}`)
        .send({ name: 'Updated' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/departments/:id - Delete Department', () => {
    let testDepartment;

    beforeEach(async () => {
      const DepartmentRepository = require('../../repositories/DepartmentRepository');
      const deptRepository = new DepartmentRepository();
      
      testDepartment = await deptRepository.create({
        name: 'Delete Department',
        code: 'DELETE',
        description: 'To be deleted',
        isActive: true
      });
    });

    it('should delete department successfully', async () => {
      const response = await adminAgent
        .delete(`/api/departments/${testDepartment._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Department deleted successfully');

      // Verify deletion
      const getResponse = await adminAgent
        .get(`/api/departments/${testDepartment._id}`)
        .expect(404);
    });

    it('should prevent deletion of department with employees', async () => {
      // Create a user in this department
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      
      await userRepository.createUser({
        username: 'deptuser',
        password: 'password123',
        name: 'Department User',
        role: 'User',
        department: testDepartment.name,
        isActive: true
      });

      const response = await adminAgent
        .delete(`/api/departments/${testDepartment._id}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('employees assigned');
    });

    it('should return 404 for non-existent department', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();

      const response = await adminAgent
        .delete(`/api/departments/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent regular users from deleting departments', async () => {
      const response = await userAgent
        .delete(`/api/departments/${testDepartment._id}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/departments/:id/employees - Get Department Employees', () => {
    let testDepartment;

    beforeEach(async () => {
      const DepartmentRepository = require('../../repositories/DepartmentRepository');
      const deptRepository = new DepartmentRepository();
      
      testDepartment = await deptRepository.create({
        name: 'Employee Department',
        code: 'EMPDEPT',
        description: 'Department with employees',
        isActive: true
      });

      // Create users in this department
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      
      await userRepository.createUser({
        username: 'emp1',
        password: 'password123',
        name: 'Employee One',
        role: 'User',
        department: testDepartment.name,
        isActive: true
      });
      
      await userRepository.createUser({
        username: 'emp2',
        password: 'password123',
        name: 'Employee Two',
        role: 'Manager',
        department: testDepartment.name,
        isActive: true
      });
      
      await userRepository.createUser({
        username: 'emp3',
        password: 'password123',
        name: 'Employee Three',
        role: 'User',
        department: testDepartment.name,
        isActive: false
      });
    });

    it('should get all department employees', async () => {
      const response = await adminAgent
        .get(`/api/departments/${testDepartment._id}/employees`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.every(emp => emp.department === testDepartment.name)).toBe(true);
    });

    it('should filter active employees only', async () => {
      const response = await adminAgent
        .get(`/api/departments/${testDepartment._id}/employees?isActive=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(emp => emp.isActive === true)).toBe(true);
    });

    it('should exclude password from employee data', async () => {
      const response = await adminAgent
        .get(`/api/departments/${testDepartment._id}/employees`)
        .expect(200);

      response.body.data.forEach(emp => {
        expect(emp.password).toBeUndefined();
      });
    });

    it('should support pagination', async () => {
      const response = await adminAgent
        .get(`/api/departments/${testDepartment._id}/employees?page=1&limit=2`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(2);
      expect(response.body.data.pagination.totalDocuments).toBe(3);
    });

    it('should allow regular users to view department employees', async () => {
      const response = await userAgent
        .get(`/api/departments/${testDepartment._id}/employees`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const unauthenticatedAgent = request(app);

      await unauthenticatedAgent
        .get('/api/departments')
        .expect(401);

      await unauthenticatedAgent
        .post('/api/departments')
        .send({})
        .expect(401);
    });

    it('should enforce admin permissions for create/update/delete', async () => {
      const testData = {
        name: 'Test Dept',
        code: 'TEST',
        description: 'Test'
      };

      // Regular user should not be able to create
      await userAgent
        .post('/api/departments')
        .send(testData)
        .expect(403);

      // Create department as admin first
      const createResponse = await adminAgent
        .post('/api/departments')
        .send(testData)
        .expect(201);

      const deptId = createResponse.body.data._id;

      // Regular user should not be able to update
      await userAgent
        .put(`/api/departments/${deptId}`)
        .send({ name: 'Updated' })
        .expect(403);

      // Regular user should not be able to delete
      await userAgent
        .delete(`/api/departments/${deptId}`)
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid ObjectId gracefully', async () => {
      const response = await adminAgent
        .get('/api/departments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ObjectId');
    });

    it('should return proper error format for validation errors', async () => {
      const response = await adminAgent
        .post('/api/departments')
        .send({
          name: '', // Invalid - too short
          code: '', // Invalid - required
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should handle database constraint violations', async () => {
      // This would typically test unique constraint violations, foreign key constraints, etc.
      // For this example, we'll test duplicate code constraint
      const deptData = {
        name: 'Test Department',
        code: 'TEST',
        description: 'Test'
      };

      // Create first department
      await adminAgent
        .post('/api/departments')
        .send(deptData)
        .expect(201);

      // Try to create duplicate - should be handled gracefully
      const response = await adminAgent
        .post('/api/departments')
        .send(deptData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });
});