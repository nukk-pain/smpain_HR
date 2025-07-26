// Test setup and configuration
const { MongoMemoryServer } = require('mongodb-memory-server');

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-session-secret';
  
  // Increase timeout for database operations
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Clean up any global resources
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Mock console methods in test environment to reduce noise
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Mock console methods to avoid test output noise
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export test utilities
module.exports = {
  // Helper function to create test database connection
  async createTestDatabase() {
    const mongoServer = await MongoMemoryServer.create();
    return {
      uri: mongoServer.getUri(),
      stop: () => mongoServer.stop()
    };
  },
  
  // Helper function to wait for async operations
  async waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Helper function to create test user data
  createTestUser(overrides = {}) {
    return {
      username: 'testuser',
      password: 'password123',
      name: 'Test User',
      role: 'User',
      department: 'IT',
      isActive: true,
      leaveBalance: 10,
      ...overrides
    };
  },
  
  // Helper function to create test admin data
  createTestAdmin(overrides = {}) {
    return {
      username: 'testadmin',
      password: 'admin123',
      name: 'Test Admin',
      role: 'Admin',
      department: 'IT',
      isActive: true,
      leaveBalance: 15,
      ...overrides
    };
  },
  
  // Helper function to create test department data
  createTestDepartment(overrides = {}) {
    return {
      name: 'Test Department',
      code: 'TEST',
      description: 'Test Department Description',
      isActive: true,
      ...overrides
    };
  },
  
  // Helper function to create test leave request data
  createTestLeaveRequest(userId, overrides = {}) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2);
    
    return {
      userId,
      startDate,
      endDate,
      reason: 'Test leave request',
      daysCount: 3,
      status: 'pending',
      ...overrides
    };
  }
};