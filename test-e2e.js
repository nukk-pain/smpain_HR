const http = require('http');

// Test data
const tests = {
  supervisorLogin: {
    username: '임정수',
    password: 'test123'
  },
  adminLogin: {
    username: 'admin', 
    password: 'admin'
  }
};

// Helper function to make HTTP requests
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting E2E Tests\n');
  
  // Test 1: Admin Login
  console.log('1. Testing Admin Login...');
  const adminLogin = await makeRequest({
    hostname: 'localhost',
    port: 5455,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, tests.adminLogin);
  
  if (adminLogin.status === 200 && adminLogin.data.token) {
    console.log('✅ Admin login successful');
    const adminToken = adminLogin.data.token;
    
    // Test Admin Payroll Access
    console.log('2. Testing Admin Payroll Access...');
    const adminPayroll = await makeRequest({
      hostname: 'localhost',
      port: 5455,
      path: '/api/payroll',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log(`   Status: ${adminPayroll.status}`);
    if (adminPayroll.status === 200) {
      console.log('✅ Admin can access payroll\n');
    } else {
      console.log('❌ Admin payroll access failed\n');
    }
  } else {
    console.log('❌ Admin login failed\n');
  }
  
  // Test 2: Supervisor Login
  console.log('3. Testing Supervisor Login...');
  const supervisorLogin = await makeRequest({
    hostname: 'localhost',
    port: 5455,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, tests.supervisorLogin);
  
  if (supervisorLogin.status === 200 && supervisorLogin.data.token) {
    console.log('✅ Supervisor login successful');
    const supervisorToken = supervisorLogin.data.token;
    
    // Test Supervisor Payroll Block
    console.log('4. Testing Supervisor Payroll Block...');
    const supervisorPayroll = await makeRequest({
      hostname: 'localhost',
      port: 5455,
      path: '/api/payroll',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supervisorToken}`
      }
    });
    
    console.log(`   Status: ${supervisorPayroll.status}`);
    if (supervisorPayroll.status === 403 || supervisorPayroll.status === 401) {
      console.log('✅ Supervisor is blocked from payroll (Expected behavior)\n');
    } else if (supervisorPayroll.status === 200) {
      console.log('❌ CRITICAL: Supervisor can access payroll (Should be blocked!)\n');
    } else {
      console.log(`⚠️  Unexpected status: ${supervisorPayroll.status}\n`);
    }
    
    // Test Supervisor Leave Access
    console.log('5. Testing Supervisor Leave Access...');
    const supervisorLeave = await makeRequest({
      hostname: 'localhost',
      port: 5455,
      path: '/api/leave/requests',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supervisorToken}`
      }
    });
    
    console.log(`   Status: ${supervisorLeave.status}`);
    if (supervisorLeave.status === 200) {
      console.log('✅ Supervisor can access leave requests\n');
    } else {
      console.log('❌ Supervisor cannot access leave requests\n');
    }
  } else {
    console.log('❌ Supervisor login failed');
    console.log('   Response:', supervisorLogin.data);
  }
  
  // Test 3: Daily Workers CRUD
  console.log('6. Testing Daily Workers (Admin)...');
  const adminLogin2 = await makeRequest({
    hostname: 'localhost',
    port: 5455,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, tests.adminLogin);
  
  if (adminLogin2.data.token) {
    const token = adminLogin2.data.token;
    
    // Get daily workers
    const dailyWorkers = await makeRequest({
      hostname: 'localhost',
      port: 5455,
      path: '/api/dailyWorkers',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${dailyWorkers.status}`);
    if (dailyWorkers.status === 200) {
      console.log('✅ Can access daily workers');
    } else {
      console.log('❌ Cannot access daily workers');
    }
  }
  
  console.log('\n📊 E2E Test Summary:');
  console.log('====================');
  console.log('✅ Tests completed. Check results above for any failures.');
}

runTests().catch(console.error);