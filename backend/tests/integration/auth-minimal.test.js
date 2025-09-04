/**
 * Minimal Auth Test - Direct testing without full app
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Minimal Auth Test', () => {
  let client;
  let db;
  
  beforeAll(async () => {
    // Direct database connection
    client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    db = client.db('hr_test');
    
    // Ensure test user exists
    const existingUser = await db.collection('users').findOne({ username: 'admin' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await db.collection('users').insertOne({
        username: 'admin',
        password: hashedPassword,
        name: 'Test Admin',
        role: 'admin',
        isActive: true,
        createdAt: new Date()
      });
    }
  });
  
  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });
  
  test('should verify admin user exists', async () => {
    const user = await db.collection('users').findOne({ username: 'admin' });
    expect(user).toBeDefined();
    expect(user.username).toBe('admin');
    expect(user.role).toBe('admin');
  });
  
  test('should validate admin password', async () => {
    const user = await db.collection('users').findOne({ username: 'admin' });
    const isValid = bcrypt.compareSync('admin', user.password);
    expect(isValid).toBe(true);
  });
  
  test('should generate valid JWT token', () => {
    const token = jwt.sign(
      { userId: '123', username: 'admin', role: 'admin' },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );
    
    expect(token).toBeDefined();
    
    const decoded = jwt.verify(token, 'test-jwt-secret');
    expect(decoded.username).toBe('admin');
    expect(decoded.role).toBe('admin');
  });
});