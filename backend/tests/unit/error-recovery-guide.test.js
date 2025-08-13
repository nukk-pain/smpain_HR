const ExcelProcessorRecovery = require('../../excelProcessorRecovery');
const XLSX = require('xlsx');

describe('Error Recovery Guide', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessorRecovery();
  });

  /**
   * Test should fail initially as error recovery guide is not implemented
   * DomainMeaning: Tests automated error recovery guidance and step-by-step solutions
   * MisleadingNames: None
   * SideEffects: May generate recovery instructions and remediation steps
   * Invariants: Recovery guides should be actionable and specific to each error type
   * RAG_Keywords: error, recovery, guide, solution, remediation, fix
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_error_recovery_001
   */
  test('should provide recovery guide for missing columns error', async () => {
    // Create Excel with missing columns
    const testData = [
      ['사원번호', '성명', '부서'], // Missing many required columns
      ['EMP001', '직원1', '개발팀']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // This should fail initially - no recovery guide implementation
    const result = await excelProcessor.parsePayrollExcelWithRecoveryGuide(buffer, {
      enableRecoveryGuide: true,
      guideFormat: 'detailed'
    });

    expect(result.success).toBe(false);
    expect(result.recoveryGuide).toBeDefined();
    expect(result.recoveryGuide.errorType).toBe('MISSING_COLUMNS');
    expect(result.recoveryGuide.steps).toBeDefined();
    expect(result.recoveryGuide.steps).toHaveLength(3);
    
    // Check recovery steps
    expect(result.recoveryGuide.steps[0]).toEqual({
      stepNumber: 1,
      action: 'Add missing columns',
      description: 'Open your Excel file and add the following columns as headers in row 1',
      details: ['직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      priority: 'critical'
    });
    
    expect(result.recoveryGuide.steps[1]).toEqual({
      stepNumber: 2,
      action: 'Verify column order',
      description: 'Ensure columns are in the correct order for optimal processing',
      details: expect.any(Array),
      priority: 'recommended'
    });

    expect(result.recoveryGuide.templateDownloadLink).toBeDefined();
    expect(result.recoveryGuide.estimatedTime).toBe('5-10 minutes');
  });

  test('should provide recovery guide for data validation errors', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['', '직원2', '개발팀', '사원', '3000000', 'invalid', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', '-1000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRecoveryGuide(buffer, {
      enableRecoveryGuide: true,
      groupByErrorType: true
    });

    expect(result.success).toBe(true); // Partial success
    expect(result.recoveryGuide).toBeDefined();
    expect(result.recoveryGuide.errorGroups).toBeDefined();
    
    // Check recovery for missing required fields
    const missingFieldGuide = result.recoveryGuide.errorGroups['REQUIRED_FIELD_MISSING'];
    expect(missingFieldGuide).toBeDefined();
    expect(missingFieldGuide.affectedRows).toEqual([2, 3]);
    expect(missingFieldGuide.recovery).toContainEqual({
      action: 'Fill missing employee data',
      description: 'Enter missing employee IDs and names in the specified rows',
      specificFixes: [
        { row: 2, field: '성명', suggestion: 'Enter employee name' },
        { row: 3, field: '사원번호', suggestion: 'Enter unique employee ID' }
      ]
    });

    // Check recovery for invalid numbers
    const invalidNumberGuide = result.recoveryGuide.errorGroups['INVALID_NUMBER'];
    expect(invalidNumberGuide).toBeDefined();
    expect(invalidNumberGuide.recovery).toContainEqual({
      action: 'Fix invalid numeric values',
      description: 'Replace text with numeric values in salary fields',
      specificFixes: [
        { row: 2, field: '기본급', currentValue: 'invalid', suggestion: 'Enter numeric value (e.g., 3000000)' },
        { row: 3, field: '인센티브', currentValue: 'invalid', suggestion: 'Enter numeric value (e.g., 500000)' }
      ]
    });

    // Check recovery for business rule violations
    const businessRuleGuide = result.recoveryGuide.errorGroups['BUSINESS_RULE_VIOLATION'];
    expect(businessRuleGuide).toBeDefined();
    expect(businessRuleGuide.recovery).toContainEqual({
      action: 'Fix business rule violations',
      description: 'Correct values that violate business rules',
      specificFixes: [
        { row: 4, field: '기본급', currentValue: -1000, suggestion: 'Change to positive value', rule: 'Base salary must be positive' }
      ]
    });
  });

  test('should provide auto-fix suggestions for common errors', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3,000,000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '직원2', '개발팀', '사원', '￦3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', '3000000원', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRecoveryGuide(buffer, {
      enableRecoveryGuide: true,
      enableAutoFix: true
    });

    expect(result.success).toBe(true);
    expect(result.autoFixReport).toBeDefined();
    expect(result.autoFixReport.fixedCount).toBe(3);
    expect(result.autoFixReport.fixes).toContainEqual({
      row: 2,
      field: '기본급',
      original: '3,000,000',
      fixed: 3000000,
      fixType: 'REMOVED_FORMATTING'
    });
    expect(result.autoFixReport.fixes).toContainEqual({
      row: 3,
      field: '기본급',
      original: '￦3000000',
      fixed: 3000000,
      fixType: 'REMOVED_CURRENCY_SYMBOL'
    });
    expect(result.autoFixReport.fixes).toContainEqual({
      row: 4,
      field: '기본급',
      original: '3000000원',
      fixed: 3000000,
      fixType: 'REMOVED_CURRENCY_TEXT'
    });

    // All rows should be valid after auto-fix
    expect(result.data.invalidRows).toBe(0);
  });

  test('should generate downloadable corrected Excel file', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP001', '직원2', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRecoveryGuide(buffer, {
      enableRecoveryGuide: true,
      generateCorrectedFile: true
    });

    expect(result.correctedFileBuffer).toBeDefined();
    expect(result.correctedFileInfo).toBeDefined();
    expect(result.correctedFileInfo.fileName).toBe('payroll_corrected.xlsx');
    expect(result.correctedFileInfo.corrections.length).toBeGreaterThanOrEqual(3); // May have more corrections
    expect(result.correctedFileInfo.corrections).toContainEqual({
      row: 2,
      field: '성명',
      type: 'PLACEHOLDER_ADDED',
      value: '[REQUIRED: Employee Name]'
    });
    expect(result.correctedFileInfo.corrections).toContainEqual({
      row: 2,
      field: '기본급',
      type: 'PLACEHOLDER_ADDED',
      value: 0
    });
    expect(result.correctedFileInfo.corrections).toContainEqual({
      row: 3,
      field: '사원번호',
      type: 'DUPLICATE_MARKED',
      value: 'EMP001_DUPLICATE'
    });

    // Verify the corrected file can be parsed
    const correctedResult = await excelProcessor.parsePayrollExcel(result.correctedFileBuffer);
    expect(correctedResult.success).toBe(true);
  });

  test('should provide severity-based recovery prioritization', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '1000000', '900000', '100000'],
      ['EMP002', '직원2', '', '', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', '3,000,000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRecoveryGuide(buffer, {
      enableRecoveryGuide: true,
      prioritizeRecovery: true
    });

    expect(result.recoveryGuide.prioritizedSteps).toBeDefined();
    expect(result.recoveryGuide.prioritizedSteps.length).toBeGreaterThanOrEqual(2); // At least critical and high priority
    
    // Critical errors should be first
    expect(result.recoveryGuide.prioritizedSteps[0].priority).toBe('critical');
    expect(result.recoveryGuide.prioritizedSteps[0].errors).toContain('Missing employee ID and name in row 2');
    
    // High priority errors next
    expect(result.recoveryGuide.prioritizedSteps[1].priority).toBe('high');
    expect(result.recoveryGuide.prioritizedSteps[1].errors).toContain('Invalid numeric value in row 2');
    
    // Low priority errors last (if present)
    if (result.recoveryGuide.prioritizedSteps.length > 2) {
      expect(result.recoveryGuide.prioritizedSteps[2].priority).toBe('low');
      expect(result.recoveryGuide.prioritizedSteps[2].errors).toContain('Formatting issue in row 4');
    }

    expect(result.recoveryGuide.estimatedFixTime).toBeDefined();
    expect(result.recoveryGuide.quickFixAvailable).toBe(true);
  });

  test('should provide batch recovery operations', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3,000,000', '500,000', '200,000', '100,000', '3,800,000', '3,200,000', '600,000'],
      ['EMP002', '직원2', '개발팀', '사원', '3,500,000', '600,000', '250,000', '150,000', '4,500,000', '3,800,000', '700,000'],
      ['EMP003', '직원3', '개발팀', '사원', '4,000,000', '700,000', '300,000', '200,000', '5,200,000', '4,400,000', '800,000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRecoveryGuide(buffer, {
      enableRecoveryGuide: true,
      enableBatchFix: true
    });

    expect(result.batchFixOperations).toBeDefined();
    expect(result.batchFixOperations).toHaveLength(1);
    expect(result.batchFixOperations[0]).toEqual({
      operation: 'REMOVE_NUMBER_FORMATTING',
      affectedCells: expect.any(Array),
      pattern: 'Remove commas from all numeric fields',
      totalCells: 21, // 7 numeric fields × 3 rows (차액 제외)
      autoApplied: true
    });

    // All data should be valid after batch fix
    expect(result.data.invalidRows).toBe(0);
    expect(result.data.validRows).toBe(3);
  });
});