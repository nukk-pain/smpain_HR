/*
 * Preview 버튼 비활성화 문제 테스트
 * 실제로 버튼이 비활성화되는지 확인
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const API_BASE = 'http://localhost:5455/api';
const TEST_FILE = path.join(__dirname, '../sample-data/payroll/excel-templates/연세신명통증의학과_2025년_07월_임금대장_제출.xlsx');

async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Login response:', response.data.success ? '✓' : '✗');
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    console.error('Error details:', error.response?.status, error.response?.statusText);
    throw error;
  }
}

async function testPreviewUpload(token) {
  try {
    console.log('\n📋 Testing Payroll Preview Upload...\n');
    
    // Check if test file exists
    if (!fs.existsSync(TEST_FILE)) {
      console.error('❌ Test file not found:', TEST_FILE);
      return;
    }
    
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE));
    form.append('year', '2025');
    form.append('month', '7');
    
    console.log('📤 Uploading file for preview...');
    const response = await axios.post(
      `${API_BASE}/payroll/preview`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('\n✅ Preview Response:');
    console.log('- Success:', response.data.success);
    console.log('- Preview Token:', response.data.previewToken ? '✓ Received' : '✗ Missing');
    console.log('- Summary:', {
      totalRecords: response.data.summary?.totalRecords,
      validRecords: response.data.summary?.validRecords,
      invalidRecords: response.data.summary?.invalidRecords,
      warningRecords: response.data.summary?.warningRecords
    });
    
    console.log('\n📊 Records Status Distribution:');
    const statusCount = {};
    response.data.records?.forEach(record => {
      const status = record.status || 'undefined';
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      // Log first 3 records for inspection
      if (record.rowIndex <= 3) {
        console.log(`  Row ${record.rowIndex}:`, {
          name: record.employeeName,
          status: record.status,
          matched: record.matched,
          userId: record.userId
        });
      }
    });
    
    console.log('\n📈 Status Summary:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} records`);
    });
    
    // Check what would be auto-selected
    console.log('\n🎯 Auto-Selection Analysis:');
    let wouldBeSelected = 0;
    let notSelected = 0;
    
    response.data.records?.forEach(record => {
      // Current logic: only 'valid' or 'warning' are selected
      if (record.status === 'valid' || record.status === 'warning') {
        wouldBeSelected++;
      } else {
        notSelected++;
      }
    });
    
    console.log(`  - Would be selected: ${wouldBeSelected}`);
    console.log(`  - Would NOT be selected: ${notSelected}`);
    console.log(`  - Button would be: ${wouldBeSelected > 0 ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    if (wouldBeSelected === 0 && response.data.records?.length > 0) {
      console.log('\n⚠️  PROBLEM CONFIRMED: No records would be auto-selected!');
      console.log('   This would cause the save button to be disabled.');
    }
    
    return response.data;
    
  } catch (error) {
    console.error('\n❌ Preview upload failed:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔐 Logging in as admin...');
    const token = await login();
    console.log('✅ Login successful\n');
    
    await testPreviewUpload(token);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main();