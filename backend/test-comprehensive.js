#!/usr/bin/env node

const axios = require('axios');
const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:5455/api';
const MONGODB_URI = 'mongodb://localhost:27017/SM_nomu';

let token = '';
let testUser = null;

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class TestSuite {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(description, testFn) {
    try {
      await testFn();
      this.passed++;
      this.tests.push({ description, status: 'passed' });
      console.log(`  ${colors.green}✅${colors.reset} ${description}`);
    } catch (error) {
      this.failed++;
      this.tests.push({ description, status: 'failed', error: error.message });
      console.log(`  ${colors.red}❌${colors.reset} ${description}`);
      console.log(`     ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }

  summary() {
    console.log(`\n${colors.cyan}${this.name} Summary:${colors.reset}`);
    console.log(`  Passed: ${colors.green}${this.passed}${colors.reset}`);
    console.log(`  Failed: ${colors.red}${this.failed}${colors.reset}`);
    return this.failed === 0;
  }
}

// Test functions
async function login() {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin',
    password: 'admin'
  });
  token = response.data.token;
  return response.data;
}

async function testBackwardCompatibility() {
  const suite = new TestSuite('Backward Compatibility Tests');
  console.log(`\n${colors.magenta}=== Testing Backward Compatibility ===${colors.reset}`);

  await suite.test('GET /api/documents returns correct structure', async () => {
    const response = await axios.get(`${API_BASE}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.data.success) throw new Error('Missing success field');
    if (!Array.isArray(response.data.data)) throw new Error('Data is not an array');
  });

  await suite.test('Document objects have expected fields', async () => {
    const response = await axios.get(`${API_BASE}/documents/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.data.length > 0) {
      const doc = response.data.data[0];
      const requiredFields = ['_id', 'type', 'fileName', 'date'];
      for (const field of requiredFields) {
        if (!(field in doc)) throw new Error(`Missing field: ${field}`);
      }
    }
  });

  await suite.test('GET /api/admin/payslips fallback works', async () => {
    const response = await axios.get(`${API_BASE}/documents/admin/payslips`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.data.success) throw new Error('Fallback endpoint failed');
    if (!Array.isArray(response.data.data)) throw new Error('Data is not an array');
  });

  return suite.summary();
}

async function testUnifiedCollection() {
  const suite = new TestSuite('Unified Collection Tests');
  console.log(`\n${colors.magenta}=== Testing Unified Collection ===${colors.reset}`);

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    await suite.test('unified_documents collection exists', async () => {
      const collections = await db.listCollections().toArray();
      const exists = collections.some(c => c.name === 'unified_documents');
      if (!exists) throw new Error('Collection does not exist');
    });

    await suite.test('Documents have unified schema structure', async () => {
      const doc = await db.collection('unified_documents').findOne({});
      if (doc) {
        const requiredFields = ['userId', 'documentType', 'file', 'audit'];
        for (const field of requiredFields) {
          if (!(field in doc)) throw new Error(`Missing unified schema field: ${field}`);
        }
      }
    });

    await suite.test('Indexes are properly created', async () => {
      const indexes = await db.collection('unified_documents').listIndexes().toArray();
      const expectedIndexes = [
        'user_documents_by_date',
        'employee_documents_by_date',
        'documents_by_type_and_status'
      ];
      
      for (const indexName of expectedIndexes) {
        const exists = indexes.some(idx => idx.name === indexName);
        if (!exists) throw new Error(`Missing index: ${indexName}`);
      }
    });

    await suite.test('Migration tracking is present', async () => {
      const doc = await db.collection('unified_documents').findOne({
        'migration.source': { $exists: true }
      });
      
      if (doc) {
        if (!doc.migration.source) throw new Error('Migration source missing');
        if (!doc.migration.migratedAt) throw new Error('Migration date missing');
      }
    });

  } finally {
    await client.close();
  }

  return suite.summary();
}

async function testAPIFunctionality() {
  const suite = new TestSuite('API Functionality Tests');
  console.log(`\n${colors.magenta}=== Testing API Functionality ===${colors.reset}`);

  await suite.test('User can access their own documents', async () => {
    // Get a regular user token
    const userLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'test.user',
      password: 'password123'
    }).catch(() => null);
    
    if (userLogin) {
      const userToken = userLogin.data.token;
      const response = await axios.get(`${API_BASE}/documents`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (!response.data.success) throw new Error('User cannot access documents');
    }
  });

  await suite.test('Admin can see all documents', async () => {
    const response = await axios.get(`${API_BASE}/documents/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.data.success) throw new Error('Admin cannot see all documents');
    // Admin should see documents from multiple users
    const userIds = new Set(response.data.data.map(d => d.userId));
    console.log(`     Found documents from ${userIds.size} unique users`);
  });

  await suite.test('Document filtering works', async () => {
    const response = await axios.get(`${API_BASE}/documents?type=payslip`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.data.success) throw new Error('Filtering failed');
    
    // All returned documents should be payslips
    const nonPayslips = response.data.data.filter(d => d.type !== 'payslip');
    if (nonPayslips.length > 0) throw new Error('Filter not working correctly');
  });

  await suite.test('Upload history endpoint works', async () => {
    const response = await axios.get(`${API_BASE}/reports/payslip/upload-history?limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.data.success) throw new Error('Upload history failed');
    if (!Array.isArray(response.data.history)) throw new Error('History is not an array');
  });

  return suite.summary();
}

async function testPerformance() {
  const suite = new TestSuite('Performance Tests');
  console.log(`\n${colors.magenta}=== Testing Performance ===${colors.reset}`);

  await suite.test('Documents API responds within 500ms', async () => {
    const start = Date.now();
    await axios.get(`${API_BASE}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const duration = Date.now() - start;
    
    console.log(`     Response time: ${duration}ms`);
    if (duration > 500) throw new Error(`Too slow: ${duration}ms`);
  });

  await suite.test('Admin documents API responds within 1000ms', async () => {
    const start = Date.now();
    await axios.get(`${API_BASE}/documents/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const duration = Date.now() - start;
    
    console.log(`     Response time: ${duration}ms`);
    if (duration > 1000) throw new Error(`Too slow: ${duration}ms`);
  });

  return suite.summary();
}

async function main() {
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}           COMPREHENSIVE UNIFIED COLLECTION TESTS           ${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  
  try {
    // Login
    console.log(`\n${colors.cyan}Authenticating...${colors.reset}`);
    const loginData = await login();
    console.log(`${colors.green}✅ Logged in as: ${loginData.user.name}${colors.reset}`);
    
    // Run test suites
    const results = [];
    results.push(await testBackwardCompatibility());
    results.push(await testUnifiedCollection());
    results.push(await testAPIFunctionality());
    results.push(await testPerformance());
    
    // Final summary
    console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.blue}                     FINAL RESULTS                     ${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
    
    const allPassed = results.every(r => r === true);
    
    if (allPassed) {
      console.log(`\n${colors.green}🎉 ALL TESTS PASSED! 🎉${colors.reset}`);
      console.log(`${colors.green}The unified collection migration is working correctly.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}⚠️  SOME TESTS FAILED${colors.reset}`);
      console.log(`${colors.yellow}Please review the failures above.${colors.reset}`);
    }
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error(`\n${colors.red}FATAL ERROR: ${error.message}${colors.reset}`);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
main();