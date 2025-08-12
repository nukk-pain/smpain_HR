/**
 * AI-HEADER
 * intent: Excel processing caching, generation, and rollback functionality
 * domain_meaning: Performance optimization through caching and transaction-safe Excel operations
 * misleading_names: None
 * data_contracts: Excel buffer input, cached results and generated Excel files as output
 * PII: Contains employee payroll data in cache - secure memory management required
 * invariants: Cache consistency maintained, rollback operations are atomic
 * rag_keywords: excel cache, file generation, rollback, transaction safety, performance
 */

const ExcelJS = require('exceljs');
const crypto = require('crypto');

class ExcelCacheService {
  /**
   * Initialize cache service with performance and security settings
   * DomainMeaning: Set up memory cache and transaction management for Excel operations
   * MisleadingNames: None
   * SideEffects: None - only sets configuration
   * Invariants: Cache size limits and security constraints are enforced
   * RAG_Keywords: initialization, cache, performance, memory management
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_excel_cache_init_001
   */
  constructor() {
    // Initialize cache
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0
    };
    
    this.defaultCacheTimeout = 300000; // 5 minutes
    this.maxCacheSize = 100; // Maximum cache entries
  }

  /**
   * Parse payroll Excel with intelligent caching
   * DomainMeaning: Use cached results when available to avoid reprocessing identical files
   * MisleadingNames: None
   * SideEffects: Modifies cache, updates cache statistics
   * Invariants: Cache keys are unique per file content, expired entries are cleaned up
   * RAG_Keywords: cache parsing, performance optimization, duplicate detection
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_parse_excel_cache_001
   */
  async parsePayrollExcelWithCache(buffer, options = {}) {
    const {
      useCache = true,
      cacheTimeout = this.defaultCacheTimeout
    } = options;

    // If caching is disabled, use standard parsing
    if (!useCache) {
      const ExcelParserService = require('./ExcelParserService');
      const parser = new ExcelParserService();
      const result = await parser.parsePayrollExcel(buffer);
      return {
        ...result,
        data: result.data ? {
          ...result.data,
          fromCache: false
        } : null
      };
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(buffer);
    const now = Date.now();

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cachedEntry = this.cache.get(cacheKey);
      
      // Check if cache entry is still valid
      if (now - cachedEntry.timestamp < cacheTimeout) {
        this.cacheStats.hits++;
        return {
          ...cachedEntry.result,
          data: {
            ...cachedEntry.result.data,
            fromCache: true,
            cacheKey
          }
        };
      } else {
        // Cache expired, remove entry
        this.cache.delete(cacheKey);
        this.cacheStats.size--;
      }
    }

    // Cache miss - parse normally
    this.cacheStats.misses++;
    const ExcelParserService = require('./ExcelParserService');
    const parser = new ExcelParserService();
    const result = await parser.parsePayrollExcel(buffer);

    // Store in cache if parsing was successful
    if (result.success) {
      // Cleanup cache if it's getting too large
      if (this.cache.size >= this.maxCacheSize) {
        this.cleanupOldestCacheEntries(10);
      }

      this.cache.set(cacheKey, {
        result: {
          ...result,
          data: {
            ...result.data,
            fromCache: false
          }
        },
        timestamp: now
      });
      this.cacheStats.size++;
    }

    return {
      ...result,
      data: result.data ? {
        ...result.data,
        fromCache: false,
        cacheKey
      } : null
    };
  }

  /**
   * Generate secure cache key from buffer content
   * DomainMeaning: Create unique identifier for file contents to enable caching
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Same file content always produces same cache key
   * RAG_Keywords: cache key, hash generation, content identification
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_generate_cache_key_001
   */
  generateCacheKey(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 32);
  }

  /**
   * Clean up oldest cache entries to manage memory
   * DomainMeaning: Remove oldest cache entries when cache size limit is exceeded
   * MisleadingNames: None
   * SideEffects: Removes entries from cache, updates cache statistics
   * Invariants: Cache size is maintained within limits, oldest entries removed first
   * RAG_Keywords: cache cleanup, memory management, LRU eviction
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_cleanup_cache_001
   */
  cleanupOldestCacheEntries(count = 10) {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, count);

    entries.forEach(([key]) => {
      this.cache.delete(key);
      this.cacheStats.size--;
    });
  }

  /**
   * Generate Excel file from data with formatting
   * DomainMeaning: Create formatted Excel files for data export
   * MisleadingNames: None
   * SideEffects: None - returns workbook object
   * Invariants: Generated Excel follows standard format with proper styling
   * RAG_Keywords: excel generation, formatting, template, export
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_generate_excel_file_001
   */
  async generateExcelFile(data, template = 'payroll') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    if (template === 'payroll') {
      // 급여 템플릿
      const headers = [
        '사원번호', '성명', '부서', '직급',
        '기본급', '인센티브', '상여금', '포상금',
        '지급총액', '실지급액', '차액'
      ];

      // 헤더 설정
      worksheet.addRow(headers);
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // 데이터 추가
      data.forEach(row => {
        worksheet.addRow([
          row.employeeId || '',
          row.name || '',
          row.department || '',
          row.position || '',
          row.baseSalary || 0,
          row.incentive || 0,
          row.bonus || 0,
          row.award || 0,
          row.totalInput || 0,
          row.actualPayment || 0,
          row.difference || 0
        ]);
      });

      // 컬럼 너비 자동 조정
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // 숫자 포맷 설정
      for (let i = 5; i <= 11; i++) {
        worksheet.getColumn(i).numFmt = '#,##0';
      }
    }

    return workbook;
  }

  /**
   * Generate specialized payroll Excel file with metadata
   * DomainMeaning: Create comprehensive payroll Excel with additional metadata and formatting
   * MisleadingNames: None
   * SideEffects: None - returns workbook object
   * Invariants: Payroll file contains all required fields with proper validation
   * RAG_Keywords: payroll excel, metadata, comprehensive formatting
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_generate_payroll_excel_001
   */
  async generatePayrollExcelFile(payrollData, metadata = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll Data');

    // 급여 데이터를 위한 헤더 정의
    const headers = [
      '사원번호', '성명', '부서', '직급', '입사일',
      '기본급', '인센티브', '상여금', '포상금', '기타수당',
      '총지급액', '국민연금', '건강보험', '고용보험', '소득세',
      '총공제액', '실지급액', '비고'
    ];

    // 메타데이터 섹션
    if (metadata.title) {
      const titleRow = worksheet.addRow([metadata.title]);
      titleRow.getCell(1).font = { size: 14, bold: true };
      titleRow.getCell(1).alignment = { horizontal: 'center' };
      worksheet.mergeCells('A1:R1');
    }

    if (metadata.period) {
      const periodRow = worksheet.addRow([`급여 기간: ${metadata.period}`]);
      periodRow.getCell(1).font = { size: 12 };
    }

    if (metadata.generatedDate) {
      const dateRow = worksheet.addRow([`생성일: ${metadata.generatedDate}`]);
      dateRow.getCell(1).font = { size: 10, italic: true };
    }

    // 빈 행 추가
    worksheet.addRow([]);

    // 헤더 추가
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD0D0D0' }
    };

    // 급여 데이터 추가
    payrollData.forEach(employee => {
      worksheet.addRow([
        employee.employeeId || '',
        employee.name || '',
        employee.department || '',
        employee.position || '',
        employee.hireDate || '',
        employee.baseSalary || 0,
        employee.incentive || 0,
        employee.bonus || 0,
        employee.award || 0,
        employee.allowance || 0,
        employee.totalInput || 0,
        employee.nationalPension || 0,
        employee.healthInsurance || 0,
        employee.employmentInsurance || 0,
        employee.incomeTax || 0,
        employee.totalDeduction || 0,
        employee.actualPayment || 0,
        employee.notes || ''
      ]);
    });

    // 컬럼 너비 설정
    worksheet.getColumn(1).width = 12; // 사원번호
    worksheet.getColumn(2).width = 10; // 성명
    worksheet.getColumn(3).width = 12; // 부서
    worksheet.getColumn(4).width = 10; // 직급
    worksheet.getColumn(5).width = 12; // 입사일

    // 숫자 컬럼들 (급여 관련)
    for (let i = 6; i <= 17; i++) {
      worksheet.getColumn(i).width = 12;
      worksheet.getColumn(i).numFmt = '#,##0';
    }

    worksheet.getColumn(18).width = 15; // 비고

    return workbook;
  }

  /**
   * Generate payroll template Excel file
   * DomainMeaning: Create empty payroll template for data entry
   * MisleadingNames: None
   * SideEffects: None - returns workbook object
   * Invariants: Template contains all required headers and formatting
   * RAG_Keywords: payroll template, empty template, data entry format
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_generate_payroll_template_001
   */
  async generatePayrollTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('급여 템플릿');

    // 제목 추가
    const titleRow = worksheet.addRow(['급여 데이터 입력 템플릿']);
    titleRow.getCell(1).font = { size: 16, bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:K1');

    // 안내 메시지
    worksheet.addRow([]);
    const instructionRow = worksheet.addRow(['아래 표에 급여 데이터를 입력하세요. 필수 항목: 사원번호, 성명']);
    instructionRow.getCell(1).font = { size: 10, italic: true };
    worksheet.mergeCells('A3:K3');

    worksheet.addRow([]);

    // 헤더 정의
    const headers = [
      '사원번호', '성명', '부서', '직급',
      '기본급', '인센티브', '상여금', '포상금',
      '지급총액', '실지급액', '차액'
    ];

    // 헤더 추가
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB0C4DE' }
    };

    // 예시 데이터 추가 (1행)
    const exampleRow = worksheet.addRow([
      'EMP001', '홍길동', '개발팀', '사원',
      3000000, 500000, 0, 0,
      3500000, 3150000, 0
    ]);
    exampleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' }
    };

    // 빈 행들 추가 (데이터 입력용)
    for (let i = 0; i < 20; i++) {
      worksheet.addRow(['', '', '', '', '', '', '', '', '', '', '']);
    }

    // 컬럼 너비 설정
    worksheet.getColumn(1).width = 12; // 사원번호
    worksheet.getColumn(2).width = 10; // 성명
    worksheet.getColumn(3).width = 12; // 부서
    worksheet.getColumn(4).width = 10; // 직급

    // 급여 컬럼들
    for (let i = 5; i <= 11; i++) {
      worksheet.getColumn(i).width = 12;
      worksheet.getColumn(i).numFmt = '#,##0';
    }

    // 데이터 유효성 검사 추가
    worksheet.dataValidations.add('A6:A100', {
      type: 'textLength',
      operator: 'greaterThan',
      formula1: 0,
      showErrorMessage: true,
      errorTitle: '입력 오류',
      error: '사원번호는 필수 입력 항목입니다.'
    });

    worksheet.dataValidations.add('B6:B100', {
      type: 'textLength',
      operator: 'greaterThan',
      formula1: 0,
      showErrorMessage: true,
      errorTitle: '입력 오류',
      error: '성명은 필수 입력 항목입니다.'
    });

    return workbook;
  }

  /**
   * Get current cache statistics
   * DomainMeaning: Provide cache performance metrics for monitoring
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Returns current cache state information
   * RAG_Keywords: cache statistics, performance monitoring, metrics
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_cache_stats_001
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits + this.cacheStats.misses > 0 
        ? Math.round((this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100)
        : 0,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear all cached data
   * DomainMeaning: Remove all cached entries and reset statistics
   * MisleadingNames: None
   * SideEffects: Clears cache map and resets statistics
   * Invariants: Cache is completely empty after operation
   * RAG_Keywords: cache clear, memory cleanup, reset
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_clear_cache_001
   */
  clearCache() {
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0
    };
  }
}

module.exports = ExcelCacheService;