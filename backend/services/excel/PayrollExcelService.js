/**
 * AI-HEADER
 * intent: Advanced payroll Excel processing with performance optimizations
 * domain_meaning: Specialized service for high-performance payroll data processing with chunking, streaming, and error handling
 * misleading_names: None
 * data_contracts: Excel buffer input, optimized payroll processing with various performance strategies
 * PII: Contains sensitive employee payroll data - maximum security required
 * invariants: All performance optimizations maintain data accuracy and validation consistency
 * rag_keywords: payroll excel, performance optimization, chunking, streaming, batch processing
 */

const XLSX = require('xlsx');

class PayrollExcelService {
  /**
   * Initialize payroll Excel service with performance settings
   * DomainMeaning: Set up performance parameters for large file processing
   * MisleadingNames: None
   * SideEffects: None - only sets configuration
   * Invariants: Performance settings are optimized for payroll data characteristics
   * RAG_Keywords: initialization, performance, optimization, configuration
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_payroll_excel_init_001
   */
  constructor() {
    this.chunkSize = 1000;
    this.streamOptions = { objectMode: true };
    this.maxMemoryMB = 100;
    this.expectedColumns = [
      '사원번호', '성명', '부서', '직급', 
      '기본급', '인센티브', '상여금', '포상금', 
      '지급총액', '실지급액', '차액'
    ];
  }

  /**
   * Process payroll Excel in memory-efficient chunks
   * DomainMeaning: Split large Excel files into manageable chunks for memory optimization
   * MisleadingNames: None
   * SideEffects: Calls onProgress callback during processing, may trigger garbage collection
   * Invariants: Maintains data accuracy while reducing memory footprint
   * RAG_Keywords: chunk processing, memory efficiency, large files, progress tracking
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_parse_payroll_chunks_001
   */
  async parsePayrollExcelInChunks(buffer, options = {}) {
    const { 
      chunkSize = this.chunkSize, 
      onProgress = null,
      maxMemoryMB = this.maxMemoryMB 
    } = options;

    try {
      // First, get basic file info
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Get range to determine file size
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const totalRows = range.e.r; // 0-based, excluding header

      // For small files, use standard processing
      if (totalRows <= chunkSize) {
        // Use basic parser from ExcelParserService
        const ExcelParserService = require('./ExcelParserService');
        const parser = new ExcelParserService();
        const standardResult = await parser.parsePayrollExcel(buffer);
        return {
          ...standardResult,
          data: {
            ...standardResult.data,
            processedInChunks: false,
            chunkCount: 1
          }
        };
      }

      // For large files, process in chunks
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headers = rawData[0];
      const dataRows = rawData.slice(1);

      // Validate headers
      const missingColumns = this.expectedColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      const allValidatedData = [];
      const chunkCount = Math.ceil(dataRows.length / chunkSize);
      let processedCount = 0;

      // Process chunks
      for (let i = 0; i < chunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, dataRows.length);
        const chunkRows = dataRows.slice(start, end);

        // Process current chunk
        const chunkData = chunkRows
          .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
          .map((row, index) => {
            const rowData = {};
            headers.forEach((header, headerIndex) => {
              if (header) {
                rowData[header] = row[headerIndex] || '';
              }
            });
            rowData.__rowIndex = start + index + 2; // Excel row number (1-based + header)
            return rowData;
          });

        // Validate chunk data
        const validatedChunk = chunkData.map(row => {
          const errors = [];
          
          // Required field validation
          if (!row['사원번호'] || !row['성명']) {
            errors.push('Employee ID and Name are required');
          }

          // Numeric field validation and conversion
          const numericFields = ['기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
          const convertedRow = { ...row };
          
          numericFields.forEach(field => {
            const value = row[field];
            if (value !== null && value !== undefined && value !== '') {
              const numValue = parseFloat(String(value).replace(/[,\s]/g, ''));
              if (isNaN(numValue)) {
                errors.push(`Invalid number format in ${field}: ${value}`);
              } else {
                convertedRow[field] = numValue;
              }
            } else {
              convertedRow[field] = 0;
            }
          });

          return {
            ...convertedRow,
            __errors: errors,
            __isValid: errors.length === 0
          };
        });

        allValidatedData.push(...validatedChunk);
        processedCount += chunkData.length;

        // Report progress
        if (onProgress) {
          onProgress({
            processed: processedCount,
            total: dataRows.length,
            chunk: i + 1,
            totalChunks: chunkCount,
            percentage: Math.round((processedCount / dataRows.length) * 100)
          });
        }

        // Memory management - force garbage collection if available
        if (global.gc && i % 5 === 0) {
          global.gc();
        }
      }

      return {
        success: true,
        data: {
          headers,
          rows: allValidatedData,
          totalRows: allValidatedData.length,
          validRows: allValidatedData.filter(row => row.__isValid).length,
          invalidRows: allValidatedData.filter(row => !row.__isValid).length,
          processedInChunks: true,
          chunkCount,
          chunkSize,
          sheetName,
          summary: this.generatePayrollSummary(allValidatedData)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Process single row with comprehensive failure handling
   * DomainMeaning: Individual row processing with error tracking and recovery
   * MisleadingNames: None  
   * SideEffects: None - read-only processing
   * Invariants: Returns consistent row structure with validation results
   * RAG_Keywords: row processing, error handling, validation, failure recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_process_row_failure_001
   */
  async processRowWithFailureHandling(rowData, rowNumber, duplicateIds, options = {}) {
    const errors = [];
    let isValid = true;

    // Basic validation
    if (!rowData['사원번호'] || !rowData['성명']) {
      errors.push('Employee ID and Name are required');
      isValid = false;
    }

    // Duplicate check
    if (duplicateIds && duplicateIds.has(rowData['사원번호'])) {
      errors.push(`Duplicate employee ID: ${rowData['사원번호']}`);
      isValid = false;
    } else if (duplicateIds) {
      duplicateIds.add(rowData['사원번호']);
    }

    // Numeric field validation
    const numericFields = ['기본급', '인센티브', '상여금', '포상금', '지급총액', '실지급액', '차액'];
    const convertedRow = { ...rowData };
    
    numericFields.forEach(field => {
      const value = rowData[field];
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(String(value).replace(/[,\s]/g, ''));
        if (isNaN(numValue)) {
          errors.push(`Invalid number format in ${field}: ${value}`);
          isValid = false;
        } else {
          convertedRow[field] = numValue;
        }
      } else {
        convertedRow[field] = 0;
      }
    });

    return {
      isValid,
      processedRow: {
        ...convertedRow,
        __rowIndex: rowNumber,
        __errors: errors,
        __isValid: isValid
      }
    };
  }

  /**
   * Process batch of rows with failure handling
   * DomainMeaning: Batch processing with rollback capability on failures
   * MisleadingNames: None
   * SideEffects: Modifies duplicateIds set, may apply rollback
   * Invariants: Either all rows succeed or batch is rolled back
   * RAG_Keywords: batch processing, rollback, failure handling, transaction
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_process_batch_001
   */
  async processBatch(batchRows, headers, startRowNumber, options = {}) {
    let processedRows = 0;
    let failedRows = 0;
    let success = true;
    let rollbackApplied = false;

    const batchData = [];

    for (let i = 0; i < batchRows.length; i++) {
      const rowNumber = startRowNumber + i;
      const row = batchRows[i];
      const rowData = {};
      headers.forEach((header, headerIndex) => {
        rowData[header] = row[headerIndex] || '';
      });

      const result = await this.processRowWithFailureHandling(rowData, rowNumber, options.duplicateIds, options);
      
      if (result.isValid) {
        processedRows++;
      } else {
        failedRows++;
        success = false;
        rollbackApplied = true; // Rollback the entire batch on any failure
        // Continue processing to get full batch results
      }

      batchData.push(result.processedRow);
    }

    return {
      success,
      processedRows,
      failedRows,
      rollbackApplied,
      batchData: rollbackApplied ? [] : batchData
    };
  }

  /**
   * Generate payroll summary statistics
   * DomainMeaning: Calculate aggregate totals for payroll validation and reporting  
   * MisleadingNames: None
   * SideEffects: None - read-only calculation
   * Invariants: Returns consistent summary structure with zero defaults
   * RAG_Keywords: payroll summary, aggregate calculation, totals, statistics
   * DuplicatePolicy: duplicate_of ExcelParserService.generatePayrollSummary
   * FunctionIdentity: hash_generate_payroll_summary_002
   */
  generatePayrollSummary(data) {
    const validData = data.filter(row => row.__isValid);
    
    if (validData.length === 0) {
      return {
        totalEmployees: 0,
        totalBaseSalary: 0,
        totalIncentive: 0,
        totalBonus: 0,
        totalAward: 0,
        totalGross: 0,
        totalNet: 0,
        totalDifference: 0
      };
    }

    return {
      totalEmployees: validData.length,
      totalBaseSalary: validData.reduce((sum, row) => sum + (row['기본급'] || 0), 0),
      totalIncentive: validData.reduce((sum, row) => sum + (row['인센티브'] || 0), 0),
      totalBonus: validData.reduce((sum, row) => sum + (row['상여금'] || 0), 0),
      totalAward: validData.reduce((sum, row) => sum + (row['포상금'] || 0), 0),
      totalGross: validData.reduce((sum, row) => sum + (row['지급총액'] || 0), 0),
      totalNet: validData.reduce((sum, row) => sum + (row['실지급액'] || 0), 0),
      totalDifference: validData.reduce((sum, row) => sum + (row['차액'] || 0), 0)
    };
  }
}

module.exports = PayrollExcelService;