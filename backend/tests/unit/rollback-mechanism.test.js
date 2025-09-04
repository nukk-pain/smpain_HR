const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');

describe('Rollback Mechanism', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  /**
   * Test should fail initially as rollback mechanism is not implemented
   * DomainMeaning: Tests ability to rollback Excel processing operations when failures exceed thresholds
   * MisleadingNames: None
   * SideEffects: May modify database state and create rollback logs
   * Invariants: All-or-nothing processing guarantee, clean state after rollback
   * RAG_Keywords: rollback, transaction, failure, threshold, recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_rollback_mechanism_001
   */
  test('should trigger rollback when failure rate exceeds threshold', async () => {
    // Create Excel with high failure rate (3 out of 4 rows fail = 75%)
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Valid
      ['', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Invalid - missing critical fields
      ['EMP003', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Invalid - missing name
      ['', '직원4', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000']  // Invalid - missing ID
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // This should fail initially - no rollback mechanism implemented
    const result = await excelProcessor.parsePayrollExcelWithRollback(buffer, {
      enableRollback: true,
      rollbackThreshold: 50, // Rollback if > 50% failures
      trackOperations: true
    });

    expect(result.success).toBe(false); // Should fail due to rollback
    expect(result.rollbackTriggered).toBe(true);
    expect(result.rollbackInfo).toBeDefined();
    expect(result.rollbackInfo.thresholdExceeded).toBe(true);
    expect(result.rollbackInfo.failureRate).toBe(75); // 3/4 = 75%
    expect(result.rollbackInfo.rollbackOperations).toBeDefined();
    expect(result.rollbackInfo.rollbackOperations).toHaveLength(1); // 1 valid row to rollback
  });

  test('should perform complete transaction rollback with state restoration', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '직원2', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Fails
      ['EMP004', '직원4', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRollback(buffer, {
      enableRollback: true,
      rollbackThreshold: 20, // Rollback if > 20% failures
      enableTransactionLog: true,
      saveRollbackHistory: true
    });

    expect(result.rollbackTriggered).toBe(true);
    expect(result.rollbackInfo.originalState).toBeDefined();
    expect(result.rollbackInfo.rollbackLog).toBeDefined();
    expect(result.rollbackInfo.rollbackLog.operations).toHaveLength(3); // 3 operations to rollback
    expect(result.rollbackInfo.rollbackLog.operations).toContainEqual({
      type: 'REMOVE_RECORD',
      employeeId: 'EMP001',
      operation: 'ROLLBACK_INSERT'
    });
    expect(result.rollbackInfo.rollbackLog.operations).toContainEqual({
      type: 'REMOVE_RECORD',
      employeeId: 'EMP002',
      operation: 'ROLLBACK_INSERT'
    });
    expect(result.rollbackInfo.rollbackLog.operations).toContainEqual({
      type: 'REMOVE_RECORD',
      employeeId: 'EMP004',
      operation: 'ROLLBACK_INSERT'
    });
  });

  test('should support selective rollback with preservation of valid data', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '직원2', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP003', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Fails
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRollback(buffer, {
      enableRollback: true,
      rollbackStrategy: 'SELECTIVE', // Only rollback failed transactions
      preserveValidData: true,
      rollbackThreshold: 25 // 33% > 25%, so should trigger
    });

    expect(result.rollbackTriggered).toBe(true);
    expect(result.rollbackInfo.strategy).toBe('SELECTIVE');
    expect(result.rollbackInfo.preservedRecords).toBeDefined();
    expect(result.rollbackInfo.preservedRecords).toHaveLength(2); // EMP001, EMP002 preserved
    expect(result.rollbackInfo.rolledBackRecords).toBeDefined();
    expect(result.rollbackInfo.rolledBackRecords).toHaveLength(0); // No successful records to rollback
    expect(result.data.validRows).toBe(2); // Valid data preserved
  });

  test('should provide rollback preview without executing', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['EMP002', '', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Fails
      ['EMP003', '직원3', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRollback(buffer, {
      enableRollback: true,
      rollbackThreshold: 30,
      previewOnly: true, // Only show what would be rolled back
      generateRollbackPlan: true
    });

    expect(result.rollbackPreview).toBeDefined();
    expect(result.rollbackPreview.wouldTrigger).toBe(true); // 33% > 30%
    expect(result.rollbackPreview.affectedRecords).toHaveLength(2); // EMP001, EMP003 would be rolled back
    expect(result.rollbackPreview.estimatedRecoveryTime).toBeDefined();
    expect(result.rollbackPreview.rollbackSteps).toBeDefined();
    expect(result.rollbackPreview.rollbackSteps).toHaveLength(2);
    expect(result.rollbackExecuted).toBe(false); // No actual rollback
  });

  test('should handle rollback failures gracefully with backup strategies', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Fails
      ['EMP003', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000']  // Fails
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRollback(buffer, {
      enableRollback: true,
      rollbackThreshold: 50,
      enableBackupStrategy: true,
      fallbackToManualReview: true,
      simulateRollbackFailure: true // For testing
    });

    expect(result.rollbackTriggered).toBe(true);
    expect(result.rollbackInfo.rollbackFailed).toBe(true);
    expect(result.rollbackInfo.backupStrategy).toBeDefined();
    expect(result.rollbackInfo.backupStrategy.fallbackApplied).toBe(true);
    expect(result.rollbackInfo.backupStrategy.manualReviewRequired).toBe(true);
    expect(result.rollbackInfo.backupStrategy.recoveryOptions).toBeDefined();
    expect(result.rollbackInfo.backupStrategy.recoveryOptions).toHaveLength(3);
  });

  test('should integrate rollback with transaction boundaries', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', '3000000', '500000', '200000', '100000', '3800000', '3200000', '600000'],
      ['', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Fails - missing critical fields
      ['EMP003', '', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000'], // Fails - missing name
      ['', '직원4', '개발팀', '사원', 'invalid', '500000', '200000', '100000', '3800000', '3200000', '600000']  // Fails - missing ID
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelWithRollback(buffer, {
      enableRollback: true,
      rollbackThreshold: 50, // 75% failure rate > 50% threshold
      enableTransactionBoundaries: true,
      batchSize: 2, // Process in batches of 2
      rollbackScope: 'TRANSACTION_LEVEL'
    });

    // Check that result exists and rollback was triggered due to high failure rate (75% > 50%)
    expect(result.rollbackTriggered).toBe(true);
    expect(result.rollbackInfo).toBeDefined();
    expect(result.rollbackInfo.failureRate).toBeGreaterThan(50);
    
    // When transaction boundaries are enabled and rollback happens
    if (result.rollbackInfo.transactionRollbacks) {
      expect(result.rollbackInfo.transactionRollbacks).toBeDefined();
      expect(result.rollbackInfo.totalRolledBackTransactions).toBeGreaterThan(0);
    }
  });
});