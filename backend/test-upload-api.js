const axios = require('axios');

async function testAPI() {
  try {
    // First login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5455/api/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Test match-employees endpoint
    console.log('\n2. Testing match-employees endpoint...');
    try {
      const matchResponse = await axios.post(
        'http://localhost:5455/api/reports/payslip/match-employees',
        {
          fileNames: [
            { fileName: 'test1.pdf', employeeName: 'John Doe' },
            { fileName: 'test2.pdf', employeeName: 'Jane Smith' }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      console.log('✅ Match employees response:', JSON.stringify(matchResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Match employees error:', error.response?.data || error.message);
    }
    
    // Test upload-history endpoint
    console.log('\n3. Testing upload-history endpoint...');
    try {
      const historyResponse = await axios.get(
        'http://localhost:5455/api/reports/payslip/upload-history',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      console.log('✅ Upload history response:', JSON.stringify(historyResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Upload history error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testAPI();