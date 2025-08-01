import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DataGrid, GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid'
import { Box, Paper, Button, IconButton, Tooltip, TextField } from '@mui/material'
import { Edit, Save, Cancel, Download } from '@mui/icons-material'
import { MonthlyPayment, User } from '@/types'
import apiService from '@/services/api'
import { useNotification } from './NotificationProvider'

interface PayrollGridProps {
  yearMonth: string
  onDataChange?: () => void
}

interface PayrollRowData extends MonthlyPayment {
  id: string // MUI DataGrid requires an id field
  employeeName: string
  department: string
  isEditing?: boolean
}

const PayrollGrid: React.FC<PayrollGridProps> = ({ yearMonth, onDataChange }) => {
  const [rowData, setRowData] = useState<PayrollRowData[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set())
  const { showSuccess, showError } = useNotification()

  // Currency formatter
  const currencyFormatter = (params: any) => {
    if (params.value == null) return '0원'
    return `${Number(params.value).toLocaleString()}원`
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
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'employeeName',
      headerName: '직원명',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ fontWeight: 'bold' }}>{params.value}</Box>
      )
    },
    {
      field: 'department',
      headerName: '부서',
      width: 100,
    },
    {
      field: 'base_salary',
      headerName: '기본급',
      width: 130,
      type: 'number',
      renderCell: EditableCellRenderer,
    },
    {
      field: 'incentive',
      headerName: '인센티브',
      width: 130,
      type: 'number',
      valueFormatter: (params) => currencyFormatter({ value: params.value }),
      renderCell: (params) => (
        <Box sx={{ backgroundColor: '#e3f2fd', width: '100%', p: 1 }}>
          {currencyFormatter({ value: params.value })}
        </Box>
      )
    },
    {
      field: 'bonus_total',
      headerName: '상여금',
      width: 120,
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
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ backgroundColor: '#e8f5e8', width: '100%', p: 1 }}>
          {currencyFormatter({ value: params.value })}
        </Box>
      )
    },
    {
      field: 'input_total',
      headerName: '총액',
      width: 140,
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
      headerName: '실제 지급액',
      width: 140,
      type: 'number',
      renderCell: (params) => (
        <Box sx={{ 
          backgroundColor: params.value == null ? 'transparent' : '#f1f8e9',
          color: params.value == null ? '#999' : 'inherit',
          width: '100%',
          p: 1
        }}>
          {currencyFormatter({ value: params.value })}
        </Box>
      )
    },
    {
      field: 'difference',
      headerName: '차이',
      width: 120,
      type: 'number',
      renderCell: (params) => {
        if (params.value == null) return <Box sx={{ color: '#999' }}>-</Box>
        const value = Number(params.value)
        const formatted = `${Math.abs(value).toLocaleString()}원`
        const displayValue = value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : '0원'
        const color = value > 0 ? '#2e7d32' : value < 0 ? '#d32f2f' : '#666'
        
        return (
          <Box sx={{ color, fontWeight: 'bold' }}>
            {displayValue}
          </Box>
        )
      }
    },
    {
      field: 'actions',
      headerName: '작업',
      width: 100,
      renderCell: ActionCellRenderer,
      sortable: false,
      filterable: false,
    }
  ], [editingRows])


  // Load payroll data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.getMonthlyPayments(yearMonth)
      if (response.success && response.data) {
        const transformedData: PayrollRowData[] = response.data.map((payment: MonthlyPayment, index: number) => ({
          ...payment,
          id: payment._id || `row-${index}`, // MUI DataGrid requires unique id
          employeeName: payment.employee?.full_name || payment.employee?.username || 'Unknown',
          department: payment.employee?.department || '-',
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
  const handleExportExcel = () => {
    // Implementation would use ag-grid's export functionality
    showSuccess('Excel 내보내기 기능은 곧 구현됩니다')
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
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExportExcel}
          disabled={rowData.length === 0}
        >
          Excel 내보내기
        </Button>
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
    </Paper>
  )
}

export default PayrollGrid