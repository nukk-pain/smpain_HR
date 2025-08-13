const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');

describe('Chunk-based File Processing', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  /**
   * Test should fail initially as chunk processing is not implemented
   * DomainMeaning: Tests ability to process large Excel files in smaller chunks
   * MisleadingNames: None
   * SideEffects: Creates test Excel file in memory
   * Invariants: Large files should be processed without memory overflow
   * RAG_Keywords: chunk, processing, large, file, memory, excel
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_chunk_processing_001
   */
  test('should process large Excel file in chunks to prevent memory overflow', async () => {
    // Create a large test Excel file (simulate 5000 rows)
    const largeData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    largeData.push(headers);

    // Generate 5000 rows of test data
    for (let i = 1; i <= 5000; i++) {
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

    // Create Excel buffer
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(largeData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // This should fail initially - no chunk processing implemented
    const result = await excelProcessor.parsePayrollExcelInChunks(buffer, {
      chunkSize: 1000, // Process 1000 rows at a time
      onProgress: (progress) => {
        console.log(`Processing progress: ${progress.processed}/${progress.total} rows`);
      }
    });

    expect(result.success).toBe(true);
    expect(result.data.totalRows).toBe(5000);
    expect(result.data.processedInChunks).toBe(true);
    expect(result.data.chunkCount).toBe(5); // 5000 rows / 1000 chunk size
    expect(result.data.rows).toHaveLength(5000);

    // Verify data integrity - first row
    expect(result.data.rows[0]['사원번호']).toBe('EMP0001');
    expect(result.data.rows[0]['성명']).toBe('직원1');
    expect(result.data.rows[0]['기본급']).toBe(3000000);

    // Verify data integrity - last row  
    expect(result.data.rows[4999]['사원번호']).toBe('EMP5000');
    expect(result.data.rows[4999]['성명']).toBe('직원5000');
  });

  test('should fall back to standard processing for small files', async () => {
    // Create small test Excel file (10 rows) with all required columns
    const smallData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    smallData.push(headers);

    for (let i = 1; i <= 10; i++) {
      smallData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(smallData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await excelProcessor.parsePayrollExcelInChunks(buffer, {
      chunkSize: 1000
    });

    expect(result.success).toBe(true);
    expect(result.data.totalRows).toBe(10);
    expect(result.data.processedInChunks).toBe(false); // Small file, no chunking needed
    expect(result.data.rows).toHaveLength(10);
  });

  test('should handle memory cleanup after chunk processing', async () => {
    // Create medium-sized test file with all required columns
    const mediumData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    mediumData.push(headers);

    for (let i = 1; i <= 2500; i++) {
      mediumData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(mediumData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const initialMemory = process.memoryUsage().heapUsed;

    const result = await excelProcessor.parsePayrollExcelInChunks(buffer, {
      chunkSize: 500
    });

    expect(result.success).toBe(true);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB for this test)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});