import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid'
import { Box, Paper, Button, IconButton, Tooltip, TextField, Collapse, Typography, Menu, MenuItem, FormControlLabel, Checkbox, Divider } from '@mui/material'
import { Edit, Save, Cancel, Download, ExpandMore, ExpandLess, Settings } from '@mui/icons-material'
import { MonthlyPayment, User } from '@/types'
import apiService from '@/services/api'
import { useNotification } from './NotificationProvider'

interface PayrollGridProps {
  yearMonth: string
  onDataChange?: () => void
}

interface PayrollRowData extends Omit<MonthlyPayment, 'id'> {
  id: string // MUI DataGrid requires string id field
  monthlyPaymentId?: number // Original id from MonthlyPayment
  employeeName: string
  department: string
  isEditing?: boolean
}

const PayrollGrid: React.FC<PayrollGridProps> = ({ yearMonth, onDataChange }) => {
  const [rowData, setRowData] = useState<PayrollRowData[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set())
  const [expandedAllowances, setExpandedAllowances] = useState<Set<string>>(new Set())
  const [expandedDeductions, setExpandedDeductions] = useState<Set<string>>(new Set())
  const [columnSettingsAnchor, setColumnSettingsAnchor] = useState<null | HTMLElement>(null)
  const { showSuccess, showError } = useNotification()

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('payrollGridVisibleColumns')
    if (saved) {
      return JSON.parse(saved)
    }
    // Default all columns visible
    return {
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
  })

  // Currency formatter
  const currencyFormatter = (params: any) => {
    if (params.value == null) return '0원'
    return `${Number(params.value).toLocaleString()}원`
  }

  // Format currency value
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '0원'
    return `${Number(value).toLocaleString()}원`
  }

  // Handle column visibility change
  const handleColumnVisibilityChange = (columnField: string, visible: boolean) => {
    const newVisibleColumns = { ...visibleColumns, [columnField]: visible }
    setVisibleColumns(newVisibleColumns)
    localStorage.setItem('payrollGridVisibleColumns', JSON.stringify(newVisibleColumns))
  }

  // Open column settings menu
  const handleColumnSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setColumnSettingsAnchor(event.currentTarget)
  }

  // Close column settings menu
  const handleColumnSettingsClose = () => {
    setColumnSettingsAnchor(null)
  }

  // Expandable Allowances Component
  const ExpandableAllowances: React.FC<{ params: GridRenderCellParams }> = ({ params }) => {
    const rowId = params.row.id
    const isExpanded = expandedAllowances.has(rowId)
    const totalAllowances = params.row.total_allowances || 0
    const allowances = params.row.allowances || {}

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation()
      setExpandedAllowances(prev => {
        const newSet = new Set(prev)
        if (isExpanded) {
          newSet.delete(rowId)
        } else {
          newSet.add(rowId)
        }
        return newSet
      })
    }

    return (
      <Box sx={{ width: '100%' }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            backgroundColor: totalAllowances > 0 ? '#e3f2fd' : 'transparent',
            p: 0.5,
            borderRadius: 1
          }}
          onClick={toggleExpand}
        >
          <Typography variant="body2" sx={{ fontWeight: totalAllowances > 0 ? 'bold' : 'normal' }}>
            {formatCurrency(totalAllowances)}
          </Typography>
          {totalAllowances > 0 && (
            <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
              {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          )}
        </Box>
        <Collapse in={isExpanded}>
          <Box sx={{ pl: 1, fontSize: '0.85em', mt: 0.5 }}>
            {allowances.incentive > 0 && <div>인센티브: {formatCurrency(allowances.incentive)}</div>}
            {allowances.meal > 0 && <div>식대: {formatCurrency(allowances.meal)}</div>}
            {allowances.transportation > 0 && <div>교통비: {formatCurrency(allowances.transportation)}</div>}
            {allowances.childCare > 0 && <div>보육수당: {formatCurrency(allowances.childCare)}</div>}
            {allowances.overtime > 0 && <div>연장근무: {formatCurrency(allowances.overtime)}</div>}
            {allowances.nightShift > 0 && <div>야간근무: {formatCurrency(allowances.nightShift)}</div>}
            {allowances.holidayWork > 0 && <div>휴일근무: {formatCurrency(allowances.holidayWork)}</div>}
            {allowances.other > 0 && <div>기타: {formatCurrency(allowances.other)}</div>}
          </Box>
        </Collapse>
      </Box>
    )
  }

  // Expandable Deductions Component
  const ExpandableDeductions: React.FC<{ params: GridRenderCellParams }> = ({ params }) => {
    const rowId = params.row.id
    const isExpanded = expandedDeductions.has(rowId)
    const totalDeductions = params.row.total_deductions || 0
    const deductions = params.row.deductions || {}

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation()
      setExpandedDeductions(prev => {
        const newSet = new Set(prev)
        if (isExpanded) {
          newSet.delete(rowId)
        } else {
          newSet.add(rowId)
        }
        return newSet
      })
    }

    return (
      <Box sx={{ width: '100%' }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            backgroundColor: totalDeductions > 0 ? '#ffebee' : 'transparent',
            p: 0.5,
            borderRadius: 1
          }}
          onClick={toggleExpand}
        >
          <Typography variant="body2" sx={{ fontWeight: totalDeductions > 0 ? 'bold' : 'normal', color: totalDeductions > 0 ? '#d32f2f' : 'inherit' }}>
            {formatCurrency(totalDeductions)}
          </Typography>
          {totalDeductions > 0 && (
            <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
              {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          )}
        </Box>
        <Collapse in={isExpanded}>
          <Box sx={{ pl: 1, fontSize: '0.85em', mt: 0.5 }}>
            {deductions.nationalPension > 0 && <div>국민연금: {formatCurrency(deductions.nationalPension)}</div>}
            {deductions.healthInsurance > 0 && <div>건강보험: {formatCurrency(deductions.healthInsurance)}</div>}
            {deductions.employmentInsurance > 0 && <div>고용보험: {formatCurrency(deductions.employmentInsurance)}</div>}
            {deductions.incomeTax > 0 && <div>소득세: {formatCurrency(deductions.incomeTax)}</div>}
            {deductions.localIncomeTax > 0 && <div>지방소득세: {formatCurrency(deductions.localIncomeTax)}</div>}
          </Box>
        </Collapse>
      </Box>
    )
  }

  // Editable cell renderer for MUI DataGrid
  const EditableCellRenderer = (params: GridRenderCellParams) => {
    const [value, setValue] = useState(params.value || 0)
    const isEditing = editingRows.has(params.row.id)

    useEffect(() => {
      setValue(params.value || 0)
    }, [params.value])

    if (!isEditing) {
      return currencyFormatter({ value: params.value })
    }

    return (
      <TextField
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onBlur={() => {
          // Update the row data
          const updatedRows = rowData.map(row => 
            row.id === params.row.id 
              ? { ...row, [params.field]: value }
              : row
          )
          setRowData(updatedRows)
        }}
        size="small"
        sx={{ width: '100%' }}
      />
    )
  }

  // Action cell renderer for MUI DataGrid
  const ActionCellRenderer = (params: GridRenderCellParams) => {
    const isEditing = editingRows.has(params.row.id)

    const handleEdit = () => {
      setEditingRows(prev => new Set(prev).add(params.row.id))
    }

    const handleSave = async () => {
      try {
        await apiService.updatePayroll({
          employee_id: params.row.employee_id,
          year_month: yearMonth,
          base_salary: params.row.base_salary,
        })
        setEditingRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(params.row.id)
          return newSet
        })
        showSuccess('급여 정보가 저장되었습니다')
        onDataChange?.()
      } catch (error) {
        showError('저장 중 오류가 발생했습니다')
      }
    }

    const handleCancel = () => {
      setEditingRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(params.row.id)
        return newSet
      })
      // Refresh data to reset changes
      loadData()
    }

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {!isEditing ? (
          <Tooltip title="수정">
            <IconButton size="small" onClick={handleEdit}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            <Tooltip title="저장">
              <IconButton size="small" onClick={handleSave} color="primary">
                <Save fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="취소">
              <IconButton size="small" onClick={handleCancel} color="secondary">
                <Cancel fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>
    )
  }

  // Column definitions for MUI DataGrid
  const allColumns: GridColDef[] = useMemo(() => [
    {
      field: 'employeeName',
      headerName: '직원명',
      width: 100,
      renderCell: (params) => (
        <Box sx={{ fontWeight: 'bold' }}>{params.value}</Box>
      )
    },
    {
      field: 'employee_id',
      headerName: '직원ID',
      width: 90,
      renderCell: (params) => (
        <Box sx={{ fontSize: '0.9em' }}>{params.value || '-'}</Box>
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
        <Box sx={{ fontSize: '0.9em' }}>{params.value || '-'}</Box>
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
      renderCell: (params) => <ExpandableAllowances params={params} />
    },
    {
      field: 'bonus_total',
      headerName: '상여금',
      width: 90,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ backgroundColor: '#f3e5f5', width: '100%', p: 1 }}>
          {currencyFormatter({ value: params.value })}
        </Box>
      )
    },
    {
      field: 'award_total',
      headerName: '포상금',
      width: 90,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ backgroundColor: '#e8f5e8', width: '100%', p: 1 }}>
          {currencyFormatter({ value: params.value })}
        </Box>
      )
    },
    {
      field: 'total_deductions',
      headerName: '공제',
      width: 120,
      type: 'number',
      renderCell: (params) => <ExpandableDeductions params={params} />
    },
    {
      field: 'input_total',
      headerName: '지급총액',
      width: 130,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ 
          backgroundColor: '#fff3e0',
          fontWeight: 'bold',
          color: '#e65100',
          width: '100%',
          p: 1
        }}>
          {currencyFormatter({ value: params.value })}
        </Box>
      )
    },
    {
      field: 'actual_payment',
      headerName: '실지급액',
      width: 130,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ 
          backgroundColor: params.value == null ? 'transparent' : '#f1f8e9',
          color: params.value == null ? '#999' : 'inherit',
          fontWeight: 'bold',
          width: '100%',
          p: 1
        }}>
          {currencyFormatter({ value: params.value })}
        </Box>
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
  ], [editingRows])

  // Filter columns based on visibility settings
  const columns = useMemo(() => {
    return allColumns.filter(col => {
      // Always show actions column
      if (col.field === 'actions') return true
      // Check visibility setting for other columns
      return visibleColumns[col.field] !== false
    })
  }, [allColumns, visibleColumns])


  // Load payroll data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.getMonthlyPayments(yearMonth)
      if (response.success && response.data) {
        const transformedData: PayrollRowData[] = (response.data as any[]).map((payment: any, index: number) => ({
          ...payment,
          // Map backend field names to frontend expected field names
          bonus_total: payment.bonus ?? payment.bonus_total ?? 0,
          award_total: payment.award ?? payment.award_total ?? 0,
          input_total: payment.total_input ?? payment.input_total ?? 0,
          // Keep existing field mappings
          id: payment._id || payment.id || `row-${index}`, // MUI DataGrid requires unique id
          employeeName: payment.employee?.full_name || payment.employee?.username || 'Unknown',
          department: payment.employee?.department || '-',
          // Add new fields for employee_id and position
          employee_id: payment.employee_id || payment.employee?.employeeId || payment.employee?.employee_id || '',
          position: payment.position || payment.employee?.position || '',
          // Add new fields for allowances and deductions
          allowances: payment.allowances || {},
          deductions: payment.deductions || {},
          total_allowances: payment.total_allowances || 0,
          total_deductions: payment.total_deductions || 0,
        }))
        setRowData(transformedData)
      } else {
        // Handle empty data gracefully
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

  // Load data when component mounts or yearMonth changes
  useEffect(() => {
    loadData()
  }, [loadData])


  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const response = await apiService.exportPayrollExcel(yearMonth)
      
      // Create blob from response
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payroll_${yearMonth}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      showSuccess('Excel 파일 다운로드가 시작되었습니다')
    } catch (error) {
      showError('Excel 내보내기에 실패했습니다')
      console.error('Excel export error:', error)
    }
  }

  // Calculate totals
  const totals = useMemo(() => {
    return rowData.reduce((acc, row) => ({
      base_salary: acc.base_salary + (row.base_salary || 0),
      incentive: acc.incentive + (row.incentive || 0),
      bonus_total: acc.bonus_total + (row.bonus_total || 0),
      award_total: acc.award_total + (row.award_total || 0),
      input_total: acc.input_total + (row.input_total || 0),
      actual_payment: acc.actual_payment + (row.actual_payment || 0),
    }), {
      base_salary: 0,
      incentive: 0,
      bonus_total: 0,
      award_total: 0,
      input_total: 0,
      actual_payment: 0,
    })
  }, [rowData])

  return (
    <Paper sx={{ height: '600px', width: '100%' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <strong>{yearMonth} 급여 현황</strong>
          <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
            총 {rowData.length}명 | 총 지급액: {totals.input_total.toLocaleString()}원
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={handleColumnSettingsClick}
          >
            컬럼 설정
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportExcel}
            disabled={rowData.length === 0}
          >
            Excel 내보내기
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ height: 'calc(100% - 80px)' }} className="ag-theme-alpine">
        {!loading && rowData.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'text.secondary' 
          }}>
            <Box sx={{ fontSize: '3rem', mb: 2 }}>📊</Box>
            <Box sx={{ fontSize: '1.2rem', fontWeight: 'medium', mb: 1 }}>
              {yearMonth} 급여 데이터가 없습니다
            </Box>
            <Box sx={{ fontSize: '0.9rem' }}>
              해당 월의 급여 정보를 추가하거나 다른 월을 선택해 주세요
            </Box>
          </Box>
        ) : (
          <DataGrid
            rows={rowData}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 20, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 20 } },
            }}
            checkboxSelection
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #e0e0e0',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f5f5f5',
                borderBottom: '2px solid #e0e0e0',
              },
            }}
          />
        )}
      </Box>
      
      {/* Column Settings Menu */}
      <Menu
        anchorEl={columnSettingsAnchor}
        open={Boolean(columnSettingsAnchor)}
        onClose={handleColumnSettingsClose}
        PaperProps={{
          sx: { width: 300, maxHeight: 400 }
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold">
            표시할 컬럼 선택
          </Typography>
        </Box>
        <Box sx={{ px: 1, py: 1 }}>
          {[
            { field: 'employee_id', label: '직원ID' },
            { field: 'employeeName', label: '직원명' },
            { field: 'department', label: '부서' },
            { field: 'position', label: '직급' },
            { field: 'base_salary', label: '기본급' },
            { field: 'incentive', label: '인센티브' },
            { field: 'total_allowances', label: '수당' },
            { field: 'bonus_total', label: '보너스' },
            { field: 'award_total', label: '포상금' },
            { field: 'total_deductions', label: '공제' },
            { field: 'input_total', label: '지급총액' },
            { field: 'actual_payment', label: '실지급액' },
          ].map(column => (
            <MenuItem key={column.field} sx={{ py: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={visibleColumns[column.field] ?? true}
                    onChange={(e) => handleColumnVisibilityChange(column.field, e.target.checked)}
                    size="small"
                  />
                }
                label={column.label}
                sx={{ width: '100%', margin: 0 }}
              />
            </MenuItem>
          ))}
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Button
            size="small"
            onClick={() => {
              const allVisible = Object.keys(visibleColumns).reduce((acc, key) => {
                acc[key] = true
                return acc
              }, {} as Record<string, boolean>)
              setVisibleColumns(allVisible)
              localStorage.setItem('payrollGridVisibleColumns', JSON.stringify(allVisible))
            }}
          >
            모두 표시
          </Button>
          <Button
            size="small"
            onClick={() => {
              // Keep only essential columns
              const essential = {
                employeeName: true,
                base_salary: true,
                input_total: true,
                actual_payment: true,
              }
              const allHidden = Object.keys(visibleColumns).reduce((acc, key) => {
                acc[key] = essential[key] || false
                return acc
              }, {} as Record<string, boolean>)
              setVisibleColumns(allHidden)
              localStorage.setItem('payrollGridVisibleColumns', JSON.stringify(allHidden))
            }}
          >
            필수만 표시
          </Button>
        </Box>
      </Menu>
    </Paper>
  )
}

export default PayrollGrid