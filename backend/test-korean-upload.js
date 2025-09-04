/**
 * Test script for Korean filename upload
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5455/api';

// Test credentials
const testCredentials = {
  username: 'admin',
  password: 'admin'
};

async function login() {
  try {
    console.log('🔐 Attempting login with:', testCredentials.username);
    const response = await axios.post(`${API_BASE}/auth/login`, testCredentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Login successful');
    // Check for different possible token locations
    const token = response.data.token || response.data.accessToken || response.data.data?.token;
    if (!token) {
      console.error('❌ No token in response:', response.data);
      throw new Error('No token received');
    }
    return token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
}

async function createTestPDF(filename) {
  // Create a simple test PDF file
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  
  const filePath = path.join(__dirname, 'test-pdfs', filename);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(20).text('Test Payslip', 100, 100);
  doc.fontSize(14).text(`Employee: ${filename.split('_').pop().replace('.pdf', '')}`, 100, 150);
  doc.fontSize(12).text('This is a test payslip document.', 100, 200);
  doc.end();
  
  // Wait for file to be written
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return filePath;
}

async function testKoreanFilenameUpload(token) {
  try {
    console.log('\n📋 Testing Korean filename upload...');
    
    // Test filenames with Korean characters
    const testFiles = [
      '연세신명마취통증의학과의원_정규202410_홍길동.pdf',
      '연세신명마취통증의학과의원_정규202410_김철수.pdf',
      '서울대학교병원_계약직202410_박영희.pdf'
    ];
    
    // Create test PDF files
    const filePaths = [];
    for (const filename of testFiles) {
      const filePath = await createTestPDF(filename);
      filePaths.push({ path: filePath, name: filename });
      console.log(`📄 Created test file: ${filename}`);
    }
    
    // First, we need to get user mappings
    // For testing, we'll use the admin user ID
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const users = usersResponse.data.users || usersResponse.data.data || usersResponse.data || [];
    console.log(`👥 Found ${users.length} users`);
    
    // If no users found, show the response for debugging
    if (users.length === 0) {
      console.log('Users response:', JSON.stringify(usersResponse.data, null, 2));
    }
    
    // Try to find users by name matching the test files
    const userMapping = {
      '홍길동': users.find(u => u.name === '홍길동'),
      '김철수': users.find(u => u.name === '김철수'),
      '박영희': users.find(u => u.name === '박영희')
    };
    
    // Create mappings for test with proper user IDs
    const mappings = testFiles.map((filename, index) => {
      // Extract name from filename
      const namePart = filename.split('_').pop().replace('.pdf', '');
      const matchedUser = userMapping[namePart] || users[index % users.length] || users[0];
      
      return {
        fileName: filename,
        userId: matchedUser?._id || matchedUser?.id,
        yearMonth: '202410'
      };
    });
    
    console.log('📝 Mappings:', mappings);
    
    // Prepare form data
    const formData = new FormData();
    
    // Add mappings as JSON
    formData.append('mappings', JSON.stringify(mappings));
    
    // Add files
    for (const fileInfo of filePaths) {
      const fileStream = fs.createReadStream(fileInfo.path);
      formData.append('payslips', fileStream, fileInfo.name);
    }
    
    // Upload files
    console.log('\n🚀 Uploading files...');
    const uploadResponse = await axios.post(
      `${API_BASE}/reports/payslip/bulk-upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('\n✅ Upload response:', uploadResponse.data);
    
    // Check if files were uploaded successfully
    if (uploadResponse.data.success) {
      console.log(`✅ Successfully uploaded ${uploadResponse.data.uploadedCount} files`);
      console.log(`❌ Failed to upload ${uploadResponse.data.errorCount} files`);
      
      // Show results
      if (uploadResponse.data.results) {
        uploadResponse.data.results.forEach(result => {
          if (result.success) {
            console.log(`  ✅ ${result.fileName} -> ${result.uniqueId || 'uploaded'}`);
          } else {
            console.log(`  ❌ ${result.fileName}: ${result.error}`);
          }
        });
      }
    }
    
    // Clean up test files
    for (const fileInfo of filePaths) {
      fs.unlinkSync(fileInfo.path);
    }
    
    return uploadResponse.data;
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testDownload(token, documentId, expectedFilename) {
  try {
    console.log(`\n📥 Testing download for document: ${documentId}`);
    
    const response = await axios.get(
      `${API_BASE}/reports/payslip/download/${documentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'stream'
      }
    );
    
    // Check Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    console.log('📎 Content-Disposition:', contentDisposition);
    
    // Extract filename from header
    const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
    if (filenameMatch) {
      const downloadedFilename = decodeURIComponent(filenameMatch[1]);
      console.log('📄 Downloaded filename:', downloadedFilename);
      console.log('📄 Expected filename:', expectedFilename);
      
      if (downloadedFilename === expectedFilename) {
        console.log('✅ Filename matches!');
      } else {
        console.log('⚠️ Filename mismatch');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Download test failed:', error.response?.data || error.message);
    return false;
  }
}

async function verifyUploadStatus(token) {
  try {
    console.log('\n🔍 Verifying upload status...');
    
    const response = await axios.get(`${API_BASE}/payslip/verify-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Upload verification:', response.data);
    
    if (response.data.success) {
      const { stats } = response.data;
      console.log(`  📁 DB Records: ${stats.totalDbRecords}`);
      console.log(`  📄 Files: ${stats.totalFiles}`);
      console.log(`  ✅ Valid: ${stats.validUploads}`);
      console.log(`  ❌ Missing: ${stats.missingFiles}`);
      
      // Get recently uploaded documents for testing download
      if (response.data.recentUploads && response.data.recentUploads.length > 0) {
        return response.data.recentUploads;
      }
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  try {
    console.log('🚀 Starting Korean filename upload test...\n');
    
    // Login
    const token = await login();
    
    // Test upload
    const uploadResult = await testKoreanFilenameUpload(token);
    
    // Verify upload status
    const recentUploads = await verifyUploadStatus(token);
    
    // Test download if we have uploaded documents
    if (recentUploads.length > 0) {
      const testDoc = recentUploads[0];
      await testDownload(token, testDoc.id, testDoc.fileName);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if pdfkit is installed
try {
  require('pdfkit');
} catch (e) {
  console.log('📦 Installing pdfkit for test PDF generation...');
  require('child_process').execSync('npm install pdfkit', { stdio: 'inherit' });
}

main();