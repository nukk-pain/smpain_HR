const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');
const crypto = require('crypto');

describe('Excel Processing Cache', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
    // Clear cache before each test
    if (excelProcessor.clearCache) {
      excelProcessor.clearCache();
    }
  });

  afterEach(() => {
    // Clean up cache after each test
    if (excelProcessor.clearCache) {
      excelProcessor.clearCache();
    }
  });

  /**
   * Test should fail initially as caching is not implemented
   * DomainMeaning: Tests ability to cache parsed Excel results to avoid re-processing
   * MisleadingNames: None
   * SideEffects: Creates cache entries during processing
   * Invariants: Cached results should be identical to fresh parsing results
   * RAG_Keywords: cache, performance, excel, parsing, optimization, hash
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_excel_cache_001
   */
  test('should cache parsed Excel results to avoid re-processing', async () => {
    // Create test Excel file
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 100; i++) {
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

    // First parsing - should not be cached
    const startTime1 = Date.now();
    const result1 = await excelProcessor.parsePayrollExcelWithCache(buffer, {
      useCache: true,
      cacheTimeout: 300000 // 5 minutes
    });
    const duration1 = Date.now() - startTime1;

    expect(result1.success).toBe(true);
    expect(result1.data.totalRows).toBe(100);
    expect(result1.data.fromCache).toBe(false);
    expect(result1.data.cacheKey).toBeDefined();

    // Second parsing with same data - should be cached
    const startTime2 = Date.now();
    const result2 = await excelProcessor.parsePayrollExcelWithCache(buffer, {
      useCache: true,
      cacheTimeout: 300000
    });
    const duration2 = Date.now() - startTime2;

    expect(result2.success).toBe(true);
    expect(result2.data.totalRows).toBe(100);
    expect(result2.data.fromCache).toBe(true);
    expect(result2.data.cacheKey).toBe(result1.data.cacheKey);

    // Cached result should be much faster (at least 50% faster)
    expect(duration2).toBeLessThan(duration1 * 0.5);

    // Results should be identical except for cache metadata
    const { fromCache: fc1, cacheKey: ck1, ...data1 } = result1.data;
    const { fromCache: fc2, cacheKey: ck2, ...data2 } = result2.data;
    expect(data1).toEqual(data2);
  });

  test('should generate consistent cache keys for identical files', async () => {
    const testData = [
      ['사원번호', '성명', '기본급'],
      ['EMP001', '직원1', 3000000],
      ['EMP002', '직원2', 3500000]
    ];

    const wb1 = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb1, ws1, 'Sheet1');
    const buffer1 = XLSX.write(wb1, { type: 'buffer', bookType: 'xlsx' });

    const wb2 = XLSX.utils.book_new();
    const ws2 = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb2, ws2, 'Sheet1');
    const buffer2 = XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' });

    const cacheKey1 = excelProcessor.generateCacheKey(buffer1);
    const cacheKey2 = excelProcessor.generateCacheKey(buffer2);

    expect(cacheKey1).toBeDefined();
    expect(cacheKey2).toBeDefined();
    expect(cacheKey1).toBe(cacheKey2); // Same data should have same cache key
  });

  test('should respect cache timeout and invalidate expired entries', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Parse with very short cache timeout
    const result1 = await excelProcessor.parsePayrollExcelWithCache(buffer, {
      useCache: true,
      cacheTimeout: 100 // 100ms
    });

    expect(result1.success).toBe(true);
    expect(result1.data.fromCache).toBe(false);

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Parse again - cache should be expired
    const result2 = await excelProcessor.parsePayrollExcelWithCache(buffer, {
      useCache: true,
      cacheTimeout: 100
    });

    expect(result2.success).toBe(true);
    expect(result2.data.fromCache).toBe(false); // Should not be from cache due to timeout
  });

  test('should handle cache miss gracefully and fall back to normal parsing', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Parse without cache first
    const result1 = await excelProcessor.parsePayrollExcelWithCache(buffer, {
      useCache: false // Explicitly disable cache
    });

    expect(result1.success).toBe(true);
    expect(result1.data.fromCache).toBe(false);
    expect(result1.data.cacheKey).toBeUndefined();
  });

  test('should provide cache statistics and management', async () => {
    const testData = [
      ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'],
      ['EMP001', '직원1', '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000],
      ['EMP002', '직원2', '개발팀', '사원', 3500000, 600000, 250000, 150000, 4500000, 3800000, 700000]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Parse to populate cache
    await excelProcessor.parsePayrollExcelWithCache(buffer, {
      useCache: true,
      cacheTimeout: 300000
    });

    // Get cache statistics
    const stats = excelProcessor.getCacheStats();
    expect(stats).toBeDefined();
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(1);

    // Parse same data again to test hit counter
    await excelProcessor.parsePayrollExcelWithCache(buffer, {
      useCache: true,
      cacheTimeout: 300000
    });

    const updatedStats = excelProcessor.getCacheStats();
    expect(updatedStats.hits).toBe(1);
    expect(updatedStats.misses).toBe(1);

    // Clear cache
    excelProcessor.clearCache();
    const clearedStats = excelProcessor.getCacheStats();
    expect(clearedStats.size).toBe(0);
  });
});