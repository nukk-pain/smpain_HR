const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');

describe('Partial Failure Handling', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  /**
   * Test should fail initially as partial failure handling is not implemented
   * DomainMeaning: Tests ability to handle mixed success/failure scenarios gracefully
   * MisleadingNames: None
   * SideEffects: May create partial data entries and transaction logs
   * Invariants: Valid data processed despite invalid entries, clear failure reporting
   * RAG_Keywords: partial, failure, handling, transaction, rollback, recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_partial_failure_001
   */
  test('should process valid rows while reporting failed rows separately', async () => {
    // Create Excel with mix of valid and invalid data
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Valid
      ['EMP002', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Invalid - missing name
      ['EMP003', '직원3', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Valid
      ['EMP004', '직원4', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Invalid - bad salary
      ['EMP005', '직원5', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']  // Valid
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // This should fail initially - no partial failure handling implemented
    const result = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      continueOnErrors: true,
      isolateFailures: true
    });

    expect(result.success).toBe(true); // Overall success despite some failures
    expect(result.partialFailure).toBe(true);
    expect(result.data.totalRows).toBe(5);
    expect(result.data.validRows).toBe(3);
    expect(result.data.invalidRows).toBe(2);
    
    // Check processing summary
    expect(result.processingReport).toBeDefined();
    expect(result.processingReport.successfullyProcessed).toBe(3);
    expect(result.processingReport.failed).toBe(2);
    expect(result.processingReport.successRate).toBe(60); // 3/5 = 60%
    
    // Check that valid data is preserved
    const validEmployees = result.data.rows.filter(row => row.__isValid);
    expect(validEmployees).toHaveLength(3);
    expect(validEmployees[0]['사원번호']).toBe('EMP001');
    expect(validEmployees[1]['사원번호']).toBe('EMP003');
    expect(validEmployees[2]['사원번호']).toBe('EMP005');
    
    // Check failure isolation
    expect(result.isolatedFailures).toBeDefined();
    expect(result.isolatedFailures).toHaveLength(2);
    expect(result.isolatedFailures[0].row).toBe(3); // EMP002
    expect(result.isolatedFailures[1].row).toBe(5); // EMP004
  });

  test('should support different failure handling strategies', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Test FAIL_FAST strategy
    const failFastResult = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      strategy: 'FAIL_FAST'
    });

    expect(failFastResult.success).toBe(false);
    expect(failFastResult.failedAt).toBe(3); // Failed at row 3 (EMP002)
    expect(failFastResult.processedCount).toBe(1); // Only EMP001 processed

    // Test CONTINUE strategy
    const continueResult = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      strategy: 'CONTINUE'
    });

    expect(continueResult.success).toBe(true);
    expect(continueResult.partialFailure).toBe(true);
    expect(continueResult.data.validRows).toBe(2); // EMP001 and EMP003
    expect(continueResult.data.invalidRows).toBe(1); // EMP002

    // Test SKIP_INVALID strategy
    const skipResult = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      strategy: 'SKIP_INVALID',
      skipInvalidRows: true
    });

    expect(skipResult.success).toBe(true);
    expect(skipResult.partialFailure).toBe(true);
    expect(skipResult.data.rows.filter(row => row.__isValid)).toHaveLength(2);
    expect(skipResult.skippedRows).toContain(3); // Row 3 skipped
  });

  test('should handle critical vs non-critical failures differently', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Valid
      ['', '직원2', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Critical - no employee ID
      ['EMP003', '직원3', '개발팀', '사원', '3,000,000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Non-critical - formatting
      ['EMP004', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'] // Critical - no name
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      categorizeFailures: true,
      allowNonCriticalFailures: true,
      autoFixNonCritical: true
    });

    expect(result.success).toBe(true);
    expect(result.failureCategories).toBeDefined();
    expect(result.failureCategories.critical).toHaveLength(2); // Rows 2 and 4
    expect(result.failureCategories.nonCritical).toHaveLength(1); // Row 3
    expect(result.failureCategories.autoFixed).toHaveLength(1); // Row 3 auto-fixed

    // Non-critical failure should be auto-fixed
    const row3 = result.data.rows.find(row => row['사원번호'] === 'EMP003');
    expect(row3).toBeDefined();
    expect(row3['기본급']).toBe(3000000); // Formatting fixed
    expect(row3.__isValid).toBe(true);
    expect(row3.__autoFixed).toBe(true);
  });

  test('should provide rollback capabilities for partial failures', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      enableRollback: true,
      rollbackThreshold: 30 // Rollback if > 30% failures
    });

    expect(result.rollbackInfo).toBeDefined();
    expect(result.rollbackInfo.thresholdExceeded).toBe(true); // 33% failure rate
    expect(result.rollbackInfo.failureRate).toBe(33); // 1/3 = 33%
    expect(result.rollbackInfo.rollbackRecommended).toBe(true);
    expect(result.rollbackInfo.rollbackOperations).toBeDefined();
    expect(result.rollbackInfo.rollbackOperations).toHaveLength(2); // EMP001 and EMP003 to rollback
  });

  test('should handle transaction boundaries in partial failures', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '직원2', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Fails
      ['EMP004', '직원4', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP005', '직원5', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      enableTransactionBoundaries: true,
      batchSize: 2 // Process in batches of 2
    });

    expect(result.transactionResults).toBeDefined();
    expect(result.transactionResults).toHaveLength(3); // 3 batches: [1,2], [3,4], [5]
    
    // First batch should succeed
    expect(result.transactionResults[0].success).toBe(true);
    expect(result.transactionResults[0].processedRows).toBe(2);
    expect(result.transactionResults[0].failedRows).toBe(0);
    
    // Second batch should partially fail
    expect(result.transactionResults[1].success).toBe(false);
    expect(result.transactionResults[1].processedRows).toBe(1); // EMP004 only
    expect(result.transactionResults[1].failedRows).toBe(1); // EMP003 failed
    expect(result.transactionResults[1].rollbackApplied).toBe(true);
    
    // Third batch should succeed
    expect(result.transactionResults[2].success).toBe(true);
    expect(result.transactionResults[2].processedRows).toBe(1);
    expect(result.transactionResults[2].failedRows).toBe(0);
  });

  test('should generate partial failure reports with actionable insights', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '직원3', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP001', '직원1중복', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithPartialFailure(buffer, {
      enablePartialFailure: true,
      generateInsights: true,
      enableRecommendations: true
    });

    expect(result.insights).toBeDefined();
    expect(result.insights.failurePatterns).toBeDefined();
    expect(result.insights.failurePatterns).toContain('MISSING_REQUIRED_FIELDS');
    expect(result.insights.failurePatterns).toContain('INVALID_DATA_TYPE');
    expect(result.insights.failurePatterns).toContain('DUPLICATE_RECORDS');
    
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations).toContainEqual({
      type: 'DATA_QUALITY',
      priority: 'high',
      message: 'Fill missing employee names in 1 row(s)',
      affectedRows: [3],
      estimatedFixTime: '2-3 minutes'
    });
    
    expect(result.recommendations).toContainEqual({
      type: 'DATA_VALIDATION',
      priority: 'high',
      message: 'Fix invalid salary format in 1 row(s)',
      affectedRows: [4],
      estimatedFixTime: '1-2 minutes'
    });

    expect(result.recommendations).toContainEqual({
      type: 'DUPLICATE_RESOLUTION',
      priority: 'medium',
      message: 'Resolve duplicate employee ID: EMP001',
      affectedRows: [2, 5],
      estimatedFixTime: '3-5 minutes'
    });
  });
});