const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.tempDir = path.join(__dirname, 'temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Generate Excel payroll report
  async generatePayrollExcelReport(data, options = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('급여 보고서');

    // Set worksheet properties
    worksheet.properties.defaultRowHeight = 20;

    // Title
    const titleRow = worksheet.addRow([`${options.yearMonth || ''} 급여 보고서`]);
    titleRow.getCell(1).font = { size: 16, bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:K1');
    
    // Add empty row
    worksheet.addRow([]);

    // Headers
    const headers = [
      '사원번호', '성명', '부서', '직급',
      '기본급', '인센티브', '상여금', '포상금',
      '지급총액', '실지급액', '차액'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    let totalBaseSalary = 0;
    let totalIncentive = 0;
    let totalBonus = 0;
    let totalAward = 0;
    let totalGross = 0;
    let totalNet = 0;
    let totalDifference = 0;

    data.forEach(row => {
      const dataRow = worksheet.addRow([
        row.employeeId || '',
        row.name || '',
        row.department || '',
        row.position || '',
        row.baseSalary || 0,
        row.incentive || 0,
        row.bonus || 0,
        row.award || 0,
        row.totalInput || 0,
        row.actualPayment || 0,
        row.difference || 0
      ]);

      // Accumulate totals
      totalBaseSalary += row.baseSalary || 0;
      totalIncentive += row.incentive || 0;
      totalBonus += row.bonus || 0;
      totalAward += row.award || 0;
      totalGross += row.totalInput || 0;
      totalNet += row.actualPayment || 0;
      totalDifference += row.difference || 0;
    });

    // Add total row
    const totalRow = worksheet.addRow([
      '', '합계', '', '',
      totalBaseSalary,
      totalIncentive,
      totalBonus,
      totalAward,
      totalGross,
      totalNet,
      totalDifference
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC' }
    };

    // Format columns
    worksheet.columns = [
      { width: 12 }, // 사원번호
      { width: 15 }, // 성명
      { width: 12 }, // 부서
      { width: 12 }, // 직급
      { width: 15 }, // 기본급
      { width: 15 }, // 인센티브
      { width: 12 }, // 상여금
      { width: 12 }, // 포상금
      { width: 15 }, // 지급총액
      { width: 15 }, // 실지급액
      { width: 12 }  // 차액
    ];

    // Number formatting for currency columns
    for (let rowNum = 4; rowNum <= worksheet.rowCount; rowNum++) {
      for (let colNum = 5; colNum <= 11; colNum++) {
        const cell = worksheet.getCell(rowNum, colNum);
        cell.numFmt = '#,##0';
        if (colNum === 11 && cell.value < 0) { // 차액이 음수인 경우
          cell.font = { color: { argb: 'FFFF0000' } };
        }
      }
    }

    // Add borders
    for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
      for (let colNum = 1; colNum <= 11; colNum++) {
        const cell = worksheet.getCell(rowNum, colNum);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    // Add summary at the bottom
    worksheet.addRow([]);
    const summaryStartRow = worksheet.rowCount + 1;
    
    worksheet.addRow(['요약 정보']);
    worksheet.getCell(summaryStartRow, 1).font = { bold: true, size: 14 };
    
    worksheet.addRow(['총 직원 수:', data.length, '명']);
    worksheet.addRow(['총 지급액:', totalGross, '원']);
    worksheet.addRow(['총 실지급액:', totalNet, '원']);
    worksheet.addRow(['총 차액:', totalDifference, '원']);

    // Format summary numbers
    for (let i = 0; i < 4; i++) {
      const row = summaryStartRow + 1 + i;
      if (i > 0) {
        worksheet.getCell(row, 2).numFmt = '#,##0';
      }
    }

    return workbook;
  }

  // Generate comparison report
  async generateComparisonReport(comparisonData, options = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('차액 비교 보고서');

    // Title
    const titleRow = worksheet.addRow([`${options.yearMonth || ''} 급여 차액 비교 보고서`]);
    titleRow.getCell(1).font = { size: 16, bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:N1');
    
    worksheet.addRow([]);

    // Headers
    const headers = [
      '사원번호', '성명', '상태',
      '시스템 지급총액', '업로드 지급총액', '지급총액 차액',
      '시스템 실지급액', '업로드 실지급액', '실지급액 차액',
      '기본급 차액', '인센티브 차액', '상여금 차액', '포상금 차액', '비고'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    comparisonData.details.forEach(item => {
      const status = item.status === 'match' ? '일치' :
                    item.status === 'different' ? '차이' :
                    item.status === 'not_found' ? '미발견' : '오류';

      const row = worksheet.addRow([
        item.employeeId,
        item.name,
        status,
        item.system?.totalInput || 0,
        item.uploaded?.['지급총액'] || 0,
        item.differences?.totalInput || 0,
        item.system?.actualPayment || 0,
        item.uploaded?.['실지급액'] || 0,
        item.differences?.actualPayment || 0,
        item.differences?.baseSalary || 0,
        item.differences?.incentive || 0,
        item.differences?.bonus || 0,
        item.differences?.award || 0,
        item.errors.join(', ')
      ]);

      // Color coding based on status
      if (item.status === 'different') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
      } else if (item.status === 'not_found') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEECC' }
        };
      } else if (item.status === 'invalid') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDDDDD' }
        };
      }
    });

    // Format columns
    worksheet.columns = [
      { width: 12 }, // 사원번호
      { width: 15 }, // 성명
      { width: 10 }, // 상태
      { width: 18 }, // 시스템 지급총액
      { width: 18 }, // 업로드 지급총액
      { width: 15 }, // 지급총액 차액
      { width: 18 }, // 시스템 실지급액
      { width: 18 }, // 업로드 실지급액
      { width: 15 }, // 실지급액 차액
      { width: 12 }, // 기본급 차액
      { width: 12 }, // 인센티브 차액
      { width: 12 }, // 상여금 차액
      { width: 12 }, // 포상금 차액
      { width: 20 }  // 비고
    ];

    // Number formatting
    for (let rowNum = 4; rowNum <= worksheet.rowCount; rowNum++) {
      for (let colNum = 4; colNum <= 13; colNum++) {
        const cell = worksheet.getCell(rowNum, colNum);
        cell.numFmt = '#,##0';
        
        // Highlight negative differences
        if (colNum >= 6 && colNum <= 13 && cell.value < 0) {
          cell.font = { color: { argb: 'FFFF0000' } };
        }
      }
    }

    // Add borders
    for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
      for (let colNum = 1; colNum <= 14; colNum++) {
        const cell = worksheet.getCell(rowNum, colNum);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    // Add summary
    worksheet.addRow([]);
    const summaryStartRow = worksheet.rowCount + 1;
    
    worksheet.addRow(['비교 결과 요약']);
    worksheet.getCell(summaryStartRow, 1).font = { bold: true, size: 14 };
    
    worksheet.addRow(['총 건수:', comparisonData.total]);
    worksheet.addRow(['일치:', comparisonData.matches]);
    worksheet.addRow(['차이:', comparisonData.differences]);
    worksheet.addRow(['미발견:', comparisonData.notFound]);
    worksheet.addRow(['오류:', comparisonData.invalid]);

    return workbook;
  }

  // Generate employee payslip (individual)
  async generatePayslip(employeeData, options = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('급여명세서');

    // Company header
    worksheet.addRow(['회사명']);
    worksheet.getCell(1, 1).font = { size: 14, bold: true };
    worksheet.addRow([`${options.yearMonth || ''} 급여명세서`]);
    worksheet.getCell(2, 1).font = { size: 16, bold: true };
    worksheet.addRow([]);

    // Employee info
    worksheet.addRow(['직원 정보']);
    worksheet.getCell(4, 1).font = { bold: true };
    worksheet.addRow(['사원번호:', employeeData.employeeId]);
    worksheet.addRow(['성명:', employeeData.name]);
    worksheet.addRow(['부서:', employeeData.department]);
    worksheet.addRow(['직급:', employeeData.position]);
    worksheet.addRow([]);

    // Payroll details
    worksheet.addRow(['급여 내역']);
    worksheet.getCell(9, 1).font = { bold: true };
    
    const payrollItems = [
      ['항목', '금액'],
      ['기본급', employeeData.baseSalary || 0],
      ['인센티브', employeeData.incentive || 0],
      ['상여금', employeeData.bonus || 0],
      ['포상금', employeeData.award || 0],
      ['지급총액', employeeData.totalInput || 0],
      ['실지급액', employeeData.actualPayment || 0],
      ['차액', employeeData.difference || 0]
    ];

    payrollItems.forEach((item, index) => {
      const row = worksheet.addRow(item);
      if (index === 0) {
        row.font = { bold: true };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      } else if (index === payrollItems.length - 1) {
        row.font = { bold: true };
      }
      
      if (index > 0) {
        worksheet.getCell(row.number, 2).numFmt = '#,##0';
      }
    });

    // Set column widths
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 20;

    // Add borders to payroll table
    for (let i = 10; i <= 17; i++) {
      for (let j = 1; j <= 2; j++) {
        worksheet.getCell(i, j).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    return workbook;
  }

  // Save workbook to buffer
  async saveToBuffer(workbook) {
    return await workbook.xlsx.writeBuffer();
  }

  // Save workbook to file
  async saveToFile(workbook, filename) {
    const filepath = path.join(this.tempDir, filename);
    await workbook.xlsx.writeFile(filepath);
    return filepath;
  }

  // Clean up temporary files
  cleanupTempFiles() {
    const files = fs.readdirSync(this.tempDir);
    files.forEach(file => {
      const filePath = path.join(this.tempDir, file);
      const stats = fs.statSync(filePath);
      const now = new Date();
      const fileAge = now - stats.mtime;
      const oneHour = 60 * 60 * 1000;
      
      if (fileAge > oneHour) {
        fs.unlinkSync(filePath);
      }
    });
  }

  // Generate CSV format for simple exports
  generateCSV(data, headers) {
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${value}"`;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }
}

module.exports = ReportGenerator;