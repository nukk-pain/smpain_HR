import { MonthlyPayment } from '@/types'

/**
 * PayrollGrid component props
 */
export interface PayrollGridProps {
  yearMonth: string
  onDataChange?: () => void
}

/**
 * Payroll row data structure for DataGrid
 */
export interface PayrollRowData extends Omit<MonthlyPayment, 'id'> {
  id: string // MUI DataGrid requires string id field
  monthlyPaymentId?: number // Original id from MonthlyPayment
  employeeName: string
  department: string
  isEditing?: boolean
}

/**
 * Default visible columns configuration
 */
export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = {
  employee_id: true,
  employeeName: true,
  department: true,
  position: true,
  base_salary: true,
  incentive: true,
  total_allowances: true,
  bonus_total: true,
  award_total: true,
  total_deductions: true,
  input_total: true,
  actual_payment: true,
}

/**
 * Storage keys for localStorage
 */
export const PAYROLL_STORAGE_KEYS = {
  VISIBLE_COLUMNS: 'payrollGridVisibleColumns',
  PRINT_OPTIONS: 'payrollPrintOptions',
  FILTER_SETTINGS: 'payrollFilterSettings',
} as const

/**
 * Print options interface
 */
export interface PayrollPrintOptions {
  includeAllowances?: boolean
  includeDeductions?: boolean
  includeSummary?: boolean
  fontSize?: 'small' | 'medium' | 'large'
}