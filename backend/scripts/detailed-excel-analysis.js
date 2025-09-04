// AI-HEADER
// Intent: Detailed analysis of Excel payroll files to understand complex structures
// Domain Meaning: Deep dive into labor consultant Excel files for accurate system integration
// Misleading Names: detailed vs comprehensive - both indicate thorough analysis
// Data Contracts: Must handle multi-sheet Excel files with various layouts
// PII: Contains actual employee data - anonymize in output
// Invariants: Must identify actual payroll data sheets among multiple sheets
// RAG Keywords: detailed excel analysis, multi-sheet parsing, payroll data detection

require('dotenv').config({ path: '.env.development' });
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class DetailedExcelAnalyzer {
  constructor() {
    this.sampleDataPath = path.join(__dirname, '../../sample-data/payroll/excel-templates');
  }

  async analyzeAllFiles() {
    console.log('🔬 Starting detailed Excel analysis...\n');
    
    const files = fs.readdirSync(this.sampleDataPath).filter(file => 
      file.endsWith('.xlsx') || file.endsWith('.xls')
    );

    for (const file of files) {
      await this.deepAnalyzeFile(path.join(this.sampleDataPath, file));
    }
  }

  async deepAnalyzeFile(filePath) {
    console.log(`\n🔍 DETAILED ANALYSIS: ${path.basename(filePath)}`);
    console.log('='.repeat(80));
    
    try {
      const workbook = XLSX.readFile(filePath);
      
      console.log(`📋 Total sheets: ${workbook.SheetNames.length}`);
      console.log(`📋 Sheet names: ${workbook.SheetNames.join(', ')}`);
      
      // 각 시트를 상세 분석
      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        await this.analyzeSheetInDetail(workbook.Sheets[sheetName], sheetName, i + 1);
      }
      
    } catch (error) {
      console.error(`❌ Error analyzing ${path.basename(filePath)}:`, error.message);
    }
  }

  async analyzeSheetInDetail(sheet, sheetName, sheetIndex) {
    console.log(`\n📊 SHEET ${sheetIndex}: "${sheetName}"`);
    console.log('-'.repeat(50));
    
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    console.log(`📐 Range: ${sheet['!ref']} (${range.e.r + 1} rows × ${range.e.c + 1} cols)`);
    
    // 첫 10행의 내용 분석
    console.log('\n🔤 First 10 rows analysis:');
    for (let row = 0; row <= Math.min(9, range.e.r); row++) {
      const rowData = [];
      let hasContent = false;
      
      for (let col = 0; col <= Math.min(10, range.e.c); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        const value = cell ? cell.v : '';
        
        if (value) hasContent = true;
        rowData.push(value);
      }
      
      if (hasContent) {
        console.log(`  Row ${row + 1}: [${rowData.map(v => 
          v ? (typeof v === 'string' ? `"${v.substring(0, 15)}${v.length > 15 ? '...' : ''}"`
                                    : v.toString()) 
            : '""'
        ).join(', ')}]`);
      }
    }
    
    // 가능한 헤더 행 찾기
    const possibleHeaders = this.findPossibleHeaders(sheet, range);
    if (possibleHeaders.length > 0) {
      console.log('\n🏷️  Possible header rows:');
      possibleHeaders.forEach(header => {
        console.log(`  Row ${header.row}: ${header.headers.slice(0, 8).map(h => `"${h}"`).join(', ')}${header.headers.length > 8 ? '...' : ''}`);
      });
    }
    
    // 급여 관련 키워드 찾기
    const payrollKeywords = this.findPayrollKeywords(sheet, range);
    if (payrollKeywords.length > 0) {
      console.log('\n💰 Payroll-related keywords found:');
      payrollKeywords.forEach(keyword => {
        console.log(`  "${keyword.text}" at ${keyword.address} (Row ${keyword.row + 1}, Col ${keyword.col + 1})`);
      });
    }
    
    // 숫자 데이터 패턴 분석
    this.analyzeNumericPatterns(sheet, range, sheetName);
  }

  findPossibleHeaders(sheet, range) {
    const possibleHeaders = [];
    
    // 처음 20행에서 헤더 같은 패턴 찾기
    for (let row = 0; row <= Math.min(19, range.e.r); row++) {
      const rowData = [];
      let textCount = 0;
      let numberCount = 0;
      
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        const value = cell ? cell.v : '';
        
        if (value) {
          rowData.push(value.toString());
          if (typeof value === 'string') textCount++;
          else if (typeof value === 'number') numberCount++;
        }
      }
      
      // 헤더 조건: 텍스트가 많고, 연속된 셀에 값이 있음
      if (textCount > numberCount && textCount >= 3 && rowData.length >= 3) {
        possibleHeaders.push({
          row: row + 1,
          headers: rowData.filter(v => v),
          textCount,
          numberCount
        });
      }
    }
    
    return possibleHeaders;
  }

  findPayrollKeywords(sheet, range) {
    const keywords = [
      '사번', '성명', '이름', '부서', '직급', '기본급', '급여', '수당', '상여',
      '시간외', '연장', '야간', '휴일', '식대', '교통비', '직책수당',
      '국민연금', '건강보험', '고용보험', '소득세', '지방소득세', '공제',
      '실지급', '실급여', '차인지급', '지급액', '총지급', '총공제'
    ];
    
    const found = [];
    
    for (let row = 0; row <= range.e.r; row++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        
        if (cell && typeof cell.v === 'string') {
          const cellText = cell.v.toString().trim();
          
          keywords.forEach(keyword => {
            if (cellText.includes(keyword)) {
              found.push({
                text: cellText,
                keyword: keyword,
                address: cellAddress,
                row: row,
                col: col
              });
            }
          });
        }
      }
    }
    
    return found;
  }

  analyzeNumericPatterns(sheet, range, sheetName) {
    console.log('\n📊 Numeric data patterns:');
    
    let totalNumbers = 0;
    let largeNumbers = 0; // > 10000 (급여 같은 큰 수)
    let smallNumbers = 0; // < 100 (개수, 비율 등)
    let zeroCount = 0;
    
    const sampleNumbers = [];
    
    for (let row = 0; row <= range.e.r; row++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        
        if (cell && typeof cell.v === 'number') {
          totalNumbers++;
          const value = cell.v;
          
          if (value === 0) zeroCount++;
          else if (value > 10000) largeNumbers++;
          else if (value < 100) smallNumbers++;
          
          // 샘플 수집 (큰 수 우선)
          if (sampleNumbers.length < 10 && value > 1000) {
            sampleNumbers.push({
              value: value,
              address: cellAddress,
              row: row + 1,
              col: col + 1
            });
          }
        }
      }
    }
    
    console.log(`  📈 Total numeric cells: ${totalNumbers}`);
    console.log(`  💰 Large numbers (>10K): ${largeNumbers} (possibly salary amounts)`);
    console.log(`  🔢 Small numbers (<100): ${smallNumbers} (possibly counts/rates)`);
    console.log(`  ⭕ Zero values: ${zeroCount}`);
    
    if (sampleNumbers.length > 0) {
      console.log(`  🎯 Sample large values:`);
      sampleNumbers.slice(0, 5).forEach(sample => {
        console.log(`    ${sample.value.toLocaleString()} at ${sample.address} (Row ${sample.row})`);
      });
    }
    
    // 급여 데이터 가능성 판단
    const salaryLikelihood = this.calculateSalaryLikelihood(totalNumbers, largeNumbers, sheetName);
    console.log(`  🎯 Salary data likelihood: ${salaryLikelihood}%`);
  }

  calculateSalaryLikelihood(totalNumbers, largeNumbers, sheetName) {
    let score = 0;
    
    // 큰 숫자의 비율
    if (totalNumbers > 0) {
      const largeRatio = largeNumbers / totalNumbers;
      score += largeRatio * 40;
    }
    
    // 시트 이름에 급여 관련 키워드
    const salaryKeywords = ['급여', '임금', '급여대장', 'salary', 'payroll', '급여명세'];
    if (salaryKeywords.some(keyword => sheetName.includes(keyword))) {
      score += 30;
    }
    
    // 최소 데이터량
    if (largeNumbers > 10) score += 20;
    if (totalNumbers > 50) score += 10;
    
    return Math.min(100, Math.round(score));
  }
}

// 실행
async function main() {
  const analyzer = new DetailedExcelAnalyzer();
  await analyzer.analyzeAllFiles();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DetailedExcelAnalyzer;