import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Save, X, Download } from 'lucide-react'
import { MonthlyPayment, User } from '@/types'
import apiService from '@/services/api'
import { useNotification } from './NotificationProvider'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface PayrollGridProps {
  yearMonth: string
  onDataChange?: () => void
}

interface PayrollRowData extends MonthlyPayment {
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

  // Editable cell renderer
  const EditableCellRenderer = (props: any) => {
    const [value, setValue] = useState(props.value || 0)
    const isEditing = editingRows.has(props.node.data.id)

    useEffect(() => {
      setValue(props.value || 0)
    }, [props.value])

    if (!isEditing) {
      return currencyFormatter(props)
    }

    return (
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onBlur={() => {
          props.node.setDataValue(props.colDef.field, value)
        }}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          padding: '4px',
        }}
      />
    )
  }

  // Action cell renderer
  const ActionCellRenderer = (props: any) => {
    const isEditing = editingRows.has(props.data.id)

    const handleEdit = () => {
      setEditingRows(prev => new Set(prev).add(props.data.id))
    }

    const handleSave = async () => {
      try {
        await apiService.updatePayroll({
          employee_id: props.data.employee_id,
          year_month: yearMonth,
          base_salary: props.data.base_salary,
        })
        setEditingRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(props.data.id)
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
        newSet.delete(props.data.id)
        return newSet
      })
      // Refresh data to reset changes
      loadData()
    }

    return (
      <div className="flex gap-1">
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-8 w-8 p-0"
            title="수정"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              title="저장"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              title="취소"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    )
  }

  // Column definitions
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: '직원명',
      field: 'employeeName',
      width: 120,
      pinned: 'left',
      cellStyle: { fontWeight: 'bold' }
    },
    {
      headerName: '부서',
      field: 'department',
      width: 100,
    },
    {
      headerName: '기본급',
      field: 'base_salary',
      width: 130,
      type: 'numericColumn',
      cellRenderer: EditableCellRenderer,
      editable: false, // Handled by custom renderer
    },
    {
      headerName: '인센티브',
      field: 'incentive',
      width: 130,
      type: 'numericColumn',
      valueFormatter: currencyFormatter,
      cellStyle: { backgroundColor: '#e3f2fd' }
    },
    {
      headerName: '상여금',
      field: 'bonus_total',
      width: 120,
      type: 'numericColumn',
      valueFormatter: currencyFormatter,
      cellStyle: { backgroundColor: '#f3e5f5' }
    },
    {
      headerName: '포상금',
      field: 'award_total',
      width: 120,
      type: 'numericColumn',
      valueFormatter: currencyFormatter,
      cellStyle: { backgroundColor: '#e8f5e8' }
    },
    {
      headerName: '총액',
      field: 'input_total',
      width: 140,
      type: 'numericColumn',
      valueFormatter: currencyFormatter,
      cellStyle: { 
        backgroundColor: '#fff3e0',
        fontWeight: 'bold',
        color: '#e65100'
      }
    },
    {
      headerName: '실제 지급액',
      field: 'actual_payment',
      width: 140,
      type: 'numericColumn',
      valueFormatter: currencyFormatter,
      cellStyle: (params) => {
        if (params.value == null) return { color: '#999' }
        return { backgroundColor: '#f1f8e9' }
      }
    },
    {
      headerName: '차이',
      field: 'difference',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (params) => {
        if (params.value == null) return '-'
        const value = Number(params.value)
        const formatted = `${Math.abs(value).toLocaleString()}원`
        return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : '0원'
      },
      cellStyle: (params) => {
        if (params.value == null) return { color: '#999' }
        const value = Number(params.value)
        if (value > 0) return { color: '#2e7d32', fontWeight: 'bold' }
        if (value < 0) return { color: '#d32f2f', fontWeight: 'bold' }
        return { color: '#666' }
      }
    },
    {
      headerName: '작업',
      field: 'actions',
      width: 100,
      cellRenderer: ActionCellRenderer,
      sortable: false,
      filter: false,
      pinned: 'right'
    }
  ], [editingRows])

  // Default column definition
  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 0,
  }

  // Load payroll data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiService.getMonthlyPayments(yearMonth)
      if (response.success && response.data) {
        const transformedData: PayrollRowData[] = response.data.map((payment: MonthlyPayment) => ({
          ...payment,
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

  // Grid ready event
  const onGridReady = (params: GridReadyEvent) => {
    params.api.sizeColumnsToFit()
  }

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
    <Card className="h-[600px] w-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">{yearMonth} 급여 현황</h3>
            <p className="text-sm text-muted-foreground mt-1">
              총 {rowData.length}명 | 총 지급액: {totals.input_total.toLocaleString()}원
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={rowData.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Excel 내보내기
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="h-[calc(500px-80px)] ag-theme-alpine">
          {!loading && rowData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="text-5xl mb-4">📊</div>
              <div className="text-xl font-medium mb-2">
                {yearMonth} 급여 데이터가 없습니다
              </div>
              <div className="text-sm">
                해당 월의 급여 정보를 추가하거나 다른 월을 선택해 주세요
              </div>
            </div>
          ) : (
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              loading={loading}
              pagination={true}
              paginationPageSize={20}
              domLayout="normal"
              suppressRowClickSelection={true}
              rowSelection="multiple"
              animateRows={true}
              suppressCellFocus={true}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default PayrollGrid