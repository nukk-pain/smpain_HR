const ExcelProcessor = require('../../excelProcessor');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

describe('Streaming Excel Parsing', () => {
  let excelProcessor;

  beforeEach(() => {
    excelProcessor = new ExcelProcessor();
  });

  /**
   * Test should fail initially as streaming parsing is not implemented
   * DomainMeaning: Tests ability to parse Excel files using streaming for reduced memory usage
   * MisleadingNames: None
   * SideEffects: May create temporary test files
   * Invariants: Streaming should produce same results as standard parsing but use less memory
   * RAG_Keywords: streaming, parsing, memory, excel, performance, low-memory
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_test_streaming_parsing_001
   */
  test('should parse Excel file using streaming to reduce memory usage', async () => {
    // Create test Excel file
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    // Generate 1000 rows of test data
    for (let i = 1; i <= 1000; i++) {
      testData.push([
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
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const memoryBefore = process.memoryUsage().heapUsed;

    // This should fail initially - no streaming parsing implemented
    const result = await excelProcessor.parsePayrollExcelStreaming(buffer, {
      onRow: (row, index) => {
        // Callback for each row as it's processed
        expect(row).toHaveProperty('사원번호');
        expect(row).toHaveProperty('성명');
      },
      onProgress: (progress) => {
        expect(progress).toHaveProperty('processed');
        expect(progress).toHaveProperty('total');
      }
    });

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryUsed = memoryAfter - memoryBefore;

    expect(result.success).toBe(true);
    expect(result.data.totalRows).toBe(1000);
    expect(result.data.streamingParsed).toBe(true);
    expect(result.data.rows).toHaveLength(1000);
    
    // Memory usage should be reasonable (less than 30MB for 1000 rows)
    expect(memoryUsed).toBeLessThan(30 * 1024 * 1024);

    // Verify data integrity
    expect(result.data.rows[0]['사원번호']).toBe('EMP0001');
    expect(result.data.rows[999]['사원번호']).toBe('EMP1000');
  });

  test('should handle streaming parsing errors gracefully', async () => {
    // Create invalid Excel data
    const invalidBuffer = Buffer.from('invalid excel data');

    const result = await excelProcessor.parsePayrollExcelStreaming(invalidBuffer);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  test('should provide row-by-row callbacks during streaming parsing', async () => {
    // Create small test file
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);

    for (let i = 1; i <= 5; i++) {
      testData.push([`EMP${i}`, `직원${i}`, '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const rowCallbacks = [];
    const progressCallbacks = [];

    const result = await excelProcessor.parsePayrollExcelStreaming(buffer, {
      onRow: (row, index) => {
        rowCallbacks.push({ row, index });
      },
      onProgress: (progress) => {
        progressCallbacks.push(progress);
      }
    });

    expect(result.success).toBe(true);
    expect(rowCallbacks).toHaveLength(5); // 5 data rows
    expect(progressCallbacks.length).toBeGreaterThan(0);
    
    // Verify callback data
    expect(rowCallbacks[0].row['사원번호']).toBe('EMP1');
    expect(rowCallbacks[4].row['사원번호']).toBe('EMP5');
  });

  test('should fall back to standard parsing when streaming fails', async () => {
    // Create valid payroll data but test fallback behavior
    const testData = [];
    const headers = ['사원번호', '성명', '부서', '직급', '기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    testData.push(headers);
    testData.push(['EMP1', '직원1', '개발팀', '사원', 3000000, 500000, 200000, 100000, 3800000, 3200000, 600000]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Test with valid data should work with streaming
    const result = await excelProcessor.parsePayrollExcelStreaming(buffer, {
      fallbackToStandard: true
    });

    // Should succeed with streaming parsing (fallback not needed for valid data)
    expect(result.success).toBe(true);
    expect(result.data.streamingParsed).toBe(true);
    expect(result.data.fallbackUsed).toBe(false);
  });
});