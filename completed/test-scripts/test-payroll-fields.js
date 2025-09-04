const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmNlYzZhMTI3MjVkYmVlZDhmZWMxOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2Vyczp2aWV3IiwidXNlcnM6bWFuYWdlIiwidXNlcnM6Y3JlYXRlIiwidXNlcnM6ZWRpdCIsInVzZXJzOmRlbGV0ZSIsImxlYXZlOnZpZXciLCJsZWF2ZTptYW5hZ2UiLCJwYXlyb2xsOnZpZXciLCJwYXlyb2xsOm1hbmFnZSIsInJlcG9ydHM6dmlldyIsImZpbGVzOnZpZXciLCJmaWxlczptYW5hZ2UiLCJkZXBhcnRtZW50czp2aWV3IiwiZGVwYXJ0bWVudHM6bWFuYWdlIiwiYWRtaW46cGVybWlzc2lvbnMiXSwidmlzaWJsZVRlYW1zIjpbXSwiaWF0IjoxNzU1MTUyMzkwLCJleHAiOjE3NTUyMzg3OTAsImF1ZCI6ImhyLWZyb250ZW5kIiwiaXNzIjoiaHItc3lzdGVtIn0.c1ataAxCVLSrVxmTGe5cHr4eyt_UV_NuljKdSj18pIQ';

async function testPayrollGrid() {
  try {
    const response = await axios.get('http://localhost:5455/api/payroll/monthly/2025-06', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success && response.data.data?.length > 0) {
      console.log('✅ PayrollGrid Test - June 2025 Data\n');
      console.log('Total records:', response.data.data.length);
      
      // Check first record for new fields
      const firstRecord = response.data.data[0];
      console.log('\n=== First Record ===');
      console.log('Name:', firstRecord.employee?.full_name || 'N/A');
      console.log('Employee ID:', firstRecord.employee_id || firstRecord.employee?.employeeId || 'N/A');
      console.log('Department:', firstRecord.employee?.department || 'N/A');
      console.log('Position:', firstRecord.position || firstRecord.employee?.position || 'N/A');
      console.log('Base Salary:', firstRecord.base_salary);
      console.log('Incentive:', firstRecord.incentive);
      console.log('Bonus:', firstRecord.bonus);
      console.log('Award:', firstRecord.award);
      console.log('Total Input:', firstRecord.total_input);
      console.log('Actual Payment:', firstRecord.actual_payment);
      
      // Summary
      console.log('\n=== Column Mapping Check ===');
      console.log('✅ employee_id available:', !!(firstRecord.employee_id || firstRecord.employee?.employeeId));
      console.log('✅ position available:', !!(firstRecord.position || firstRecord.employee?.position));
      console.log('✅ bonus -> bonus_total mapping needed');
      console.log('✅ award -> award_total mapping needed');
      console.log('✅ total_input -> input_total mapping needed');
      console.log('❌ difference column removed from UI');
      
    } else {
      console.log('No data found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPayrollGrid();