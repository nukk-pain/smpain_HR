const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');

describe('API Response Time Optimization', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  /**
   * Test should fail initially as API response time optimization is not implemented
   * DomainMeaning: Tests API response time optimization to achieve sub-2-second response times
   * MisleadingNames: None
   * SideEffects: May create performance measurements and timing data
   * Invariants: API responses should complete within 2 seconds for standard payroll files
   * RAG_Keywords: api, response-time, optimization, performance, speed, timeout
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_api_response_time_001
   */
  test('should optimize API response time to under 2 seconds for standard payroll files', async () => {
    // Create standard-sized test Excel file (500 rows)
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 500; i++) {
      testData.push([
        `EMP${i.toString().padStart(3, '0')}`,
        `직원${i}`,
        '개발팀',
        '사원',
        3000000,
        500000,
        200000,
        100000,
        3800000,
        3200000,
        600000
      ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // This should fail initially - no response time optimization implemented
    const startTime = Date.now();
    const result = await excelProcessor.parsePayrollExcelFast(buffer, {
      enableFastMode: true,
      targetResponseTimeMs: 2000,
      optimizationLevel: 'aggressive'
    });
    const responseTime = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.data.totalRows).toBe(500);
    expect(result.data.fastModeEnabled).toBe(true);
    expect(result.data.performanceStats).toBeDefined();
    expect(result.data.performanceStats.responseTimeMs).toBeLessThan(2000);
    
    // Verify actual response time is under target
    expect(responseTime).toBeLessThan(2000);
    
    // Performance stats should be included
    expect(result.data.performanceStats.parsingTimeMs).toBeDefined();
    expect(result.data.performanceStats.validationTimeMs).toBeDefined();
    expect(result.data.performanceStats.optimizationsApplied).toContain('fast_parsing');
  });

  test('should apply different optimization levels based on file size', async () => {
    // Create small test file (50 rows)
    const smallData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    smallData.push(headers);

    for (let i = 1; i <= 50; i++) {
      smallData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(smallData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelFast(buffer, {
      enableFastMode: true,
      adaptiveOptimization: true
    });

    expect(result.success).toBe(true);
    expect(result.data.performanceStats.optimizationLevel).toBe('minimal'); // Small file needs minimal optimization
    expect(result.data.performanceStats.responseTimeMs).toBeLessThan(500); // Should be very fast
  });

  test('should use parallel processing for large files', async () => {
    // Create larger test file (1000 rows)
    const largeData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    largeData.push(headers);

    for (let i = 1; i <= 1000; i++) {
      largeData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(largeData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelFast(buffer, {
      enableFastMode: true,
      enableParallelProcessing: true,
      maxWorkers: 4
    });

    expect(result.success).toBe(true);
    expect(result.data.totalRows).toBe(1000);
    expect(result.data.performanceStats.parallelProcessingUsed).toBe(true);
    expect(result.data.performanceStats.workerCount).toBeGreaterThan(1);
    expect(result.data.performanceStats.responseTimeMs).toBeLessThan(2000);
  });

  test('should implement progressive validation for faster response', async () => {
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    // Mix of valid and invalid data
    for (let i = 1; i <= 300; i++) {
      if (i % 10 === 0) {
        // Add some invalid data
        testData.push([`EMP${i}`, '', '개발팀', '사원', 'invalid', 500000, 200000, 100000, 3800000, 3200000, 600000]);
      } else {
        testData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelFast(buffer, {
      enableFastMode: true,
      progressiveValidation: true,
      earlyErrorDetection: true
    });

    expect(result.success).toBe(true);
    expect(result.data.performanceStats.progressiveValidationUsed).toBe(true);
    expect(result.data.performanceStats.earlyErrorsDetected).toBeGreaterThan(0);
    expect(result.data.invalidRows).toBe(30); // 10% invalid rows
  });

  test('should provide real-time performance metrics during processing', async () => {
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 800; i++) {
      testData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const performanceMetrics = [];

    const result = await excelProcessor.parsePayrollExcelFast(buffer, {
      enableFastMode: true,
      realtimeMetrics: true,
      onPerformanceUpdate: (metrics) => {
        performanceMetrics.push(metrics);
        expect(metrics).toHaveProperty('currentPhase');
        expect(metrics).toHaveProperty('elapsedMs');
        expect(metrics).toHaveProperty('estimatedRemainingMs');
      }
    });

    expect(result.success).toBe(true);
    expect(performanceMetrics.length).toBeGreaterThan(0);
    expect(result.data.performanceStats.realtimeMetricsEnabled).toBe(true);
  });

  test('should optimize based on target response time constraints', async () => {
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 600; i++) {
      testData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Test with strict time constraint
    const startTime = Date.now();
    const result = await excelProcessor.parsePayrollExcelFast(buffer, {
      enableFastMode: true,
      targetResponseTimeMs: 1000, // Very strict: 1 second
      adaptiveOptimization: true
    });
    const actualTime = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(actualTime).toBeLessThan(1200); // Allow small buffer for test overhead
    expect(result.data.performanceStats.targetMet).toBe(true);
    expect(result.data.performanceStats.optimizationLevel).toBe('aggressive');
  });
});