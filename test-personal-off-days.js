const axios = require('axios');

const baseURL = 'http://localhost:5455';

// Test data
const testLeaveRequest = {
  leaveType: 'annual',
  startDate: '2025-01-27', // Monday
  endDate: '2025-01-31',   // Friday
  reason: 'Test personal off days feature',
  substituteEmployee: '',
  personalOffDays: ['2025-01-29'] // Wednesday as personal off day
};

async function testPersonalOffDays() {
  try {
    console.log('🧪 Testing Personal Off Days Feature');
    console.log('=====================================');
    
    // First, login as admin to get session
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, {
      withCredentials: true
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    
    console.log('✅ Login successful');
    
    // Create a leave request with personal off days
    console.log('2. Creating leave request with personal off days...');
    console.log('Request data:', JSON.stringify(testLeaveRequest, null, 2));
    
    const createResponse = await axios.post(`${baseURL}/api/leave`, testLeaveRequest, {
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Leave request created successfully');
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));
    
    const leaveRequestId = createResponse.data.data.id || createResponse.data.data._id;
    
    // Get the created leave request to verify data
    console.log('3. Retrieving created leave request...');
    const getResponse = await axios.get(`${baseURL}/api/leave/${leaveRequestId}`, {
      headers: {
        'Cookie': cookieHeader
      }
    });
    
    console.log('✅ Leave request retrieved successfully');
    console.log('Retrieved data:', JSON.stringify(getResponse.data.data, null, 2));
    
    // Verify the personal off days are stored correctly
    const retrievedRequest = getResponse.data.data;
    if (retrievedRequest.personalOffDays && retrievedRequest.personalOffDays.length > 0) {
      console.log('✅ Personal off days stored correctly:', retrievedRequest.personalOffDays);
    } else {
      console.log('❌ Personal off days not found in response');
    }
    
    // Check if actualLeaveDays is calculated correctly
    if (retrievedRequest.actualLeaveDays !== undefined) {
      console.log('✅ Actual leave days calculated:', retrievedRequest.actualLeaveDays);
    } else {
      console.log('❌ Actual leave days not calculated');
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('Authentication failed - check if admin user exists');
    }
  }
}

// Run the test
testPersonalOffDays();