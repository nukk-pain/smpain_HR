#!/usr/bin/env node

/**
 * Test script for bulk payslip upload functionality
 * Tests performance with multiple PDF files
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3003';
const TEST_USER_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
};

// Test data - Korean employee names
const TEST_EMPLOYEES = [
  '김철수', '이영희', '박민수', '최지연', '정수진',
  '강민호', '조현우', '윤서연', '장미란', '임동혁',
  '한지민', '송중기', '김태희', '이민정', '박서준',
  '전지현', '공유', '손예진', '현빈', '김수현'
];

// Generate test PDF files
async function generateTestPDFs(count = 10) {
  const testDir = path.join(__dirname, 'test-payslips');
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  console.log(`📁 Generating ${count} test PDF files...`);
  
  const files = [];
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  
  for (let i = 0; i < count && i < TEST_EMPLOYEES.length; i++) {
    const employeeName = TEST_EMPLOYEES[i];
    const fileName = `연세신명마취통증의학과의원_상용${year}${month}_${employeeName}.pdf`;
    const filePath = path.join(testDir, fileName);
    
    // Create a simple PDF-like file (for testing purposes)
    // In real scenario, you would use a PDF library
    const pdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Payslip for ${employeeName}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
365
%%EOF`);
    
    fs.writeFileSync(filePath, pdfContent);
    files.push({
      path: filePath,
      name: fileName
    });
  }
  
  console.log(`✅ Generated ${files.length} test PDF files`);
  return files;
}

// Login and get auth token
async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_USER_CREDENTIALS);
    const token = response.data.token;
    console.log('✅ Login successful');
    return token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test employee matching
async function testEmployeeMatching(token, files) {
  try {
    console.log('\n📊 Testing employee matching...');
    
    const fileNames = files.map(f => ({
      fileName: f.name,
      employeeName: f.name.split('_').pop().replace('.pdf', '')
    }));
    
    const startTime = Date.now();
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/payslip/match-employees`,
      { fileNames },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const endTime = Date.now();
    
    const matchedCount = response.data.matches.filter(m => m.matched).length;
    const failedCount = response.data.matches.filter(m => !m.matched).length;
    
    console.log(`✅ Matching completed in ${endTime - startTime}ms`);
    console.log(`   - Matched: ${matchedCount}/${files.length}`);
    console.log(`   - Failed: ${failedCount}/${files.length}`);
    
    return response.data.matches;
  } catch (error) {
    console.error('❌ Employee matching failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test bulk upload
async function testBulkUpload(token, files, matches) {
  try {
    console.log('\n📤 Testing bulk upload...');
    
    const formData = new FormData();
    
    // Prepare mappings
    const mappings = matches
      .filter(m => m.matched)
      .map(m => ({
        fileName: m.fileName,
        userId: m.user.id,
        yearMonth: new Date().getFullYear().toString() + String(new Date().getMonth() + 1).padStart(2, '0')
      }));
    
    formData.append('mappings', JSON.stringify(mappings));
    
    // Add files
    files.forEach(file => {
      const matchedFile = matches.find(m => m.fileName === file.name);
      if (matchedFile && matchedFile.matched) {
        formData.append('payslips', fs.createReadStream(file.path), file.name);
      }
    });
    
    const startTime = Date.now();
    const response = await axios.post(
      `${API_BASE_URL}/api/reports/payslip/bulk-upload`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    const endTime = Date.now();
    
    console.log(`✅ Upload completed in ${endTime - startTime}ms`);
    console.log(`   - Uploaded: ${response.data.uploadedCount} files`);
    console.log(`   - Errors: ${response.data.errorCount} files`);
    
    if (response.data.errorCount > 0) {
      console.log('\n⚠️ Upload errors:');
      response.data.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.fileName}: ${r.error}`));
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Bulk upload failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test upload history
async function testUploadHistory(token) {
  try {
    console.log('\n📜 Testing upload history...');
    
    const response = await axios.get(
      `${API_BASE_URL}/api/reports/payslip/upload-history`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log(`✅ Retrieved ${response.data.history.length} upload records`);
    
    if (response.data.history.length > 0) {
      console.log('\n📋 Recent uploads:');
      response.data.history.slice(0, 5).forEach(record => {
        console.log(`   - ${record.originalFileName} (${record.userName}) - ${new Date(record.uploadedAt).toLocaleString()}`);
      });
    }
    
    return response.data.history;
  } catch (error) {
    console.error('❌ Failed to fetch upload history:', error.response?.data || error.message);
    throw error;
  }
}

// Cleanup test files
function cleanup(files) {
  console.log('\n🧹 Cleaning up test files...');
  const testDir = path.join(__dirname, 'test-payslips');
  
  files.forEach(file => {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      // Ignore errors
    }
  });
  
  try {
    fs.rmdirSync(testDir);
    console.log('✅ Cleanup completed');
  } catch (error) {
    // Directory might not be empty or already deleted
  }
}

// Performance test with different file counts
async function runPerformanceTest(token) {
  console.log('\n🚀 Running performance tests...');
  
  const testCases = [5, 10, 20, 30, 50];
  const results = [];
  
  for (const count of testCases) {
    console.log(`\n📊 Testing with ${count} files...`);
    
    const files = await generateTestPDFs(count);
    const startTime = Date.now();
    
    try {
      const matches = await testEmployeeMatching(token, files);
      await testBulkUpload(token, files, matches);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / count;
      
      results.push({
        fileCount: count,
        totalTime,
        avgTimePerFile: avgTime
      });
      
      console.log(`⏱️ Total time: ${totalTime}ms (${avgTime.toFixed(2)}ms per file)`);
    } catch (error) {
      console.error(`❌ Test failed for ${count} files`);
    } finally {
      cleanup(files);
    }
  }
  
  // Display summary
  console.log('\n📈 Performance Summary:');
  console.log('═══════════════════════════════════════');
  console.log('Files | Total Time | Avg Time/File');
  console.log('───────────────────────────────────────');
  results.forEach(r => {
    console.log(`${String(r.fileCount).padEnd(5)} | ${String(r.totalTime + 'ms').padEnd(10)} | ${r.avgTimePerFile.toFixed(2)}ms`);
  });
  console.log('═══════════════════════════════════════');
}

// Main test runner
async function main() {
  console.log('🧪 Payslip Bulk Upload Test Suite');
  console.log('══════════════════════════════════════');
  console.log(`📍 API URL: ${API_BASE_URL}`);
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════\n');
  
  try {
    // Login
    const token = await login();
    
    // Run basic tests
    const fileCount = parseInt(process.argv[2]) || 10;
    console.log(`\n🧪 Running basic test with ${fileCount} files...`);
    
    const files = await generateTestPDFs(fileCount);
    const matches = await testEmployeeMatching(token, files);
    await testBulkUpload(token, files, matches);
    await testUploadHistory(token);
    cleanup(files);
    
    // Run performance tests if requested
    if (process.argv.includes('--performance')) {
      await runPerformanceTest(token);
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main();
}

module.exports = {
  generateTestPDFs,
  login,
  testEmployeeMatching,
  testBulkUpload,
  testUploadHistory,
  cleanup
};