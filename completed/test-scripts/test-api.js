const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmNlYzZhMTI3MjVkYmVlZDhmZWMxOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2Vyczp2aWV3IiwidXNlcnM6bWFuYWdlIiwidXNlcnM6Y3JlYXRlIiwidXNlcnM6ZWRpdCIsInVzZXJzOmRlbGV0ZSIsImxlYXZlOnZpZXciLCJsZWF2ZTptYW5hZ2UiLCJwYXlyb2xsOnZpZXciLCJwYXlyb2xsOm1hbmFnZSIsInJlcG9ydHM6dmlldyIsImZpbGVzOnZpZXciLCJmaWxlczptYW5hZ2UiLCJkZXBhcnRtZW50czp2aWV3IiwiZGVwYXJ0bWVudHM6bWFuYWdlIiwiYWRtaW46cGVybWlzc2lvbnMiXSwidmlzaWJsZVRlYW1zIjpbXSwiaWF0IjoxNzU1MTUyMzkwLCJleHAiOjE3NTUyMzg3OTAsImF1ZCI6ImhyLWZyb250ZW5kIiwiaXNzIjoiaHItc3lzdGVtIn0.c1ataAxCVLSrVxmTGe5cHr4eyt_UV_NuljKdSj18pIQ';

async function testApi() {
  try {
    const response = await axios.get('http://localhost:5455/api/reports/payroll/2025-06', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success && response.data.data?.summary) {
      const summary = response.data.data.summary;
      console.log('✅ Summary data found:');
      console.log('  Total Employees:', summary.totalEmployees);
      console.log('  Total Payroll:', summary.totalPayroll?.toLocaleString() + '원');
      console.log('  Total Incentive:', summary.totalIncentive?.toLocaleString() + '원');
      console.log('  Average Salary:', summary.avgSalary?.toLocaleString() + '원');
    } else {
      console.log('❌ No summary data found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApi();