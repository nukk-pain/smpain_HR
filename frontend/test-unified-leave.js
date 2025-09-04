// Test script for UnifiedLeaveOverview functionality
// Run this script to test the refactored components

const testResults = {
  passed: [],
  failed: [],
  pending: []
};

// Test configuration
const config = {
  frontendUrl: 'http://localhost:3727',
  backendUrl: 'http://localhost:3001',
  adminCredentials: { username: 'admin', password: 'admin' },
  testTimeout: 30000
};

// Helper function to log test results
function logTest(category, test, status, details = '') {
  const result = `[${category}] ${test}: ${status}`;
  console.log(result);
  if (details) console.log(`  Details: ${details}`);
  
  if (status === 'PASS') {
    testResults.passed.push({ category, test });
  } else if (status === 'FAIL') {
    testResults.failed.push({ category, test, details });
  } else {
    testResults.pending.push({ category, test });
  }
}

// Helper to make API requests
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${config.backendUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response;
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

// Test 1: Backend Health Check
async function testBackendHealth() {
  try {
    const response = await apiRequest('/api/health');
    if (response.ok) {
      logTest('Infrastructure', 'Backend health check', 'PASS');
      return true;
    }
    logTest('Infrastructure', 'Backend health check', 'FAIL', `Status: ${response.status}`);
    return false;
  } catch (error) {
    logTest('Infrastructure', 'Backend health check', 'FAIL', error.message);
    return false;
  }
}

// Test 2: Admin Login
async function testAdminLogin() {
  try {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(config.adminCredentials)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        logTest('Authentication', 'Admin login', 'PASS');
        return data.token;
      }
    }
    logTest('Authentication', 'Admin login', 'FAIL', 'No token received');
    return null;
  } catch (error) {
    logTest('Authentication', 'Admin login', 'FAIL', error.message);
    return null;
  }
}

// Test 3: Leave Overview API
async function testLeaveOverviewAPI(token) {
  try {
    const year = new Date().getFullYear();
    const response = await apiRequest(`/api/leave/overview?year=${year}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('API', 'Leave overview endpoint', 'PASS', `${data.length} employees found`);
      return data;
    }
    logTest('API', 'Leave overview endpoint', 'FAIL', `Status: ${response.status}`);
    return null;
  } catch (error) {
    logTest('API', 'Leave overview endpoint', 'FAIL', error.message);
    return null;
  }
}

// Test 4: Team Status API
async function testTeamStatusAPI(token) {
  try {
    const year = new Date().getFullYear();
    const response = await apiRequest(`/api/leave/team-status?year=${year}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('API', 'Team status endpoint', 'PASS', `${data.length} team members found`);
      return data;
    }
    logTest('API', 'Team status endpoint', 'FAIL', `Status: ${response.status}`);
    return null;
  } catch (error) {
    logTest('API', 'Team status endpoint', 'FAIL', error.message);
    return null;
  }
}

// Test 5: Departments API
async function testDepartmentsAPI(token) {
  try {
    const response = await apiRequest('/api/departments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('API', 'Departments endpoint', 'PASS', `${data.length} departments found`);
      return data;
    }
    logTest('API', 'Departments endpoint', 'FAIL', `Status: ${response.status}`);
    return null;
  } catch (error) {
    logTest('API', 'Departments endpoint', 'FAIL', error.message);
    return null;
  }
}

// Test 6: Data Consistency
function testDataConsistency(overviewData, teamData) {
  if (!overviewData || !teamData) {
    logTest('Data', 'Data consistency check', 'SKIP', 'Missing data');
    return;
  }
  
  // Check if employee IDs match between overview and team data
  const overviewIds = new Set(overviewData.map(e => e._id || e.id));
  const teamIds = new Set(teamData.map(e => e._id || e.id));
  
  let consistent = true;
  teamIds.forEach(id => {
    if (!overviewIds.has(id)) {
      consistent = false;
    }
  });
  
  if (consistent) {
    logTest('Data', 'Data consistency check', 'PASS');
  } else {
    logTest('Data', 'Data consistency check', 'FAIL', 'Mismatched employee IDs');
  }
}

// Test 7: Field Validation
function testFieldValidation(data) {
  if (!data || data.length === 0) {
    logTest('Data', 'Field validation', 'SKIP', 'No data to validate');
    return;
  }
  
  const requiredFields = ['name', 'department', 'totalAnnualLeave', 'usedAnnualLeave', 'remainingAnnualLeave'];
  let allFieldsPresent = true;
  
  data.slice(0, 5).forEach(item => {
    requiredFields.forEach(field => {
      if (!(field in item)) {
        allFieldsPresent = false;
        logTest('Data', `Field validation - ${field}`, 'FAIL', `Missing in employee data`);
      }
    });
  });
  
  if (allFieldsPresent) {
    logTest('Data', 'Field validation', 'PASS');
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('UnifiedLeaveOverview Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing at: ${new Date().toLocaleString()}`);
  console.log(`Frontend: ${config.frontendUrl}`);
  console.log(`Backend: ${config.backendUrl}`);
  console.log('='.repeat(60));
  
  // Run infrastructure tests
  const backendOk = await testBackendHealth();
  if (!backendOk) {
    console.log('\n❌ Backend is not running. Please start the backend server.');
    return;
  }
  
  // Run authentication tests
  const token = await testAdminLogin();
  if (!token) {
    console.log('\n❌ Admin login failed. Cannot continue with API tests.');
    return;
  }
  
  // Run API tests
  const overviewData = await testLeaveOverviewAPI(token);
  const teamData = await testTeamStatusAPI(token);
  const departments = await testDepartmentsAPI(token);
  
  // Run data validation tests
  testDataConsistency(overviewData, teamData);
  testFieldValidation(overviewData);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⏭️ Skipped: ${testResults.pending.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\nFailed Tests:');
    testResults.failed.forEach(test => {
      console.log(`  - [${test.category}] ${test.test}: ${test.details}`);
    });
  }
  
  // Create test report
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      frontend: config.frontendUrl,
      backend: config.backendUrl
    },
    results: testResults,
    summary: {
      total: testResults.passed.length + testResults.failed.length + testResults.pending.length,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      skipped: testResults.pending.length
    }
  };
  
  console.log('\n📋 Test report saved to: test-results-unified-leave.json');
  require('fs').writeFileSync('test-results-unified-leave.json', JSON.stringify(report, null, 2));
}

// Run the tests
runTests().catch(console.error);