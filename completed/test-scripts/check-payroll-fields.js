const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmNlYzZhMTI3MjVkYmVlZDhmZWMxOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2Vyczp2aWV3IiwidXNlcnM6bWFuYWdlIiwidXNlcnM6Y3JlYXRlIiwidXNlcnM6ZWRpdCIsInVzZXJzOmRlbGV0ZSIsImxlYXZlOnZpZXciLCJsZWF2ZTptYW5hZ2UiLCJwYXlyb2xsOnZpZXciLCJwYXlyb2xsOm1hbmFnZSIsInJlcG9ydHM6dmlldyIsImZpbGVzOnZpZXciLCJmaWxlczptYW5hZ2UiLCJkZXBhcnRtZW50czp2aWV3IiwiZGVwYXJ0bWVudHM6bWFuYWdlIiwiYWRtaW46cGVybWlzc2lvbnMiXSwidmlzaWJsZVRlYW1zIjpbXSwiaWF0IjoxNzU1MTUyMzkwLCJleHAiOjE3NTUyMzg3OTAsImF1ZCI6ImhyLWZyb250ZW5kIiwiaXNzIjoiaHItc3lzdGVtIn0.c1ataAxCVLSrVxmTGe5cHr4eyt_UV_NuljKdSj18pIQ';

async function checkPayrollFields() {
  try {
    const response = await axios.get('http://localhost:5455/api/payroll/monthly/2025-06', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success && response.data.data?.length > 0) {
      const firstRecord = response.data.data[0];
      console.log('=== Available Fields in Payroll Data ===\n');
      console.log('Sample record for:', firstRecord.employee?.full_name || 'Unknown');
      console.log('\nAll available fields:');
      
      const fields = Object.keys(firstRecord).sort();
      fields.forEach(field => {
        const value = firstRecord[field];
        const type = typeof value;
        if (value === null) {
          console.log(`  ${field}: null`);
        } else if (type === 'object') {
          console.log(`  ${field}: [object] ${JSON.stringify(value).substring(0, 50)}...`);
        } else {
          console.log(`  ${field}: ${value} (${type})`);
        }
      });
      
      // Check for nested allowances if exists
      if (firstRecord.allowances) {
        console.log('\n=== Allowances breakdown ===');
        Object.keys(firstRecord.allowances).forEach(key => {
          console.log(`  ${key}: ${firstRecord.allowances[key]}`);
        });
      }
      
      // Check for deductions if exists
      if (firstRecord.deductions) {
        console.log('\n=== Deductions breakdown ===');
        Object.keys(firstRecord.deductions).forEach(key => {
          console.log(`  ${key}: ${firstRecord.deductions[key]}`);
        });
      }
      
    } else {
      console.log('No data found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPayrollFields();