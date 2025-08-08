const UserRepository = require('../../repositories/UserRepository');
const { connectToDatabase, closeDatabaseConnection } = require('../../utils/database');

describe('JWT Authentication Middleware Active Status Tests', () => {
  let userRepository;
  let activeUser;
  let inactiveUser;

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
    await collection.deleteMany({ username: { $regex: /^test_auth_middleware_/ } });

    // Create active user
    activeUser = await userRepository.createUser({
      username: 'test_auth_middleware_active',
      name: 'Auth Middleware Active User',
      role: 'User',
      employeeId: 'TEST_AUTH_MIDDLEWARE_ACTIVE_001',
      password: 'user123',
      isActive: true
    });

    // Create inactive user
    inactiveUser = await userRepository.createUser({
      username: 'test_auth_middleware_inactive',
      name: 'Auth Middleware Inactive User', 
      role: 'User',
      employeeId: 'TEST_AUTH_MIDDLEWARE_INACTIVE_001',
      password: 'user123',
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: 'Test auth middleware deactivation'
    });
  });

  describe('Authentication Middleware Active Status Validation', () => {
    test('should simulate auth middleware rejecting inactive user', async () => {
      // Simulate what the auth middleware does:
      // 1. Get decoded JWT token data
      // 2. Look up user in database
      // 3. Check if user is active
      
      const { ObjectId } = require('mongodb');
      const { getDatabase } = require('../../utils/database');

      async function simulateAuthMiddleware(userId) {
        try {
          const db = await getDatabase();
          
          let user = null;
          if (ObjectId.isValid(userId)) {
            user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
          }
          
          if (!user) {
            return { success: false, error: 'User not found', status: 401 };
          }
          
          if (user.isActive === false) {
            return { success: false, error: 'Account is deactivated', status: 401 };
          }
          
          return { success: true, user };
        } catch (error) {
          return { success: false, error: error.message, status: 401 };
        }
      }

      // Test active user
      const activeResult = await simulateAuthMiddleware(activeUser._id.toString());
      expect(activeResult.success).toBe(true);
      expect(activeResult.user.isActive).toBe(true);

      // Test inactive user - should be rejected
      const inactiveResult = await simulateAuthMiddleware(inactiveUser._id.toString());
      expect(inactiveResult.success).toBe(false);
      expect(inactiveResult.error).toBe('Account is deactivated');
      expect(inactiveResult.status).toBe(401);
    });

    test('should simulate auth middleware rejecting non-existent user ID', async () => {
      const { ObjectId } = require('mongodb');
      const { getDatabase } = require('../../utils/database');

      async function simulateAuthMiddleware(userId) {
        try {
          const db = await getDatabase();
          
          let user = null;
          if (ObjectId.isValid(userId)) {
            user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
          }
          
          if (!user) {
            return { success: false, error: 'User not found', status: 401 };
          }
          
          if (user.isActive === false) {
            return { success: false, error: 'Account is deactivated', status: 401 };
          }
          
          return { success: true, user };
        } catch (error) {
          return { success: false, error: error.message, status: 401 };
        }
      }

      // Test with fake user ID
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await simulateAuthMiddleware(fakeId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.status).toBe(401);
    });

    test('should simulate auth middleware handling invalid ObjectId', async () => {
      const { ObjectId } = require('mongodb');
      const { getDatabase } = require('../../utils/database');

      async function simulateAuthMiddleware(userId) {
        try {
          const db = await getDatabase();
          
          let user = null;
          if (ObjectId.isValid(userId)) {
            user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
          } else {
            return { success: false, error: 'Invalid user ID format', status: 401 };
          }
          
          if (!user) {
            return { success: false, error: 'User not found', status: 401 };
          }
          
          if (user.isActive === false) {
            return { success: false, error: 'Account is deactivated', status: 401 };
          }
          
          return { success: true, user };
        } catch (error) {
          return { success: false, error: error.message, status: 401 };
        }
      }

      // Test with invalid ObjectId
      const result = await simulateAuthMiddleware('invalid-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user ID format');
      expect(result.status).toBe(401);
    });

    test('should verify actual user statuses in database', async () => {
      // Verify active user
      const activeUserFromDB = await userRepository.findById(activeUser._id.toString());
      expect(activeUserFromDB).toBeTruthy();
      expect(activeUserFromDB.isActive).toBe(true);
      expect(activeUserFromDB.deactivatedAt).toBeUndefined();

      // Verify inactive user
      const inactiveUserFromDB = await userRepository.findById(inactiveUser._id.toString());
      expect(inactiveUserFromDB).toBeTruthy();
      expect(inactiveUserFromDB.isActive).toBe(false);
      expect(inactiveUserFromDB.deactivatedAt).toBeInstanceOf(Date);
      expect(inactiveUserFromDB.deactivationReason).toBe('Test auth middleware deactivation');
    });

    test('should test middleware logic flow step by step', async () => {
      // Step 1: Extract token from header (simulated as already having userId)
      const activeUserId = activeUser._id.toString();
      const inactiveUserId = inactiveUser._id.toString();

      // Step 2: Verify ObjectId validity
      const { ObjectId } = require('mongodb');
      expect(ObjectId.isValid(activeUserId)).toBe(true);
      expect(ObjectId.isValid(inactiveUserId)).toBe(true);

      // Step 3: Database lookup
      const { getDatabase } = require('../../utils/database');
      const db = await getDatabase();

      const activeUserFromDB = await db.collection('users').findOne({ 
        _id: new ObjectId(activeUserId) 
      });
      const inactiveUserFromDB = await db.collection('users').findOne({ 
        _id: new ObjectId(inactiveUserId) 
      });

      expect(activeUserFromDB).toBeTruthy();
      expect(inactiveUserFromDB).toBeTruthy();

      // Step 4: Active status check
      expect(activeUserFromDB.isActive).toBe(true); // Should pass
      expect(inactiveUserFromDB.isActive).toBe(false); // Should fail

      // Step 5: Middleware decision
      // Active user should be allowed
      expect(activeUserFromDB.isActive !== false).toBe(true);

      // Inactive user should be rejected
      expect(inactiveUserFromDB.isActive === false).toBe(true);
    });
  });
});