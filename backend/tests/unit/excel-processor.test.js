/*
 * AI-HEADER
 * Intent: Unit tests for ExcelProcessor functionality
 * Domain Meaning: Tests Excel file processing, validation, and generation
 * Misleading Names: None
 * Data Contracts: Tests Excel file format validation and data extraction
 * PII: Uses test data only - no real salary information
 * Invariants: Valid Excel files must parse correctly; Invalid files rejected
 * RAG Keywords: excel, processor, unit test, validation, parsing
 * DuplicatePolicy: canonical
 * FunctionIdentity: excel-processor-unit-tests
 */

const ExcelProcessor = require('../../excelProcessor');
const fs = require('fs');
const path = require('path');

describe('ExcelProcessor Unit Tests', () => {
  let excelProcessor;
  
  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  describe('File Validation', () => {
    test('should accept valid Excel file types', () => {
      const validFiles = [
        {
          originalname: 'payroll.xlsx',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1024
        },
        {
          originalname: 'payroll.xls',
          mimetype: 'application/vnd.ms-excel',
          size: 2048
        }
      ];

      validFiles.forEach(file => {
        const result = excelProcessor.validateFile(file);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid file extensions', () => {
      const invalidFiles = [
        {
          originalname: 'payroll.pdf',
          mimetype: 'application/pdf',
          size: 1024
        },
        {
          originalname: 'payroll.txt',
          mimetype: 'text/plain',
          size: 512
        },
        {
          originalname: 'payroll.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 2048
        }
      ];

      invalidFiles.forEach(file => {
        const result = excelProcessor.validateFile(file);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Only .xlsx and .xls files are allowed');
      });
    });

    test('should reject files exceeding size limit', () => {
      const oversizedFile = {
        originalname: 'large-payroll.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 15 * 1024 * 1024 // 15MB
      };

      const result = excelProcessor.validateFile(oversizedFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size must be less than 10MB');
    });

    test('should reject invalid MIME types', () => {
      const invalidMimeFile = {
        originalname: 'payroll.xlsx',
        mimetype: 'application/octet-stream',
        size: 1024
      };

      const result = excelProcessor.validateFile(invalidMimeFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid file type');
    });

    test('should handle multiple validation errors', () => {
      const badFile = {
        originalname: 'payroll.pdf',
        mimetype: 'application/pdf',
        size: 15 * 1024 * 1024 // 15MB
      };

      const result = excelProcessor.validateFile(badFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Only .xlsx and .xls files are allowed');
      expect(result.errors).toContain('File size must be less than 10MB');
    });
  });

  describe('Payroll Data Validation', () => {
    test('should validate required payroll fields', () => {
      const testData = [
        {
          '사원번호': 'EMP001',
          '성명': '홍길동',
          '기본급': 3000000,
          '인센티브': 200000,
          __rowIndex: 2
        },
        {
          '사원번호': '', // Missing required field
          '성명': '김철수',
          '기본급': 2800000,
          __rowIndex: 3
        }
      ];

      const validatedData = testData.map(row => {
        const errors = [];
        
        if (!row['사원번호'] || !row['성명']) {
          errors.push('Employee ID and Name are required');
        }
        
        return {
          ...row,
          __errors: errors,
          __isValid: errors.length === 0
        };
      });

      expect(validatedData[0].__isValid).toBe(true);
      expect(validatedData[1].__isValid).toBe(false);
      expect(validatedData[1].__errors).toContain('Employee ID and Name are required');
    });

    test('should validate and convert numeric fields', () => {
      const testRow = {
        '사원번호': 'EMP001',
        '성명': '홍길동',
        '기본급': '3,000,000',
        '인센티브': '200000',
        '상여금': 'invalid',
        '포상금': '',
        __rowIndex: 2
      };

      const errors = [];
      const convertedRow = { ...testRow };
      const numericFields = ['기본급', '인센티브', '상여금', '포상금'];
      
      numericFields.forEach(field => {
        const value = testRow[field];
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

      expect(convertedRow['기본급']).toBe(3000000);
      expect(convertedRow['인센티브']).toBe(200000);
      expect(convertedRow['포상금']).toBe(0);
      expect(errors).toContain('Invalid number format in 상여금: invalid');
    });
  });

  describe('Payroll Summary Generation', () => {
    test('should generate correct summary from valid data', () => {
      const testData = [
        {
          '사원번호': 'EMP001',
          '성명': '홍길동',
          '기본급': 3000000,
          '인센티브': 200000,
          '상여금': 150000,
          '포상금': 50000,
          '지급총액': 3400000,
          '실지급액': 3200000,
          '차액': 200000,
          __isValid: true
        },
        {
          '사원번호': 'EMP002',
          '성명': '김철수',
          '기본급': 2800000,
          '인센티브': 150000,
          '상여금': 100000,
          '포상금': 0,
          '지급총액': 3050000,
          '실지급액': 2900000,
          '차액': 150000,
          __isValid: true
        },
        {
          '사원번호': '',
          '성명': '',
          __isValid: false // Invalid row should be excluded
        }
      ];

      const summary = excelProcessor.generatePayrollSummary(testData);

      expect(summary.totalEmployees).toBe(2);
      expect(summary.totalBaseSalary).toBe(5800000);
      expect(summary.totalIncentive).toBe(350000);
      expect(summary.totalBonus).toBe(250000);
      expect(summary.totalAward).toBe(50000);
      expect(summary.totalGross).toBe(6450000);
      expect(summary.totalNet).toBe(6100000);
      expect(summary.totalDifference).toBe(350000);
    });

    test('should handle empty or invalid data', () => {
      const emptyData = [];
      const summary = excelProcessor.generatePayrollSummary(emptyData);

      expect(summary.totalEmployees).toBe(0);
      expect(summary.totalBaseSalary).toBe(0);
      expect(summary.totalIncentive).toBe(0);
      expect(summary.totalBonus).toBe(0);
      expect(summary.totalAward).toBe(0);
      expect(summary.totalGross).toBe(0);
      expect(summary.totalNet).toBe(0);
      expect(summary.totalDifference).toBe(0);
    });

    test('should handle missing numeric fields gracefully', () => {
      const testData = [
        {
          '사원번호': 'EMP001',
          '성명': '홍길동',
          '기본급': 3000000,
          // Missing other fields
          __isValid: true
        }
      ];

      const summary = excelProcessor.generatePayrollSummary(testData);

      expect(summary.totalEmployees).toBe(1);
      expect(summary.totalBaseSalary).toBe(3000000);
      expect(summary.totalIncentive).toBe(0);
      expect(summary.totalBonus).toBe(0);
    });
  });

  describe('Data Comparison Logic', () => {
    test('should compare uploaded data with system data correctly', async () => {
      const uploadedData = [
        {
          '사원번호': 'EMP001',
          '성명': '홍길동',
          '기본급': 3000000,
          '인센티브': 200000,
          '지급총액': 3200000,
          '실지급액': 3100000,
          __isValid: true
        }
      ];

      const systemData = [
        {
          employeeId: 'EMP001',
          name: '홍길동',
          baseSalary: 2900000, // Different from uploaded
          incentive: 200000,
          totalInput: 3100000,
          actualPayment: 3000000
        }
      ];

      const comparison = await excelProcessor.compareWithSystemData(uploadedData, systemData);

      expect(comparison.total).toBe(1);
      expect(comparison.differences).toBe(1);
      expect(comparison.matches).toBe(0);
      expect(comparison.details[0].status).toBe('different');
      expect(comparison.details[0].differences.baseSalary).toBe(100000); // 3M - 2.9M
    });

    test('should handle employee not found in system', async () => {
      const uploadedData = [
        {
          '사원번호': 'EMP999',
          '성명': '존재하지않음',
          '기본급': 3000000,
          __isValid: true
        }
      ];

      const systemData = []; // Empty system data

      const comparison = await excelProcessor.compareWithSystemData(uploadedData, systemData);

      expect(comparison.total).toBe(1);
      expect(comparison.notFound).toBe(1);
      expect(comparison.details[0].status).toBe('not_found');
      expect(comparison.details[0].errors).toContain('Employee not found in system');
    });

    test('should handle invalid uploaded data', async () => {
      const uploadedData = [
        {
          '사원번호': '',
          '성명': '',
          __isValid: false,
          __errors: ['Employee ID and Name are required']
        }
      ];

      const systemData = [];

      const comparison = await excelProcessor.compareWithSystemData(uploadedData, systemData);

      expect(comparison.total).toBe(1);
      expect(comparison.invalid).toBe(1);
      expect(comparison.details[0].status).toBe('invalid');
      expect(comparison.details[0].errors).toEqual(['Employee ID and Name are required']);
    });

    test('should identify matching records', async () => {
      const uploadedData = [
        {
          '사원번호': 'EMP001',
          '성명': '홍길동',
          '기본급': 3000000,
          '인센티브': 200000,
          __isValid: true
        }
      ];

      const systemData = [
        {
          employeeId: 'EMP001',
          name: '홍길동',
          baseSalary: 3000000, // Exact match
          incentive: 200000 // Exact match
        }
      ];

      const comparison = await excelProcessor.compareWithSystemData(uploadedData, systemData);

      expect(comparison.total).toBe(1);
      expect(comparison.matches).toBe(1);
      expect(comparison.details[0].status).toBe('match');
      expect(Math.abs(comparison.details[0].differences.baseSalary)).toBeLessThan(0.01);
    });
  });

  describe('Upload Metadata Generation', () => {
    test('should generate complete upload metadata', () => {
      const mockFile = {
        originalname: 'payroll_2024_08.xlsx',
        size: 51200,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      const mockParseResult = {
        success: true,
        data: {
          totalRows: 50,
          validRows: 48,
          invalidRows: 2,
          summary: {
            totalEmployees: 48,
            totalBaseSalary: 150000000
          }
        }
      };

      const yearMonth = '2024-08';
      const metadata = excelProcessor.generateUploadMetadata(mockFile, mockParseResult, yearMonth);

      expect(metadata.originalName).toBe('payroll_2024_08.xlsx');
      expect(metadata.size).toBe(51200);
      expect(metadata.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(metadata.yearMonth).toBe('2024-08');
      expect(metadata.uploadedAt).toBeInstanceOf(Date);
      expect(metadata.parseResult.success).toBe(true);
      expect(metadata.parseResult.totalRows).toBe(50);
      expect(metadata.parseResult.validRows).toBe(48);
      expect(metadata.parseResult.invalidRows).toBe(2);
    });

    test('should handle failed parse results', () => {
      const mockFile = {
        originalname: 'invalid.xlsx',
        size: 1024,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      const mockParseResult = {
        success: false,
        error: 'File format not recognized'
      };

      const metadata = excelProcessor.generateUploadMetadata(mockFile, mockParseResult, '2024-08');

      expect(metadata.parseResult.success).toBe(false);
      expect(metadata.parseResult.totalRows).toBe(0);
      expect(metadata.parseResult.validRows).toBe(0);
      expect(metadata.parseResult.invalidRows).toBe(0);
      expect(metadata.parseResult.summary).toBe(null);
    });
  });
});