const axios = require('axios');

const API_BASE = 'http://localhost:5455/api';

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
};

async function testIncentiveAPI() {
  try {
    console.log('🔐 Logging in as admin...');
    console.log(`   URL: ${API_BASE}/auth/login`);
    console.log(`   Credentials:`, ADMIN_CREDENTIALS);
    
    // Login to get token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, ADMIN_CREDENTIALS);
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Set authorization header
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // Test 1: Get incentive types
    console.log('\n📋 Test 1: Getting incentive types...');
    const typesResponse = await axios.get(`${API_BASE}/incentive/types`, config);
    console.log('✅ Incentive types:', typesResponse.data.data);

    // Test 2: Get users to find a test user
    console.log('\n👥 Getting users list...');
    const usersResponse = await axios.get(`${API_BASE}/users`, config);
    const users = usersResponse.data.data;
    const testUser = users.find(u => u.username !== 'admin') || users[0];
    console.log(`✅ Selected test user: ${testUser.name} (${testUser._id})`);

    // Test 3: Get user's current incentive config
    console.log(`\n📊 Test 2: Getting incentive config for ${testUser.name}...`);
    try {
      const configResponse = await axios.get(`${API_BASE}/incentive/config/${testUser._id}`, config);
      console.log('✅ Current config:', configResponse.data.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ No incentive config found for user (expected for new setup)');
      } else {
        throw error;
      }
    }

    // Test 4: Save incentive config
    console.log(`\n💾 Test 3: Saving incentive config for ${testUser.name}...`);
    const newConfig = {
      type: 'PERSONAL_PERCENT',
      parameters: {
        rate: 0.05,
        minAmount: 0,
        maxAmount: 1000000
      },
      isActive: true
    };
    
    const saveResponse = await axios.put(
      `${API_BASE}/incentive/config/${testUser._id}`,
      newConfig,
      config
    );
    console.log('✅ Config saved:', saveResponse.data.message);

    // Test 5: Calculate incentive
    console.log('\n🧮 Test 4: Calculating incentive...');
    const calculationData = {
      userId: testUser._id,
      salesData: {
        personal: 10000000,
        total: 50000000
      },
      yearMonth: '2025-01'
    };
    
    const calcResponse = await axios.post(
      `${API_BASE}/incentive/calculate`,
      calculationData,
      config
    );
    console.log('✅ Calculation result:', calcResponse.data.data);

    // Test 6: Simulate incentive
    console.log('\n🔬 Test 5: Simulating incentive...');
    const simulationData = {
      config: {
        type: 'PERSONAL_EXCESS',
        parameters: {
          threshold: 5000000,
          rate: 0.1,
          minAmount: 0,
          maxAmount: 2000000
        }
      },
      salesData: {
        personal: 8000000,
        total: 30000000
      }
    };
    
    const simResponse = await axios.post(
      `${API_BASE}/incentive/simulate`,
      simulationData,
      config
    );
    console.log('✅ Simulation result:', simResponse.data.data);

    console.log('\n🎉 All incentive API tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testIncentiveAPI();