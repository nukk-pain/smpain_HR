// AI-HEADER
// Intent: Analyze Excel files from labor consultants to understand structure and extract payroll data
// Domain Meaning: Parse real payroll Excel files to determine column mapping and data extraction patterns
// Misleading Names: analyzer vs parser - analyzer examines structure, parser extracts data
// Data Contracts: Must handle various Excel formats from different labor consultants
// PII: Contains actual employee salary information - handle with security
// Invariants: Must preserve data integrity during analysis, log all parsing attempts
// RAG Keywords: excel analysis, payroll parsing, labor consultant files, data extraction

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class ExcelAnalyzer {
  constructor() {
    this.commonColumnMappings = {
      // 한글 컬럼명 매핑
      '사번': 'employeeId',
      '직원번호': 'employeeId', 
      '성명': 'name',
      '이름': 'name',
      '부서': 'department',
      '직급': 'position',
      '직책': 'position',
      
      // 급여 관련
      '기본급': 'baseSalary',
      '기본금': 'baseSalary',
      '시간외수당': 'overtimeAllowance',
      '연장근무수당': 'overtimeAllowance',
      '직책수당': 'positionAllowance',
      '식대': 'mealAllowance',
      '교통비': 'transportationAllowance',
      '상여금': 'bonus',
      
      // 공제 관련
      '국민연금': 'nationalPension',
      '건강보험': 'healthInsurance', 
      '고용보험': 'employmentInsurance',
      '소득세': 'incomeTax',
      '지방소득세': 'localIncomeTax',
      '실지급액': 'netPay',
      '실급여': 'netPay',
      '실수령액': 'netPay'
    };
  }

  /**
   * AI-HEADER
   * DomainMeaning: Analyze Excel file structure to identify columns and data patterns
   * MisleadingNames: analyzeStructure vs parseStructure - analyze examines without extraction
   * SideEffects: Logs analysis results, creates structure report
   * Invariants: Must identify all sheets, column headers, and data ranges
   * RAG_Keywords: excel structure analysis, column detection, sheet parsing
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(analyzeStructure_excel_payroll)
   */
  async analyzeExcelStructure(filePath) {
    try {
      console.log(`🔍 Analyzing Excel file: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const workbook = XLSX.readFile(filePath);
      const analysis = {
        fileName: path.basename(filePath),
        fileSize: fs.statSync(filePath).size,
        sheets: [],
        recommendedMapping: {},
        dataPreview: [],
        analysisDate: new Date()
      };

      // 각 시트 분석
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetAnalysis = await this.analyzeSheet(sheet, sheetName);
        analysis.sheets.push(sheetAnalysis);
        
        // 첫 번째 시트 또는 가장 많은 데이터가 있는 시트를 기준으로 매핑 추천
        if (analysis.sheets.length === 1 || sheetAnalysis.dataRowCount > (analysis.mainSheet?.dataRowCount || 0)) {
          analysis.mainSheet = sheetAnalysis;
          analysis.recommendedMapping = this.generateColumnMapping(sheetAnalysis.headers);
        }
      }

      return analysis;
    } catch (error) {
      console.error('Excel analysis error:', error);
      throw new Error(`Failed to analyze Excel file: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Analyze individual Excel sheet structure and content
   * MisleadingNames: analyzeSheet vs parseSheet - analyze examines structure only
   * SideEffects: None - read-only analysis
   * Invariants: Must detect headers, data range, and data types
   * RAG_Keywords: sheet analysis, header detection, data range identification
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(analyzeSheet_structure_detection)
   */
  async analyzeSheet(sheet, sheetName) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const headers = [];
    const dataPreview = [];
    
    // 헤더 추출 (첫 번째 행)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = sheet[cellAddress];
      headers.push(cell ? cell.v : '');
    }

    // 데이터 미리보기 (최대 5행)
    const previewRows = Math.min(5, range.e.r);
    for (let row = 1; row <= previewRows; row++) {
      const rowData = {};
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        const header = headers[col - range.s.c] || `Column_${col}`;
        rowData[header] = cell ? cell.v : '';
      }
      dataPreview.push(rowData);
    }

    return {
      sheetName,
      headers: headers.filter(h => h), // 빈 헤더 제거
      dataRowCount: range.e.r, // 총 행 수 (헤더 포함)
      dataColumnCount: range.e.c + 1,
      dataPreview,
      range: sheet['!ref']
    };
  }

  /**
   * AI-HEADER
   * DomainMeaning: Generate column mapping from Korean headers to system field names
   * MisleadingNames: generateColumnMapping vs createMapping - both create field mappings
   * SideEffects: None - pure mapping generation
   * Invariants: Must map all recognizable Korean columns to English system fields
   * RAG_Keywords: column mapping, korean headers, field translation
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(generateColumnMapping_korean_to_english)
   */
  generateColumnMapping(headers) {
    const mapping = {};
    const unmappedColumns = [];

    headers.forEach((header, index) => {
      const cleanHeader = header.toString().trim();
      const mappedField = this.commonColumnMappings[cleanHeader];
      
      if (mappedField) {
        mapping[cleanHeader] = {
          systemField: mappedField,
          columnIndex: index,
          dataType: this.guessDataType(cleanHeader)
        };
      } else {
        unmappedColumns.push({
          header: cleanHeader,
          columnIndex: index,
          suggested: this.suggestMapping(cleanHeader)
        });
      }
    });

    return {
      mapped: mapping,
      unmapped: unmappedColumns,
      mappingConfidence: Object.keys(mapping).length / headers.length
    };
  }

  /**
   * AI-HEADER
   * DomainMeaning: Guess data type based on Korean column name patterns
   * MisleadingNames: guessDataType vs detectType - both determine column data types
   * SideEffects: None - pure type inference
   * Invariants: Returns standard data types (string, number, date, currency)
   * RAG_Keywords: data type detection, column type inference, korean patterns
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(guessDataType_korean_columns)
   */
  guessDataType(columnName) {
    const salaryKeywords = ['급', '수당', '연금', '보험', '세금', '세', '금액', '지급'];
    const nameKeywords = ['성명', '이름', '부서', '직급', '직책'];
    const idKeywords = ['사번', '번호', '코드'];
    const dateKeywords = ['일자', '날짜', '입사일'];

    if (salaryKeywords.some(keyword => columnName.includes(keyword))) {
      return 'currency';
    }
    if (nameKeywords.some(keyword => columnName.includes(keyword))) {
      return 'string';
    }
    if (idKeywords.some(keyword => columnName.includes(keyword))) {
      return 'string'; // 사번은 문자열로 처리
    }
    if (dateKeywords.some(keyword => columnName.includes(keyword))) {
      return 'date';
    }
    
    return 'string'; // 기본값
  }

  /**
   * AI-HEADER
   * DomainMeaning: Suggest possible mapping for unmapped Korean column names
   * MisleadingNames: suggestMapping vs recommendMapping - both suggest field mappings
   * SideEffects: None - pure suggestion generation
   * Invariants: Returns array of suggested mappings with confidence scores
   * RAG_Keywords: mapping suggestion, fuzzy matching, column recommendations
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(suggestMapping_fuzzy_korean)
   */
  suggestMapping(columnName) {
    const suggestions = [];
    
    // 부분 문자열 매칭으로 유사한 컬럼 찾기
    Object.keys(this.commonColumnMappings).forEach(knownColumn => {
      if (columnName.includes(knownColumn) || knownColumn.includes(columnName)) {
        suggestions.push({
          systemField: this.commonColumnMappings[knownColumn],
          confidence: 0.8,
          reason: `Contains '${knownColumn}'`
        });
      }
    });

    // 키워드 기반 추천
    if (columnName.includes('수당') && !suggestions.length) {
      suggestions.push({
        systemField: 'otherAllowance',
        confidence: 0.6,
        reason: 'Contains allowance keyword'
      });
    }

    return suggestions;
  }

  /**
   * AI-HEADER
   * DomainMeaning: Extract actual payroll data from Excel using established mapping
   * MisleadingNames: extractPayrollData vs parsePayrollData - both extract data
   * SideEffects: Reads Excel file, logs extraction progress
   * Invariants: Must preserve data integrity, handle missing values gracefully
   * RAG_Keywords: data extraction, payroll parsing, excel to json
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(extractPayrollData_excel_to_system)
   */
  async extractPayrollData(filePath, columnMapping, options = {}) {
    try {
      console.log(`📊 Extracting payroll data from: ${filePath}`);
      
      const workbook = XLSX.readFile(filePath);
      const sheetName = options.sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);
      
      const extractedData = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (this.isEmptyRow(row)) continue;
        
        const payrollRecord = this.mapRowToPayrollRecord(row, headers, columnMapping, i + 2); // +2 for Excel row number
        if (payrollRecord) {
          extractedData.push(payrollRecord);
        }
      }
      
      return {
        extractedData,
        totalRecords: extractedData.length,
        skippedRows: dataRows.length - extractedData.length,
        extractionDate: new Date(),
        sourceFile: path.basename(filePath)
      };
      
    } catch (error) {
      console.error('Data extraction error:', error);
      throw new Error(`Failed to extract payroll data: ${error.message}`);
    }
  }

  /**
   * AI-HEADER Helper Methods
   * DomainMeaning: Utility functions for data processing and validation
   * MisleadingNames: Various helper function naming conventions
   * SideEffects: None - pure utility functions
   * Invariants: Handle edge cases and missing data gracefully
   * RAG_Keywords: data processing helpers, row mapping, validation
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(helper_methods_data_processing)
   */
  isEmptyRow(row) {
    return !row || row.every(cell => !cell || cell.toString().trim() === '');
  }

  mapRowToPayrollRecord(row, headers, columnMapping, rowNumber) {
    try {
      const record = {
        sourceRowNumber: rowNumber,
        extractedAt: new Date()
      };

      // 매핑된 컬럼들 처리
      Object.keys(columnMapping.mapped).forEach(koreanHeader => {
        const mapping = columnMapping.mapped[koreanHeader];
        const columnIndex = headers.indexOf(koreanHeader);
        
        if (columnIndex !== -1 && columnIndex < row.length) {
          const cellValue = row[columnIndex];
          record[mapping.systemField] = this.convertValue(cellValue, mapping.dataType);
        }
      });

      // 필수 필드 검증
      if (!record.name || !record.employeeId) {
        console.warn(`Row ${rowNumber}: Missing required fields (name or employeeId)`);
        return null;
      }

      return record;
    } catch (error) {
      console.error(`Error mapping row ${rowNumber}:`, error);
      return null;
    }
  }

  convertValue(value, dataType) {
    if (value === null || value === undefined || value === '') {
      return dataType === 'number' || dataType === 'currency' ? 0 : '';
    }

    switch (dataType) {
      case 'currency':
      case 'number':
        const numValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[,\s]/g, ''));
        return isNaN(numValue) ? 0 : numValue;
      
      case 'date':
        if (value instanceof Date) return value;
        if (typeof value === 'number') return XLSX.SSF.parse_date_code(value);
        return new Date(value);
      
      case 'string':
      default:
        return value.toString().trim();
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Generate analysis report for Excel file structure and mapping
   * MisleadingNames: generateReport vs createReport - both generate analysis output
   * SideEffects: Creates JSON report file, logs analysis summary
   * Invariants: Report must include all analysis details and recommendations
   * RAG_Keywords: analysis report, excel structure, mapping recommendations
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(generateReport_analysis_output)
   */
  async generateAnalysisReport(analysis, outputPath) {
    const report = {
      ...analysis,
      recommendations: {
        primarySheet: analysis.mainSheet.sheetName,
        confidenceScore: analysis.recommendedMapping.mappingConfidence,
        requiredActions: this.generateRecommendations(analysis)
      }
    };

    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`📄 Analysis report saved to: ${outputPath}`);
    }

    return report;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.recommendedMapping.mappingConfidence < 0.7) {
      recommendations.push('Low mapping confidence - manual column mapping may be required');
    }
    
    if (analysis.recommendedMapping.unmapped.length > 0) {
      recommendations.push(`${analysis.recommendedMapping.unmapped.length} unmapped columns found - review column mapping`);
    }
    
    if (analysis.mainSheet.dataRowCount > 1000) {
      recommendations.push('Large dataset detected - consider batch processing');
    }
    
    return recommendations;
  }
}

module.exports = ExcelAnalyzer;