#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:5455/api';

async function testPayslipVerify() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Test verify-status endpoint
    console.log('📋 Testing /api/payslip/verify-status');
    const verifyResponse = await axios.get(`${API_BASE}/payslip/verify-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Verify status endpoint working');
    console.log('  Stats:', verifyResponse.data.stats);
    console.log('  Recent uploads:', verifyResponse.data.recentUploads.length);
    console.log('  Missing files:', verifyResponse.data.missingFiles.length);
    
    // Test statistics endpoint
    console.log('\n📊 Testing /api/payslip/statistics');
    const statsResponse = await axios.get(`${API_BASE}/payslip/statistics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Statistics endpoint working');
    console.log('  Monthly stats entries:', statsResponse.data.monthlyStats.length);
    console.log('  User stats entries:', statsResponse.data.userStats.length);
    
    if (statsResponse.data.monthlyStats.length > 0) {
      const latest = statsResponse.data.monthlyStats[0];
      console.log(`  Latest month: ${latest._id.year}-${latest._id.month} (${latest.count} documents)`);
    }
    
    console.log('\n✅ All payslip-verify endpoints are working correctly with unified collection!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testPayslipVerify();