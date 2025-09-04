/*
 * Simplified test for preview button issue
 * Using node fetch to avoid axios issues
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5455/api';
const TEST_FILE = path.join(__dirname, '../sample-data/payroll/excel-templates/연세신명통증의학과_2025년_07월_임금대장_제출.xlsx');

async function test() {
  try {
    // 1. Login
    console.log('🔐 Logging in...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) {
      throw new Error('Login failed');
    }
    
    const token = loginData.token;
    console.log('✅ Login successful\n');
    
    // 2. Upload for preview
    console.log('📤 Uploading Excel for preview...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE));
    form.append('year', '2025');
    form.append('month', '7');
    
    const uploadRes = await fetch(`${API_BASE}/upload/excel/preview`, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      body: form
    });
    
    const previewData = await uploadRes.json();
    
    if (!previewData.success) {
      console.error('❌ Preview failed:', previewData.error);
      return;
    }
    
    console.log('\n✅ Preview Response Received');
    console.log('📊 Summary:', {
      total: previewData.summary?.totalRecords,
      valid: previewData.summary?.validRecords,
      invalid: previewData.summary?.invalidRecords,
      warning: previewData.summary?.warningRecords
    });
    
    // 3. Analyze records
    console.log('\n📈 Records Analysis:');
    const statusCount = {};
    let validOrWarning = 0;
    let other = 0;
    
    previewData.records?.forEach((record, index) => {
      const status = record.status || 'undefined';
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      // Check auto-select logic
      if (status === 'valid' || status === 'warning') {
        validOrWarning++;
      } else {
        other++;
      }
      
      // Show first 5 records
      if (index < 5) {
        console.log(`  Row ${record.rowIndex || index + 1}:`, {
          name: record.employeeName,
          status: status,
          matched: record.matched,
          userId: record.userId ? '✓' : '✗'
        });
      }
    });
    
    console.log('\n📊 Status Distribution:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\n🎯 Auto-Selection Result:');
    console.log(`  Would be selected (valid/warning): ${validOrWarning}`);
    console.log(`  Would NOT be selected (other): ${other}`);
    console.log(`  Save button would be: ${validOrWarning > 0 ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    if (validOrWarning === 0 && previewData.records?.length > 0) {
      console.log('\n⚠️  PROBLEM CONFIRMED!');
      console.log('  No records have status "valid" or "warning"');
      console.log('  This causes the save button to be disabled');
      console.log('\n  Most common status:', Object.entries(statusCount).sort((a, b) => b[1] - a[1])[0]);
    } else {
      console.log('\n✅ No problem detected - button should be enabled');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();