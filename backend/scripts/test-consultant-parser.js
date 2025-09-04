// AI-HEADER
// Intent: Test the labor consultant parser with real payroll Excel files
// Domain Meaning: Validate parser functionality with actual consultant data
// Misleading Names: test vs validate - both verify parser functionality
// Data Contracts: Must handle real payroll data securely for testing
// PII: Contains actual employee data - anonymize output for security
// Invariants: Must successfully parse without exposing sensitive information
// RAG Keywords: parser testing, payroll validation, consultant data processing

require('dotenv').config({ path: '.env.development' });
const LaborConsultantParser = require('../utils/laborConsultantParser');
const path = require('path');
const fs = require('fs');

class ConsultantParserTester {
  constructor() {
    this.parser = new LaborConsultantParser();
    this.sampleDataPath = path.join(__dirname, '../../sample-data/payroll/excel-templates');
  }

  async testAllFiles() {
    console.log('🧪 Testing Labor Consultant Parser...\n');
    
    try {
      // 노무사 파일 찾기
      const consultantFile = this.findConsultantFile();
      
      if (!consultantFile) {
        console.log('❌ No labor consultant file found');
        return;
      }
      
      // 파서 테스트
      await this.testParser(consultantFile);
      
    } catch (error) {
      console.error('❌ Parser test failed:', error.message);
    }
  }

  findConsultantFile() {
    const files = fs.readdirSync(this.sampleDataPath);
    
    // 연세신명통증의학과 파일 찾기
    const consultantFile = files.find(file => 
      file.includes('연세신명') || file.includes('임금대장')
    );
    
    if (consultantFile) {
      console.log(`📄 Found consultant file: ${consultantFile}`);
      return path.join(this.sampleDataPath, consultantFile);
    }
    
    return null;
  }

  async testParser(filePath) {
    console.log('\n🔍 Testing parser with real data...');
    console.log('='.repeat(60));
    
    try {
      // 파일 파싱
      const result = await this.parser.parsePayrollFile(filePath);
      
      // 결과 분석
      this.analyzeResults(result);
      
      // 시스템 포맷 변환 테스트
      this.testSystemFormatConversion(result);
      
    } catch (error) {
      console.error('❌ Parsing failed:', error.message);
      throw error;
    }
  }

  analyzeResults(result) {
    console.log('\n📊 PARSING RESULTS ANALYSIS');
    console.log('-'.repeat(40));
    
    console.log(`✅ Total records parsed: ${result.totalRecords}`);
    console.log(`📅 Extracted at: ${result.extractedAt.toISOString()}`);
    console.log(`📄 Source file: ${result.sourceFile}`);
    
    if (result.payrollData && result.payrollData.length > 0) {
      console.log('\n👥 EMPLOYEE DATA ANALYSIS (Anonymized)');
      console.log('-'.repeat(40));
      
      // 통계 분석 (개인정보 제외)
      const stats = this.calculateStatistics(result.payrollData);
      
      console.log(`📈 Salary Statistics:`);
      console.log(`  - Average base salary: ${stats.avgBaseSalary.toLocaleString()}원`);
      console.log(`  - Min base salary: ${stats.minBaseSalary.toLocaleString()}원`);
      console.log(`  - Max base salary: ${stats.maxBaseSalary.toLocaleString()}원`);
      console.log(`  - Total payroll: ${stats.totalPayroll.toLocaleString()}원`);
      
      console.log(`📊 Data Coverage:`);
      console.log(`  - Records with employee ID: ${stats.employeeIdCount}`);
      console.log(`  - Records with department: ${stats.departmentCount}`);
      console.log(`  - Records with deductions: ${stats.deductionsCount}`);
      
      // 첫 번째 레코드 샘플 (익명화)
      console.log('\n🔍 SAMPLE RECORD (Anonymized):');
      console.log('-'.repeat(40));
      this.displayAnonymizedRecord(result.payrollData[0]);
    }
  }

  calculateStatistics(payrollData) {
    const salaries = payrollData.map(r => r.baseSalary || 0).filter(s => s > 0);
    
    return {
      avgBaseSalary: salaries.reduce((sum, s) => sum + s, 0) / salaries.length,
      minBaseSalary: Math.min(...salaries),
      maxBaseSalary: Math.max(...salaries),
      totalPayroll: salaries.reduce((sum, s) => sum + s, 0),
      employeeIdCount: payrollData.filter(r => r.employeeId).length,
      departmentCount: payrollData.filter(r => r.department).length,
      deductionsCount: payrollData.filter(r => r.nationalPension > 0).length
    };
  }

  displayAnonymizedRecord(record) {
    // 개인정보 익명화하여 출력
    console.log(`{
  "name": "${this.anonymizeName(record.name)}",
  "employeeId": "${record.employeeId ? 'SA***' : 'N/A'}",
  "department": "${record.department || 'N/A'}",
  "jobType": "${record.jobType || 'N/A'}",
  "baseSalary": ${record.baseSalary?.toLocaleString() || 0},
  "overtimeAllowance": ${record.overtimeAllowance?.toLocaleString() || 0},
  "holidayAllowance": ${record.holidayAllowance?.toLocaleString() || 0},
  "deductions": {
    "nationalPension": ${record.nationalPension?.toLocaleString() || 0},
    "healthInsurance": ${record.healthInsurance?.toLocaleString() || 0},
    "employmentInsurance": ${record.employmentInsurance?.toLocaleString() || 0},
    "incomeTax": ${record.incomeTax?.toLocaleString() || 0},
    "localIncomeTax": ${record.localIncomeTax?.toLocaleString() || 0}
  },
  "netPay": ${record.netPay?.toLocaleString() || 0},
  "workDays": ${record.workDays || 0},
  "overtimeHours": ${record.overtimeHours || 0}
}`);
  }

  anonymizeName(name) {
    if (!name) return 'N/A';
    if (name.length <= 2) return name.charAt(0) + '*';
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
  }

  testSystemFormatConversion(result) {
    console.log('\n🔄 SYSTEM FORMAT CONVERSION TEST');
    console.log('-'.repeat(40));
    
    try {
      // PayrollRepository 포맷으로 변환
      const systemFormat = this.parser.toPayrollRepositoryFormat(result, 2025, 7);
      
      console.log(`✅ Successfully converted ${systemFormat.length} records to system format`);
      
      // 첫 번째 레코드 구조 확인
      if (systemFormat.length > 0) {
        console.log('\n📝 System Format Sample:');
        const sample = systemFormat[0];
        console.log(`{
  "employeeName": "${this.anonymizeName(sample.employeeName)}",
  "year": ${sample.year},
  "month": ${sample.month},
  "baseSalary": ${sample.baseSalary?.toLocaleString()},
  "allowances": {
    "overtime": ${sample.allowances.overtime?.toLocaleString()},
    "other": ${sample.allowances.other?.toLocaleString()}
  },
  "deductions": {
    "nationalPension": ${sample.deductions.nationalPension?.toLocaleString()},
    "healthInsurance": ${sample.deductions.healthInsurance?.toLocaleString()},
    "employmentInsurance": ${sample.deductions.employmentInsurance?.toLocaleString()},
    "incomeTax": ${sample.deductions.incomeTax?.toLocaleString()},
    "localIncomeTax": ${sample.deductions.localIncomeTax?.toLocaleString()}
  },
  "netSalary": ${sample.netSalary?.toLocaleString()},
  "paymentStatus": "${sample.paymentStatus}"
}`);
      }
      
      // 데이터 무결성 검증
      this.validateDataIntegrity(systemFormat);
      
    } catch (error) {
      console.error('❌ System format conversion failed:', error.message);
    }
  }

  validateDataIntegrity(systemFormat) {
    console.log('\n✅ DATA INTEGRITY VALIDATION');
    console.log('-'.repeat(40));
    
    let validRecords = 0;
    let issues = [];
    
    systemFormat.forEach((record, index) => {
      let recordValid = true;
      
      // 필수 필드 검증
      if (!record.employeeName) {
        issues.push(`Record ${index + 1}: Missing employee name`);
        recordValid = false;
      }
      
      if (!record.baseSalary || record.baseSalary <= 0) {
        issues.push(`Record ${index + 1}: Invalid base salary`);
        recordValid = false;
      }
      
      // 계산 검증
      const totalAllowances = Object.values(record.allowances).reduce((sum, val) => sum + val, 0);
      const totalDeductions = Object.values(record.deductions).reduce((sum, val) => sum + val, 0);
      const expectedNet = record.baseSalary + totalAllowances - totalDeductions;
      
      if (Math.abs(expectedNet - record.netSalary) > 1000) {
        issues.push(`Record ${index + 1}: Net salary calculation mismatch`);
      }
      
      if (recordValid) validRecords++;
    });
    
    console.log(`✅ Valid records: ${validRecords}/${systemFormat.length}`);
    
    if (issues.length > 0) {
      console.log(`⚠️ Issues found:`);
      issues.slice(0, 5).forEach(issue => console.log(`  - ${issue}`));
      if (issues.length > 5) {
        console.log(`  ... and ${issues.length - 5} more issues`);
      }
    } else {
      console.log(`🎉 All records passed integrity validation!`);
    }
  }
}

// 실행
async function main() {
  const tester = new ConsultantParserTester();
  await tester.testAllFiles();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ConsultantParserTester;