const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../sample-data/payroll/excel-templates', '연세신명통증의학과_2025년_07월_임금대장_제출.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['급여대장(제출)'];
const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== Row 9 분석 (신홍재 서브 데이터) ===');
const row9 = sheetData[8] || [];
for (let col = 0; col < 32; col++) {
  const value = row9[col];
  if (value !== undefined && value !== null && value !== '' && value !== 0) {
    const colLetter = String.fromCharCode(65 + col);
    console.log(`[${colLetter}] = ${value}`);
  }
}

console.log('\n=== 모든 직원의 인센티브 데이터 체크 ===');
for (let row = 7; row < Math.min(20, sheetData.length); row++) {
  const rowData = sheetData[row] || [];
  const employeeName = rowData[1];
  
  // N열에서 큰 값 찾기
  if (rowData[13] && typeof rowData[13] === 'number' && rowData[13] > 10000) {
    console.log(`Row ${row + 1}: N열 인센티브 = ${rowData[13].toLocaleString()}원`);
  }
  
  // Q열에서 큰 값 찾기  
  if (rowData[16] && typeof rowData[16] === 'number' && rowData[16] > 10000) {
    console.log(`Row ${row + 1}: Q열 포상금 = ${rowData[16].toLocaleString()}원`);
  }
}

console.log('\n=== 실제 인센티브가 있는지 전체 시트 스캔 ===');
let foundIncentives = false;
for (let row = 0; row < sheetData.length; row++) {
  const rowData = sheetData[row] || [];
  for (let col = 13; col <= 16; col++) { // N, O, P, Q 열
    const value = rowData[col];
    if (typeof value === 'number' && value > 100000) {
      const colLetter = String.fromCharCode(65 + col);
      console.log(`큰 값 발견: Row ${row + 1}, Col ${colLetter} = ${value.toLocaleString()}원`);
      foundIncentives = true;
    }
  }
}

if (!foundIncentives) {
  console.log('N-Q열에서 큰 인센티브 값을 찾지 못했습니다. 다른 열을 확인해보겠습니다.');
  
  // 전체 시트에서 "인센티브" 관련 큰 값 찾기
  for (let row = 0; row < sheetData.length; row++) {
    const rowData = sheetData[row] || [];
    for (let col = 0; col < 32; col++) {
      const value = rowData[col];
      if (typeof value === 'number' && value > 500000 && value < 10000000) {
        const colLetter = String.fromCharCode(65 + col);
        console.log(`의심스러운 큰 값: Row ${row + 1}, Col ${colLetter} = ${value.toLocaleString()}원`);
      }
    }
  }
}