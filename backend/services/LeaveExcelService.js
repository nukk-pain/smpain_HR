const ExcelJS = require('exceljs');

class LeaveExcelService {
  constructor() {
    this.workbook = null;
    this.worksheet = null;
  }

  /**
   * Generate Excel file for leave overview data
   * @param {Object} data - Leave data to export
   * @param {string} viewType - Type of view (overview, team, department)
   * @param {number} year - Year for the data
   * @returns {ExcelJS.Workbook} - Generated workbook
   */
  async generateLeaveOverviewExcel(data, viewType, year) {
    this.workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    this.workbook.creator = 'HR System';
    this.workbook.lastModifiedBy = 'HR System';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
    
    // Create worksheet based on view type
    switch (viewType) {
      case 'overview':
        await this.createOverviewSheet(data, year);
        break;
      case 'team':
        await this.createTeamSheet(data, year);
        break;
      case 'department':
        await this.createDepartmentSheet(data, year);
        break;
      default:
        await this.createOverviewSheet(data, year);
    }
    
    return this.workbook;
  }

  /**
   * Create overview sheet for admin view
   */
  async createOverviewSheet(data, year) {
    this.worksheet = this.workbook.addWorksheet(`휴가현황_${year}`);
    
    // Add title
    this.worksheet.mergeCells('A1:I1');
    const titleCell = this.worksheet.getCell('A1');
    titleCell.value = `${year}년 전체 휴가 현황`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add headers
    const headers = [
      '직원명',
      '부서',
      '직급',
      '총 연차',
      '사용',
      '대기',
      '잔여',
      '사용률(%)',
      '위험도'
    ];
    
    const headerRow = this.worksheet.addRow([]);
    this.worksheet.addRow(headers);
    
    // Style headers
    const headerRowRef = this.worksheet.getRow(3);
    headerRowRef.font = { bold: true };
    headerRowRef.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    headerRowRef.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRowRef.height = 25;
    
    // Add data
    if (data && data.employees) {
      data.employees.forEach(employee => {
        const row = this.worksheet.addRow([
          employee.name || '',
          employee.department || '',
          employee.position || '',
          employee.totalAnnualLeave || 0,
          employee.usedAnnualLeave || 0,
          employee.pendingAnnualLeave || 0,
          employee.remainingAnnualLeave || 0,
          employee.usageRate ? `${employee.usageRate.toFixed(1)}` : '0.0',
          this.getRiskLevelKorean(employee.riskLevel)
        ]);
        
        // Apply conditional formatting for risk level
        const riskCell = row.getCell(9);
        if (employee.riskLevel === 'high') {
          riskCell.font = { color: { argb: 'FFFF0000' }, bold: true };
        } else if (employee.riskLevel === 'medium') {
          riskCell.font = { color: { argb: 'FFFF8C00' } };
        } else {
          riskCell.font = { color: { argb: 'FF008000' } };
        }
      });
    }
    
    // Add summary row
    if (data && data.summary) {
      this.worksheet.addRow([]);
      const summaryRow = this.worksheet.addRow([
        '요약',
        `전체: ${data.summary.totalEmployees}명`,
        '',
        '',
        '',
        '',
        '',
        `평균: ${data.summary.averageUsageRate.toFixed(1)}%`,
        `고위험: ${data.summary.highRiskCount}명`
      ]);
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      };
    }
    
    // Auto-fit columns
    this.worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 30);
    });
    
    // Add borders
    const lastRow = this.worksheet.lastRow.number;
    for (let i = 3; i <= lastRow; i++) {
      const row = this.worksheet.getRow(i);
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  }

  /**
   * Create team sheet for team view
   */
  async createTeamSheet(data, year) {
    this.worksheet = this.workbook.addWorksheet(`팀현황_${year}`);
    
    // Add title
    this.worksheet.mergeCells('A1:F1');
    const titleCell = this.worksheet.getCell('A1');
    titleCell.value = `${year}년 팀 휴가 현황`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add headers
    const headers = [
      '이름',
      '직급',
      '부서',
      '총 연차',
      '사용/잔여',
      '현재 상태'
    ];
    
    this.worksheet.addRow([]);
    const headerRow = this.worksheet.addRow(headers);
    
    // Style headers
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data
    if (data && data.members) {
      data.members.forEach(member => {
        const row = this.worksheet.addRow([
          member.name || '',
          member.position || '',
          member.department || '',
          member.leaveBalance?.annual || 0,
          `${member.leaveBalance?.used || 0} / ${member.leaveBalance?.remaining || 0}`,
          member.currentStatus === 'on_leave' ? '휴가중' : '근무중'
        ]);
        
        // Highlight if on leave
        if (member.currentStatus === 'on_leave') {
          row.getCell(6).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFE0' }
          };
        }
      });
    }
    
    // Auto-fit columns
    this.autoFitColumns();
    this.addBorders(3);
  }

  /**
   * Create department statistics sheet
   */
  async createDepartmentSheet(data, year) {
    this.worksheet = this.workbook.addWorksheet(`부서통계_${year}`);
    
    // Add title
    this.worksheet.mergeCells('A1:E1');
    const titleCell = this.worksheet.getCell('A1');
    titleCell.value = `${year}년 부서별 휴가 통계`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add headers
    const headers = [
      '부서명',
      '전체 인원',
      '휴가중',
      '평균 사용률(%)',
      '대기중 요청'
    ];
    
    this.worksheet.addRow([]);
    const headerRow = this.worksheet.addRow(headers);
    
    // Style headers
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data
    if (data && Array.isArray(data)) {
      data.forEach(dept => {
        this.worksheet.addRow([
          dept.department || '',
          dept.totalMembers || 0,
          dept.onLeave || 0,
          dept.avgLeaveUsage ? `${dept.avgLeaveUsage.toFixed(1)}` : '0.0',
          dept.pendingRequests || 0
        ]);
      });
    }
    
    // Auto-fit columns
    this.autoFitColumns();
    this.addBorders(3);
  }

  /**
   * Get Korean label for risk level
   */
  getRiskLevelKorean(level) {
    switch (level) {
      case 'high': return '높음';
      case 'medium': return '중간';
      case 'low': return '낮음';
      default: return '-';
    }
  }

  /**
   * Auto-fit columns based on content
   */
  autoFitColumns() {
    this.worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 30);
    });
  }

  /**
   * Add borders to cells
   */
  addBorders(startRow) {
    const lastRow = this.worksheet.lastRow.number;
    for (let i = startRow; i <= lastRow; i++) {
      const row = this.worksheet.getRow(i);
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  }

  /**
   * Convert workbook to buffer for download
   */
  async toBuffer() {
    if (!this.workbook) {
      throw new Error('No workbook to convert');
    }
    return await this.workbook.xlsx.writeBuffer();
  }
}

module.exports = LeaveExcelService;