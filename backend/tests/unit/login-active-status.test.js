const UserRepository = require('../../repositories/UserRepository');
const { connectToDatabase, closeDatabaseConnection } = require('../../utils/database');
const bcrypt = require('bcryptjs');

describe('Login Active Status Validation Tests', () => {
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
    await collection.deleteMany({ username: { $regex: /^test_login_/ } });

    // Create active user
    activeUser = await userRepository.createUser({
      username: 'test_login_active',
      name: 'Login Active User',
      role: 'User',
      employeeId: 'TEST_LOGIN_ACTIVE_001',
      password: 'password123',
      isActive: true
    });

    // Create inactive user
    inactiveUser = await userRepository.createUser({
      username: 'test_login_inactive',
      name: 'Login Inactive User',
      role: 'User',
      employeeId: 'TEST_LOGIN_INACTIVE_001',
      password: 'password123',
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: 'Test login deactivation'
    });
  });

  describe('Login Active Status Validation', () => {
    test('should simulate login logic for active user', async () => {
      // Simulate login endpoint logic
      async function simulateLogin(username, password) {
        try {
          const { getDatabase } = require('../../utils/database');
          const db = await getDatabase();
          
          // Step 1: Find user by username
          const user = await db.collection('users').findOne({ username: String(username) });
          
          if (!user) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          // Step 2: Validate password
          const isValid = bcrypt.compareSync(password, user.password);
          
          if (!isValid) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          // Step 3: Check if user is active
          if (!user.isActive) {
            return { success: false, error: 'Account is deactivated', status: 401 };
          }
          
          return { 
            success: true, 
            user: {
              id: user._id,
              username: user.username,
              name: user.name,
              role: user.role
            } 
          };
        } catch (error) {
          return { success: false, error: error.message, status: 500 };
        }
      }

      // Test active user login
      const result = await simulateLogin('test_login_active', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.user.username).toBe('test_login_active');
      expect(result.user.name).toBe('Login Active User');
    });

    test('should simulate login rejection for inactive user', async () => {
      // Simulate login endpoint logic
      async function simulateLogin(username, password) {
        try {
          const { getDatabase } = require('../../utils/database');
          const db = await getDatabase();
          
          // Step 1: Find user by username
          const user = await db.collection('users').findOne({ username: String(username) });
          
          if (!user) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          // Step 2: Validate password
          const isValid = bcrypt.compareSync(password, user.password);
          
          if (!isValid) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          // Step 3: Check if user is active
          if (!user.isActive) {
            return { success: false, error: 'Account is deactivated', status: 401 };
          }
          
          return { 
            success: true, 
            user: {
              id: user._id,
              username: user.username,
              name: user.name,
              role: user.role
            } 
          };
        } catch (error) {
          return { success: false, error: error.message, status: 500 };
        }
      }

      // Test inactive user login - should be rejected
      const result = await simulateLogin('test_login_inactive', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
      expect(result.status).toBe(401);
    });

    test('should handle non-existent user gracefully', async () => {
      async function simulateLogin(username, password) {
        try {
          const { getDatabase } = require('../../utils/database');
          const db = await getDatabase();
          
          const user = await db.collection('users').findOne({ username: String(username) });
          
          if (!user) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          const isValid = bcrypt.compareSync(password, user.password);
          
          if (!isValid) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          if (!user.isActive) {
            return { success: false, error: 'Account is deactivated', status: 401 };
          }
          
          return { success: true, user };
        } catch (error) {
          return { success: false, error: error.message, status: 500 };
        }
      }

      // Test non-existent user
      const result = await simulateLogin('nonexistent_user', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.status).toBe(401);
    });

    test('should handle wrong password for active user', async () => {
      async function simulateLogin(username, password) {
        try {
          const { getDatabase } = require('../../utils/database');
          const db = await getDatabase();
          
          const user = await db.collection('users').findOne({ username: String(username) });
          
          if (!user) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          const isValid = bcrypt.compareSync(password, user.password);
          
          if (!isValid) {
            return { success: false, error: 'Invalid credentials', status: 401 };
          }
          
          if (!user.isActive) {
            return { success: false, error: 'Account is deactivated', status: 401 };
          }
          
          return { success: true, user };
        } catch (error) {
          return { success: false, error: error.message, status: 500 };
        }
      }

      // Test wrong password for active user
      const result = await simulateLogin('test_login_active', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.status).toBe(401);
    });

    test('should verify user states before login tests', async () => {
      // Verify active user
      const activeUserFromDB = await userRepository.findById(activeUser._id.toString());
      expect(activeUserFromDB.isActive).toBe(true);
      expect(activeUserFromDB.username).toBe('test_login_active');

      // Verify inactive user
      const inactiveUserFromDB = await userRepository.findById(inactiveUser._id.toString());
      expect(inactiveUserFromDB.isActive).toBe(false);
      expect(inactiveUserFromDB.username).toBe('test_login_inactive');
      expect(inactiveUserFromDB.deactivationReason).toBe('Test login deactivation');
    });

    test('should test login flow step by step', async () => {
      const { getDatabase } = require('../../utils/database');
      const db = await getDatabase();

      // Step 1: Username lookup for active user
      const activeUserFromDB = await db.collection('users').findOne({ 
        username: 'test_login_active' 
      });
      expect(activeUserFromDB).toBeTruthy();

      // Step 2: Password validation for active user
      const isValidPassword = bcrypt.compareSync('password123', activeUserFromDB.password);
      expect(isValidPassword).toBe(true);

      // Step 3: Active status check for active user
      expect(activeUserFromDB.isActive).toBe(true);

      // Now test inactive user
      // Step 1: Username lookup for inactive user
      const inactiveUserFromDB = await db.collection('users').findOne({ 
        username: 'test_login_inactive' 
      });
      expect(inactiveUserFromDB).toBeTruthy();

      // Step 2: Password validation for inactive user (would be valid if user was active)
      const isValidPasswordInactive = bcrypt.compareSync('password123', inactiveUserFromDB.password);
      expect(isValidPasswordInactive).toBe(true);

      // Step 3: Active status check for inactive user - should fail here
      expect(inactiveUserFromDB.isActive).toBe(false);
    });
  });
});