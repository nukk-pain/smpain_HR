import { GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid'
import { formatCurrency, currencyFormatter } from '@/utils/payrollFormatters'
import React from 'react'

/**
 * PayrollGrid column definitions and configuration
 */

/**
 * Base column definitions without cell renderers
 * Cell renderers will be injected by the main component
 */
export const getColumnDefinitions = (
  EditableCellRenderer: any,
  ExpandableAllowances: any,
  ExpandableDeductions: any,
  ActionCellRenderer: any
): GridColDef[] => [
  {
    field: 'employeeName',
    headerName: '직원명',
    width: 100,
    renderCell: (params) => (
      <div style={{ fontWeight: 'bold' }}>{params.value}</div>
    )
  },
  {
    field: 'employee_id',
    headerName: '직원ID',
    width: 90,
    renderCell: (params) => (
      <div style={{ fontSize: '0.9em' }}>{params.value || '-'}</div>
    )
  },
  {
    field: 'department',
    headerName: '부서',
    width: 120,
  },
  {
    field: 'position',
    headerName: '직급',
    width: 80,
    renderCell: (params) => (
      <div style={{ fontSize: '0.9em' }}>{params.value || '-'}</div>
    )
  },
  {
    field: 'base_salary',
    headerName: '기본급',
    width: 110,
    type: 'number',
    renderCell: EditableCellRenderer,
  },
  {
    field: 'total_allowances',
    headerName: '수당',
    width: 130,
    type: 'number',
    renderCell: (params) => ExpandableAllowances({ params })
  },
  {
    field: 'bonus_total',
    headerName: '상여금',
    width: 90,
    type: 'number',
    renderCell: (params) => (
      <div style={{ backgroundColor: '#f3e5f5', width: '100%', padding: '8px' }}>
        {currencyFormatter({ value: params.value })}
      </div>
    )
  },
  {
    field: 'award_total',
    headerName: '포상금',
    width: 90,
    type: 'number',
    renderCell: (params) => (
      <div style={{ backgroundColor: '#e8f5e8', width: '100%', padding: '8px' }}>
        {currencyFormatter({ value: params.value })}
      </div>
    )
  },
  {
    field: 'total_deductions',
    headerName: '공제',
    width: 120,
    type: 'number',
    renderCell: (params) => ExpandableDeductions({ params })
  },
  {
    field: 'input_total',
    headerName: '지급총액',
    width: 130,
    type: 'number',
    renderCell: (params) => (
      <div style={{ 
        backgroundColor: '#fff3e0',
        fontWeight: 'bold',
        color: '#e65100',
        width: '100%',
        padding: '8px'
      }}>
        {currencyFormatter({ value: params.value })}
      </div>
    )
  },
  {
    field: 'actual_payment',
    headerName: '실지급액',
    width: 130,
    type: 'number',
    renderCell: (params) => (
      <div style={{ 
        backgroundColor: params.value == null ? 'transparent' : '#f1f8e9',
        color: params.value == null ? '#999' : 'inherit',
        fontWeight: 'bold',
        width: '100%',
        padding: '8px'
      }}>
        {currencyFormatter({ value: params.value })}
      </div>
    )
  },
  {
    field: 'actions',
    headerName: '작업',
    width: 80,
    renderCell: ActionCellRenderer,
    sortable: false,
    filterable: false,
  }
]

/**
 * Default DataGrid options
 */
export const defaultGridOptions = {
  initialState: {
    pagination: {
      paginationModel: {
        pageSize: 20,
      },
    },
  },
  pageSizeOptions: [10, 20, 50, 100],
  disableRowSelectionOnClick: true,
  density: 'comfortable' as const,
}

/**
 * Get visible columns based on visibility settings
 */
export const getVisibleColumns = (
  allColumns: GridColDef[],
  visibilityModel: Record<string, boolean>
): GridColDef[] => {
  return allColumns.filter(col => 
    visibilityModel[col.field] !== false
  )
}

/**
 * Default column visibility model
 */
export const getDefaultColumnVisibility = (): GridColumnVisibilityModel => ({
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
  actions: true,
})

/**
 * Column groups for organized display
 */
export const columnGroups = {
  basic: ['employeeName', 'employee_id', 'department', 'position'],
  salary: ['base_salary', 'incentive'],
  allowances: ['total_allowances', 'bonus_total', 'award_total'],
  deductions: ['total_deductions'],
  totals: ['input_total', 'actual_payment'],
  actions: ['actions']
}

/**
 * Export column configuration for Excel/CSV
 */
export const exportColumns = [
  { field: 'employee_id', header: '직원ID' },
  { field: 'employeeName', header: '직원명' },
  { field: 'department', header: '부서' },
  { field: 'position', header: '직급' },
  { field: 'base_salary', header: '기본급' },
  { field: 'total_allowances', header: '수당' },
  { field: 'bonus_total', header: '상여금' },
  { field: 'award_total', header: '포상금' },
  { field: 'total_deductions', header: '공제' },
  { field: 'input_total', header: '지급총액' },
  { field: 'actual_payment', header: '실지급액' },
]