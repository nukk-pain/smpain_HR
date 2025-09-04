// Test Excel export endpoint
const axios = require('axios');
const fs = require('fs');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmNlYzZhMTI3MjVkYmVlZDhmZWMxOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2Vyczp2aWV3IiwidXNlcnM6bWFuYWdlIiwidXNlcnM6Y3JlYXRlIiwidXNlcnM6ZWRpdCIsInVzZXJzOmRlbGV0ZSIsImxlYXZlOnZpZXciLCJsZWF2ZTptYW5hZ2UiLCJwYXlyb2xsOnZpZXciLCJwYXlyb2xsOm1hbmFnZSIsInJlcG9ydHM6dmlldyIsImZpbGVzOnZpZXciLCJmaWxlczptYW5hZ2UiLCJkZXBhcnRtZW50czp2aWV3IiwiZGVwYXJ0bWVudHM6bWFuYWdlIiwiYWRtaW46cGVybWlzc2lvbnMiXSwidmlzaWJsZVRlYW1zIjpbXSwiaWF0IjoxNzU1MTUyMzkwLCJleHAiOjE3NTUyMzg3OTAsImF1ZCI6ImhyLWZyb250ZW5kIiwiaXNzIjoiaHItc3lzdGVtIn0.c1ataAxCVLSrVxmTGe5cHr4eyt_UV_NuljKdSj18pIQ';

async function testExcelExport() {
  try {
    console.log('Testing Excel export for June 2025...');
    
    const response = await axios.get('http://localhost:5455/api/payroll/monthly/2025-06/export', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer'
    });
    
    // Save the Excel file
    const filename = 'test_payroll_2025-06.xlsx';
    fs.writeFileSync(filename, response.data);
    
    console.log('✅ Excel export successful!');
    console.log(`   File saved as: ${filename}`);
    console.log(`   File size: ${response.data.byteLength} bytes`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    // Verify the file is valid Excel
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filename);
    const sheetNames = workbook.SheetNames;
    console.log(`   Sheets in workbook: ${sheetNames.join(', ')}`);
    
    // Read the first sheet
    const firstSheet = workbook.Sheets[sheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    
    console.log(`\n=== Excel Content Summary ===`);
    console.log(`Total rows: ${data.length}`);
    
    if (data.length > 0) {
      console.log('\nColumns in Excel:');
      Object.keys(data[0]).forEach(col => {
        console.log(`  - ${col}`);
      });
      
      console.log('\nFirst record sample:');
      const firstRecord = data[0];
      console.log(`  직원명: ${firstRecord['직원명']}`);
      console.log(`  부서: ${firstRecord['부서']}`);
      console.log(`  기본급: ${firstRecord['기본급']}`);
      console.log(`  실지급액: ${firstRecord['실지급액']}`);
    }
    
    // Clean up test file
    fs.unlinkSync(filename);
    console.log('\n✅ Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Excel export failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testExcelExport();