const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');

describe('Detailed Error Messages', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  /**
   * Test should fail initially as detailed error messages are not implemented
   * DomainMeaning: Tests comprehensive error reporting with actionable details
   * MisleadingNames: None
   * SideEffects: May create error logs and diagnostic data
   * Invariants: Error messages should be detailed, actionable, and user-friendly
   * RAG_Keywords: error, message, detailed, diagnostic, reporting, validation
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_detailed_errors_001
   */
  test('should provide detailed error messages for missing columns', async () => {
    // Create Excel with missing required columns
    const testData = [
      ['사원번호', '성명', '부서'], // Missing many required columns
      ['EMP001', '직원1', '개발팀']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // This should fail initially - no detailed error implementation
    const result = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      errorLevel: 'verbose'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.errorDetails).toBeDefined();
    expect(result.errorDetails.type).toBe('MISSING_COLUMNS');
    expect(result.errorDetails.missingColumns).toEqual([
      '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'
    ]);
    expect(result.errorDetails.suggestion).toContain('Please add the following columns');
    expect(result.errorDetails.affectedRows).toBe(0); // No rows processed due to column error
    expect(result.errorDetails.severity).toBe('critical');
  });

  test('should provide detailed error messages for invalid data types', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '직원2', '개발팀', '사원', '3000000', 'invalid', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      includeRowContext: true
    });

    expect(result.success).toBe(true); // Partial success
    expect(result.data.totalRows).toBe(3);
    expect(result.data.invalidRows).toBe(3);
    expect(result.errorReport).toBeDefined();
    expect(result.errorReport.length).toBe(3);

    // Check first error
    const error1 = result.errorReport[0];
    expect(error1.row).toBe(2); // Excel row number
    expect(error1.employeeId).toBe('EMP001');
    expect(error1.errors).toContainEqual({
      field: '기본급',
      value: 'invalid',
      type: 'INVALID_NUMBER',
      message: 'Expected a number but got "invalid"',
      suggestion: 'Please enter a valid number without currency symbols or text'
    });

    // Check second error
    const error2 = result.errorReport[1];
    expect(error2.row).toBe(3);
    expect(error2.errors).toContainEqual({
      field: '인센티브',
      value: 'invalid',
      type: 'INVALID_NUMBER',
      message: 'Expected a number but got "invalid"',
      suggestion: 'Please enter a valid number without currency symbols or text'
    });

    // Check third error (missing name)
    const error3 = result.errorReport[2];
    expect(error3.row).toBe(4);
    expect(error3.errors).toContainEqual({
      field: '성명',
      value: '',
      type: 'REQUIRED_FIELD_MISSING',
      message: 'Employee name is required',
      suggestion: 'Please provide the employee name'
    });
  });

  test('should provide error summary with statistics', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP004', '직원4', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['', '직원5', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      generateSummary: true
    });

    expect(result.success).toBe(true);
    expect(result.errorSummary).toBeDefined();
    expect(result.errorSummary.totalErrors).toBe(3);
    expect(result.errorSummary.errorsByType).toEqual({
      'REQUIRED_FIELD_MISSING': 2,
      'INVALID_NUMBER': 1
    });
    expect(result.errorSummary.errorsByField).toEqual({
      '성명': 1,
      '사원번호': 1,
      '기본급': 1
    });
    expect(result.errorSummary.affectedRows).toEqual([3, 4, 6]); // Excel row numbers (1-based + header)
    expect(result.errorSummary.successRate).toBe(40); // 2 out of 5 rows valid
  });

  test('should provide contextual error messages based on business rules', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '-1000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP001', '직원2', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', '3000000', '500000', '200000', '100000', '1000000', '900000', '100000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      validateBusinessRules: true
    });

    expect(result.errorReport).toBeDefined();
    
    // Check negative salary error
    const error1 = result.errorReport.find(e => e.row === 2);
    expect(error1.errors).toContainEqual({
      field: '기본급',
      value: -1000,
      type: 'BUSINESS_RULE_VIOLATION',
      message: 'Base salary cannot be negative',
      suggestion: 'Please enter a positive value for base salary',
      rule: 'POSITIVE_SALARY_REQUIRED'
    });

    // Check duplicate employee ID error
    const error2 = result.errorReport.find(e => e.row === 3);
    expect(error2.errors).toContainEqual({
      field: '사원번호',
      value: 'EMP001',
      type: 'DUPLICATE_VALUE',
      message: 'Duplicate employee ID found',
      suggestion: 'Employee ID "EMP001" already exists in row 2',
      duplicateRows: [2]
    });

    // Check calculation mismatch error
    const error3 = result.errorReport.find(e => e.row === 4);
    expect(error3.errors).toContainEqual({
      field: '지급총액',
      value: 1000000,
      type: 'CALCULATION_MISMATCH',
      message: 'Total payment does not match sum of components',
      suggestion: 'Expected total: 3800000 (기본급 + 인센티브 + 상여금 + 포상금)',
      expectedValue: 3800000,
      actualValue: 1000000
    });
  });

  test('should support multiple error detail levels', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Test minimal error level
    const minimalResult = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      errorLevel: 'minimal'
    });

    expect(minimalResult.errorReport[0].errors.length).toBe(2);
    expect(minimalResult.errorReport[0].errors[0]).not.toHaveProperty('suggestion');

    // Test standard error level
    const standardResult = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      errorLevel: 'standard'
    });

    expect(standardResult.errorReport[0].errors[0]).toHaveProperty('message');
    expect(standardResult.errorReport[0].errors[0]).toHaveProperty('suggestion');

    // Test verbose error level
    const verboseResult = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      errorLevel: 'verbose'
    });

    expect(verboseResult.errorReport[0].errors[0]).toHaveProperty('message');
    expect(verboseResult.errorReport[0].errors[0]).toHaveProperty('suggestion');
    expect(verboseResult.errorReport[0].errors[0]).toHaveProperty('field');
    expect(verboseResult.errorReport[0].errors[0]).toHaveProperty('value');
    expect(verboseResult.errorReport[0].errors[0]).toHaveProperty('type');
    expect(verboseResult.errorReport[0]).toHaveProperty('rowContext');
  });

  test('should generate exportable error report', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '직원2', '개발팀', '사원', '3000000', 'invalid', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithDetailedErrors(buffer, {
      enableDetailedErrors: true,
      exportFormat: 'json'
    });

    expect(result.exportableErrorReport).toBeDefined();
    expect(typeof result.exportableErrorReport).toBe('string');
    
    const parsed = JSON.parse(result.exportableErrorReport);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('fileName');
    expect(parsed).toHaveProperty('totalRows');
    expect(parsed).toHaveProperty('errors');
    expect(parsed.errors).toHaveLength(2);
  });
});