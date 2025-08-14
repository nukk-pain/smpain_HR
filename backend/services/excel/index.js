/**
 * AI-HEADER
 * intent: Unified Excel service integrating all Excel-related functionality
 * domain_meaning: Single entry point for all Excel operations with backwards compatibility
 * misleading_names: None
 * data_contracts: Provides complete Excel processing API compatible with original ExcelProcessor
 * PII: Handles employee payroll data across all services - security managed at service level
 * invariants: API compatibility maintained, all original functionality preserved
 * rag_keywords: excel service integration, unified api, backwards compatibility
 */

const ExcelParserService = require('./ExcelParserService');
const PayrollExcelService = require('./PayrollExcelService');
const ExcelCacheService = require('./ExcelCacheService');

// Import existing related services
const ExcelRecoveryService = require('./ExcelRecoveryService');
const ReportGenerator = require('../../reportGenerator');
const IncentiveCalculator = require('../../incentiveCalculator');
const ExcelAnalyzer = require('../../utils/excelAnalyzer');
const LaborConsultantParser = require('../../utils/laborConsultantParser');
const fieldConverter = require('../../utils/fieldConverter');

class ExcelService {
  /**
   * Initialize unified Excel service with all components
   * DomainMeaning: Create integrated service providing all Excel functionality through single interface
   * MisleadingNames: None
   * SideEffects: None - only sets up service instances
   * Invariants: All sub-services are properly initialized and accessible
   * RAG_Keywords: service integration, initialization, unified interface
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_excel_service_init_001
   */
  constructor() {
    // New modular services
    this.parser = new ExcelParserService();
    this.payroll = new PayrollExcelService();
    this.cache = new ExcelCacheService();
    
    // Existing services integration
    this.recovery = new ExcelRecoveryService();
    this.generator = new ReportGenerator();
    this.calculator = new IncentiveCalculator();
    this.analyzer = new ExcelAnalyzer();
    this.laborParser = new LaborConsultantParser();
    this.fieldConverter = fieldConverter;

    // Maintain original properties for compatibility
    this.allowedMimeTypes = this.parser.allowedMimeTypes;
    this.maxFileSize = this.parser.maxFileSize;
  }

  // ===== BACKWARDS COMPATIBILITY API =====
  // These methods maintain the exact same interface as the original ExcelProcessor

  /**
   * Validate Excel file (backwards compatible)
   * DomainMeaning: File validation with original interface
   * MisleadingNames: None
   * SideEffects: None - delegates to parser service
   * Invariants: Same validation logic and response format as original
   * RAG_Keywords: file validation, backwards compatibility
   * DuplicatePolicy: supersedes original ExcelProcessor.validateFile
   * FunctionIdentity: hash_validate_file_compat_001
   */
  validateFile(file) {
    return this.parser.validateFile(file);
  }

  /**
   * Parse Excel file (backwards compatible)
   * DomainMeaning: Basic Excel parsing with original interface
   * MisleadingNames: None
   * SideEffects: None - delegates to parser service
   * Invariants: Same parsing logic and response format as original
   * RAG_Keywords: excel parsing, backwards compatibility
   * DuplicatePolicy: supersedes original ExcelProcessor.parseExcelFile
   * FunctionIdentity: hash_parse_excel_compat_001
   */
  async parseExcelFile(buffer, expectedColumns = []) {
    return this.parser.parseExcelFile(buffer, expectedColumns);
  }

  /**
   * Parse payroll Excel (backwards compatible)
   * DomainMeaning: Payroll-specific parsing with original interface
   * MisleadingNames: None
   * SideEffects: None - delegates to parser service
   * Invariants: Same payroll parsing logic and response format as original
   * RAG_Keywords: payroll parsing, backwards compatibility
   * DuplicatePolicy: supersedes original ExcelProcessor.parsePayrollExcel
   * FunctionIdentity: hash_parse_payroll_compat_001
   */
  async parsePayrollExcel(buffer) {
    return this.parser.parsePayrollExcel(buffer);
  }

  /**
   * Compare with system data (backwards compatible)
   * DomainMeaning: Data comparison with original interface
   * MisleadingNames: None
   * SideEffects: None - delegates to parser service
   * Invariants: Same comparison logic and response format as original
   * RAG_Keywords: data comparison, backwards compatibility
   * DuplicatePolicy: supersedes original ExcelProcessor.compareWithSystemData
   * FunctionIdentity: hash_compare_system_compat_001
   */
  async compareWithSystemData(uploadedData, systemData) {
    return this.parser.compareWithSystemData(uploadedData, systemData);
  }

  /**
   * Generate Excel file (backwards compatible)
   * DomainMeaning: Excel file generation with original interface
   * MisleadingNames: None
   * SideEffects: None - delegates to cache service
   * Invariants: Same generation logic and response format as original
   * RAG_Keywords: excel generation, backwards compatibility
   * DuplicatePolicy: supersedes original ExcelProcessor.generateExcelFile
   * FunctionIdentity: hash_generate_excel_compat_001
   */
  async generateExcelFile(data, template = 'payroll') {
    return this.cache.generateExcelFile(data, template);
  }

  /**
   * Generate payroll Excel file (backwards compatible)
   * DomainMeaning: Payroll Excel generation with original interface
   * MisleadingNames: None
   * SideEffects: None - delegates to cache service
   * Invariants: Same payroll generation logic and response format as original
   * RAG_Keywords: payroll generation, backwards compatibility
   * DuplicatePolicy: supersedes original ExcelProcessor.generatePayrollExcelFile
   * FunctionIdentity: hash_generate_payroll_excel_compat_001
   */
  async generatePayrollExcelFile(payrollData, metadata = {}) {
    return this.cache.generatePayrollExcelFile(payrollData, metadata);
  }

  /**
   * Generate payroll summary (backwards compatible)
   * DomainMeaning: Summary generation with original interface
   * MisleadingNames: None
   * SideEffects: None - delegates to parser service
   * Invariants: Same summary logic and response format as original
   * RAG_Keywords: summary generation, backwards compatibility
   * DuplicatePolicy: supersedes original ExcelProcessor.generatePayrollSummary
   * FunctionIdentity: hash_generate_summary_compat_001
   */
  generatePayrollSummary(data) {
    return this.parser.generatePayrollSummary(data);
  }

  // ===== PERFORMANCE OPTIMIZED METHODS =====
  // These methods provide enhanced functionality from the specialized services

  /**
   * Parse payroll Excel in chunks for large files
   * DomainMeaning: Memory-efficient chunked processing for large payroll files
   * MisleadingNames: None
   * SideEffects: May trigger garbage collection, calls progress callbacks
   * Invariants: Same data accuracy as standard parsing but with memory optimization
   * RAG_Keywords: chunk processing, performance optimization, memory efficiency
   * DuplicatePolicy: supersedes original ExcelProcessor.parsePayrollExcelInChunks
   * FunctionIdentity: hash_parse_chunks_enhanced_001
   */
  async parsePayrollExcelInChunks(buffer, options = {}) {
    return this.payroll.parsePayrollExcelInChunks(buffer, options);
  }

  /**
   * Parse payroll Excel with caching
   * DomainMeaning: Cache-enabled parsing for repeated file processing
   * MisleadingNames: None
   * SideEffects: Modifies cache, updates cache statistics
   * Invariants: Cached results are identical to non-cached processing
   * RAG_Keywords: cache parsing, performance optimization, duplicate detection
   * DuplicatePolicy: supersedes original ExcelProcessor.parsePayrollExcelWithCache
   * FunctionIdentity: hash_parse_cache_enhanced_001
   */
  async parsePayrollExcelWithCache(buffer, options = {}) {
    return this.cache.parsePayrollExcelWithCache(buffer, options);
  }

  /**
   * Process row with comprehensive failure handling
   * DomainMeaning: Individual row processing with detailed error tracking
   * MisleadingNames: None
   * SideEffects: May modify duplicateIds set
   * Invariants: Returns consistent validation results for row processing
   * RAG_Keywords: row processing, error handling, validation
   * DuplicatePolicy: supersedes original ExcelProcessor.processRowWithFailureHandling
   * FunctionIdentity: hash_process_row_enhanced_001
   */
  async processRowWithFailureHandling(rowData, rowNumber, duplicateIds, options = {}) {
    return this.payroll.processRowWithFailureHandling(rowData, rowNumber, duplicateIds, options);
  }

  /**
   * Process batch with rollback capability
   * DomainMeaning: Batch processing with transaction-safe rollback
   * MisleadingNames: None
   * SideEffects: May apply rollback, modifies batch processing state
   * Invariants: Either all rows in batch succeed or entire batch is rolled back
   * RAG_Keywords: batch processing, rollback, transaction safety
   * DuplicatePolicy: supersedes original ExcelProcessor.processBatch
   * FunctionIdentity: hash_process_batch_enhanced_001
   */
  async processBatch(batchRows, headers, startRowNumber, options = {}) {
    return this.payroll.processBatch(batchRows, headers, startRowNumber, options);
  }

  // ===== INTEGRATED SERVICE METHODS =====
  // These methods provide access to related services

  /**
   * Parse Excel with error recovery
   * DomainMeaning: Excel parsing with automatic error recovery fallback
   * MisleadingNames: None
   * SideEffects: None - combines services for resilient parsing
   * Invariants: Attempts standard parsing first, falls back to recovery on failure
   * RAG_Keywords: error recovery, resilient parsing, fallback processing
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_parse_with_recovery_001
   */
  async parsePayrollExcelWithRecovery(buffer, options = {}) {
    try {
      // Try standard parsing first
      return await this.parser.parsePayrollExcel(buffer);
    } catch (error) {
      // Fall back to recovery service
      console.log('Standard parsing failed, attempting recovery:', error.message);
      return this.recovery.parsePayrollExcel(buffer);
    }
  }

  /**
   * Generate payroll report using report generator
   * DomainMeaning: Create comprehensive payroll reports with advanced formatting
   * MisleadingNames: None
   * SideEffects: None - delegates to report generator
   * Invariants: Generated reports follow consistent format and structure
   * RAG_Keywords: report generation, payroll reports, advanced formatting
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_generate_report_001
   */
  async generatePayrollReport(data, options = {}) {
    return this.generator.generatePayrollExcelReport(data, options);
  }

  /**
   * Calculate incentives using calculator service
   * DomainMeaning: Compute employee incentives based on performance metrics
   * MisleadingNames: None
   * SideEffects: None - delegates to incentive calculator
   * Invariants: Calculations follow consistent business rules and formulas
   * RAG_Keywords: incentive calculation, performance metrics, business rules
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_calculate_incentives_001
   */
  calculateIncentive(formula, variables) {
    return this.calculator.calculateIncentive(formula, variables);
  }

  /**
   * Analyze Excel structure using analyzer service
   * DomainMeaning: Examine Excel file structure and column mappings
   * MisleadingNames: None
   * SideEffects: None - delegates to analyzer service
   * Invariants: Analysis provides consistent structure information
   * RAG_Keywords: excel analysis, structure examination, column mapping
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_analyze_excel_001
   */
  async analyzeExcelStructure(buffer) {
    return this.analyzer.analyzeExcelFile(buffer);
  }

  /**
   * Parse labor consultant format using specialized parser
   * DomainMeaning: Handle specific Excel format from labor consultants
   * MisleadingNames: None
   * SideEffects: None - delegates to labor consultant parser
   * Invariants: Parsing follows labor consultant specific format rules
   * RAG_Keywords: labor consultant, specialized parsing, format specific
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_parse_labor_consultant_001
   */
  async parseLaborConsultantExcel(buffer) {
    return this.laborParser.parsePayrollExcel(buffer);
  }

  /**
   * Get cache statistics
   * DomainMeaning: Retrieve cache performance metrics
   * MisleadingNames: None
   * SideEffects: None - delegates to cache service
   * Invariants: Returns current cache state and performance metrics
   * RAG_Keywords: cache statistics, performance monitoring
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_cache_stats_001
   */
  getCacheStats() {
    return this.cache.getCacheStats();
  }

  /**
   * Clear all cached data
   * DomainMeaning: Remove all cached entries and reset statistics
   * MisleadingNames: None
   * SideEffects: Clears cache through cache service
   * Invariants: Cache is completely empty after operation
   * RAG_Keywords: cache clear, memory cleanup
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_clear_cache_001
   */
  clearCache() {
    return this.cache.clearCache();
  }
}

// Export single instance for backwards compatibility
module.exports = ExcelService;