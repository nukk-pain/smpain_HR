/**
 * AI-HEADER
 * intent: Basic Excel file parsing and validation services
 * domain_meaning: Core Excel processing functionality for file validation and data extraction
 * misleading_names: None
 * data_contracts: Excel buffer input, structured data output with validation results
 * PII: Contains employee payroll data - handle with security
 * invariants: All files validated before parsing, structured data format consistent
 * rag_keywords: excel parser, file validation, data extraction, payroll parsing
 */

const XLSX = require('xlsx');
const path = require('path');

class ExcelParserService {
  /**
   * Initialize Excel parser with security settings
   * DomainMeaning: Set up file validation rules and constraints
   * MisleadingNames: None
   * SideEffects: None - only sets configuration
   * Invariants: Security constraints are always enforced
   * RAG_Keywords: initialization, security, validation, configuration
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_excel_parser_init_001
   */
  constructor() {
    this.allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/wps-office.xlsx',
      'application/wps-office.xls'
    ];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Validate Excel file for security and format compliance
   * DomainMeaning: Security check for file type, size and format before processing
   * MisleadingNames: None
   * SideEffects: None - read-only validation
   * Invariants: Returns validation result with detailed error messages
   * RAG_Keywords: file validation, security check, format verification
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_validate_file_001
   */
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

  /**
   * Parse Excel file buffer into structured data
   * DomainMeaning: Extract and structure Excel data with header validation
   * MisleadingNames: None
   * SideEffects: None - read-only parsing
   * Invariants: Returns success/failure status with parsed data or error details
   * RAG_Keywords: excel parsing, data extraction, header validation, structure
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_parse_excel_file_001
   */
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

  /**
   * Parse payroll-specific Excel file with validation
   * DomainMeaning: Extract payroll data with field validation and number conversion
   * MisleadingNames: None
   * SideEffects: None - read-only parsing
   * Invariants: Returns validated payroll data with error tracking per row
   * RAG_Keywords: payroll parsing, field validation, number conversion, korean columns
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_parse_payroll_excel_001
   */
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

  /**
   * Generate summary statistics for payroll data
   * DomainMeaning: Calculate aggregate totals for payroll validation and reporting
   * MisleadingNames: None
   * SideEffects: None - read-only calculation
   * Invariants: Returns consistent summary structure with zero defaults
   * RAG_Keywords: payroll summary, aggregate calculation, totals, statistics
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_generate_payroll_summary_001
   */
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

  /**
   * Compare uploaded payroll data with system data
   * DomainMeaning: Match employees and calculate differences between uploaded and system payroll
   * MisleadingNames: None
   * SideEffects: None - read-only comparison
   * Invariants: Returns comparison results with status for each employee record
   * RAG_Keywords: data comparison, payroll matching, difference calculation, validation
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_compare_system_data_001
   */
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
}

module.exports = ExcelParserService;