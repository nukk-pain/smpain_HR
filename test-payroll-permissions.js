/**
 * Manual test script for payroll permission restrictions
 * Run with: node test-payroll-permissions.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test tokens (you'll need to get real tokens by logging in)
const tokens = {
  admin: '', // Add admin token here
  supervisor: '', // Add supervisor token here
  user: '' // Add user token here
};

// Endpoints to test
const endpoints = [
  { method: 'GET', path: '/payroll/', name: 'Get Payroll List' },
  { method: 'GET', path: '/bonus/2025-09', name: 'Get Bonuses' },
  { method: 'GET', path: '/sales/company/2025-09', name: 'Get Sales' },
  { method: 'GET', path: '/daily-workers/2025-09', name: 'Get Daily Workers' },
];

async function testEndpoint(endpoint, role, token) {
  try {
    const response = await axios({
      method: endpoint.method,
      url: `${API_BASE}${endpoint.path}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return { 
      success: true, 
      status: response.status,
      hasData: !!response.data 
    };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status || 'ERROR',
      message: error.response?.data?.message || error.response?.data?.error || error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Payroll Permission Restrictions\n');
  console.log('=' .repeat(60));
  
  for (const endpoint of endpoints) {
    console.log(`\n📍 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    console.log('-'.repeat(40));
    
    for (const [role, token] of Object.entries(tokens)) {
      if (!token) {
        console.log(`   ${role.padEnd(12)}: ⏭️  SKIPPED (no token)`);
        continue;
      }
      
      const result = await testEndpoint(endpoint, role, token);
      const icon = result.status === 403 ? '🚫' : 
                   result.status === 200 ? '✅' : '❌';
      const expected = role === 'admin' ? 
        (result.status !== 403 ? '✅ PASS' : '❌ FAIL') :
        (result.status === 403 ? '✅ PASS' : '❌ FAIL');
      
      console.log(`   ${role.padEnd(12)}: ${icon} ${result.status} - ${expected}`);
      if (result.message) {
        console.log(`                  Message: ${result.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Summary:');
  console.log('- Admin should have access (NOT 403)');
  console.log('- Supervisor should be denied (403)');
  console.log('- User should be denied (403)');
}

// Instructions for getting tokens
console.log('📝 Instructions:');
console.log('1. Start the backend server: npm run dev');
console.log('2. Login as each user type and get tokens:');
console.log('   - Admin: admin/admin');
console.log('   - Create a Supervisor and User account if needed');
console.log('3. Add the JWT tokens to this script');
console.log('4. Run: node test-payroll-permissions.js\n');

// Uncomment to run tests when tokens are added
// runTests();

module.exports = { runTests, testEndpoint };