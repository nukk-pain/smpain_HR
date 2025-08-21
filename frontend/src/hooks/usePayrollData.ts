import { useState, useEffect, useCallback } from 'react'
import apiService from '@/services/api'
import { PayrollRowData } from '@/types/PayrollTypes'
import { useNotification } from '@/components/NotificationProvider'

/**
 * Custom hook for managing payroll data
 * Handles loading, saving, and updating payroll information
 */
export const usePayrollData = (yearMonth: string) => {
  const [rowData, setRowData] = useState<PayrollRowData[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const { showSuccess, showError } = useNotification()

  /**
   * Transform backend data to frontend format
   */
  const transformPayrollData = (data: any[]): PayrollRowData[] => {
    return data.map((payment: any, index: number) => ({
      ...payment,
      // Map backend field names to frontend expected field names
      bonus_total: payment.bonus ?? payment.bonus_total ?? 0,
      award_total: payment.award ?? payment.award_total ?? 0,
      input_total: payment.total_input ?? payment.input_total ?? 0,
      // Keep existing field mappings
      id: payment._id || payment.id || `row-${index}`, // MUI DataGrid requires unique id
      employeeName: payment.employee?.full_name || payment.employee?.username || 'Unknown',
      department: payment.employee?.department || '-',
      // Add fields for employee_id and position
      employee_id: payment.employee_id || payment.employee?.employeeId || payment.employee?.employee_id || '',
      position: payment.position || payment.employee?.position || '',
      // Add fields for allowances and deductions
      allowances: payment.allowances || {},
      deductions: payment.deductions || {},
      total_allowances: payment.total_allowances || 0,
      total_deductions: payment.total_deductions || 0,
    }))
  }

  /**
   * Load payroll data from backend
   */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.getMonthlyPayments(yearMonth)
      if (response.success && response.data) {
        const transformedData = transformPayrollData(response.data as any[])
        setRowData(transformedData)
      } else {
        setRowData([])
      }
    } catch (error: any) {
      // Only show error for actual errors, not empty data
      if (error.response?.status !== 404) {
        showError('데이터를 불러오는 중 오류가 발생했습니다')
      } else {
        // 404 means no data exists for this month, which is normal
        setRowData([])
      }
    } finally {
      setLoading(false)
    }
  }, [yearMonth, showError])

  /**
   * Save payroll data
   */
  const savePayroll = async (rowId: string, data: any): Promise<void> => {
    try {
      await apiService.updatePayroll({
        employee_id: data.employee_id,
        year_month: yearMonth,
        base_salary: data.base_salary,
      })
      
      setEditingRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(rowId)
        return newSet
      })
      
      showSuccess('급여 정보가 저장되었습니다')
      await loadData() // Reload to get latest data
    } catch (error) {
      showError('저장 중 오류가 발생했습니다')
      throw error
    }
  }

  /**
   * Start editing a row
   */
  const startEditing = (rowId: string) => {
    setEditingRows(prev => new Set(prev).add(rowId))
  }

  /**
   * Cancel editing a row
   */
  const cancelEditing = (rowId: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev)
      newSet.delete(rowId)
      return newSet
    })
    loadData() // Reload to reset changes
  }

  /**
   * Update a cell value
   */
  const updateCellValue = (rowId: string, field: string, value: any) => {
    setRowData(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, [field]: value }
        : row
    ))
  }

  /**
   * Check if a row is being edited
   */
  const isEditing = (rowId: string): boolean => {
    return editingRows.has(rowId)
  }

  // Load data when component mounts or yearMonth changes
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    rowData,
    loading,
    editingRows,
    loadData,
    savePayroll,
    startEditing,
    cancelEditing,
    updateCellValue,
    isEditing,
    setRowData,
  }
}