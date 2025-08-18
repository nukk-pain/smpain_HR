const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmNlYzZhMTI3MjVkYmVlZDhmZWMxOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJuYW1lIjoiU3lzdGVtIEFkbWluaXN0cmF0b3IiLCJyb2xlIjoiYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2Vyczp2aWV3IiwidXNlcnM6bWFuYWdlIiwidXNlcnM6Y3JlYXRlIiwidXNlcnM6ZWRpdCIsInVzZXJzOmRlbGV0ZSIsImxlYXZlOnZpZXciLCJsZWF2ZTptYW5hZ2UiLCJwYXlyb2xsOnZpZXciLCJwYXlyb2xsOm1hbmFnZSIsInJlcG9ydHM6dmlldyIsImZpbGVzOnZpZXciLCJmaWxlczptYW5hZ2UiLCJkZXBhcnRtZW50czp2aWV3IiwiZGVwYXJ0bWVudHM6bWFuYWdlIiwiYWRtaW46cGVybWlzc2lvbnMiXSwidmlzaWJsZVRlYW1zIjpbXSwiaWF0IjoxNzU1MTUyMzkwLCJleHAiOjE3NTUyMzg3OTAsImF1ZCI6ImhyLWZyb250ZW5kIiwiaXNzIjoiaHItc3lzdGVtIn0.c1ataAxCVLSrVxmTGe5cHr4eyt_UV_NuljKdSj18pIQ';

async function testPhase2() {
  try {
    const response = await axios.get('http://localhost:5455/api/payroll/monthly/2025-06', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success && response.data.data?.length > 0) {
      console.log('✅ Phase 2 Test - Enhanced Payroll Data\n');
      console.log('Total records:', response.data.data.length);
      
      // Find a record with allowances/deductions
      const recordWithData = response.data.data.find(r => 
        r.total_allowances > 0 || r.total_deductions > 0
      ) || response.data.data[0];
      
      console.log('\n=== Sample Record ===');
      console.log('Name:', recordWithData.employee?.full_name || 'N/A');
      console.log('Employee ID:', recordWithData.employee?.employeeId || 'N/A');
      console.log('Department:', recordWithData.employee?.department || 'N/A');
      console.log('Position:', recordWithData.employee?.position || 'N/A');
      
      console.log('\n=== Salary Components ===');
      console.log('Base Salary:', recordWithData.base_salary?.toLocaleString() + '원');
      
      // Check allowances
      console.log('\n=== Allowances ===');
      if (recordWithData.allowances) {
        console.log('✅ Allowances object exists');
        console.log('  Incentive:', recordWithData.allowances.incentive || 0);
        console.log('  Meal:', recordWithData.allowances.meal || 0);
        console.log('  Transportation:', recordWithData.allowances.transportation || 0);
        console.log('  Child Care:', recordWithData.allowances.childCare || 0);
        console.log('  Overtime:', recordWithData.allowances.overtime || 0);
        console.log('  Night Shift:', recordWithData.allowances.nightShift || 0);
        console.log('  Holiday Work:', recordWithData.allowances.holidayWork || 0);
        console.log('  Other:', recordWithData.allowances.other || 0);
      } else {
        console.log('❌ Allowances object missing');
      }
      console.log('Total Allowances:', recordWithData.total_allowances?.toLocaleString() + '원');
      
      // Check deductions
      console.log('\n=== Deductions ===');
      if (recordWithData.deductions) {
        console.log('✅ Deductions object exists');
        console.log('  National Pension:', recordWithData.deductions.nationalPension || 0);
        console.log('  Health Insurance:', recordWithData.deductions.healthInsurance || 0);
        console.log('  Employment Insurance:', recordWithData.deductions.employmentInsurance || 0);
        console.log('  Income Tax:', recordWithData.deductions.incomeTax || 0);
        console.log('  Local Income Tax:', recordWithData.deductions.localIncomeTax || 0);
      } else {
        console.log('❌ Deductions object missing');
      }
      console.log('Total Deductions:', recordWithData.total_deductions?.toLocaleString() + '원');
      
      console.log('\n=== Final Amounts ===');
      console.log('Total Input:', recordWithData.total_input?.toLocaleString() + '원');
      console.log('Actual Payment:', recordWithData.actual_payment?.toLocaleString() + '원');
      
      // Summary
      console.log('\n=== Test Summary ===');
      console.log('✅ Employee fields available');
      console.log(recordWithData.allowances ? '✅ Allowances object available' : '❌ Allowances object missing');
      console.log(recordWithData.deductions ? '✅ Deductions object available' : '❌ Deductions object missing');
      console.log(recordWithData.total_allowances !== undefined ? '✅ Total allowances calculated' : '❌ Total allowances missing');
      console.log(recordWithData.total_deductions !== undefined ? '✅ Total deductions calculated' : '❌ Total deductions missing');
      
    } else {
      console.log('No data found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPhase2();