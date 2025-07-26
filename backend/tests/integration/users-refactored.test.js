// Integration tests for refactored users API
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { connectToDatabase } = require('../../utils/database');
const userRoutes = require('../../routes/users-refactored');

describe('Users API Integration Tests', () => {
  let app;
  let mongoServer;
  let agent;
  let adminUser;

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
    
    app.use('/api/users', userRoutes);
    
    // Create test agent for maintaining sessions
    agent = request.agent(app);
    
    // Connect to database and create test admin user
    const { db } = await connectToDatabase();
    const UserRepository = require('../../repositories/UserRepository');
    const userRepository = new UserRepository();
    
    adminUser = await userRepository.createUser({
      username: 'testadmin',
      password: 'admin123',
      name: 'Test Admin',
      role: 'Admin',
      department: 'IT',
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear users collection except admin
    const { db } = await connectToDatabase();
    await db.collection('users').deleteMany({ 
      _id: { $ne: adminUser._id } 
    });
    
    // Login as admin for each test
    await agent
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'admin123'
      });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      // Create test users
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      
      await userRepository.createUser({
        username: 'manager1',
        password: 'password123',
        name: 'Manager One',
        role: 'Manager',
        department: 'Sales',
        isActive: true
      });
      
      await userRepository.createUser({
        username: 'user1',
        password: 'password123',
        name: 'User One',
        role: 'User',
        department: 'IT',
        isActive: true
      });
      
      await userRepository.createUser({
        username: 'user2',
        password: 'password123',
        name: 'User Two',
        role: 'User',
        department: 'Sales',
        isActive: false
      });
    });

    it('should get all users for admin', async () => {
      const response = await agent
        .get('/api/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4); // Admin + 3 test users
      expect(response.body.message).toBe('Users retrieved successfully');
    });

    it('should filter users by role', async () => {
      const response = await agent
        .get('/api/users?role=User')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(user => user.role === 'User')).toBe(true);
    });

    it('should filter users by department', async () => {
      const response = await agent
        .get('/api/users?department=Sales')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(user => user.department === 'Sales')).toBe(true);
    });

    it('should filter active users only', async () => {
      const response = await agent
        .get('/api/users?isActive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3); // Admin + active users
      expect(response.body.data.every(user => user.isActive === true)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await agent
        .get('/api/users?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalDocuments).toBe(4);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should exclude password from response', async () => {
      const response = await agent
        .get('/api/users')
        .expect(200);

      response.body.data.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  describe('GET /api/users/:id', () => {
    let testUser;

    beforeEach(async () => {
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      
      testUser = await userRepository.createUser({
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
        role: 'User',
        department: 'IT',
        employeeId: 'EMP001',
        isActive: true
      });
    });

    it('should get user by ID', async () => {
      const response = await agent
        .get(`/api/users/${testUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testUser._id.toString());
      expect(response.body.data.name).toBe('Test User');
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();

      const response = await agent
        .get(`/api/users/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await agent
        .get('/api/users/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ObjectId');
    });
  });

  describe('POST /api/users', () => {
    const validUserData = {
      username: 'newuser',
      password: 'password123',
      name: 'New User',
      role: 'User',
      department: 'IT',
      employeeId: 'EMP002'
    };

    it('should create new user successfully', async () => {
      const response = await agent
        .post('/api/users')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('newuser');
      expect(response.body.data.name).toBe('New User');
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.message).toBe('User created successfully');
    });

    it('should reject duplicate username', async () => {
      // Create first user
      await agent
        .post('/api/users')
        .send(validUserData);

      // Try to create duplicate
      const response = await agent
        .post('/api/users')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = { username: 'test' }; // Missing required fields

      const response = await agent
        .post('/api/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate role enum', async () => {
      const invalidData = {
        ...validUserData,
        role: 'InvalidRole'
      };

      const response = await agent
        .post('/api/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should set default values correctly', async () => {
      const minimalData = {
        username: 'minimal',
        password: 'password123',
        name: 'Minimal User',
        role: 'User'
      };

      const response = await agent
        .post('/api/users')
        .send(minimalData)
        .expect(201);

      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.leaveBalance).toBe(0);
    });
  });

  describe('PUT /api/users/:id', () => {
    let testUser;

    beforeEach(async () => {
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      
      testUser = await userRepository.createUser({
        username: 'updateuser',
        password: 'password123',
        name: 'Update User',
        role: 'User',
        department: 'IT',
        isActive: true
      });
    });

    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        department: 'Sales',
        role: 'Manager'
      };

      const response = await agent
        .put(`/api/users/${testUser._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.department).toBe('Sales');
      expect(response.body.data.role).toBe('Manager');
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should not update username', async () => {
      const updateData = {
        username: 'newusername',
        name: 'Updated Name'
      };

      const response = await agent
        .put(`/api/users/${testUser._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.username).toBe('updateuser'); // Original username
    });

    it('should hash password if provided', async () => {
      const updateData = {
        password: 'newpassword123'
      };

      const response = await agent
        .put(`/api/users/${testUser._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.password).toBeUndefined(); // Not in response
      
      // Verify password was actually updated and hashed
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      const updatedUser = await userRepository.findById(testUser._id);
      expect(updatedUser.password).not.toBe('newpassword123');
      expect(updatedUser.password).toMatch(/^\$2[aby]\$10\$/); // bcrypt hash pattern
    });

    it('should return 404 for non-existent user', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();

      const response = await agent
        .put(`/api/users/${nonExistentId}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    let testUser;

    beforeEach(async () => {
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      
      testUser = await userRepository.createUser({
        username: 'deleteuser',
        password: 'password123',
        name: 'Delete User',
        role: 'User',
        department: 'IT',
        isActive: true
      });
    });

    it('should delete user successfully', async () => {
      const response = await agent
        .delete(`/api/users/${testUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const getResponse = await agent
        .get(`/api/users/${testUser._id}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();

      const response = await agent
        .delete(`/api/users/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await agent
        .delete(`/api/users/${adminUser._id}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('delete yourself');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Test without session
      const unauthenticatedAgent = request(app);

      await unauthenticatedAgent
        .get('/api/users')
        .expect(401);

      await unauthenticatedAgent
        .post('/api/users')
        .send({ username: 'test' })
        .expect(401);
    });

    it('should require proper permissions', async () => {
      // Create and login as regular user
      const UserRepository = require('../../repositories/UserRepository');
      const userRepository = new UserRepository();
      
      await userRepository.createUser({
        username: 'regularuser',
        password: 'password123',
        name: 'Regular User',
        role: 'User',
        department: 'IT',
        isActive: true
      });

      const userAgent = request.agent(app);
      await userAgent
        .post('/api/auth/login')
        .send({
          username: 'regularuser',
          password: 'password123'
        });

      // Regular user should not be able to create users
      await userAgent
        .post('/api/users')
        .send({
          username: 'newuser',
          password: 'password123',
          name: 'New User',
          role: 'User'
        })
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error by using invalid data that would cause DB constraint violation
      const response = await agent
        .post('/api/users')
        .send({
          username: null, // This should cause a database error
          password: 'password123',
          name: 'Test User',
          role: 'User'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should return proper error format for validation errors', async () => {
      const response = await agent
        .post('/api/users')
        .send({
          username: 'a', // Too short
          password: '123', // Too short
          role: 'InvalidRole'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
});