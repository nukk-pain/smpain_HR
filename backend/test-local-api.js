/**
 * Test local API with JWT authentication
 */

require('dotenv').config({ path: '.env.development' });
const jwt = require('jsonwebtoken');
const axios = require('axios');

const API_URL = 'http://localhost:5455'; // Adjust port if needed

// Create test token
const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
const adminToken = jwt.sign(
  { 
    id: '507f1f77bcf86cd799439011',
    username: 'admin',
    name: 'Test Admin',
    role: 'Admin',
    permissions: ['users:view', 'users:manage', 'users:delete']
  },
  secret,
  { 
    expiresIn: '24h',
    issuer: 'hr-system',
    audience: 'hr-frontend'
  }
);

console.log('Testing local API with JWT token...');
console.log('API URL:', API_URL);
console.log('Token:', adminToken.substring(0, 50) + '...\n');

// Test users API
async function testUsersAPI() {
  try {
    console.log('Testing GET /api/users...');
    const response = await axios.get(`${API_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log('✅ Users API Response Status:', response.status);
    console.log('✅ Response has users:', Array.isArray(response.data) || !!response.data.users);
    return true;
  } catch (error) {
    console.error('❌ Users API Error:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

// Test leave pending API
async function testLeavePendingAPI() {
  try {
    console.log('\nTesting GET /api/leave/pending...');
    const response = await axios.get(`${API_URL}/api/leave/pending`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log('✅ Leave Pending API Response Status:', response.status);
    console.log('✅ Response data:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Leave Pending API Error:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  const usersResult = await testUsersAPI();
  const leaveResult = await testLeavePendingAPI();
  
  console.log('\n📊 Test Results:');
  console.log('Users API:', usersResult ? '✅ PASSED' : '❌ FAILED');
  console.log('Leave Pending API:', leaveResult ? '✅ PASSED' : '❌ FAILED');
  
  if (usersResult && leaveResult) {
    console.log('\n🎉 All tests passed! JWT authentication is working.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
}

runTests().catch(console.error);