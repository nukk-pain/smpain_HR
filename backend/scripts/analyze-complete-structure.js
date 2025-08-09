const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../sample-data/payroll/excel-templates', '연세신명통증의학과_2025년_07월_임금대장_제출.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['급여대장(제출)'];
const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== 급여대장(제출) 시트 완전 분석 ===');
console.log('전체 범위:', sheet['!ref']);

// 헤더 분석 (5-7행)
console.log('\n=== 헤더 구조 분석 ===');
for (let row = 4; row <= 8; row++) {
  const rowData = sheetData[row] || [];
  console.log(`Row ${row + 1}:`, rowData.map((v, i) => `[${String.fromCharCode(65 + i)}] ${v || ''}`).slice(0, 32).join(' | '));
}

// 첫 번째 직원 데이터 분석 (8행)
console.log('\n=== 첫 번째 직원 데이터 (Row 8) ===');
const firstEmployeeRow = sheetData[7] || [];
firstEmployeeRow.slice(0, 32).forEach((value, index) => {
  if (value !== undefined && value !== null && value !== '') {
    const colLetter = String.fromCharCode(65 + index);
    console.log(`[${colLetter}] = ${value}`);
  }
});

// 모든 컬럼 헤더 매핑
console.log('\n=== 전체 컬럼 헤더 매핑 ===');
const headers = sheetData[5] || [];
const subHeaders = sheetData[6] || [];
for (let i = 0; i < 32; i++) {
  const header = headers[i] || '';
  const subHeader = subHeaders[i] || '';
  const colLetter = String.fromCharCode(65 + i);
  console.log(`[${colLetter}] Main: "${header}" / Sub: "${subHeader}"`);
}

// "인센티브" 같은 키워드가 있는 컬럼 찾기
console.log('\n=== 인센티브/추가수당 관련 컬럼 찾기 ===');
const incentiveKeywords = ['인센티브', '상여', '보너스', '추가수당', '포상', '성과급', '식대', '교통비'];
for (let row = 0; row < Math.min(10, sheetData.length); row++) {
  const rowData = sheetData[row] || [];
  rowData.forEach((cell, col) => {
    if (typeof cell === 'string') {
      incentiveKeywords.forEach(keyword => {
        if (cell.includes(keyword)) {
          const colLetter = String.fromCharCode(65 + col);
          console.log(`Found "${keyword}" in ${colLetter}${row + 1}: "${cell}"`);
        }
      });
    }
  });
}

// Row 8의 모든 숫자 데이터 확인 (급여 데이터)
console.log('\n=== Row 8의 모든 데이터 (첫 번째 직원) ===');
const firstRow = sheetData[7] || [];
for (let col = 0; col < 32; col++) {
  const value = firstRow[col];
  const colLetter = String.fromCharCode(65 + col);
  const header = headers[col] || '';
  const subHeader = subHeaders[col] || '';
  
  if (value !== undefined && value !== null && value !== '') {
    console.log(`[${colLetter}] ${header}/${subHeader} = ${value} (${typeof value})`);
  }
}

// 전체 시트에서 큰 숫자 데이터 패턴 분석 (급여성 데이터)
console.log('\n=== 큰 숫자 데이터 패턴 분석 ===');
const salaryData = [];
for (let row = 7; row < Math.min(15, sheetData.length); row++) {
  const rowData = sheetData[row] || [];
  const employeeName = rowData[1]; // B열이 성명
  
  if (employeeName && typeof employeeName === 'string') {
    console.log(`\n직원: ${employeeName} (Row ${row + 1})`);
    
    for (let col = 0; col < 32; col++) {
      const value = rowData[col];
      const colLetter = String.fromCharCode(65 + col);
      const header = headers[col] || '';
      const subHeader = subHeaders[col] || '';
      
      // 큰 숫자만 출력 (급여성 데이터)
      if (typeof value === 'number' && value > 10000) {
        console.log(`  [${colLetter}] ${header}/${subHeader} = ${value.toLocaleString()}원`);
      }
    }
  }
}

// 인센티브 데이터 확인
console.log('\n=== 인센티브 및 추가수당 데이터 확인 ===');
for (let row = 7; row < Math.min(15, sheetData.length); row++) {
  const rowData = sheetData[row] || [];
  const employeeName = rowData[1];
  
  if (employeeName && typeof employeeName === 'string') {
    console.log(`\n직원: ${employeeName} (Row ${row + 1})`);
    console.log(`  N열 (고정인센티브/인센티브): ${rowData[13] || 0}`);
    console.log(`  O열 (식대): ${rowData[14] || 0}`); 
    console.log(`  P열 (추가수당): ${rowData[15] || 0}`);
    console.log(`  Q열 (포상금): ${rowData[16] || 0}`);
    console.log(`  T열 (지급계/총급여): ${rowData[19] || 0}`);
  }
}