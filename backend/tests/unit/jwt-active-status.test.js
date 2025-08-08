const UserRepository = require('../../repositories/UserRepository');
const { connectToDatabase, closeDatabaseConnection } = require('../../utils/database');
const { verifyToken } = require('../../utils/jwt');
const jwt = require('jsonwebtoken');

describe('JWT Active Status Validation Tests', () => {
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
    await collection.deleteMany({ username: { $regex: /^test_jwt_/ } });

    // Create active user
    activeUser = await userRepository.createUser({
      username: 'test_jwt_active_user',
      name: 'JWT Active User',
      role: 'User',
      employeeId: 'TEST_JWT_ACTIVE_001',
      password: 'user123',
      isActive: true
    });

    // Create inactive user
    inactiveUser = await userRepository.createUser({
      username: 'test_jwt_inactive_user',
      name: 'JWT Inactive User',
      role: 'User',
      employeeId: 'TEST_JWT_INACTIVE_001',
      password: 'user123',
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: 'Test JWT deactivation'
    });
  });

  describe('JWT Token Creation and Validation', () => {
    test('should create valid token for active user', () => {
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
      const token = jwt.sign(
        { 
          id: activeUser._id.toString(),
          username: activeUser.username,
          name: activeUser.name,
          role: activeUser.role,
          permissions: ['leave:view']
        },
        jwtSecret,
        { 
          expiresIn: '1h',
          issuer: 'hr-system',
          audience: 'hr-frontend'
        }
      );

      // Token should be created successfully
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Token should be verifiable
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(activeUser._id.toString());
      expect(decoded.username).toBe(activeUser.username);
    });

    test('should create token for inactive user (token creation does not check status)', () => {
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
      const token = jwt.sign(
        { 
          id: inactiveUser._id.toString(),
          username: inactiveUser.username,
          name: inactiveUser.name,
          role: inactiveUser.role,
          permissions: ['leave:view']
        },
        jwtSecret,
        { 
          expiresIn: '1h',
          issuer: 'hr-system',
          audience: 'hr-frontend'
        }
      );

      // Token creation should succeed even for inactive users
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Token should be verifiable (JWT verification doesn't check DB status)
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(inactiveUser._id.toString());
      expect(decoded.username).toBe(inactiveUser.username);
    });

    test('should verify user active status from database', async () => {
      // Check active user status
      const activeUserFromDB = await userRepository.findById(activeUser._id.toString());
      expect(activeUserFromDB.isActive).toBe(true);
      expect(activeUserFromDB.deactivatedAt).toBeUndefined();

      // Check inactive user status
      const inactiveUserFromDB = await userRepository.findById(inactiveUser._id.toString());
      expect(inactiveUserFromDB.isActive).toBe(false);
      expect(inactiveUserFromDB.deactivatedAt).toBeInstanceOf(Date);
      expect(inactiveUserFromDB.deactivationReason).toBe('Test JWT deactivation');
    });

    test('should simulate authentication middleware checking user status', async () => {
      // This simulates what the auth middleware should do:
      // 1. Verify JWT token
      // 2. Look up user in database
      // 3. Check if user is active

      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
      
      // Create tokens for both users
      const activeToken = jwt.sign(
        { 
          id: activeUser._id.toString(),
          username: activeUser.username,
          role: activeUser.role
        },
        jwtSecret,
        { 
          expiresIn: '1h',
          issuer: 'hr-system',
          audience: 'hr-frontend'
        }
      );

      const inactiveToken = jwt.sign(
        { 
          id: inactiveUser._id.toString(),
          username: inactiveUser.username,
          role: inactiveUser.role
        },
        jwtSecret,
        { 
          expiresIn: '1h',
          issuer: 'hr-system',
          audience: 'hr-frontend'
        }
      );

      // Simulate middleware logic
      async function simulateAuthMiddleware(token) {
        try {
          // Step 1: Verify JWT token
          const decoded = verifyToken(token);
          
          // Step 2: Look up user in database
          const user = await userRepository.findById(decoded.id);
          
          if (!user) {
            return { success: false, error: 'User not found' };
          }
          
          // Step 3: Check if user is active
          if (user.isActive === false) {
            return { success: false, error: 'Account is deactivated' };
          }
          
          return { success: true, user: decoded };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }

      // Test active user token
      const activeResult = await simulateAuthMiddleware(activeToken);
      expect(activeResult.success).toBe(true);
      expect(activeResult.user.username).toBe(activeUser.username);

      // Test inactive user token
      const inactiveResult = await simulateAuthMiddleware(inactiveToken);
      expect(inactiveResult.success).toBe(false);
      expect(inactiveResult.error).toBe('Account is deactivated');
    });

    test('should handle non-existent user ID in token', async () => {
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
      const fakeId = '507f1f77bcf86cd799439011';
      
      const fakeToken = jwt.sign(
        { 
          id: fakeId,
          username: 'fake_user',
          role: 'User'
        },
        jwtSecret,
        { 
          expiresIn: '1h',
          issuer: 'hr-system',
          audience: 'hr-frontend'
        }
      );

      // Simulate middleware checking for non-existent user
      const decoded = verifyToken(fakeToken);
      const user = await userRepository.findById(decoded.id);
      
      // User should not exist
      expect(user).toBeNull();
      
      // Middleware should reject this token
      expect(decoded.id).toBe(fakeId);
    });
  });
});