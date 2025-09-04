/**
 * Payroll calculation utilities
 */

/**
 * Calculate total allowances from individual allowance fields
 * @param allowances - Object containing allowance fields
 * @returns Total allowances amount
 */
export const calculateTotalAllowances = (allowances: Record<string, number>): number => {
  if (!allowances) return 0
  
  return Object.values(allowances).reduce((sum, value) => {
    return sum + (value || 0)
  }, 0)
}

/**
 * Calculate total deductions from individual deduction fields
 * @param deductions - Object containing deduction fields
 * @returns Total deductions amount
 */
export const calculateTotalDeductions = (deductions: Record<string, number>): number => {
  if (!deductions) return 0
  
  return Object.values(deductions).reduce((sum, value) => {
    return sum + (value || 0)
  }, 0)
}

/**
 * Calculate incentive based on sales performance
 * @param salesAmount - Total sales amount
 * @param incentiveRate - Incentive percentage rate
 * @returns Calculated incentive amount
 */
export const calculateIncentive = (salesAmount: number, incentiveRate: number = 0.1): number => {
  if (!salesAmount || salesAmount <= 0) return 0
  return Math.floor(salesAmount * incentiveRate)
}

/**
 * Calculate net salary
 * @param baseSalary - Base salary amount
 * @param totalAllowances - Total allowances
 * @param totalDeductions - Total deductions
 * @returns Net salary amount
 */
export const calculateNetSalary = (
  baseSalary: number,
  totalAllowances: number,
  totalDeductions: number
): number => {
  return (baseSalary || 0) + (totalAllowances || 0) - (totalDeductions || 0)
}

/**
 * Calculate input total (gross salary before deductions)
 * @param baseSalary - Base salary
 * @param incentive - Incentive amount
 * @param bonus - Bonus amount
 * @param award - Award amount
 * @param allowances - Total allowances
 * @returns Total input amount
 */
export const calculateInputTotal = (
  baseSalary: number,
  incentive: number = 0,
  bonus: number = 0,
  award: number = 0,
  allowances: number = 0
): number => {
  return (baseSalary || 0) + (incentive || 0) + (bonus || 0) + (award || 0) + (allowances || 0)
}

/**
 * Calculate actual payment
 * @param inputTotal - Total input amount
 * @param totalDeductions - Total deductions
 * @returns Actual payment amount
 */
export const calculateActualPayment = (
  inputTotal: number,
  totalDeductions: number
): number => {
  return (inputTotal || 0) - (totalDeductions || 0)
}

/**
 * Validate calculation results
 * @param data - Payroll data to validate
 * @returns Validation result with any errors
 */
export const validateCalculations = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!data.baseSalary || data.baseSalary < 0) {
    errors.push('기본급이 유효하지 않습니다.')
  }
  
  if (data.totalDeductions > data.inputTotal) {
    errors.push('공제액이 총 지급액보다 큽니다.')
  }
  
  if (data.actualPayment < 0) {
    errors.push('실지급액이 음수입니다.')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Calculate payroll summary statistics
 * @param data - Array of payroll data
 * @returns Summary statistics object
 */
export const calculatePayrollSummary = (data: any[]): any => {
  if (!data || data.length === 0) {
    return {
      totalEmployees: 0,
      totalBaseSalary: 0,
      totalIncentive: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      totalPayment: 0,
      averagePayment: 0
    }
  }
  
  return data.reduce((acc, row) => ({
    totalEmployees: acc.totalEmployees + 1,
    totalBaseSalary: acc.totalBaseSalary + (row.base_salary || 0),
    totalIncentive: acc.totalIncentive + (row.incentive || 0),
    totalAllowances: acc.totalAllowances + (row.total_allowances || 0),
    totalDeductions: acc.totalDeductions + (row.total_deductions || 0),
    totalPayment: acc.totalPayment + (row.actual_payment || 0),
    averagePayment: 0 // Will be calculated after reduce
  }), {
    totalEmployees: 0,
    totalBaseSalary: 0,
    totalIncentive: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    totalPayment: 0,
    averagePayment: 0
  })
}