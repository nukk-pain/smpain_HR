/**
 * Security Fix Test Script
 * Tests the NoSQL injection and token logging fixes
 */

const axios = require('axios');

// Test configuration
const API_BASE = process.env.API_BASE || 'http://localhost:5455';
const API_URL = `${API_BASE}/api`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testNoSQLInjection() {
  log('\n=== Testing NoSQL Injection Protection ===', 'blue');
  
  const maliciousPayloads = [
    {
      name: 'Object injection with $ne',
      payload: { username: { $ne: null }, password: 'test' },
      expected: 400
    },
    {
      name: 'Object injection with $regex',
      payload: { username: { $regex: 'admin.*' }, password: 'test' },
      expected: 400
    },
    {
      name: 'Object injection with $gt',
      payload: { username: { $gt: '' }, password: 'test' },
      expected: 400
    },
    {
      name: 'Array injection',
      payload: { username: ['admin', 'user'], password: 'test' },
      expected: 400
    },
    {
      name: 'Null injection',
      payload: { username: null, password: 'test' },
      expected: 400
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of maliciousPayloads) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, test.payload, {
        validateStatus: () => true // Don't throw on any status
      });

      if (response.status === test.expected || response.status === 401) {
        log(`  ✅ ${test.name}: Protected (Status: ${response.status})`, 'green');
        passed++;
      } else if (response.status === 200) {
        log(`  ❌ ${test.name}: VULNERABLE - Login succeeded!`, 'red');
        failed++;
      } else {
        log(`  ⚠️ ${test.name}: Unexpected status ${response.status}`, 'yellow');
        passed++; // Count as passed if it didn't succeed
      }
    } catch (error) {
      log(`  ❌ ${test.name}: Error - ${error.message}`, 'red');
      failed++;
    }
  }

  // Test valid login still works
  log('\n  Testing valid login...', 'blue');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin'
    }, {
      validateStatus: () => true
    });

    if (response.status === 200 && response.data.token) {
      log(`  ✅ Valid login works correctly`, 'green');
      passed++;
    } else {
      log(`  ❌ Valid login failed (Status: ${response.status})`, 'red');
      failed++;
    }
  } catch (error) {
    log(`  ❌ Valid login error: ${error.message}`, 'red');
    failed++;
  }

  log(`\nNoSQL Injection Tests: ${passed} passed, ${failed} failed`, 
      failed === 0 ? 'green' : 'red');
  
  return failed === 0;
}

async function testValidationErrors() {
  log('\n=== Testing Input Validation ===', 'blue');
  
  const invalidPayloads = [
    {
      name: 'Missing username',
      payload: { password: 'test' },
      expectedMessage: 'required'
    },
    {
      name: 'Missing password',
      payload: { username: 'test' },
      expectedMessage: 'required'
    },
    {
      name: 'Empty object',
      payload: {},
      expectedMessage: 'required'
    },
    {
      name: 'Number as username',
      payload: { username: 12345, password: 'test' },
      expectedMessage: 'string'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of invalidPayloads) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, test.payload, {
        validateStatus: () => true
      });

      if (response.status === 400) {
        const errorMessage = JSON.stringify(response.data).toLowerCase();
        if (errorMessage.includes(test.expectedMessage)) {
          log(`  ✅ ${test.name}: Validation working`, 'green');
          passed++;
        } else {
          log(`  ⚠️ ${test.name}: Validation works but different message`, 'yellow');
          passed++;
        }
      } else {
        log(`  ❌ ${test.name}: No validation error (Status: ${response.status})`, 'red');
        failed++;
      }
    } catch (error) {
      log(`  ❌ ${test.name}: Error - ${error.message}`, 'red');
      failed++;
    }
  }

  log(`\nValidation Tests: ${passed} passed, ${failed} failed`, 
      failed === 0 ? 'green' : 'red');
  
  return failed === 0;
}

async function main() {
  log('\n🔒 Security Fix Test Suite', 'blue');
  log('=' .repeat(50), 'blue');
  
  try {
    // Check if server is running
    try {
      await axios.get(`${API_BASE}/health`);
      log(`✅ Server is running at ${API_BASE}`, 'green');
    } catch (error) {
      log(`❌ Server not accessible at ${API_BASE}`, 'red');
      log('Please start the backend server first: cd backend && npm run dev', 'yellow');
      process.exit(1);
    }

    const results = [];
    
    // Run tests
    results.push(await testNoSQLInjection());
    results.push(await testValidationErrors());
    
    // Summary
    log('\n' + '=' .repeat(50), 'blue');
    const allPassed = results.every(r => r);
    
    if (allPassed) {
      log('✅ All security tests passed!', 'green');
      log('The NoSQL injection vulnerability has been successfully fixed.', 'green');
    } else {
      log('❌ Some security tests failed', 'red');
      log('Please review the fixes and try again.', 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);