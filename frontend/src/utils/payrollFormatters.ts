/**
 * Payroll data formatters and utilities
 */

/**
 * Format currency value to Korean won format
 * @param value - Number value to format
 * @returns Formatted string with 원 suffix
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '0원'
  return `${Number(value).toLocaleString()}원`
}

/**
 * Currency formatter for AG Grid cell renderer
 * @param params - Grid render cell parameters
 * @returns Formatted currency string
 */
export const currencyFormatter = (params: any): string => {
  if (params.value == null) return '0원'
  return `${Number(params.value).toLocaleString()}원`
}

/**
 * Parse and validate number from input string
 * @param value - Input string value
 * @returns Parsed number or 0 if invalid
 */
export const parseNumberInput = (value: string): number => {
  const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format date for display
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR')
}

/**
 * Format year-month string
 * @param yearMonth - Format: "YYYY-MM"
 * @returns Formatted string like "2024년 1월"
 */
export const formatYearMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-')
  return `${year}년 ${parseInt(month, 10)}월`
}

/**
 * Validate year-month format
 * @param yearMonth - String to validate
 * @returns Boolean indicating if format is valid
 */
export const isValidYearMonth = (yearMonth: string): boolean => {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/
  return regex.test(yearMonth)
}