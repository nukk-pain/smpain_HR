// Unit tests for UserRepository
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const UserRepository = require('../../repositories/UserRepository');

describe('UserRepository', () => {
  let mongoServer;
  let connection;
  let db;
  let userRepository;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    connection = await MongoClient.connect(uri);
    db = connection.db();

    // Mock getDatabase function
    jest.mock('../../utils/database', () => ({
      getDatabase: jest.fn(() => Promise.resolve(db))
    }));

    userRepository = new UserRepository();
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await db.collection('users').deleteMany({});
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
        role: 'User',
        department: 'IT',
        isActive: true
      };

      const result = await userRepository.createUser(userData);

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe('User');
      expect(result.department).toBe('IT');
      expect(result.isActive).toBe(true);
      expect(result.leaveBalance).toBe(0);
      expect(result.password).toBeDefined();
      expect(result.password).not.toBe('password123'); // Should be hashed
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should set default values correctly', async () => {
      const userData = {
        username: 'testuser2',
        password: 'password123',
        name: 'Test User 2',
        role: 'User'
      };

      const result = await userRepository.createUser(userData);

      expect(result.isActive).toBe(true);
      expect(result.leaveBalance).toBe(0);
    });

    it('should validate password after creation', async () => {
      const userData = {
        username: 'testuser3',
        password: 'password123',
        name: 'Test User 3',
        role: 'User'
      };

      const result = await userRepository.createUser(userData);
      const isValidPassword = await userRepository.validatePassword('password123', result.password);

      expect(isValidPassword).toBe(true);
    });
  });

  describe('findByUsername', () => {
    beforeEach(async () => {
      await userRepository.createUser({
        username: 'john_doe',
        password: 'password123',
        name: 'John Doe',
        role: 'User',
        department: 'Sales'
      });
    });

    it('should find user by username', async () => {
      const user = await userRepository.findByUsername('john_doe');

      expect(user).toBeDefined();
      expect(user.username).toBe('john_doe');
      expect(user.name).toBe('John Doe');
      expect(user.department).toBe('Sales');
    });

    it('should return null for non-existent username', async () => {
      const user = await userRepository.findByUsername('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    beforeEach(async () => {
      await userRepository.createUser({
        username: 'employee001',
        password: 'password123',
        name: 'Employee One',
        role: 'User',
        employeeId: 'EMP001'
      });
    });

    it('should find user by employee ID', async () => {
      const user = await userRepository.findByEmployeeId('EMP001');

      expect(user).toBeDefined();
      expect(user.employeeId).toBe('EMP001');
      expect(user.name).toBe('Employee One');
    });

    it('should return null for non-existent employee ID', async () => {
      const user = await userRepository.findByEmployeeId('EMP999');
      expect(user).toBeNull();
    });
  });

  describe('findActiveUsers', () => {
    beforeEach(async () => {
      await userRepository.createUser({
        username: 'active1',
        password: 'password123',
        name: 'Active User 1',
        role: 'User',
        isActive: true
      });

      await userRepository.createUser({
        username: 'active2',
        password: 'password123',
        name: 'Active User 2',
        role: 'Manager',
        isActive: true
      });

      await userRepository.createUser({
        username: 'inactive1',
        password: 'password123',
        name: 'Inactive User',
        role: 'User',
        isActive: false
      });
    });

    it('should return only active users', async () => {
      const activeUsers = await userRepository.findActiveUsers();

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(user => user.isActive === true)).toBe(true);
      expect(activeUsers.map(u => u.name)).toContain('Active User 1');
      expect(activeUsers.map(u => u.name)).toContain('Active User 2');
      expect(activeUsers.map(u => u.name)).not.toContain('Inactive User');
    });
  });

  describe('findByDepartment', () => {
    beforeEach(async () => {
      await userRepository.createUser({
        username: 'it1',
        password: 'password123',
        name: 'IT User 1',
        role: 'User',
        department: 'IT'
      });

      await userRepository.createUser({
        username: 'it2',
        password: 'password123',
        name: 'IT User 2',
        role: 'Manager',
        department: 'IT'
      });

      await userRepository.createUser({
        username: 'sales1',
        password: 'password123',
        name: 'Sales User',
        role: 'User',
        department: 'Sales'
      });
    });

    it('should return users from specific department', async () => {
      const itUsers = await userRepository.findByDepartment('IT');

      expect(itUsers).toHaveLength(2);
      expect(itUsers.every(user => user.department === 'IT')).toBe(true);
      expect(itUsers.map(u => u.name)).toContain('IT User 1');
      expect(itUsers.map(u => u.name)).toContain('IT User 2');
    });

    it('should return empty array for non-existent department', async () => {
      const users = await userRepository.findByDepartment('NonExistent');
      expect(users).toHaveLength(0);
    });
  });

  describe('findByRole', () => {
    beforeEach(async () => {
      await userRepository.createUser({
        username: 'admin1',
        password: 'password123',
        name: 'Admin User',
        role: 'Admin'
      });

      await userRepository.createUser({
        username: 'manager1',
        password: 'password123',
        name: 'Manager User 1',
        role: 'Manager'
      });

      await userRepository.createUser({
        username: 'manager2',
        password: 'password123',
        name: 'Manager User 2',
        role: 'Manager'
      });

      await userRepository.createUser({
        username: 'user1',
        password: 'password123',
        name: 'Regular User',
        role: 'User'
      });
    });

    it('should return users with specific role', async () => {
      const managers = await userRepository.findByRole('Manager');

      expect(managers).toHaveLength(2);
      expect(managers.every(user => user.role === 'Manager')).toBe(true);
      expect(managers.map(u => u.name)).toContain('Manager User 1');
      expect(managers.map(u => u.name)).toContain('Manager User 2');
    });

    it('should return single admin user', async () => {
      const admins = await userRepository.findByRole('Admin');

      expect(admins).toHaveLength(1);
      expect(admins[0].name).toBe('Admin User');
    });
  });

  describe('updateLeaveBalance', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await userRepository.createUser({
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
        role: 'User',
        leaveBalance: 15
      });
    });

    it('should update leave balance', async () => {
      const updatedUser = await userRepository.updateLeaveBalance(testUser._id, 10);

      expect(updatedUser.leaveBalance).toBe(10);
      expect(updatedUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow negative leave balance', async () => {
      const updatedUser = await userRepository.updateLeaveBalance(testUser._id, -3);

      expect(updatedUser.leaveBalance).toBe(-3);
    });
  });

  describe('incrementLeaveBalance', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await userRepository.createUser({
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
        role: 'User',
        leaveBalance: 10
      });
    });

    it('should increment leave balance', async () => {
      await userRepository.incrementLeaveBalance(testUser._id, 5);
      
      const updatedUser = await userRepository.findById(testUser._id);
      expect(updatedUser.leaveBalance).toBe(15);
    });

    it('should handle negative increment (decrement)', async () => {
      await userRepository.incrementLeaveBalance(testUser._id, -3);
      
      const updatedUser = await userRepository.findById(testUser._id);
      expect(updatedUser.leaveBalance).toBe(7);
    });
  });

  describe('decrementLeaveBalance', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await userRepository.createUser({
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
        role: 'User',
        leaveBalance: 10
      });
    });

    it('should decrement leave balance', async () => {
      await userRepository.decrementLeaveBalance(testUser._id, 4);
      
      const updatedUser = await userRepository.findById(testUser._id);
      expect(updatedUser.leaveBalance).toBe(6);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const plainPassword = 'mypassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const isValid = await userRepository.validatePassword(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const plainPassword = 'mypassword123';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const isValid = await userRepository.validatePassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('deactivateUser and reactivateUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await userRepository.createUser({
        username: 'testuser',
        password: 'password123',
        name: 'Test User',
        role: 'User',
        isActive: true
      });
    });

    it('should deactivate user', async () => {
      const terminationDate = new Date();
      const deactivatedUser = await userRepository.deactivateUser(testUser._id, terminationDate);

      expect(deactivatedUser.isActive).toBe(false);
      expect(deactivatedUser.terminationDate).toEqual(terminationDate);
    });

    it('should reactivate user', async () => {
      // First deactivate
      await userRepository.deactivateUser(testUser._id);
      
      // Then reactivate
      const reactivatedUser = await userRepository.reactivateUser(testUser._id);

      expect(reactivatedUser.isActive).toBe(true);
      expect(reactivatedUser.terminationDate).toBeNull();
    });
  });

  describe('getUserStats', () => {
    beforeEach(async () => {
      await userRepository.createUser({
        username: 'admin1',
        password: 'pass123',
        name: 'Admin 1',
        role: 'Admin',
        isActive: true
      });

      await userRepository.createUser({
        username: 'manager1',
        password: 'pass123',
        name: 'Manager 1',
        role: 'Manager',
        isActive: true
      });

      await userRepository.createUser({
        username: 'manager2',
        password: 'pass123',
        name: 'Manager 2',
        role: 'Manager',
        isActive: false
      });

      await userRepository.createUser({
        username: 'user1',
        password: 'pass123',
        name: 'User 1',
        role: 'User',
        isActive: true
      });

      await userRepository.createUser({
        username: 'user2',
        password: 'pass123',
        name: 'User 2',
        role: 'User',
        isActive: true
      });
    });

    it('should return correct user statistics', async () => {
      const stats = await userRepository.getUserStats();

      expect(stats).toHaveLength(3); // Admin, Manager, User
      
      const adminStats = stats.find(s => s._id === 'Admin');
      expect(adminStats.count).toBe(1);
      expect(adminStats.activeCount).toBe(1);

      const managerStats = stats.find(s => s._id === 'Manager');
      expect(managerStats.count).toBe(2);
      expect(managerStats.activeCount).toBe(1);

      const userStats = stats.find(s => s._id === 'User');
      expect(userStats.count).toBe(2);
      expect(userStats.activeCount).toBe(2);
    });
  });
});