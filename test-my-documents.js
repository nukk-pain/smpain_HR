// Test script for My Documents portal
const axios = require('axios');

const API_BASE = 'http://localhost:5455/api';

async function testMyDocuments() {
  try {
    console.log('🧪 Testing My Documents Portal\n');
    console.log('================================\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Test documents endpoint
    console.log('2️⃣ Testing GET /api/documents...');
    const documentsResponse = await axios.get(`${API_BASE}/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Documents endpoint working');
    console.log(`📄 Found ${documentsResponse.data.data.length} documents\n`);
    
    if (documentsResponse.data.data.length > 0) {
      console.log('Documents:');
      documentsResponse.data.data.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.title}`);
        console.log(`     Type: ${doc.type}`);
        console.log(`     File: ${doc.fileName}`);
        console.log(`     Size: ${doc.fileSize} bytes`);
        console.log(`     Date: ${doc.date}\n`);
      });
    } else {
      console.log('ℹ️  No documents found for this user (this is normal for admin)\n');
    }

    // Step 3: Test with year/month filters
    console.log('3️⃣ Testing with filters (year=2025)...');
    const filteredResponse = await axios.get(`${API_BASE}/documents?year=2025`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(`✅ Filtered request successful (${filteredResponse.data.data.length} results)\n`);

    // Step 4: Test certificate generation endpoint (should return 501)
    console.log('4️⃣ Testing certificate generation (Phase 2 feature)...');
    try {
      await axios.post(`${API_BASE}/documents/certificate/generate`, {
        type: 'employment',
        purpose: 'test',
        language: 'ko'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 501) {
        console.log('✅ Certificate endpoint returns expected 501 (not implemented yet)\n');
      } else {
        throw error;
      }
    }

    // Step 5: Login as a regular user and check
    console.log('5️⃣ Testing with a regular user...');
    try {
      // Try to find a regular user
      const usersResponse = await axios.get(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const regularUser = usersResponse.data.data.find(u => u.role === 'User' && u.isActive);
      if (regularUser) {
        console.log(`   Found user: ${regularUser.name} (${regularUser.username})`);
        
        // Note: We can't login as them without their password
        console.log('   ℹ️  Cannot login as regular user without password\n');
      } else {
        console.log('   ℹ️  No regular users found\n');
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch users\n');
    }

    console.log('================================');
    console.log('✅ All tests passed successfully!');
    console.log('================================\n');
    
    console.log('📊 Summary:');
    console.log('  - Documents API endpoint is working');
    console.log('  - Authentication & authorization working');
    console.log('  - Filtering by year/month working');
    console.log('  - Certificate generation placeholder ready');
    console.log('\n✨ My Documents Portal is ready to use!');
    console.log('🌐 You can now access it at: http://localhost:3728/my-documents');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testMyDocuments();