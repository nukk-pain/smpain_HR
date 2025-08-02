#!/usr/bin/env node

/**
 * Create test users for production environment
 * This script creates manager and regular user accounts for testing
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'https://hr-backend-429401177957.asia-northeast3.run.app';

// Test users to create
const TEST_USERS = [
  {
    username: 'hyeseong_kim',
    password: 'ths1004',
    name: '김혜성',
    email: 'hyeseong.kim@company.com',
    role: 'manager',
    department: '인사팀',
    position: '과장',
    baseSalary: 4500000,
    hireDate: '2024-01-15'
  },
  {
    username: 'yongho_kim',
    password: 'kim1234',
    name: '김용호',
    email: 'yongho.kim@company.com',
    role: 'user',
    department: '개발팀',
    position: '대리',
    baseSalary: 3500000,
    hireDate: '2024-02-01'
  }
];

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function loginAsAdmin() {
  try {
    console.log(`${colors.blue}Logging in as admin...${colors.reset}`);
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    if (response.data.token) {
      console.log(`${colors.green}✓ Admin login successful${colors.reset}`);
      return response.data.token;
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    console.error(`${colors.red}✗ Admin login failed: ${error.response?.data?.error || error.message}${colors.reset}`);
    return null;
  }
}

async function createUser(userData, token) {
  try {
    console.log(`\n${colors.blue}Creating user: ${userData.username}${colors.reset}`);
    
    const response = await axios.post(`${API_URL}/api/users`, userData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`${colors.green}✓ User created successfully: ${userData.username}${colors.reset}`);
    return true;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`${colors.yellow}⚠ User already exists: ${userData.username}${colors.reset}`);
      
      // Try to update the password instead
      try {
        const users = await axios.get(`${API_URL}/api/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const existingUser = users.data.find(u => u.username === userData.username);
        if (existingUser) {
          await axios.put(`${API_URL}/api/users/${existingUser._id}`, 
            { password: userData.password },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`${colors.green}✓ Password updated for existing user: ${userData.username}${colors.reset}`);
        }
      } catch (updateError) {
        console.error(`${colors.red}✗ Failed to update password: ${updateError.response?.data?.error || updateError.message}${colors.reset}`);
      }
    } else {
      console.error(`${colors.red}✗ Failed to create user: ${error.response?.data?.error || error.message}${colors.reset}`);
    }
    return false;
  }
}

async function verifyLogin(username, password) {
  try {
    console.log(`${colors.blue}Verifying login for: ${username}${colors.reset}`);
    
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username,
      password
    });
    
    if (response.data.token) {
      console.log(`${colors.green}✓ Login verification successful${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Login verification failed: ${error.response?.data?.error || error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.yellow}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.yellow}Test User Creation Script${colors.reset}`);
  console.log(`${colors.yellow}API URL: ${API_URL}${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(50)}${colors.reset}\n`);
  
  // Step 1: Login as admin
  const adminToken = await loginAsAdmin();
  if (!adminToken) {
    console.error(`${colors.red}Cannot proceed without admin access${colors.reset}`);
    process.exit(1);
  }
  
  // Step 2: Create test users
  console.log(`\n${colors.yellow}Creating test users...${colors.reset}`);
  
  for (const userData of TEST_USERS) {
    await createUser(userData, adminToken);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Step 3: Verify logins
  console.log(`\n${colors.yellow}Verifying user logins...${colors.reset}`);
  
  for (const userData of TEST_USERS) {
    await verifyLogin(userData.username, userData.password);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${colors.yellow}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.green}Test user creation complete!${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(50)}${colors.reset}\n`);
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Script error: ${error.message}${colors.reset}`);
  process.exit(1);
});