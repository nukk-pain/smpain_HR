// AI-HEADER
// Intent: Analyze real payroll Excel files from labor consultants to understand data structure
// Domain Meaning: Parse actual payroll files to determine system integration requirements
// Misleading Names: analyze vs parse - this script examines structure for integration planning
// Data Contracts: Must handle actual payroll files with real employee data securely
// PII: Contains real employee salary data - handle with maximum security
// Invariants: Must never expose actual employee data, only structural analysis
// RAG Keywords: payroll file analysis, excel structure, labor consultant integration

require('dotenv').config({ path: '.env.development' });
const ExcelAnalyzer = require('../utils/excelAnalyzer');
const path = require('path');
const fs = require('fs');

class PayrollFileAnalyzer {
  constructor() {
    this.analyzer = new ExcelAnalyzer();
    this.sampleDataPath = path.join(__dirname, '../../sample-data/payroll');
  }

  async analyzeAllPayrollFiles() {
    console.log('🚀 Starting payroll file analysis...\n');
    
    try {
      // Excel 파일들 분석
      await this.analyzeExcelFiles();
      
      // PDF 파일들 분석 (구조만)
      await this.analyzePDFFiles();
      
      console.log('\n✅ Analysis completed successfully!');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
    }
  }

  async analyzeExcelFiles() {
    console.log('📊 Analyzing Excel files...');
    
    const excelPath = path.join(this.sampleDataPath, 'excel-templates');
    if (!fs.existsSync(excelPath)) {
      console.log('No Excel files directory found');
      return;
    }

    const files = fs.readdirSync(excelPath).filter(file => 
      file.endsWith('.xlsx') || file.endsWith('.xls')
    );

    for (const file of files) {
      await this.analyzeExcelFile(path.join(excelPath, file));
    }
  }

  async analyzeExcelFile(filePath) {
    try {
      console.log(`\n🔍 Analyzing: ${path.basename(filePath)}`);
      
      // 파일 구조 분석
      const analysis = await this.analyzer.analyzeExcelStructure(filePath);
      
      // 분석 결과 출력 (개인정보는 제외)
      this.displayAnalysisResults(analysis);
      
      // 시스템 통합 권장사항 생성
      this.generateIntegrationRecommendations(analysis);
      
    } catch (error) {
      console.error(`❌ Failed to analyze ${path.basename(filePath)}:`, error.message);
    }
  }

  displayAnalysisResults(analysis) {
    console.log(`
📄 File: ${analysis.fileName}
📏 Size: ${(analysis.fileSize / 1024).toFixed(1)} KB
📋 Sheets: ${analysis.sheets.length}
`);

    // 메인 시트 정보
    if (analysis.mainSheet) {
      console.log(`📊 Main Sheet: ${analysis.mainSheet.sheetName}`);
      console.log(`📝 Headers found: ${analysis.mainSheet.headers.length}`);
      console.log(`📈 Data rows: ${analysis.mainSheet.dataRowCount}`);
      
      // 컬럼 매핑 결과
      const mapping = analysis.recommendedMapping;
      console.log(`🎯 Mapping confidence: ${(mapping.mappingConfidence * 100).toFixed(1)}%`);
      
      console.log('\n✅ Mapped columns:');
      Object.keys(mapping.mapped).forEach(koreanHeader => {
        const systemField = mapping.mapped[koreanHeader].systemField;
        console.log(`  "${koreanHeader}" → ${systemField}`);
      });
      
      if (mapping.unmapped.length > 0) {
        console.log('\n⚠️  Unmapped columns:');
        mapping.unmapped.forEach(col => {
          console.log(`  "${col.header}" (suggestions: ${col.suggested.length})`);
        });
      }
    }
  }

  generateIntegrationRecommendations(analysis) {
    console.log('\n🔧 Integration Recommendations:');
    
    const mapping = analysis.recommendedMapping;
    
    // API 매핑 코드 생성 예시
    console.log('\n💾 Suggested API mapping:');
    console.log('```javascript');
    console.log('const columnMapping = {');
    
    Object.keys(mapping.mapped).forEach(koreanHeader => {
      const systemField = mapping.mapped[koreanHeader].systemField;
      console.log(`  "${koreanHeader}": "${systemField}",`);
    });
    
    console.log('};');
    console.log('```');
    
    // PayrollRepository 필드 매핑
    console.log('\n🗃️  PayrollRepository field mapping:');
    const payrollFields = this.generatePayrollFieldMapping(mapping.mapped);
    console.log(JSON.stringify(payrollFields, null, 2));
  }

  generatePayrollFieldMapping(mappedColumns) {
    const payrollStructure = {
      basicInfo: {},
      allowances: {},
      deductions: {},
      totals: {}
    };

    Object.keys(mappedColumns).forEach(koreanHeader => {
      const systemField = mappedColumns[koreanHeader].systemField;
      
      // 기본 정보
      if (['employeeId', 'name', 'department', 'position'].includes(systemField)) {
        payrollStructure.basicInfo[systemField] = koreanHeader;
      }
      // 수당
      else if (systemField.includes('Allowance') || systemField === 'baseSalary' || systemField === 'bonus') {
        payrollStructure.allowances[systemField] = koreanHeader;
      }
      // 공제
      else if (['nationalPension', 'healthInsurance', 'employmentInsurance', 'incomeTax', 'localIncomeTax'].includes(systemField)) {
        payrollStructure.deductions[systemField] = koreanHeader;
      }
      // 합계
      else if (systemField === 'netPay') {
        payrollStructure.totals[systemField] = koreanHeader;
      }
    });

    return payrollStructure;
  }

  async analyzePDFFiles() {
    console.log('\n📄 Analyzing PDF files...');
    
    const pdfPath = path.join(this.sampleDataPath, 'payslips-pdf');
    if (!fs.existsSync(pdfPath)) {
      console.log('No PDF files directory found');
      return;
    }

    const files = fs.readdirSync(pdfPath).filter(file => 
      file.endsWith('.pdf')
    );

    console.log(`📋 Found ${files.length} PDF payslip files`);
    
    // PDF 파일 구조 분석 (파일명 패턴 분석)
    this.analyzePDFNamingPatterns(files);
  }

  analyzePDFNamingPatterns(files) {
    console.log('\n🏷️  PDF naming pattern analysis:');
    
    const patterns = [];
    files.forEach(filename => {
      // 개인정보 보호를 위해 패턴만 분석
      const parts = filename.split('_');
      if (parts.length > 1) {
        patterns.push({
          partCount: parts.length,
          hasDate: /\d{6}|\d{4}/.test(filename),
          hasEmployeeName: parts.length >= 3,
          extension: path.extname(filename)
        });
      }
    });

    // 패턴 통계
    console.log(`📊 Naming pattern statistics:`);
    console.log(`  - Files with date pattern: ${patterns.filter(p => p.hasDate).length}`);
    console.log(`  - Files with employee identifier: ${patterns.filter(p => p.hasEmployeeName).length}`);
    console.log(`  - Average filename parts: ${(patterns.reduce((sum, p) => sum + p.partCount, 0) / patterns.length).toFixed(1)}`);
    
    // 권장 파일명 구조
    console.log('\n💡 Recommended PDF file structure for system:');
    console.log('  payslip_{employeeId}_{YYYY}_{MM}.pdf');
    console.log('  Example: payslip_E001_2025_01.pdf');
  }
}

// 실행
async function main() {
  const analyzer = new PayrollFileAnalyzer();
  await analyzer.analyzeAllPayrollFiles();
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PayrollFileAnalyzer;