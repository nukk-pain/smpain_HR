const axios = require('axios');

async function testRefreshFlow() {
  try {
    // 1. Login to get tokens
    console.log('1. Logging in to get initial tokens...');
    const loginRes = await axios.post('http://localhost:5444/api/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginRes.data.token || loginRes.data.accessToken;
    const refreshToken = loginRes.data.refreshToken;
    
    console.log('Login successful:', {
      hasAccessToken: Boolean(token),
      hasRefreshToken: Boolean(refreshToken),
      tokenLength: token ? token.length : 0
    });
    
    if (!refreshToken) {
      console.log('No refresh token received - backend may not have USE_REFRESH_TOKENS enabled');
      console.log('Setting USE_REFRESH_TOKENS=true in backend .env will enable dual token mode');
      return;
    }
    
    // 2. Try to refresh
    console.log('\n2. Testing refresh endpoint...');
    const refreshRes = await axios.post('http://localhost:5444/api/auth/refresh', {
      refreshToken: refreshToken
    });
    
    console.log('Refresh successful:', {
      hasNewAccessToken: Boolean(refreshRes.data.accessToken),
      hasNewRefreshToken: Boolean(refreshRes.data.refreshToken)
    });
    
    // 3. Use new token
    console.log('\n3. Testing new token...');
    const testRes = await axios.get('http://localhost:5444/api/users/profile', {
      headers: {
        'Authorization': 'Bearer ' + refreshRes.data.accessToken
      }
    });
    
    console.log('New token works! User:', testRes.data.username);
    console.log('\n✅ Token refresh flow is working correctly!');
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testRefreshFlow();