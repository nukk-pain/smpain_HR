const axios = require('axios');

async function testAdminDocumentsAPI() {
  try {
    // Login as admin
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Test /api/documents/admin/all endpoint
    console.log('\nTesting /api/documents/admin/all endpoint...');
    const documentsResponse = await axios.get('http://localhost:5000/api/documents/admin/all', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`\nTotal documents: ${documentsResponse.data.data.length}`);
    
    // Show first 3 documents
    console.log('\nFirst 3 documents:');
    documentsResponse.data.data.slice(0, 3).forEach(doc => {
      console.log({
        userName: doc.userName,
        userEmployeeId: doc.userEmployeeId,
        title: doc.title,
        year: doc.year,
        month: doc.month,
        status: doc.status,
        deleted: doc.deleted
      });
    });
    
    // Count by type
    const payslips = documentsResponse.data.data.filter(d => d.type === 'payslip');
    console.log(`\nPayslips count: ${payslips.length}`);
    
    // Count non-deleted
    const activeDocuments = documentsResponse.data.data.filter(d => !d.deleted);
    console.log(`Active (non-deleted) documents: ${activeDocuments.length}`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Backend server is not running. Please start it first.');
    }
  }
}

testAdminDocumentsAPI();