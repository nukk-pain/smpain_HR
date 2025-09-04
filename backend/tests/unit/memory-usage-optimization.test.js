const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');

describe('Memory Usage Optimization', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  /**
   * Test should fail initially as memory optimization is not implemented
   * DomainMeaning: Tests memory efficiency during Excel processing operations
   * MisleadingNames: None
   * SideEffects: May trigger garbage collection during tests
   * Invariants: Memory usage should stay within reasonable bounds during processing
   * RAG_Keywords: memory, optimization, excel, performance, garbage-collection
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_memory_optimization_001
   */
  test('should optimize memory usage during large file processing', async () => {
    // Create large test Excel file (2000 rows)
    const largeData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    largeData.push(headers);

    for (let i = 1; i <= 2000; i++) {
      largeData.push([
        `EMP${i.toString().padStart(4, '0')}`,
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
    const ws = XLSX.utils.aoa_to_sheet(largeData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Measure memory before processing
    const memoryBefore = process.memoryUsage();

    // This should fail initially - no memory optimization implemented
    const result = await excelProcessor.parsePayrollExcelOptimized(buffer, {
      enableMemoryOptimization: true,
      maxMemoryUsageMB: 50, // Limit to 50MB increase
      autoGarbageCollection: true
    });

    // Measure memory after processing
    const memoryAfter = process.memoryUsage();
    const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

    expect(result.success).toBe(true);
    expect(result.data.totalRows).toBe(2000);
    expect(result.data.memoryOptimized).toBe(true);
    expect(result.data.memoryStats).toBeDefined();
    expect(result.data.memoryStats.peakUsageMB).toBeLessThan(50);

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

    // Verify garbage collection was triggered (if available)
    if (global.gc) {
      expect(result.data.memoryStats.gcTriggered).toBe(true);
    } else {
      // GC not available, just verify the flag is set correctly
      expect(result.data.memoryStats.gcTriggered).toBe(false);
    }
  });

  test('should provide memory monitoring during processing', async () => {
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 500; i++) {
      testData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const memorySnapshots = [];

    const result = await excelProcessor.parsePayrollExcelOptimized(buffer, {
      enableMemoryOptimization: true,
      onMemoryUpdate: (memoryInfo) => {
        memorySnapshots.push(memoryInfo);
        expect(memoryInfo).toHaveProperty('heapUsed');
        expect(memoryInfo).toHaveProperty('heapTotal');
        expect(memoryInfo).toHaveProperty('external');
      }
    });

    expect(result.success).toBe(true);
    expect(memorySnapshots.length).toBeGreaterThan(0);
    expect(result.data.memoryStats.monitoringEnabled).toBe(true);
  });

  test('should automatically trigger garbage collection when memory threshold exceeded', async () => {
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 1000; i++) {
      testData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelOptimized(buffer, {
      enableMemoryOptimization: true,
      memoryThresholdMB: 10, // Very low threshold to trigger GC
      autoGarbageCollection: true
    });

    expect(result.success).toBe(true);
    
    // Check GC behavior based on availability
    if (global.gc) {
      expect(result.data.memoryStats.gcTriggered).toBe(true);
      expect(result.data.memoryStats.gcCount).toBeGreaterThan(0);
    } else {
      // GC not available, just verify structure
      expect(result.data.memoryStats.gcTriggered).toBe(false);
      expect(result.data.memoryStats.gcCount).toBe(0);
    }
  });

  test('should handle memory pressure gracefully', async () => {
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 3000; i++) {
      testData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelOptimized(buffer, {
      enableMemoryOptimization: true,
      maxMemoryUsageMB: 30, // Strict limit
      fallbackToStandard: true
    });

    expect(result.success).toBe(true);
    expect(result.data.totalRows).toBe(3000);
    
    // Should either succeed with optimization or fall back gracefully
    if (result.data.memoryOptimized) {
      expect(result.data.memoryStats.peakUsageMB).toBeLessThan(30);
    } else {
      expect(result.data.fallbackUsed).toBe(true);
    }
  });

  test('should clean up temporary objects and references', async () => {
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

    const memoryBefore = process.memoryUsage().heapUsed;

    const result = await excelProcessor.parsePayrollExcelOptimized(buffer, {
      enableMemoryOptimization: true,
      cleanupTemporaryObjects: true
    });

    // Force garbage collection after processing
    if (global.gc) {
      global.gc();
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDifference = memoryAfter - memoryBefore;

    expect(result.success).toBe(true);
    expect(result.data.memoryStats.cleanupPerformed).toBe(true);
    
    // Memory should not increase significantly after cleanup and GC
    expect(memoryDifference).toBeLessThan(20 * 1024 * 1024); // Less than 20MB residual
  });
});