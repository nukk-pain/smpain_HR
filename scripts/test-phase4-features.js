#!/usr/bin/env node

/**
 * Phase 4 Features Testing Script
 * Tests refresh tokens and token blacklisting
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'https://hr-backend-429401177957.asia-northeast3.run.app';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
  testResults.passed++;
  testResults.total++;
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
  testResults.failed++;
  testResults.total++;
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}${title}${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

async function testRefreshTokensDisabled() {
  logInfo('Testing with refresh tokens disabled (default mode)');
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    if (response.data.token && !response.data.refreshToken) {
      logSuccess('Legacy mode: Single token returned, no refresh token');
      return response.data.token;
    } else {
      logError('Legacy mode: Expected single token, got refresh token');
      return null;
    }
  } catch (error) {
    logError(`Legacy mode login failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testRefreshTokensEnabled() {
  logInfo('Testing with refresh tokens enabled');
  
  // Set environment variable for refresh tokens (this would be set on the server)
  logInfo('Note: USE_REFRESH_TOKENS=true should be set on the server for this test');
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    if (response.data.accessToken && response.data.refreshToken) {
      logSuccess('Refresh mode: Both access and refresh tokens returned');
      return {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken
      };
    } else if (response.data.token && !response.data.refreshToken) {
      logInfo('Server is still in legacy mode (USE_REFRESH_TOKENS not enabled)');
      return { accessToken: response.data.token, refreshToken: null };
    } else {
      logError('Unexpected token response format');
      return null;
    }
  } catch (error) {
    logError(`Refresh mode login failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testRefreshEndpoint(refreshToken) {
  if (!refreshToken) {
    logInfo('Skipping refresh test - no refresh token available');
    return null;
  }
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken: refreshToken
    });
    
    if (response.data.accessToken) {
      logSuccess('Token refresh successful');
      return response.data.accessToken;
    } else {
      logError('Token refresh failed - no access token returned');
      return null;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      logInfo('Refresh endpoint returned 401 (expected if refresh tokens not implemented)');
    } else {
      logError(`Token refresh failed: ${error.response?.data?.error || error.message}`);
    }
    return null;
  }
}

async function testTokenBlacklisting(token) {
  if (!token) {
    logInfo('Skipping blacklist test - no token available');
    return;
  }
  
  logInfo('Testing token blacklisting (logout)');
  
  try {
    // First, test that token works
    const testResponse = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (testResponse.status === 200) {
      logSuccess('Token works before logout');
      
      // Now logout (which should blacklist token if enabled)
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      logSuccess('Logout successful');
      
      // Test if token still works (should fail if blacklisting enabled)
      try {
        await axios.get(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        logInfo('Token still works after logout (blacklisting not enabled)');
      } catch (error) {
        if (error.response?.status === 401) {
          logSuccess('Token correctly rejected after logout (blacklisting enabled)');
        } else {
          logError(`Unexpected error after logout: ${error.message}`);
        }
      }
    } else {
      logError('Token did not work before logout test');
    }
  } catch (error) {
    logError(`Blacklist test failed: ${error.response?.data?.error || error.message}`);
  }
}

async function testEndpointsWithNewUsers() {
  logInfo('Testing API endpoints with new user accounts');
  
  const testAccounts = [
    { username: 'hyeseong_kim', password: 'ths1004', role: 'manager' },
    { username: 'yongho_kim', password: 'kim1234', role: 'user' }
  ];
  
  for (const account of testAccounts) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, account);
      
      if (response.data.token) {
        logSuccess(`${account.role} login successful: ${account.username}`);
        
        // Test a few endpoints
        const token = response.data.token;
        
        try {
          await axios.get(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          logSuccess(`${account.role} can access /api/auth/me`);
        } catch (error) {
          logError(`${account.role} cannot access /api/auth/me: ${error.response?.status}`);
        }
        
        try {
          await axios.get(`${API_URL}/api/leave/balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          logSuccess(`${account.role} can access /api/leave/balance`);
        } catch (error) {
          logError(`${account.role} cannot access /api/leave/balance: ${error.response?.status}`);
        }
      }
    } catch (error) {
      logError(`${account.role} login failed: ${error.response?.data?.error || error.message}`);
    }
  }
}

async function main() {
  console.log(`${colors.blue}Phase 4 Features Testing Suite${colors.reset}`);
  console.log(`API Base URL: ${API_URL}\n`);
  
  // Test 1: Legacy Mode (Refresh Tokens Disabled)
  logSection('1. LEGACY JWT MODE TEST');
  const legacyToken = await testRefreshTokensDisabled();
  
  // Test 2: Refresh Token Mode
  logSection('2. REFRESH TOKEN MODE TEST');
  const tokenPair = await testRefreshTokensEnabled();
  
  // Test 3: Refresh Endpoint
  logSection('3. TOKEN REFRESH TEST');
  const newToken = await testRefreshEndpoint(tokenPair?.refreshToken);
  
  // Test 4: Token Blacklisting
  logSection('4. TOKEN BLACKLISTING TEST');
  await testTokenBlacklisting(legacyToken);
  
  // Test 5: New User Accounts
  logSection('5. NEW USER ACCOUNTS TEST');
  await testEndpointsWithNewUsers();
  
  // Summary
  logSection('TEST SUMMARY');
  console.log(`Total tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}Success rate: ${((testResults.passed/testResults.total) * 100).toFixed(1)}%${colors.reset}`);
  
  if (testResults.failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}ℹ Some tests failed, but this may be expected if Phase 4 features are not enabled${colors.reset}\n`);
  }
  
  // Configuration notes
  console.log(`${colors.blue}Configuration Notes:${colors.reset}`);
  console.log('- Set USE_REFRESH_TOKENS=true to enable refresh token mode');
  console.log('- Set ENABLE_TOKEN_BLACKLIST=true to enable logout token invalidation');
  console.log('- These features are optional enhancements (Phase 4)');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});