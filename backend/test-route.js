const axios = require('axios');

async function testRoutes() {
  const API_BASE = 'http://localhost:3001';
  
  console.log('Testing available routes...\n');
  
  // Test if server is running
  try {
    const response = await axios.get(`${API_BASE}/api/auth/check`);
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is not responding');
    return;
  }
  
  // Test various endpoints
  const endpoints = [
    '/api/sales',
    '/api/sales/',
    '/api/sales/company/2025-01',
    '/api/sales/individual/2025-01',
    '/api/payroll',
    '/api/users',
    '/api/departments'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE}${endpoint}`, {
        timeout: 1000,
        validateStatus: () => true // Accept any status
      });
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
}

testRoutes();