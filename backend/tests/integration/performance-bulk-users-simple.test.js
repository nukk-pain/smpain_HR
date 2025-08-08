const UserRepository = require('../../repositories/UserRepository');

describe('Performance Test: Bulk User Data Filtering (Simple)', () => {
  let userRepository;
  let testUserIds = [];
  const BULK_USER_COUNT = 30; // Start with 30 users

  beforeAll(async () => {
    // Initialize repository
    userRepository = new UserRepository();
    
    // Clean up any existing test users from previous runs
    console.log('Cleaning up existing test users...');
    const existingTestUsers = await userRepository.findAll({ 
      username: { $regex: `^perftest_` }
    });
    
    for (const user of existingTestUsers) {
      try {
        await userRepository.delete(user._id.toString());
      } catch (error) {
        console.error(`Failed to delete existing user:`, error.message);
      }
    }
    
    // Create bulk test users - mix of active and inactive
    console.log(`Creating ${BULK_USER_COUNT} test users...`);
    const timestamp = Date.now();
    
    // Create users sequentially to avoid connection issues
    for (let i = 0; i < BULK_USER_COUNT; i++) {
      const isActive = i % 3 !== 0; // Every 3rd user is inactive
      const userData = {
        username: `perftest_${timestamp}_${i}`,
        password: 'Test123!',
        name: `Performance Test User ${i}`,
        employeeId: `EMP${timestamp}${i}`,
        role: 'User',
        department: 'Test Department',
        isActive: isActive,
        deactivatedAt: isActive ? null : new Date(),
        deactivatedBy: isActive ? null : '674f4c2c1ad14a17586c5555',
        deactivationReason: isActive ? null : 'Performance test inactive user'
      };

      try {
        const user = await userRepository.createUser(userData);
        testUserIds.push(user._id.toString());
      } catch (error) {
        console.error(`Failed to create user ${i}:`, error.message);
      }
    }
    
    console.log(`Created ${testUserIds.length} test users successfully`);
  });

  afterAll(async () => {
    // Clean up test users
    console.log('Cleaning up test users...');
    
    for (const id of testUserIds) {
      try {
        await userRepository.delete(id);
      } catch (error) {
        console.error(`Failed to delete user ${id}:`, error.message);
      }
    }
    
    console.log('Cleanup completed');
  });

  test('should efficiently query active users only', async () => {
    const startTime = Date.now();
    
    // Query active users
    const activeUsers = await userRepository.findAll({ 
      isActive: { $ne: false },
      username: { $regex: `^perftest_` }
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`✓ Active users query time: ${queryTime}ms`);
    
    // Performance assertions
    expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    
    // Verify results
    const testActiveUsers = activeUsers.filter(user => 
      user.username.startsWith('perftest_')
    );
    
    // All returned users should be active
    testActiveUsers.forEach(user => {
      expect(user.isActive).toBe(true);
    });
    
    // Approximately 2/3 should be active
    const expectedActiveCount = Math.floor((BULK_USER_COUNT * 2) / 3);
    expect(testActiveUsers.length).toBeGreaterThanOrEqual(expectedActiveCount - 2);
    expect(testActiveUsers.length).toBeLessThanOrEqual(expectedActiveCount + 2);
  });

  test('should efficiently query all users including inactive', async () => {
    const startTime = Date.now();
    
    // Query all users
    const allUsers = await userRepository.findAll({ 
      username: { $regex: `^perftest_` }
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`✓ All users query time: ${queryTime}ms`);
    
    // Performance assertions
    expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    
    // Should return at least all test users (may have extras from previous runs)
    expect(allUsers.length).toBeGreaterThanOrEqual(BULK_USER_COUNT);
  });

  test('should efficiently query inactive users only', async () => {
    const startTime = Date.now();
    
    // Query inactive users
    const inactiveUsers = await userRepository.findAll({ 
      isActive: false,
      username: { $regex: `^perftest_` }
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`✓ Inactive users query time: ${queryTime}ms`);
    
    // Performance assertions
    expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    
    // All returned users should be inactive
    inactiveUsers.forEach(user => {
      expect(user.isActive).toBe(false);
    });
    
    // Approximately 1/3 should be inactive
    const expectedInactiveCount = Math.floor(BULK_USER_COUNT / 3);
    expect(inactiveUsers.length).toBeGreaterThanOrEqual(expectedInactiveCount - 2);
    expect(inactiveUsers.length).toBeLessThanOrEqual(expectedInactiveCount + 2);
  });

  test('should handle multiple concurrent queries efficiently', async () => {
    const startTime = Date.now();
    
    // Execute multiple queries concurrently
    const queries = [
      userRepository.findAll({ isActive: { $ne: false }, username: { $regex: `^perftest_` } }),
      userRepository.findAll({ isActive: false, username: { $regex: `^perftest_` } }),
      userRepository.findAll({ username: { $regex: `^perftest_` } }),
      userRepository.count({ username: { $regex: `^perftest_` } }),
      userRepository.count({ isActive: { $ne: false }, username: { $regex: `^perftest_` } })
    ];
    
    const results = await Promise.all(queries);
    const totalTime = Date.now() - startTime;
    
    console.log(`✓ 5 concurrent queries completed in: ${totalTime}ms`);
    console.log(`✓ Average time per query: ${Math.round(totalTime / 5)}ms`);
    
    // All queries should complete efficiently
    expect(totalTime).toBeLessThan(2000); // 5 queries should complete within 2 seconds
    
    // Verify results are correct
    expect(results[3]).toBeGreaterThanOrEqual(BULK_USER_COUNT); // Total count (may have extras)
    expect(results[4]).toBeGreaterThan(0); // Active count
  });

  test('should perform well with pagination', async () => {
    const pageSize = 10;
    const timings = [];
    
    for (let page = 0; page < 3; page++) {
      const startTime = Date.now();
      
      const users = await userRepository.findAll(
        { username: { $regex: `^perftest_` } },
        { 
          skip: page * pageSize,
          limit: pageSize,
          sort: { createdAt: -1 }
        }
      );
      
      const queryTime = Date.now() - startTime;
      timings.push(queryTime);
      
      console.log(`  Page ${page + 1} query time: ${queryTime}ms`);
      
      expect(queryTime).toBeLessThan(500); // Each page should load quickly
      expect(users.length).toBeLessThanOrEqual(pageSize);
    }
    
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`✓ Average pagination query time: ${Math.round(avgTime)}ms`);
    expect(avgTime).toBeLessThan(400); // Average should be under 400ms
  });
});