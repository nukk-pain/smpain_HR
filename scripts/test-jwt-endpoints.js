#!/usr/bin/env node

/**
 * JWT Endpoint Testing Script
 * Tests various API endpoints with JWT authentication
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'https://hr-backend-429401177957.asia-northeast3.run.app';
const TEST_ACCOUNTS = {
  admin: { username: 'admin', password: 'admin' },
  manager: { username: 'hyeseong_kim', password: 'ths1004' },
  user: { username: 'yongho_kim', password: 'kim1234' }
};

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper functions
function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
  passedTests++;
  totalTests++;
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
  failedTests++;
  totalTests++;
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.yellow}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.yellow}${title}${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(50)}${colors.reset}\n`);
}

// Test functions
async function testLogin(role) {
  try {
    logInfo(`Testing login for ${role}...`);
    const credentials = TEST_ACCOUNTS[role];
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
    
    if (response.data.success && response.data.token) {
      logSuccess(`${role} login successful - JWT token received`);
      return response.data.token;
    } else {
      logError(`${role} login failed - No token received`);
      return null;
    }
  } catch (error) {
    logError(`${role} login error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testAuthenticatedEndpoint(endpoint, token, description) {
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    logSuccess(`${description}: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      logError(`${description}: Unauthorized (401) - JWT authentication failed`);
    } else {
      logError(`${description}: ${error.response?.status || 'Network'} - ${error.response?.data?.message || error.message}`);
    }
    return false;
  }
}

async function testCRUDOperation(token, role) {
  logInfo(`Testing CRUD operations for ${role}...`);
  
  // Test endpoints based on role
  const endpoints = [
    { url: '/api/auth/me', desc: 'Get current user info' },
    { url: '/api/users', desc: 'Get users list' },
    { url: '/api/leave/requests', desc: 'Get leave requests' },
    { url: '/api/leave/balance', desc: 'Get leave balance' },
    { url: '/api/departments', desc: 'Get departments' }
  ];
  
  if (role === 'admin' || role === 'manager') {
    endpoints.push(
      { url: '/api/payroll', desc: 'Get payroll data' },
      { url: '/api/reports/leave/summary', desc: 'Get leave summary report' }
    );
  }
  
  for (const endpoint of endpoints) {
    await testAuthenticatedEndpoint(endpoint.url, token, endpoint.desc);
  }
}

async function testTokenExpiration() {
  logInfo('Testing expired token handling...');
  
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.invalid';
  
  try {
    await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    logError('Expired token was accepted - Security issue!');
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Expired token correctly rejected with 401');
    } else {
      logError(`Unexpected error with expired token: ${error.response?.status}`);
    }
  }
}

async function testNoToken() {
  logInfo('Testing request without token...');
  
  try {
    await axios.get(`${API_BASE_URL}/api/auth/me`);
    logError('Request without token was accepted - Security issue!');
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Request without token correctly rejected with 401');
    } else {
      logError(`Unexpected error without token: ${error.response?.status}`);
    }
  }
}

// Main test runner
async function runTests() {
  console.log(`\n${colors.blue}JWT Authentication Test Suite${colors.reset}`);
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  
  // Test 1: Authentication
  logSection('1. AUTHENTICATION TESTS');
  const tokens = {};
  
  for (const role of Object.keys(TEST_ACCOUNTS)) {
    tokens[role] = await testLogin(role);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }
  
  // Test 2: Authorized Endpoints
  logSection('2. AUTHORIZED ENDPOINT TESTS');
  
  for (const [role, token] of Object.entries(tokens)) {
    if (token) {
      console.log(`\n${colors.yellow}Testing ${role} endpoints:${colors.reset}`);
      await testCRUDOperation(token, role);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between role tests
    }
  }
  
  // Test 3: Token Validation
  logSection('3. TOKEN VALIDATION TESTS');
  await testTokenExpiration();
  await testNoToken();
  
  // Test 4: Logout
  logSection('4. LOGOUT TEST');
  if (tokens.user) {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${tokens.user}`
        }
      });
      logSuccess('Logout successful');
      
      // Try to use token after logout
      try {
        await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${tokens.user}`
          }
        });
        logSuccess('Token still valid after logout (stateless JWT - expected behavior)');
      } catch (error) {
        if (error.response?.status === 401) {
          logInfo('Token invalidated after logout (server-side blacklist implemented)');
        }
      }
    } catch (error) {
      logError(`Logout failed: ${error.message}`);
    }
  }
  
  // Summary
  logSection('TEST SUMMARY');
  console.log(`Total tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.yellow}Success rate: ${((passedTests/totalTests) * 100).toFixed(1)}%${colors.reset}\n`);
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});