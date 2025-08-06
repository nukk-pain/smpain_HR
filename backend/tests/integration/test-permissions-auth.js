/**
 * Test permissions.js requireAuth middleware
 */

require('dotenv').config({ path: '.env.development' });
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../../middleware/permissions');

// Create test token
const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
const token = jwt.sign(
  { 
    id: '123456789', 
    username: 'testuser', 
    role: 'Admin',
    permissions: ['users:view', 'users:manage']
  },
  secret,
  { 
    expiresIn: '24h',
    issuer: 'hr-system',
    audience: 'hr-frontend'
  }
);

console.log('Testing permissions.js requireAuth...');

// Mock request, response, and next
const req = {
  headers: {
    authorization: `Bearer ${token}`
  },
  user: null
};

const res = {
  status: function(code) {
    console.log('Response status:', code);
    return this;
  },
  json: function(data) {
    console.log('Response data:', data);
    return this;
  }
};

let nextCalled = false;
const next = () => {
  nextCalled = true;
  console.log('✅ next() called - authentication successful!');
};

// Test the middleware
console.log('Calling requireAuth middleware...');
requireAuth(req, res, next);

// Check results
setTimeout(() => {
  if (nextCalled && req.user) {
    console.log('✅ Authentication successful!');
    console.log('User set in request:', req.user);
    process.exit(0);
  } else {
    console.log('❌ Authentication failed');
    console.log('Next called:', nextCalled);
    console.log('User in request:', req.user);
    process.exit(1);
  }
}, 100);