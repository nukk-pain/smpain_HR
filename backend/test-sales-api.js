require('dotenv').config();
const axios = require('axios');

// Change these values as needed
const API_BASE = process.env.API_BASE_URL || 'http://[::1]:5455';
const USERNAME = 'admin';  // admin account
const PASSWORD = 'admin';   // admin password

async function testSalesAPI() {
  try {
    console.log('=== Testing Sales API ===\n');
    console.log('API Base:', API_BASE);
    
    // Step 1: Login to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: USERNAME,
      password: PASSWORD
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log('User:', user.name, '- Role:', user.role);
    console.log('Token received:', token ? 'Yes' : 'No');
    console.log('');
    
    // Configure axios with token
    const api = axios.create({
      baseURL: `${API_BASE}/api`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Step 2: Test saving sales data
    const testYearMonth = '2025-01';
    const testPayload = {
      yearMonth: testYearMonth,
      companySales: {
        total_amount: 50000000,  // 50 million won
        notes: 'Test sales data'
      },
      individualSales: [
        {
          user_id: user._id || user.id,  // Use admin's own ID for testing
          individual_sales: 5000000,  // 5 million won
          notes: 'Test individual sales'
        }
      ]
    };
    
    console.log('2. Testing POST /api/sales/bulk');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    try {
      const saveResponse = await api.post('/sales/bulk', testPayload);
      console.log('✅ Save successful');
      console.log('Response:', JSON.stringify(saveResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Save failed');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Error:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
    }
    
    console.log('');
    
    // Step 3: Test loading saved data
    console.log('3. Testing GET /api/sales/company/' + testYearMonth);
    try {
      const companyResponse = await api.get(`/sales/company/${testYearMonth}`);
      console.log('✅ Load company sales successful');
      console.log('Response:', JSON.stringify(companyResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Load company sales failed');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Error:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
    }
    
    console.log('');
    
    console.log('4. Testing GET /api/sales/individual/' + testYearMonth);
    try {
      const individualResponse = await api.get(`/sales/individual/${testYearMonth}`);
      console.log('✅ Load individual sales successful');
      console.log('Response:', JSON.stringify(individualResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Load individual sales failed');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Error:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSalesAPI();