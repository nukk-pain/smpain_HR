const axios = require('axios');

const API_BASE = 'http://localhost:5455/api';

async function login() {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin',
    password: 'admin'
  });
  return response.data.token;
}

async function addTestUsers(token) {
  const testUsers = [
    { username: 'hong', password: 'test123', name: '홍길동', department: '물리치료', role: 'user' },
    { username: 'kim', password: 'test123', name: '김철수', department: '간호', role: 'user' },
    { username: 'park', password: 'test123', name: '박영희', department: '원무', role: 'user' }
  ];
  
  for (const user of testUsers) {
    try {
      await axios.post(`${API_BASE}/users`, user, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Added user: ${user.name}`);
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log(`⚠️ User already exists: ${user.name}`);
      } else {
        console.error(`❌ Failed to add ${user.name}:`, error.response?.data);
      }
    }
  }
}

async function main() {
  const token = await login();
  await addTestUsers(token);
  console.log('✅ Test users ready');
}

main().catch(console.error);
