// AI-HEADER
// Intent: Parse specific Excel format from labor consultant (연세신명통증의학과) for payroll integration
// Domain Meaning: Convert labor consultant payroll Excel files to system-compatible format
// Misleading Names: parser vs converter - parser extracts, converter transforms format
// Data Contracts: Must handle multi-sheet Excel with specific Korean column headers
// PII: Processes real employee salary data - maximum security required
// Invariants: Must preserve data accuracy, handle missing values, validate calculations
// RAG Keywords: labor consultant parser, excel payroll extraction, korean payroll format

const XLSX = require('xlsx');
const path = require('path');

class LaborConsultantParser {
  constructor() {
    // 연세신명통증의학과 Excel 파일 전용 매핑
    this.consultantMapping = {
      // 급여대장(제출) 시트 매핑 - 실제 급여 데이터
      payrollSheet: {
        sheetName: '급여대장(제출)',
        headerRow: 6, // 7번째 행이 실제 헤더
        dataStartRow: 8, // 9번째 행부터 데이터
        columns: {
          // 기본 정보
          '성명': 'name',
          '고용일': 'hireDate', 
          '종사업무': 'jobType',
          
          // 근로 시간
          '근로일수': 'workDays',
          '연장근로': 'overtimeHours', // H열
          '추가연장': 'additionalOvertimeHours', // H열(7행)
          
          // 급여 항목
          '기본급': 'baseSalary', // K열
          '연장근로수당': 'overtimeAllowance', // L열
          '야간수당': 'nightAllowance', // K열(7행)
          '추가연장수당': 'additionalOvertimeAllowance', // L열(7행)
          '휴일근로수당': 'holidayAllowance', // M열
          '휴일연장수당': 'holidayOvertimeAllowance', // M열(7행)
          '연차휴가수당': 'annualLeaveAllowance', // Q열
          '추가수당': 'additionalAllowance', // P열(7행)
          
          // 공제 항목
          '소득세': 'incomeTax', // U열
          '지방소득세': 'localIncomeTax', // V열
          '국민연금': 'nationalPension', // W열
          '건강보험': 'healthInsurance', // X열
          '고용보험': 'employmentInsurance', // 고용보험 열 찾기
          
          // 합계
          '공제계': 'totalDeductions', // AC열
          '실지급액': 'netPay' // AD열
        }
      },
      
      // 기초사항 시트에서 사번 등 추가 정보
      basicInfoSheet: {
        sheetName: '1.기초사항',
        headerRow: 6,
        dataStartRow: 8,
        columns: {
          '성명': 'name',
          '사번': 'employeeId',
          '부서': 'department',
          '직책': 'position',
          '담당업무': 'jobDescription'
        }
      }
    };
  }

  /**
   * AI-HEADER
   * DomainMeaning: Parse labor consultant Excel file and extract payroll data
   * MisleadingNames: parsePayrollFile vs extractPayrollData - both extract payroll information
   * SideEffects: Reads Excel file, logs parsing progress, validates data
   * Invariants: Must return structured payroll data with all required fields
   * RAG_Keywords: payroll parsing, excel extraction, labor consultant format
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(parsePayrollFile_consultant_format)
   */
  async parsePayrollFile(filePath) {
    console.log(`🔍 Parsing labor consultant file: ${path.basename(filePath)}`);
    
    try {
      const workbook = XLSX.readFile(filePath);
      
      // 파일 유효성 검증
      this.validateWorkbook(workbook);
      
      // 급여 데이터 추출
      const payrollData = await this.extractPayrollData(workbook);
      
      // 기초 정보 추가
      const enrichedData = await this.enrichWithBasicInfo(workbook, payrollData);
      
      // 데이터 검증
      const validatedData = this.validateAndCleanData(enrichedData);
      
      console.log(`✅ Parsed ${validatedData.length} payroll records`);
      
      return {
        totalRecords: validatedData.length,
        payrollData: validatedData,
        extractedAt: new Date(),
        sourceFile: path.basename(filePath)
      };
      
    } catch (error) {
      console.error('❌ Parsing failed:', error.message);
      throw new Error(`Failed to parse payroll file: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Validate Excel workbook structure for labor consultant format
   * MisleadingNames: validateWorkbook vs checkWorkbook - both verify workbook structure
   * SideEffects: Throws error if validation fails, logs validation steps
   * Invariants: Must ensure required sheets exist with expected structure
   * RAG_Keywords: workbook validation, sheet verification, format checking
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(validateWorkbook_consultant_format)
   */
  validateWorkbook(workbook) {
    const requiredSheets = ['급여대장(제출)'];
    const optionalSheets = ['1.기초사항'];
    
    console.log(`📋 Available sheets: ${workbook.SheetNames.join(', ')}`);
    
    // 필수 시트 존재 확인
    for (const sheetName of requiredSheets) {
      if (!workbook.SheetNames.includes(sheetName)) {
        throw new Error(`Required sheet '${sheetName}' not found`);
      }
    }
    
    // 급여대장 시트 구조 확인
    const payrollSheet = workbook.Sheets['급여대장(제출)'];
    const range = XLSX.utils.decode_range(payrollSheet['!ref'] || 'A1');
    
    if (range.e.r < 10 || range.e.c < 30) {
      throw new Error('Payroll sheet appears to have insufficient data');
    }
    
    console.log(`✅ Workbook validation passed`);
  }

  /**
   * AI-HEADER
   * DomainMeaning: Extract dual-row payroll data from main payroll sheet
   * MisleadingNames: extractPayrollData vs parsePayrollData - both extract payroll info
   * SideEffects: Reads Excel sheet data, processes employee dual-row records
   * Invariants: Must handle dual-row structure, missing data gracefully, preserve numeric precision
   * RAG_Keywords: dual-row payroll extraction, employee pair processing, incentive data
   * DuplicatePolicy: supersedes
   * FunctionIdentity: sha256(extractPayrollData_dual_row_main_sheet)
   */
  async extractPayrollData(workbook) {
    const sheetConfig = this.consultantMapping.payrollSheet;
    const sheet = workbook.Sheets[sheetConfig.sheetName];
    
    // 시트를 배열로 변환
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // 헤더 추출
    const headers = sheetData[sheetConfig.headerRow - 1] || [];
    const subHeaders = sheetData[sheetConfig.headerRow] || []; // 7행 서브헤더
    
    console.log(`📊 Processing dual-row structure from ${sheetData.length - sheetConfig.dataStartRow + 1} data rows`);
    
    const payrollRecords = [];
    
    // 데이터 행 처리 - DUAL ROW STRUCTURE!
    // Each employee has 2 rows: main data row + incentive/detail row
    for (let i = sheetConfig.dataStartRow - 1; i < sheetData.length; i += 2) {
      const mainRow = sheetData[i];
      const incentiveRow = sheetData[i + 1]; // Next row contains incentives and additional details
      
      // Skip if main row is empty
      if (!mainRow || this.isEmptyPayrollRow(mainRow)) {
        // If we skipped a row, don't increment by 2, try next single row
        i--;
        continue;
      }
      
      // Check if this is actually a main employee row (has name in column B)
      if (!mainRow[1] || typeof mainRow[1] !== 'string') {
        i--; // Adjust counter and try next row as single row
        continue;
      }
      
      console.log(`📝 Processing employee: ${mainRow[1]} (Main: Row ${i + 1}, Incentive: Row ${i + 2})`);
      
      const record = this.parsePayrollRow(mainRow, incentiveRow, headers, subHeaders, i + 1);
      if (record) {
        payrollRecords.push(record);
      }
    }
    
    console.log(`✅ Successfully processed ${payrollRecords.length} employee records with dual-row structure`);
    return payrollRecords;
  }

  /**
   * AI-HEADER
   * DomainMeaning: Parse dual-row payroll structure (main+incentive rows) into structured record
   * MisleadingNames: parsePayrollRow vs processPayrollRow - both convert row data
   * SideEffects: None - pure data transformation
   * Invariants: Must handle dual-row structure, extract ALL incentives and allowances
   * RAG_Keywords: dual-row parsing, incentive extraction, complete payroll processing
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(parsePayrollRow_dual_row_incentive_support)
   */
  parsePayrollRow(mainRow, incentiveRow, headers, subHeaders, rowNumber) {
    try {
      const record = {
        rowNumber,
        extractedAt: new Date()
      };

      // === BASIC EMPLOYEE INFO (Main Row) ===
      
      // 컬럼 A: 연번
      if (mainRow[0] && typeof mainRow[0] === 'number') {
        record.sequenceNumber = mainRow[0];
      }

      // 컬럼 B: 성명
      if (mainRow[1] && typeof mainRow[1] === 'string') {
        record.name = mainRow[1].trim();
      }

      // 컬럼 C: 고용일 (Main Row), 주민번호 (Incentive Row)
      if (mainRow[2]) {
        record.hireDate = this.convertExcelDate(mainRow[2]);
      }
      if (incentiveRow && incentiveRow[2] && typeof incentiveRow[2] === 'string') {
        record.socialSecurityNumber = incentiveRow[2].toString().trim();
      }

      // 컬럼 D: 퇴사일
      if (mainRow[3] && mainRow[3] !== '-') {
        record.resignationDate = this.convertExcelDate(mainRow[3]);
      }

      // 컬럼 E: 종사업무
      if (mainRow[4]) {
        record.jobType = mainRow[4].toString().trim();
      }

      // === WORKING HOURS INFO ===
      
      // 컬럼 F: 기준시간 (Main), 통상시급 (Incentive)
      if (mainRow[5]) {
        record.standardWorkHours = this.convertToNumber(mainRow[5]);
      }
      if (incentiveRow && incentiveRow[5]) {
        record.hourlyRate = this.convertToNumber(incentiveRow[5]);
      }

      // 컬럼 G: 근로일수 (Main), 미사용연차일수 (Incentive)
      if (mainRow[6] && typeof mainRow[6] === 'number') {
        record.workDays = mainRow[6];
      }
      if (incentiveRow && incentiveRow[6]) {
        record.unusedAnnualLeaveDays = this.convertToNumber(incentiveRow[6]);
      }

      // 컬럼 H: 연장근로 (Main), 추가연장 (Incentive)
      if (mainRow[7] !== undefined) {
        record.overtimeHours = this.convertToNumber(mainRow[7]);
      }
      if (incentiveRow && incentiveRow[7] !== undefined) {
        record.additionalOvertimeHours = this.convertToNumber(incentiveRow[7]);
      }

      // 컬럼 I: 휴일근로 (Main), 휴일연장 (Incentive)
      if (mainRow[8] !== undefined) {
        record.holidayWorkHours = this.convertToNumber(mainRow[8]);
      }
      if (incentiveRow && incentiveRow[8] !== undefined) {
        record.holidayOvertimeHours = this.convertToNumber(incentiveRow[8]);
      }

      // 컬럼 J: 결근 (Main), 지각조퇴 (Incentive)
      if (mainRow[9] !== undefined) {
        record.absentDays = this.convertToNumber(mainRow[9]);
      }
      if (incentiveRow && incentiveRow[9] !== undefined) {
        record.latenessEarlyDepartureDays = this.convertToNumber(incentiveRow[9]);
      }

      // === SALARY AND ALLOWANCES ===
      
      // 컬럼 K: 기본급 (Main), 야간수당 (Incentive)
      if (mainRow[10] !== undefined) {
        record.baseSalary = this.convertToNumber(mainRow[10]);
      }
      if (incentiveRow && incentiveRow[10] !== undefined) {
        record.nightAllowance = this.convertToNumber(incentiveRow[10]);
      }

      // 컬럼 L: 연장근로수당 (Main), 추가연장수당 (Incentive)
      if (mainRow[11] !== undefined) {
        record.overtimeAllowance = this.convertToNumber(mainRow[11]);
      }
      if (incentiveRow && incentiveRow[11] !== undefined) {
        record.additionalOvertimeAllowance = this.convertToNumber(incentiveRow[11]);
      }

      // 컬럼 M: 휴일근로수당 (Main), 휴일연장수당 (Incentive)
      if (mainRow[12] !== undefined) {
        record.holidayAllowance = this.convertToNumber(mainRow[12]);
      }
      if (incentiveRow && incentiveRow[12] !== undefined) {
        record.holidayOvertimeAllowance = this.convertToNumber(incentiveRow[12]);
      }

      // 컬럼 N: 고정인센티브 (Main), 인센티브 (Incentive) - CRITICAL!
      if (mainRow[13] !== undefined) {
        record.fixedIncentive = this.convertToNumber(mainRow[13]);
      }
      if (incentiveRow && incentiveRow[13] !== undefined) {
        record.incentive = this.convertToNumber(incentiveRow[13]);
      }

      // 컬럼 O: 식대 (Main), 소급분 (Incentive)
      if (mainRow[14] !== undefined) {
        record.mealAllowance = this.convertToNumber(mainRow[14]);
      }
      if (incentiveRow && incentiveRow[14] !== undefined) {
        record.retroactivePay = this.convertToNumber(incentiveRow[14]);
      }

      // 컬럼 P: 결근지각조퇴공제 (Main), 추가수당 (Incentive)
      if (mainRow[15] !== undefined) {
        record.absenceDeduction = this.convertToNumber(mainRow[15]);
      }
      if (incentiveRow && incentiveRow[15] !== undefined) {
        record.additionalAllowance = this.convertToNumber(incentiveRow[15]);
      }

      // 컬럼 Q: 연차휴가수당 (Main), 포상금 (Incentive) - CRITICAL!
      if (mainRow[16] !== undefined) {
        record.annualLeaveAllowance = this.convertToNumber(mainRow[16]);
      }
      if (incentiveRow && incentiveRow[16] !== undefined) {
        record.bonusReward = this.convertToNumber(incentiveRow[16]);
      }

      // 컬럼 T: 지급계 (총급여 - 세전) - CRITICAL GROSS SALARY!
      if (mainRow[19] !== undefined) {
        record.grossSalaryPreTax = this.convertToNumber(mainRow[19]);
      }

      // === DEDUCTION ITEMS ===
      
      // 컬럼 U: 소득세 (Main), 장기요양 (Incentive)
      if (mainRow[20] !== undefined) {
        record.incomeTax = this.convertToNumber(mainRow[20]);
      }
      if (incentiveRow && incentiveRow[20] !== undefined) {
        record.longTermCareInsurance = this.convertToNumber(incentiveRow[20]);
      }

      // 컬럼 V: 지방소득세 (Main), 고용보험 (Incentive)
      if (mainRow[21] !== undefined) {
        record.localIncomeTax = this.convertToNumber(mainRow[21]);
      }
      if (incentiveRow && incentiveRow[21] !== undefined) {
        record.employmentInsurance = this.convertToNumber(incentiveRow[21]);
      }

      // 컬럼 W: 국민연금 (Main), 연말퇴직정산 (Incentive)
      if (mainRow[22] !== undefined) {
        record.nationalPension = this.convertToNumber(mainRow[22]);
      }
      if (incentiveRow && incentiveRow[22] !== undefined) {
        record.yearEndRetirementSettlement = this.convertToNumber(incentiveRow[22]);
      }

      // 컬럼 X: 건강보험 (Main), 보험료정산 (Incentive)
      if (mainRow[23] !== undefined) {
        record.healthInsurance = this.convertToNumber(mainRow[23]);
      }
      if (incentiveRow && incentiveRow[23] !== undefined) {
        record.insurancePremiumSettlement = this.convertToNumber(incentiveRow[23]);
      }

      // 컬럼 Y: 학자금대출 (Main), 기지급 (Incentive)
      if (mainRow[24] !== undefined) {
        record.studentLoanDeduction = this.convertToNumber(mainRow[24]);
      }
      if (incentiveRow && incentiveRow[24] !== undefined) {
        record.advancePayment = this.convertToNumber(incentiveRow[24]);
      }

      // 컬럼 AC (28): 공제계
      if (mainRow[28] !== undefined) {
        record.totalDeductions = this.convertToNumber(mainRow[28]);
      }

      // 컬럼 AD (29): 실지급액
      if (mainRow[29] !== undefined) {
        record.netPay = this.convertToNumber(mainRow[29]);
      }

      // === CALCULATED TOTALS ===
      
      // Calculate total allowances
      record.totalAllowances = (record.overtimeAllowance || 0) +
                              (record.additionalOvertimeAllowance || 0) +
                              (record.holidayAllowance || 0) +
                              (record.holidayOvertimeAllowance || 0) +
                              (record.nightAllowance || 0) +
                              (record.fixedIncentive || 0) +
                              (record.incentive || 0) +
                              (record.mealAllowance || 0) +
                              (record.additionalAllowance || 0) +
                              (record.annualLeaveAllowance || 0) +
                              (record.bonusReward || 0) +
                              (record.retroactivePay || 0);

      // Calculate total deductions
      record.calculatedTotalDeductions = (record.incomeTax || 0) +
                                        (record.localIncomeTax || 0) +
                                        (record.nationalPension || 0) +
                                        (record.healthInsurance || 0) +
                                        (record.longTermCareInsurance || 0) +
                                        (record.employmentInsurance || 0) +
                                        (record.studentLoanDeduction || 0) +
                                        (record.yearEndRetirementSettlement || 0) +
                                        (record.insurancePremiumSettlement || 0) +
                                        (record.advancePayment || 0) +
                                        (record.absenceDeduction || 0);

      // Calculate gross salary if missing
      if (!record.grossSalaryPreTax) {
        record.grossSalaryPreTax = (record.baseSalary || 0) + record.totalAllowances;
      }

      // Validation
      if (!record.name || (!record.baseSalary && !record.grossSalaryPreTax)) {
        console.warn(`Row ${rowNumber}: Missing required fields`);
        return null;
      }

      return record;

    } catch (error) {
      console.error(`Error parsing dual-row ${rowNumber}:`, error.message);
      return null;
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Enrich payroll data with additional info from basic info sheet
   * MisleadingNames: enrichWithBasicInfo vs addBasicInfo - both add additional employee data
   * SideEffects: Reads basic info sheet, matches employees by name
   * Invariants: Must match employees correctly, handle missing basic info gracefully
   * RAG_Keywords: data enrichment, employee matching, basic info integration
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(enrichWithBasicInfo_employee_matching)
   */
  async enrichWithBasicInfo(workbook, payrollData) {
    const basicInfoSheetName = '1.기초사항';
    
    if (!workbook.SheetNames.includes(basicInfoSheetName)) {
      console.log('⚠️ Basic info sheet not found, using payroll data only');
      return payrollData;
    }

    const sheet = workbook.Sheets[basicInfoSheetName];
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // 기초사항에서 사번, 부서 등 추출
    const basicInfoMap = new Map();
    
    for (let i = 7; i < sheetData.length; i++) { // 8행부터 데이터
      const row = sheetData[i];
      if (!row || !row[1]) continue;
      
      const name = row[1].toString().trim();
      const basicInfo = {
        employeeId: row[5] ? row[5].toString().trim() : null, // 사번
        department: row[7] ? row[7].toString().trim() : '', // 부서
        position: row[8] ? row[8].toString().trim() : '', // 직책
        jobDescription: row[9] ? row[9].toString().trim() : '' // 담당업무
      };
      
      basicInfoMap.set(name, basicInfo);
    }

    // 급여 데이터에 기초 정보 병합
    const enrichedData = payrollData.map(record => {
      const basicInfo = basicInfoMap.get(record.name);
      if (basicInfo) {
        return {
          ...record,
          ...basicInfo
        };
      }
      return record;
    });

    console.log(`✅ Enriched ${enrichedData.length} records with basic info`);
    return enrichedData;
  }

  /**
   * AI-HEADER Helper Methods
   * DomainMeaning: Utility functions for data processing and validation
   * MisleadingNames: Various utility function names
   * SideEffects: None - pure utility functions
   * Invariants: Must handle edge cases gracefully, preserve data types
   * RAG_Keywords: data conversion, validation helpers, utility functions
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(helper_methods_data_processing)
   */
  isEmptyPayrollRow(row) {
    if (!row || row.length === 0) return true;
    
    // 첫 3개 컬럼 중 하나라도 값이 있으면 유효한 행
    return !(row[0] || row[1] || row[2]);
  }

  convertToNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    
    const numValue = parseFloat(value.toString().replace(/[,\s]/g, ''));
    return isNaN(numValue) ? 0 : numValue;
  }

  convertExcelDate(excelDate) {
    if (typeof excelDate === 'number') {
      // Excel 날짜는 1900년 1월 1일부터의 일수
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    }
    return excelDate;
  }

  validateAndCleanData(payrollData) {
    return payrollData.filter(record => {
      // 필수 필드 검증
      if (!record.name || !record.baseSalary) {
        console.warn(`Removing invalid record: ${record.name || 'Unknown'}`);
        return false;
      }

      // 기본값 설정
      record.employmentInsurance = record.employmentInsurance || 0;
      record.incomeTax = record.incomeTax || 0;
      record.localIncomeTax = record.localIncomeTax || 0;
      record.nationalPension = record.nationalPension || 0;
      record.healthInsurance = record.healthInsurance || 0;

      // 총계 계산 및 검증
      const calculatedTotalDeductions = 
        (record.incomeTax || 0) + 
        (record.localIncomeTax || 0) + 
        (record.nationalPension || 0) + 
        (record.healthInsurance || 0) + 
        (record.employmentInsurance || 0);

      // 공제계와 계산값 차이가 크면 경고
      if (record.totalDeductions && Math.abs(record.totalDeductions - calculatedTotalDeductions) > 1000) {
        console.warn(`Deduction mismatch for ${record.name}: ${record.totalDeductions} vs ${calculatedTotalDeductions}`);
      }

      record.calculatedTotalDeductions = calculatedTotalDeductions;

      return true;
    });
  }

  /**
   * AI-HEADER
   * DomainMeaning: Convert complete parsed data to PayrollRepository compatible format
   * MisleadingNames: toPayrollRepositoryFormat vs convertToSystemFormat - both format for system use
   * SideEffects: None - pure data transformation
   * Invariants: Must match PayrollRepository schema exactly with all incentive fields
   * RAG_Keywords: complete data transformation, repository format, system integration, incentives
   * DuplicatePolicy: supersedes
   * FunctionIdentity: sha256(toPayrollRepositoryFormat_complete_system_integration)
   */
  toPayrollRepositoryFormat(parsedData, year = 2025, month = 7) {
    return parsedData.payrollData.map(record => ({
      // 사용자 매핑은 별도로 필요 (이름으로 userId 찾기)
      employeeId: record.employeeId,
      employeeName: record.name,
      year: year,
      month: month,
      
      baseSalary: record.baseSalary || 0,
      
      // COMPLETE ALLOWANCES INCLUDING ALL INCENTIVES
      allowances: {
        overtime: (record.overtimeAllowance || 0) + (record.additionalOvertimeAllowance || 0),
        holiday: (record.holidayAllowance || 0) + (record.holidayOvertimeAllowance || 0),
        night: record.nightAllowance || 0,
        meal: record.mealAllowance || 0, // 식대 properly mapped
        transportation: 0, // Not found in this Excel format
        annualLeave: record.annualLeaveAllowance || 0,
        
        // INCENTIVES - CRITICAL FIELDS THAT WERE MISSING!
        fixedIncentive: record.fixedIncentive || 0,
        incentive: record.incentive || 0,
        bonusReward: record.bonusReward || 0,
        
        // Additional allowances
        retroactivePay: record.retroactivePay || 0,
        additionalAllowance: record.additionalAllowance || 0,
        
        // Calculate other allowances total
        other: 0 // Will be calculated below
      },
      
      // COMPLETE DEDUCTIONS
      deductions: {
        nationalPension: record.nationalPension || 0,
        healthInsurance: (record.healthInsurance || 0) + (record.longTermCareInsurance || 0),
        employmentInsurance: record.employmentInsurance || 0,
        incomeTax: record.incomeTax || 0,
        localIncomeTax: record.localIncomeTax || 0,
        
        // Additional deductions
        studentLoan: record.studentLoanDeduction || 0,
        yearEndSettlement: record.yearEndRetirementSettlement || 0,
        insuranceSettlement: record.insurancePremiumSettlement || 0,
        advancePayment: record.advancePayment || 0,
        absenceDeduction: record.absenceDeduction || 0,
        
        other: 0 // Additional deductions sum
      },
      
      // GROSS SALARY - CRITICAL FIELD THAT WAS MISSING!
      grossSalaryPreTax: record.grossSalaryPreTax || 0,
      
      netSalary: record.netPay || 0,
      paymentStatus: 'pending',
      
      // Working hours data
      workingHours: {
        standardHours: record.standardWorkHours || 0,
        workDays: record.workDays || 0,
        overtimeHours: (record.overtimeHours || 0) + (record.additionalOvertimeHours || 0),
        holidayHours: (record.holidayWorkHours || 0) + (record.holidayOvertimeHours || 0),
        unusedAnnualLeaveDays: record.unusedAnnualLeaveDays || 0,
        absentDays: record.absentDays || 0,
        latenessEarlyDays: record.latenessEarlyDepartureDays || 0
      },
      
      // Personal info (anonymized for system use)
      personalInfo: {
        hireDate: record.hireDate,
        resignationDate: record.resignationDate,
        jobType: record.jobType,
        hourlyRate: record.hourlyRate || 0,
        socialSecurityNumber: record.socialSecurityNumber ? '***-**-****' : null // Anonymize
      },
      
      // Calculated totals for verification
      calculatedTotals: {
        totalAllowances: record.totalAllowances || 0,
        totalDeductions: record.calculatedTotalDeductions || 0,
        totalDeductionsFromFile: record.totalDeductions || 0,
        grossFromCalculation: record.grossSalaryPreTax || 0
      },
      
      // 메타데이터
      sourceRowNumber: record.rowNumber,
      extractedAt: record.extractedAt,
      sourceFile: parsedData.sourceFile
    }));
  }
}

module.exports = LaborConsultantParser;