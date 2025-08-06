/**
 * Quick test to verify JWT authentication works
 */

const jwt = require('jsonwebtoken');

// Test JWT token creation and verification
const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';

const testPayload = { 
  id: '123456789', 
  username: 'testuser', 
  role: 'Admin',
  permissions: ['users:view', 'users:manage']
};

console.log('Creating test token...');
const token = jwt.sign(testPayload, secret, { 
  expiresIn: '24h',
  issuer: 'hr-system',
  audience: 'hr-frontend'
});

console.log('Token created successfully');
console.log('Token:', token.substring(0, 50) + '...');

try {
  console.log('\nVerifying token...');
  const decoded = jwt.verify(token, secret, {
    issuer: 'hr-system',
    audience: 'hr-frontend'
  });
  
  console.log('✅ Token verified successfully!');
  console.log('Decoded payload:', decoded);
  
  // Test the extractTokenFromHeader function
  const { extractTokenFromHeader } = require('../../utils/jwt');
  const authHeader = `Bearer ${token}`;
  const extracted = extractTokenFromHeader(authHeader);
  
  console.log('\n✅ Token extraction successful!');
  console.log('Extracted token matches:', extracted === token);
  
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
  process.exit(1);
}

console.log('\n✅ All JWT tests passed!');
process.exit(0);