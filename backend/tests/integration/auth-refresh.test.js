/**
 * TEST-02: Refresh Token Flow Tests
 * TDD Approach: RED → GREEN → REFACTOR
 * 
 * Tests refresh token functionality from FEAT-06
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

describe('Refresh Token Flow', () => {
  let testUser;
  let validAccessToken;
  let validRefreshToken;
  let expiredAccessToken;
  let db, connection;

  beforeAll(async () => {
    // Connect to test database
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'SM_nomu_test';
    
    connection = await MongoClient.connect(uri);
    db = connection.db(dbName);
    app.locals.db = db;

    // Clean up test user
    await db.collection('users').deleteOne({ email: 'refresh-test@test.com' });
    await db.collection('refresh_tokens').deleteMany({ userId: 'refresh-test-user' });

    // Create test user
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    testUser = {
      userId: 'refresh-test-user',
      username: 'refresh-test-user',
      name: 'Refresh Test User',
      email: 'refresh-test@test.com',
      password: hashedPassword,
      role: 'User',
      isActive: true,
      createdAt: new Date()
    };
    await db.collection('users').insertOne(testUser);

    // Generate valid tokens
    validAccessToken = jwt.sign(
      { userId: testUser.userId, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '15m' }
    );

    validRefreshToken = jwt.sign(
      { userId: testUser.userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
      { expiresIn: '7d' }
    );

    // Store refresh token in database
    await db.collection('refresh_tokens').updateOne(
      { userId: testUser.userId },
      { 
        $set: {
          token: validRefreshToken,
          userId: testUser.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      { upsert: true }
    );

    // Generate expired access token
    expiredAccessToken = jwt.sign(
      { userId: testUser.userId, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '0s' }
    );
  });

  describe('Valid Refresh Token Tests', () => {
    // Test 1: RED → GREEN → REFACTOR
    test('Should refresh valid token and return new access token', async () => {
      // RED: Write test expecting successful refresh
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      // GREEN: Verify successful refresh
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      // Verify new access token is valid
      const decodedToken = jwt.verify(
        response.body.accessToken,
        process.env.JWT_SECRET || 'test-secret'
      );
      expect(decodedToken.userId).toBe(testUser.userId);
      expect(decodedToken.role).toBe(testUser.role);

      // REFACTOR: Store new tokens for later tests
      validAccessToken = response.body.accessToken;
      if (response.body.refreshToken) {
        validRefreshToken = response.body.refreshToken;
      }
    });

    test('Should use refreshToken from cookie if not in body', async () => {
      // RED: Test cookie-based refresh
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshToken}`]);

      // GREEN: Verify successful refresh
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });

    test('Should maintain user session after refresh', async () => {
      // RED: Test session continuity
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(refreshResponse.status).toBe(200);
      const newAccessToken = refreshResponse.body.accessToken;

      // Use new token to access protected endpoint
      const protectedResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${newAccessToken}`);

      // GREEN: Verify session maintained
      expect(protectedResponse.status).not.toBe(401);
      if (protectedResponse.body.user) {
        expect(protectedResponse.body.user.userId).toBe(testUser.userId);
      }
    });
  });

  describe('Invalid Refresh Token Tests', () => {
    // Test 2: Invalid token should return 401
    test('Should reject invalid refresh token', async () => {
      // RED: Test with invalid token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      // GREEN: Verify rejection
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid refresh token');
    });

    test('Should reject missing refresh token', async () => {
      // RED: Test without token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      // GREEN: Verify rejection
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Refresh token required');
    });

    test('Should reject malformed refresh token', async () => {
      // RED: Test with malformed JWT
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature';
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: malformedToken });

      // GREEN: Verify rejection
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid refresh token');
    });
  });

  describe('Expired Refresh Token Tests', () => {
    // Test 3: Expired refresh token handling
    test('Should handle expired refresh token', async () => {
      // Create expired refresh token
      const expiredRefreshToken = jwt.sign(
        { userId: testUser.userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '0s' }
      );

      // RED: Test with expired token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredRefreshToken });

      // GREEN: Verify proper error
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('refresh token expired');
    });

    test('Should cleanup expired tokens from database', async () => {
      // Create expired token in database
      const expiredToken = jwt.sign(
        { userId: 'expired-user', type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '0s' }
      );

      await db.collection('refresh_tokens').insertOne({
        token: expiredToken,
        userId: 'expired-user',
        expiresAt: new Date(Date.now() - 1000) // Already expired
      });

      // Trigger cleanup (if implemented)
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken });

      // Verify token removed from database
      const deletedToken = await db.collection('refresh_tokens').findOne({ token: expiredToken });
      expect(deletedToken).toBeNull();
    });
  });

  describe('Concurrent Refresh Tests', () => {
    test('Should handle concurrent refresh requests', async () => {
      // RED: Test concurrent refreshes
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: validRefreshToken })
      );

      const responses = await Promise.all(promises);

      // GREEN: All should succeed or be properly queued
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // 429 for rate limiting
        if (response.status === 200) {
          expect(response.body).toHaveProperty('accessToken');
        }
      });
    });

    test('Should prevent refresh token reuse after refresh', async () => {
      // Get new tokens
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(firstRefresh.status).toBe(200);
      const newRefreshToken = firstRefresh.body.refreshToken;

      // Try to use old refresh token
      const secondRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      // Old token should be invalid
      expect(secondRefresh.status).toBe(401);

      // New token should work
      const thirdRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken });
      
      expect(thirdRefresh.status).toBe(200);
    });
  });

  describe('Access Token Expiry Tests', () => {
    test('Should auto-refresh when access token expires', async () => {
      // Use expired access token
      const protectedRequest = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredAccessToken}`);

      // Should get 401
      expect(protectedRequest.status).toBe(401);

      // Client should then use refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(refreshResponse.status).toBe(200);
      
      // Use new access token
      const retryRequest = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`);

      expect(retryRequest.status).not.toBe(401);
    });
  });

  // REFACTOR: Extract helper functions
  const refreshToken = async (token) => {
    return request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: token });
  };

  const verifyTokenValid = (token, secret = process.env.JWT_SECRET || 'test-secret') => {
    try {
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      return null;
    }
  };

  describe('Refactored Tests with Helpers', () => {
    test('Helper: Quick refresh validation', async () => {
      const response = await refreshToken(validRefreshToken);
      expect(response.status).toBe(200);
      
      const decoded = verifyTokenValid(response.body.accessToken);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toBe(testUser.userId);
    });

    test('Helper: Batch token validation', async () => {
      const tokens = [
        validRefreshToken,
        'invalid-token',
        null,
        undefined
      ];

      const results = await Promise.all(
        tokens.map(token => 
          refreshToken(token)
            .then(res => ({ status: res.status, valid: res.status === 200 }))
        )
      );

      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(false);
      expect(results[3].valid).toBe(false);
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.collection('users').deleteOne({ userId: 'refresh-test-user' });
      await db.collection('refresh_tokens').deleteMany({ 
        userId: { $in: ['refresh-test-user', 'expired-user'] }
      });
    }
    if (connection) {
      await connection.close();
    }
  });
});