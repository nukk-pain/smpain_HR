#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:5455/api';
let token = '';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function login() {
  try {
    console.log(`${colors.cyan}=== Testing Login ===${colors.reset}`);
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    token = response.data.token;
    console.log(`${colors.green}✅ Login successful${colors.reset}`);
    console.log(`  User: ${response.data.user.name}`);
    console.log(`  Role: ${response.data.user.role}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Login failed:${colors.reset}`, error.message);
    return false;
  }
}

async function testDocumentsEndpoint() {
  try {
    console.log(`\n${colors.cyan}=== Testing GET /api/documents ===${colors.reset}`);
    const response = await axios.get(`${API_BASE}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`${colors.green}✅ Endpoint working${colors.reset}`);
    console.log(`  Documents found: ${response.data.data.length}`);
    
    if (response.data.data.length > 0) {
      console.log(`  Sample document:`, response.data.data[0]);
    }
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Test failed:${colors.reset}`, error.message);
    return false;
  }
}

async function testAdminDocumentsEndpoint() {
  try {
    console.log(`\n${colors.cyan}=== Testing GET /api/documents/admin/all ===${colors.reset}`);
    const response = await axios.get(`${API_BASE}/documents/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`${colors.green}✅ Endpoint working${colors.reset}`);
    console.log(`  Total documents: ${response.data.data.length}`);
    
    // Group by type
    const byType = {};
    response.data.data.forEach(doc => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
    });
    
    console.log(`  Documents by type:`, byType);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Test failed:${colors.reset}`, error.message);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, error.response.data);
    }
    return false;
  }
}

async function testPayslipHistory() {
  try {
    console.log(`\n${colors.cyan}=== Testing GET /api/reports/payslip/upload-history ===${colors.reset}`);
    const response = await axios.get(`${API_BASE}/reports/payslip/upload-history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`${colors.green}✅ Endpoint working${colors.reset}`);
    console.log(`  History entries: ${response.data.history.length}`);
    
    if (response.data.history.length > 0) {
      console.log(`  Latest upload:`, {
        file: response.data.history[0].originalFileName,
        date: response.data.history[0].uploadedAt,
        user: response.data.history[0].userName
      });
    }
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Test failed:${colors.reset}`, error.message);
    return false;
  }
}

async function checkUnifiedCollection() {
  try {
    console.log(`\n${colors.cyan}=== Checking MongoDB unified_documents Collection ===${colors.reset}`);
    
    // Use a simple MongoDB check via the API
    const response = await axios.get(`${API_BASE}/documents/admin/all?includeDeleted=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const docCount = response.data.data.length;
    console.log(`${colors.blue}📊 Unified collection status:${colors.reset}`);
    console.log(`  Total documents: ${docCount}`);
    
    if (docCount === 0) {
      console.log(`${colors.yellow}⚠️  No documents in unified collection.${colors.reset}`);
      console.log(`    You may need to run the migration script.`);
    } else {
      console.log(`${colors.green}✅ Unified collection has data${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Check failed:${colors.reset}`, error.message);
    return false;
  }
}

async function main() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}    Testing Unified Documents API    ${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  // Run tests
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error(`${colors.red}Cannot continue without authentication${colors.reset}`);
    process.exit(1);
  }
  
  await testDocumentsEndpoint();
  await testAdminDocumentsEndpoint();
  await testPayslipHistory();
  await checkUnifiedCollection();
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✅ API tests completed${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});