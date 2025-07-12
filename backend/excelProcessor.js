const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');

class ExcelProcessor {
  constructor() {
    this.allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/wps-office.xlsx',
      'application/wps-office.xls'
    ];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  // 파일 유효성 검증
  validateFile(file) {
    const errors = [];

    // 파일 확장자 검증
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('Only .xlsx and .xls files are allowed');
    }

    // 파일 크기 검증
    if (file.size > this.maxFileSize) {
      errors.push('File size must be less than 10MB');
    }

    // MIME 타입 검증
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push('Invalid file type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 엑셀 파일 읽기 및 파싱
  async parseExcelFile(buffer, expectedColumns = []) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // JSON으로 변환
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // 헤더 추출
      const headers = rawData[0];
      const dataRows = rawData.slice(1);

      // 헤더 검증
      if (expectedColumns.length > 0) {
        const missingColumns = expectedColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }
      }

      // 데이터 구조화
      const structuredData = dataRows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row, index) => {
          const rowData = {};
          headers.forEach((header, headerIndex) => {
            if (header) {
              rowData[header] = row[headerIndex] || '';
            }
          });
          rowData.__rowIndex = index + 2; // Excel row number (1-based + header)
          return rowData;
        });

      return {
        success: true,
        data: {
          headers,
          rows: structuredData,
          totalRows: structuredData.length,
          sheetName
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // 급여 엑셀 파일 파싱 (노무사 지급 확정 파일)
  async parsePayrollExcel(buffer) {
    const expectedColumns = [
      '사원번호', '성명', '부서', '직급', 
      '기본급', '인센티브', '상여금', '포상금', 
      '지급총액', '실지급액', '차액'
    ];

    const result = await this.parseExcelFile(buffer, expectedColumns);
    
    if (!result.success) {
      return result;
    }

    // 급여 데이터 검증 및 변환
    const validatedData = result.data.rows.map(row => {
      const errors = [];
      
      // 필수 필드 검증
      if (!row['사원번호'] || !row['성명']) {
        errors.push('Employee ID and Name are required');
      }

      // 숫자 필드 검증 및 변환
      const numericFields = ['기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
      const convertedRow = { ...row };
      
      numericFields.forEach(field => {
        const value = row[field];
        if (value !== null && value !== undefined && value !== '') {
          const numValue = parseFloat(String(value).replace(/[,\s]/g, ''));
          if (isNaN(numValue)) {
            errors.push(`Invalid number format in ${field}: ${value}`);
          } else {
            convertedRow[field] = numValue;
          }
        } else {
          convertedRow[field] = 0;
        }
      });

      return {
        ...convertedRow,
        __errors: errors,
        __isValid: errors.length === 0
      };
    });

    return {
      success: true,
      data: {
        ...result.data,
        rows: validatedData,
        validRows: validatedData.filter(row => row.__isValid).length,
        invalidRows: validatedData.filter(row => !row.__isValid).length,
        summary: this.generatePayrollSummary(validatedData)
      }
    };
  }

  // 급여 데이터 요약 생성
  generatePayrollSummary(data) {
    const validData = data.filter(row => row.__isValid);
    
    if (validData.length === 0) {
      return {
        totalEmployees: 0,
        totalBaseSalary: 0,
        totalIncentive: 0,
        totalBonus: 0,
        totalAward: 0,
        totalGross: 0,
        totalNet: 0,
        totalDifference: 0
      };
    }

    return {
      totalEmployees: validData.length,
      totalBaseSalary: validData.reduce((sum, row) => sum + (row['기본급'] || 0), 0),
      totalIncentive: validData.reduce((sum, row) => sum + (row['인센티브'] || 0), 0),
      totalBonus: validData.reduce((sum, row) => sum + (row['상여금'] || 0), 0),
      totalAward: validData.reduce((sum, row) => sum + (row['포상금'] || 0), 0),
      totalGross: validData.reduce((sum, row) => sum + (row['지급총액'] || 0), 0),
      totalNet: validData.reduce((sum, row) => sum + (row['실지급액'] || 0), 0),
      totalDifference: validData.reduce((sum, row) => sum + (row['차액'] || 0), 0)
    };
  }

  // 데이터 비교 및 차액 계산
  async compareWithSystemData(uploadedData, systemData) {
    const comparison = [];
    
    uploadedData.forEach(uploadedRow => {
      if (!uploadedRow.__isValid) {
        comparison.push({
          employeeId: uploadedRow['사원번호'],
          name: uploadedRow['성명'],
          status: 'invalid',
          errors: uploadedRow.__errors,
          uploaded: uploadedRow,
          system: null,
          differences: null
        });
        return;
      }

      // 시스템 데이터에서 해당 직원 찾기
      const systemRow = systemData.find(row => 
        row.employeeId === uploadedRow['사원번호'] || 
        row.name === uploadedRow['성명']
      );

      if (!systemRow) {
        comparison.push({
          employeeId: uploadedRow['사원번호'],
          name: uploadedRow['성명'],
          status: 'not_found',
          errors: ['Employee not found in system'],
          uploaded: uploadedRow,
          system: null,
          differences: null
        });
        return;
      }

      // 차액 계산
      const differences = {
        baseSalary: (uploadedRow['기본급'] || 0) - (systemRow.baseSalary || 0),
        incentive: (uploadedRow['인센티브'] || 0) - (systemRow.incentive || 0),
        bonus: (uploadedRow['상여금'] || 0) - (systemRow.bonus || 0),
        award: (uploadedRow['포상금'] || 0) - (systemRow.award || 0),
        totalInput: (uploadedRow['지급총액'] || 0) - (systemRow.totalInput || 0),
        actualPayment: (uploadedRow['실지급액'] || 0) - (systemRow.actualPayment || 0)
      };

      const hasDifferences = Object.values(differences).some(diff => Math.abs(diff) > 0.01);

      comparison.push({
        employeeId: uploadedRow['사원번호'],
        name: uploadedRow['성명'],
        status: hasDifferences ? 'different' : 'match',
        errors: [],
        uploaded: uploadedRow,
        system: systemRow,
        differences
      });
    });

    return {
      total: comparison.length,
      matches: comparison.filter(c => c.status === 'match').length,
      differences: comparison.filter(c => c.status === 'different').length,
      notFound: comparison.filter(c => c.status === 'not_found').length,
      invalid: comparison.filter(c => c.status === 'invalid').length,
      details: comparison
    };
  }

  // 엑셀 파일 생성
  async generateExcelFile(data, template = 'payroll') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    if (template === 'payroll') {
      // 급여 템플릿
      const headers = [
        '사원번호', '성명', '부서', '직급',
        '기본급', '인센티브', '상여금', '포상금',
        '지급총액', '실지급액', '차액'
      ];

      // 헤더 설정
      worksheet.addRow(headers);
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // 데이터 추가
      data.forEach(row => {
        worksheet.addRow([
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
      });

      // 컬럼 너비 자동 조정
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // 숫자 포맷 설정
      for (let i = 5; i <= 11; i++) {
        worksheet.getColumn(i).numFmt = '#,##0';
      }
    }

    return workbook;
  }

  // 업로드된 파일 정보 저장용 메타데이터 생성
  generateUploadMetadata(file, parseResult, yearMonth) {
    return {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      yearMonth,
      uploadedAt: new Date(),
      parseResult: {
        success: parseResult.success,
        totalRows: parseResult.data?.totalRows || 0,
        validRows: parseResult.data?.validRows || 0,
        invalidRows: parseResult.data?.invalidRows || 0,
        summary: parseResult.data?.summary || null
      }
    };
  }
}

module.exports = ExcelProcessor;