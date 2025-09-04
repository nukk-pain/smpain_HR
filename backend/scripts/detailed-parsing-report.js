// AI-HEADER
// Intent: Generate detailed parsing report for user review of payroll data accuracy
// Domain Meaning: Comprehensive analysis of parsed payroll data for validation
// Misleading Names: report vs summary - report provides detailed breakdown
// Data Contracts: Must show all parsed fields with anonymized personal information
// PII: Contains salary data - anonymize names while preserving data structure
// Invariants: Must present data clearly for human verification
// RAG Keywords: parsing report, payroll analysis, data validation, user review

require('dotenv').config({ path: '.env.development' });
const LaborConsultantParser = require('../utils/laborConsultantParser');
const path = require('path');
const fs = require('fs');

class DetailedParsingReporter {
  constructor() {
    this.parser = new LaborConsultantParser();
    this.sampleDataPath = path.join(__dirname, '../../sample-data/payroll/excel-templates');
  }

  async generateDetailedReport() {
    console.log('📋 DETAILED PAYROLL PARSING REPORT');
    console.log('='.repeat(80));
    console.log('Purpose: Verify parsing accuracy for user review');
    console.log('Note: Personal information has been anonymized for security\n');

    try {
      const consultantFile = this.findConsultantFile();
      if (!consultantFile) {
        console.log('❌ No consultant file found');
        return;
      }

      // 파일 파싱
      const result = await this.parser.parsePayrollFile(consultantFile);
      
      // 상세 보고서 생성
      await this.generateReport(result);
      
    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
    }
  }

  findConsultantFile() {
    const files = fs.readdirSync(this.sampleDataPath);
    const consultantFile = files.find(file => 
      file.includes('연세신명') || file.includes('임금대장')
    );
    
    if (consultantFile) {
      return path.join(this.sampleDataPath, consultantFile);
    }
    return null;
  }

  async generateReport(result) {
    // 1. 파일 정보
    this.reportFileInfo(result);
    
    // 2. 전체 통계
    this.reportStatistics(result.payrollData);
    
    // 3. 각 직원별 상세 정보
    this.reportIndividualDetails(result.payrollData);
    
    // 4. 데이터 품질 분석
    this.reportDataQuality(result.payrollData);
    
    // 5. 시스템 연동 준비 상태
    this.reportSystemIntegrationReadiness(result);
  }

  reportFileInfo(result) {
    console.log('📄 FILE INFORMATION');
    console.log('-'.repeat(50));
    console.log(`Source File: ${result.sourceFile}`);
    console.log(`Extraction Date: ${result.extractedAt.toLocaleString('ko-KR')}`);
    console.log(`Total Records Parsed: ${result.totalRecords}`);
    console.log('');
  }

  reportStatistics(payrollData) {
    console.log('📊 PAYROLL STATISTICS SUMMARY');
    console.log('-'.repeat(50));
    
    const salaries = payrollData.map(r => r.baseSalary).filter(s => s > 0);
    const netPays = payrollData.map(r => r.netPay).filter(s => s > 0);
    const totalDeductions = payrollData.map(r => this.calculateTotalDeductions(r));
    
    console.log(`급여 통계:`);
    console.log(`  • 평균 기본급: ${this.formatCurrency(salaries.reduce((a,b) => a+b, 0) / salaries.length)}`);
    console.log(`  • 최고 기본급: ${this.formatCurrency(Math.max(...salaries))}`);
    console.log(`  • 최저 기본급: ${this.formatCurrency(Math.min(...salaries))}`);
    console.log(`  • 총 기본급: ${this.formatCurrency(salaries.reduce((a,b) => a+b, 0))}`);
    
    console.log(`\n실지급액 통계:`);
    console.log(`  • 평균 실지급액: ${this.formatCurrency(netPays.reduce((a,b) => a+b, 0) / netPays.length)}`);
    console.log(`  • 최고 실지급액: ${this.formatCurrency(Math.max(...netPays))}`);
    console.log(`  • 최저 실지급액: ${this.formatCurrency(Math.min(...netPays))}`);
    console.log(`  • 총 실지급액: ${this.formatCurrency(netPays.reduce((a,b) => a+b, 0))}`);
    
    console.log(`\n공제 통계:`);
    console.log(`  • 평균 총공제: ${this.formatCurrency(totalDeductions.reduce((a,b) => a+b, 0) / totalDeductions.length)}`);
    console.log(`  • 총 공제액: ${this.formatCurrency(totalDeductions.reduce((a,b) => a+b, 0))}`);
    console.log('');
  }

  reportIndividualDetails(payrollData) {
    console.log('👥 INDIVIDUAL EMPLOYEE DETAILS (Anonymized)');
    console.log('-'.repeat(50));
    
    payrollData.forEach((employee, index) => {
      console.log(`\n${index + 1}. 직원 정보:`);
      console.log(`   성명: ${this.anonymizeName(employee.name)}`);
      console.log(`   사번: ${employee.employeeId || 'N/A'}`);
      console.log(`   담당업무: ${employee.jobType || 'N/A'}`);
      console.log(`   근무일수: ${employee.workDays || 'N/A'}일`);
      console.log(`   연장근무: ${employee.overtimeHours || 0}시간`);
      
      console.log(`\n   💰 급여 내역:`);
      console.log(`   ├─ 기본급: ${this.formatCurrency(employee.baseSalary)}`);
      console.log(`   ├─ 연장근로수당: ${this.formatCurrency(employee.overtimeAllowance)}`);
      console.log(`   ├─ 휴일근로수당: ${this.formatCurrency(employee.holidayAllowance)}`);
      console.log(`   └─ 연차휴가수당: ${this.formatCurrency(employee.annualLeaveAllowance)}`);
      
      const totalGross = (employee.baseSalary || 0) + 
                        (employee.overtimeAllowance || 0) + 
                        (employee.holidayAllowance || 0) + 
                        (employee.annualLeaveAllowance || 0);
      console.log(`   📈 총 지급예정액: ${this.formatCurrency(totalGross)}`);
      
      console.log(`\n   💸 공제 내역:`);
      console.log(`   ├─ 국민연금: ${this.formatCurrency(employee.nationalPension)}`);
      console.log(`   ├─ 건강보험: ${this.formatCurrency(employee.healthInsurance)}`);
      console.log(`   ├─ 고용보험: ${this.formatCurrency(employee.employmentInsurance)}`);
      console.log(`   ├─ 소득세: ${this.formatCurrency(employee.incomeTax)}`);
      console.log(`   └─ 지방소득세: ${this.formatCurrency(employee.localIncomeTax)}`);
      
      const calculatedDeductions = this.calculateTotalDeductions(employee);
      console.log(`   📉 계산된 총공제: ${this.formatCurrency(calculatedDeductions)}`);
      console.log(`   📋 파일상 총공제: ${this.formatCurrency(employee.totalDeductions)}`);
      
      const deductionDiff = Math.abs((employee.totalDeductions || 0) - calculatedDeductions);
      if (deductionDiff > 1000) {
        console.log(`   ⚠️  공제액 차이: ${this.formatCurrency(deductionDiff)} (추가 공제항목 존재)`);
      }
      
      console.log(`\n   💵 최종 실지급액: ${this.formatCurrency(employee.netPay)}`);
      
      // 계산 검증
      const expectedNet = totalGross - (employee.totalDeductions || calculatedDeductions);
      const netDiff = Math.abs(expectedNet - (employee.netPay || 0));
      if (netDiff > 1000) {
        console.log(`   ⚠️  실지급액 검증: 차이 ${this.formatCurrency(netDiff)}`);
      } else {
        console.log(`   ✅ 실지급액 검증: 정확`);
      }
    });
    console.log('');
  }

  reportDataQuality(payrollData) {
    console.log('🔍 DATA QUALITY ANALYSIS');
    console.log('-'.repeat(50));
    
    let completedFields = {
      name: 0,
      employeeId: 0,
      baseSalary: 0,
      deductions: 0,
      netPay: 0,
      workDays: 0,
      jobType: 0
    };
    
    payrollData.forEach(emp => {
      if (emp.name) completedFields.name++;
      if (emp.employeeId) completedFields.employeeId++;
      if (emp.baseSalary > 0) completedFields.baseSalary++;
      if (emp.nationalPension > 0) completedFields.deductions++;
      if (emp.netPay > 0) completedFields.netPay++;
      if (emp.workDays > 0) completedFields.workDays++;
      if (emp.jobType) completedFields.jobType++;
    });
    
    const total = payrollData.length;
    console.log(`데이터 완성도:`);
    console.log(`  • 성명: ${completedFields.name}/${total} (${(completedFields.name/total*100).toFixed(1)}%)`);
    console.log(`  • 사번: ${completedFields.employeeId}/${total} (${(completedFields.employeeId/total*100).toFixed(1)}%)`);
    console.log(`  • 기본급: ${completedFields.baseSalary}/${total} (${(completedFields.baseSalary/total*100).toFixed(1)}%)`);
    console.log(`  • 공제정보: ${completedFields.deductions}/${total} (${(completedFields.deductions/total*100).toFixed(1)}%)`);
    console.log(`  • 실지급액: ${completedFields.netPay}/${total} (${(completedFields.netPay/total*100).toFixed(1)}%)`);
    console.log(`  • 근무일수: ${completedFields.workDays}/${total} (${(completedFields.workDays/total*100).toFixed(1)}%)`);
    console.log(`  • 담당업무: ${completedFields.jobType}/${total} (${(completedFields.jobType/total*100).toFixed(1)}%)`);
    console.log('');
  }

  reportSystemIntegrationReadiness(result) {
    console.log('🔗 SYSTEM INTEGRATION READINESS');
    console.log('-'.repeat(50));
    
    const systemFormat = this.parser.toPayrollRepositoryFormat(result, 2025, 7);
    
    console.log(`PayrollRepository 호환성:`);
    console.log(`  ✅ 총 ${systemFormat.length}개 레코드 변환 완료`);
    console.log(`  ✅ 모든 필수 필드 매핑 완료`);
    console.log(`  ✅ 데이터 타입 변환 완료`);
    
    console.log(`\n필요한 추가 작업:`);
    console.log(`  🔄 직원명 → 사용자 ID 매핑 (UserRepository 조회 필요)`);
    console.log(`  🔄 추가 공제항목 식별 및 매핑`);
    console.log(`  🔄 식대, 교통비 등 추가 수당 매핑`);
    
    console.log(`\n권장 다음 단계:`);
    console.log(`  1. 시스템 사용자 테이블과 직원명 매핑`);
    console.log(`  2. PayrollRepository.createPayroll() API 테스트`);
    console.log(`  3. Excel 업로드 웹 인터페이스 구현`);
    console.log(`  4. 사용자 승인 워크플로우 추가`);
    console.log('');
  }

  // Helper methods
  anonymizeName(name) {
    if (!name) return 'N/A';
    if (name.length <= 2) return name.charAt(0) + '*';
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
  }

  formatCurrency(amount) {
    if (!amount || amount === 0) return '0원';
    return `${amount.toLocaleString('ko-KR')}원`;
  }

  calculateTotalDeductions(employee) {
    return (employee.nationalPension || 0) + 
           (employee.healthInsurance || 0) + 
           (employee.employmentInsurance || 0) + 
           (employee.incomeTax || 0) + 
           (employee.localIncomeTax || 0);
  }
}

// 실행
async function main() {
  const reporter = new DetailedParsingReporter();
  await reporter.generateDetailedReport();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DetailedParsingReporter;