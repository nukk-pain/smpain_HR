// Debug test2 user annual leave calculation
function calculateAnnualLeaveEntitlement(hireDate) {
  const now = new Date();
  const hire = new Date(hireDate);
  
  console.log(`현재 날짜: ${now.toISOString().split('T')[0]}`);
  console.log(`입사 날짜: ${hire.toISOString().split('T')[0]}`);
  
  // Calculate years of service
  const yearsOfService = Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 365.25));
  console.log(`근속 연수: ${yearsOfService}년`);
  
  if (yearsOfService === 0) {
    // For employees with less than 1 year: 1 day per completed month from hire date
    let monthsPassed = 0;
    let checkDate = new Date(hire);
    
    console.log('\n월별 계산:');
    // Count completed months from hire date
    while (true) {
      // Move to the same day next month
      checkDate.setMonth(checkDate.getMonth() + 1);
      
      console.log(`체크 날짜: ${checkDate.toISOString().split('T')[0]} ${checkDate <= now ? '✓' : '✗'}`);
      
      // If this date hasn't passed yet, break
      if (checkDate > now) {
        break;
      }
      
      monthsPassed++;
    }
    
    console.log(`완료된 월수: ${monthsPassed}개월`);
    const result = Math.min(monthsPassed, 11);
    console.log(`연차 일수: ${result}일 (최대 11일 제한)`);
    return result;
  } else {
    // For 1+ year employees: 15 + (years - 1), max 25 days
    const result = Math.min(15 + (yearsOfService - 1), 25);
    console.log(`1년 이상 직원 연차: ${result}일`);
    return result;
  }
}

// Test with test2's hire date
console.log('=== test2 사용자 연차 계산 디버그 ===');
calculateAnnualLeaveEntitlement('2025-02-03');