const UserRepository = require('../../repositories/UserRepository');
const { connectToDatabase, closeDatabaseConnection } = require('../../utils/database');

describe('User List Filtering Tests', () => {
  let userRepository;
  let activeUsers = [];
  let inactiveUsers = [];

  beforeAll(async () => {
    await connectToDatabase();
    userRepository = new UserRepository();
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  beforeEach(async () => {
    // Clean up test data
    const collection = await userRepository.getCollection();
    await collection.deleteMany({ username: { $regex: /^test_filtering_/ } });

    // Create active users
    const activeUser1 = await userRepository.createUser({
      username: 'test_filtering_active_1',
      name: 'Active User 1',
      role: 'User',
      employeeId: 'TEST_FILTERING_ACTIVE_001',
      password: 'user123',
      isActive: true
    });

    const activeUser2 = await userRepository.createUser({
      username: 'test_filtering_active_2', 
      name: 'Active User 2',
      role: 'Supervisor',
      employeeId: 'TEST_FILTERING_ACTIVE_002',
      password: 'user123',
      isActive: true
    });

    // Create inactive users
    const inactiveUser1 = await userRepository.createUser({
      username: 'test_filtering_inactive_1',
      name: 'Inactive User 1',
      role: 'User',
      employeeId: 'TEST_FILTERING_INACTIVE_001',
      password: 'user123',
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: 'Test deactivation 1'
    });

    const inactiveUser2 = await userRepository.createUser({
      username: 'test_filtering_inactive_2',
      name: 'Inactive User 2', 
      role: 'User',
      employeeId: 'TEST_FILTERING_INACTIVE_002',
      password: 'user123',
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: 'Test deactivation 2'
    });

    activeUsers = [activeUser1, activeUser2];
    inactiveUsers = [inactiveUser1, inactiveUser2];
  });

  describe('findActiveUsers method', () => {
    test('should return only active users by default', async () => {
      const users = await userRepository.findActiveUsers();
      const testActiveUsers = users.filter(u => u.username?.startsWith('test_filtering_active_'));
      const testInactiveUsers = users.filter(u => u.username?.startsWith('test_filtering_inactive_'));

      expect(testActiveUsers).toHaveLength(2);
      expect(testInactiveUsers).toHaveLength(0);
      
      // Verify all returned users are active
      testActiveUsers.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    test('should include users with isActive: true', async () => {
      const activeUsers = await userRepository.findActiveUsers();
      const testUsers = activeUsers.filter(u => u.username?.startsWith('test_filtering_'));

      expect(testUsers).toHaveLength(2);
      testUsers.forEach(user => {
        expect(user.isActive).toBe(true);
        expect(user.username).toMatch(/^test_filtering_active_/);
      });
    });

    test('should exclude users with isActive: false', async () => {
      const activeUsers = await userRepository.findActiveUsers();
      const inactiveTestUsers = activeUsers.filter(u => 
        u.username?.startsWith('test_filtering_inactive_')
      );

      expect(inactiveTestUsers).toHaveLength(0);
    });
  });

  describe('findAll with filtering options', () => {
    test('should return all users when no filter applied', async () => {
      const allUsers = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ }
      });

      expect(allUsers).toHaveLength(4);
      
      const activeCount = allUsers.filter(u => u.isActive === true).length;
      const inactiveCount = allUsers.filter(u => u.isActive === false).length;
      
      expect(activeCount).toBe(2);
      expect(inactiveCount).toBe(2);
    });

    test('should filter by active status', async () => {
      const activeUsers = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ },
        isActive: true
      });

      expect(activeUsers).toHaveLength(2);
      activeUsers.forEach(user => {
        expect(user.isActive).toBe(true);
        expect(user.username).toMatch(/^test_filtering_active_/);
      });
    });

    test('should filter by inactive status', async () => {
      const inactiveUsers = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ },
        isActive: false
      });

      expect(inactiveUsers).toHaveLength(2);
      inactiveUsers.forEach(user => {
        expect(user.isActive).toBe(false);
        expect(user.username).toMatch(/^test_filtering_inactive_/);
        expect(user.deactivationReason).toBeDefined();
      });
    });

    test('should support complex filtering with multiple criteria', async () => {
      const supervisorUsers = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ },
        role: 'Supervisor',
        isActive: true
      });

      expect(supervisorUsers).toHaveLength(1);
      expect(supervisorUsers[0].role).toBe('Supervisor');
      expect(supervisorUsers[0].isActive).toBe(true);
      expect(supervisorUsers[0].username).toBe('test_filtering_active_2');
    });
  });

  describe('API query parameter simulation', () => {
    test('should simulate ?includeInactive=false (default behavior)', async () => {
      // Simulate default API behavior - only active users
      const users = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ },
        isActive: { $ne: false }
      });

      const activeCount = users.filter(u => u.isActive === true).length;
      const inactiveCount = users.filter(u => u.isActive === false).length;

      expect(activeCount).toBeGreaterThanOrEqual(2);
      expect(inactiveCount).toBe(0);
    });

    test('should simulate ?includeInactive=true', async () => {
      // Simulate including inactive users
      const users = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ }
      });

      const activeCount = users.filter(u => u.isActive === true).length;
      const inactiveCount = users.filter(u => u.isActive === false).length;

      expect(activeCount).toBe(2);
      expect(inactiveCount).toBe(2);
    });

    test('should simulate ?status=active', async () => {
      const users = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ },
        isActive: true
      });

      expect(users).toHaveLength(2);
      users.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    test('should simulate ?status=inactive', async () => {
      const users = await userRepository.findAll({
        username: { $regex: /^test_filtering_/ },
        isActive: false
      });

      expect(users).toHaveLength(2);
      users.forEach(user => {
        expect(user.isActive).toBe(false);
        expect(user.deactivationReason).toBeDefined();
        expect(user.deactivatedAt).toBeInstanceOf(Date);
      });
    });
  });
});