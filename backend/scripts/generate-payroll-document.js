const LaborConsultantParser = require('../utils/laborConsultantParser');
const path = require('path');

async function generatePayrollDocument() {
  console.log('📋 급여 정보 문서 생성 중...');
  console.log('='.repeat(80));
  
  const parser = new LaborConsultantParser();
  const filePath = path.join(__dirname, '../../sample-data/payroll/excel-templates', '연세신명통증의학과_2025년_06월_임금대장_제출.xlsx');
  
  try {
    const result = await parser.parsePayrollFile(filePath);
    
    console.log('# 연세신명통증의학과 2025년 6월분 급여 정보');
    console.log('');
    console.log(`- **분석 파일**: ${result.sourceFile}`);
    console.log(`- **분석 일시**: ${result.extractedAt.toLocaleString('ko-KR')}`);
    console.log(`- **총 직원 수**: ${result.totalRecords}명`);
    console.log('');
    
    // 전체 통계
    const totalBaseSalary = result.payrollData.reduce((sum, r) => sum + (r.baseSalary || 0), 0);
    const totalIncentives = result.payrollData.reduce((sum, r) => sum + (r.incentive || 0) + (r.fixedIncentive || 0), 0);
    const totalBonuses = result.payrollData.reduce((sum, r) => sum + (r.bonusReward || 0), 0);
    const totalGrossSalary = result.payrollData.reduce((sum, r) => sum + (r.grossSalaryPreTax || 0), 0);
    const totalNetPay = result.payrollData.reduce((sum, r) => sum + (r.netPay || 0), 0);
    
    console.log('## 📊 전체 급여 통계');
    console.log('');
    console.log(`- **총 기본급**: ${totalBaseSalary.toLocaleString()}원`);
    console.log(`- **총 인센티브**: ${totalIncentives.toLocaleString()}원`);
    console.log(`- **총 포상금**: ${totalBonuses.toLocaleString()}원`);
    console.log(`- **총 지급예정액(세전)**: ${totalGrossSalary.toLocaleString()}원`);
    console.log(`- **총 실지급액**: ${totalNetPay.toLocaleString()}원`);
    console.log('');
    
    // 각 직원별 상세 정보
    console.log('## 👥 직원별 급여 상세 정보');
    console.log('');
    
    result.payrollData.forEach((employee, index) => {
      console.log(`### ${index + 1}. ${employee.name} (${employee.jobType})`);
      console.log('');
      
      // 기본 정보
      console.log('**기본 정보**');
      console.log(`- 사번: ${employee.employeeId || 'N/A'}`);
      console.log(`- 담당업무: ${employee.jobType || 'N/A'}`);
      console.log(`- 근무일수: ${employee.workDays || 0}일`);
      console.log(`- 연장근무: ${employee.overtimeHours || 0}시간`);
      if (employee.additionalOvertimeHours) {
        console.log(`- 추가연장근무: ${employee.additionalOvertimeHours}시간`);
      }
      console.log('');
      
      // 급여 구성
      console.log('**💰 급여 구성**');
      console.log(`- 기본급: ${(employee.baseSalary || 0).toLocaleString()}원`);
      
      if (employee.overtimeAllowance > 0) {
        console.log(`- 연장근로수당: ${employee.overtimeAllowance.toLocaleString()}원`);
      }
      if (employee.additionalOvertimeAllowance > 0) {
        console.log(`- 추가연장수당: ${employee.additionalOvertimeAllowance.toLocaleString()}원`);
      }
      if (employee.holidayAllowance > 0) {
        console.log(`- 휴일근로수당: ${employee.holidayAllowance.toLocaleString()}원`);
      }
      if (employee.holidayOvertimeAllowance > 0) {
        console.log(`- 휴일연장수당: ${employee.holidayOvertimeAllowance.toLocaleString()}원`);
      }
      if (employee.nightAllowance > 0) {
        console.log(`- 야간수당: ${employee.nightAllowance.toLocaleString()}원`);
      }
      if (employee.annualLeaveAllowance > 0) {
        console.log(`- 연차휴가수당: ${employee.annualLeaveAllowance.toLocaleString()}원`);
      }
      
      // 인센티브 및 수당
      console.log('');
      console.log('**🎯 인센티브 및 특별수당**');
      if (employee.fixedIncentive > 0) {
        console.log(`- 고정인센티브: ${employee.fixedIncentive.toLocaleString()}원`);
      }
      if (employee.incentive > 0) {
        console.log(`- 인센티브: ${employee.incentive.toLocaleString()}원`);
      }
      if (employee.bonusReward > 0) {
        console.log(`- 포상금: ${employee.bonusReward.toLocaleString()}원`);
      }
      if (employee.mealAllowance > 0) {
        console.log(`- 식대: ${employee.mealAllowance.toLocaleString()}원`);
      }
      if (employee.retroactivePay > 0) {
        console.log(`- 소급분: ${employee.retroactivePay.toLocaleString()}원`);
      }
      if (employee.additionalAllowance > 0) {
        console.log(`- 추가수당: ${employee.additionalAllowance.toLocaleString()}원`);
      }
      
      // 총 지급예정액 표시
      console.log('');
      console.log(`**📈 총 지급예정액(세전): ${(employee.grossSalaryPreTax || 0).toLocaleString()}원**`);
      console.log('');
      
      // 공제 내역
      console.log('**💸 공제 내역**');
      if (employee.incomeTax > 0) {
        console.log(`- 소득세: ${employee.incomeTax.toLocaleString()}원`);
      }
      if (employee.localIncomeTax > 0) {
        console.log(`- 지방소득세: ${employee.localIncomeTax.toLocaleString()}원`);
      }
      if (employee.nationalPension > 0) {
        console.log(`- 국민연금: ${employee.nationalPension.toLocaleString()}원`);
      }
      if (employee.healthInsurance > 0) {
        console.log(`- 건강보험: ${employee.healthInsurance.toLocaleString()}원`);
      }
      if (employee.longTermCareInsurance > 0) {
        console.log(`- 장기요양보험: ${employee.longTermCareInsurance.toLocaleString()}원`);
      }
      if (employee.employmentInsurance > 0) {
        console.log(`- 고용보험: ${employee.employmentInsurance.toLocaleString()}원`);
      }
      if (employee.studentLoanDeduction > 0) {
        console.log(`- 학자금대출: ${employee.studentLoanDeduction.toLocaleString()}원`);
      }
      if (employee.yearEndRetirementSettlement > 0) {
        console.log(`- 연말/퇴직정산: ${employee.yearEndRetirementSettlement.toLocaleString()}원`);
      }
      if (employee.insurancePremiumSettlement > 0) {
        console.log(`- 보험료정산: ${employee.insurancePremiumSettlement.toLocaleString()}원`);
      }
      if (employee.advancePayment > 0) {
        console.log(`- 기지급: ${employee.advancePayment.toLocaleString()}원`);
      }
      if (employee.absenceDeduction > 0) {
        console.log(`- 결근공제: ${employee.absenceDeduction.toLocaleString()}원`);
      }
      
      const totalDeductions = employee.calculatedTotalDeductions || 0;
      console.log(`- **총 공제액: ${totalDeductions.toLocaleString()}원**`);
      console.log('');
      
      // 최종 실지급액
      console.log(`**💵 최종 실지급액: ${(employee.netPay || 0).toLocaleString()}원**`);
      console.log('');
      
      // 계산 검증
      const expectedNet = (employee.grossSalaryPreTax || 0) - totalDeductions;
      const netDifference = Math.abs(expectedNet - (employee.netPay || 0));
      if (netDifference > 1000) {
        console.log(`⚠️ *실지급액 차이: ${netDifference.toLocaleString()}원 (추가 공제항목 존재 가능)*`);
      } else {
        console.log(`✅ *실지급액 검증: 정확*`);
      }
      console.log('');
      console.log('---');
      console.log('');
    });
    
    // 인센티브 분석
    const employeesWithIncentives = result.payrollData.filter(e => (e.incentive || 0) > 0);
    const employeesWithBonuses = result.payrollData.filter(e => (e.bonusReward || 0) > 0);
    
    console.log('## 📈 인센티브 분석');
    console.log('');
    console.log(`- **인센티브 지급 직원**: ${employeesWithIncentives.length}명`);
    console.log(`- **포상금 지급 직원**: ${employeesWithBonuses.length}명`);
    
    if (employeesWithIncentives.length > 0) {
      const avgIncentive = employeesWithIncentives.reduce((sum, e) => sum + (e.incentive || 0), 0) / employeesWithIncentives.length;
      const maxIncentive = Math.max(...employeesWithIncentives.map(e => e.incentive || 0));
      const minIncentive = Math.min(...employeesWithIncentives.map(e => e.incentive || 0));
      
      console.log(`- **평균 인센티브**: ${avgIncentive.toLocaleString()}원`);
      console.log(`- **최고 인센티브**: ${maxIncentive.toLocaleString()}원`);
      console.log(`- **최저 인센티브**: ${minIncentive.toLocaleString()}원`);
    }
    console.log('');
    
    // 급여 구간 분석
    console.log('## 💼 급여 구간별 분석');
    console.log('');
    
    const salaryRanges = [
      { min: 0, max: 1000000, label: '100만원 미만' },
      { min: 1000000, max: 2000000, label: '100만원 이상 200만원 미만' },
      { min: 2000000, max: 3000000, label: '200만원 이상 300만원 미만' },
      { min: 3000000, max: 4000000, label: '300만원 이상 400만원 미만' },
      { min: 4000000, max: 5000000, label: '400만원 이상 500만원 미만' },
      { min: 5000000, max: Infinity, label: '500만원 이상' }
    ];
    
    salaryRanges.forEach(range => {
      const count = result.payrollData.filter(e => {
        const netPay = e.netPay || 0;
        return netPay >= range.min && netPay < range.max;
      }).length;
      
      if (count > 0) {
        console.log(`- **${range.label}**: ${count}명`);
      }
    });
    
    console.log('');
    console.log('---');
    console.log('*문서 생성 완료*');
    
  } catch (error) {
    console.error('❌ 문서 생성 실패:', error.message);
  }
}

generatePayrollDocument().catch(console.error);