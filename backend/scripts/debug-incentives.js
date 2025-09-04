const LaborConsultantParser = require('../utils/laborConsultantParser');
const path = require('path');

async function debugIncentiveExtraction() {
  console.log('🔬 DEBUGGING INCENTIVE EXTRACTION');
  console.log('='.repeat(60));
  
  const parser = new LaborConsultantParser();
  const filePath = path.join(__dirname, '../../sample-data/payroll/excel-templates', '연세신명통증의학과_2025년_07월_임금대장_제출.xlsx');
  
  try {
    const result = await parser.parsePayrollFile(filePath);
    
    console.log('\n📋 EXTRACTED RECORDS WITH INCENTIVE DATA:');
    console.log('-'.repeat(40));
    
    result.payrollData.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.name}:`);
      
      // Basic info
      console.log(`   기본급: ${(record.baseSalary || 0).toLocaleString()}원`);
      console.log(`   연장근로수당: ${(record.overtimeAllowance || 0).toLocaleString()}원`);
      
      // CRITICAL INCENTIVE FIELDS
      console.log(`   🎯 고정인센티브: ${(record.fixedIncentive || 0).toLocaleString()}원`);
      console.log(`   🎯 인센티브: ${(record.incentive || 0).toLocaleString()}원`);
      console.log(`   🎯 포상금: ${(record.bonusReward || 0).toLocaleString()}원`);
      
      // Additional allowances
      console.log(`   식대: ${(record.mealAllowance || 0).toLocaleString()}원`);
      console.log(`   추가수당: ${(record.additionalAllowance || 0).toLocaleString()}원`);
      console.log(`   소급분: ${(record.retroactivePay || 0).toLocaleString()}원`);
      
      // CRITICAL GROSS SALARY
      console.log(`   🎯 총급여(세전): ${(record.grossSalaryPreTax || 0).toLocaleString()}원`);
      console.log(`   계산된 총수당: ${(record.totalAllowances || 0).toLocaleString()}원`);
      
      // Verification
      const expectedGross = (record.baseSalary || 0) + (record.totalAllowances || 0);
      console.log(`   예상 총급여: ${expectedGross.toLocaleString()}원`);
      console.log(`   실지급액: ${(record.netPay || 0).toLocaleString()}원`);
      
      if (record.incentive && record.incentive > 0) {
        console.log(`   ✅ 인센티브 데이터 발견!`);
      } else {
        console.log(`   ❌ 인센티브 데이터 없음`);
      }
    });
    
    console.log('\n📊 INCENTIVE STATISTICS:');
    console.log('-'.repeat(40));
    
    const withIncentives = result.payrollData.filter(r => (r.incentive || 0) > 0);
    const withFixedIncentives = result.payrollData.filter(r => (r.fixedIncentive || 0) > 0);
    const withBonuses = result.payrollData.filter(r => (r.bonusReward || 0) > 0);
    const withMealAllowance = result.payrollData.filter(r => (r.mealAllowance || 0) > 0);
    
    console.log(`인센티브 있는 직원: ${withIncentives.length}/${result.payrollData.length}`);
    console.log(`고정인센티브 있는 직원: ${withFixedIncentives.length}/${result.payrollData.length}`);
    console.log(`포상금 있는 직원: ${withBonuses.length}/${result.payrollData.length}`);
    console.log(`식대 있는 직원: ${withMealAllowance.length}/${result.payrollData.length}`);
    
    if (withIncentives.length > 0) {
      const avgIncentive = withIncentives.reduce((sum, r) => sum + (r.incentive || 0), 0) / withIncentives.length;
      console.log(`평균 인센티브: ${avgIncentive.toLocaleString()}원`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugIncentiveExtraction().catch(console.error);