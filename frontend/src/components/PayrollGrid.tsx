import React, { useState, useMemo, useCallback } from 'react'
import { DataGrid, GridRowSelectionModel } from '@mui/x-data-grid'
import { 
  Box, 
  Paper, 
  Button, 
  Typography, 
  Menu, 
  MenuItem, 
  FormControlLabel, 
  Checkbox, 
  Divider,
  CircularProgress,
  TablePagination 
} from '@mui/material'
import { Settings, Print, Download } from '@mui/icons-material'
import DataGridErrorBoundary from './DataGridErrorBoundary'

// Types
import { PayrollGridProps, PayrollRowData, DEFAULT_VISIBLE_COLUMNS, PAYROLL_STORAGE_KEYS } from '@/types/PayrollTypes'

// Hooks
import { usePayrollData } from '@/hooks/usePayrollData'
import { useNotification } from './NotificationProvider'

// Components
import PrintPreviewDialog, { PrintOptions } from './PrintPreviewDialog'
import PayrollExpandableAllowances from './PayrollExpandableAllowances'
import PayrollExpandableDeductions from './PayrollExpandableDeductions'
import PayrollEditableCell from './PayrollEditableCell'
import PayrollActionButtons from './PayrollActionButtons'

// Configuration
import { getColumnDefinitions, defaultGridOptions } from '@/config/payrollGridConfig'

// Utils
import { formatCurrency, formatYearMonth } from '@/utils/payrollFormatters'
import { calculatePayrollSummary } from '@/utils/payrollCalculations'

/**
 * Refactored PayrollGrid Component
 * Manages payroll data display and editing with AG Grid
 */
const PayrollGrid: React.FC<PayrollGridProps> = ({ yearMonth, onDataChange }) => {
  // Data management hook
  const {
    rowData,
    loading,
    editingRows,
    savePayroll,
    startEditing,
    cancelEditing,
    updateCellValue,
    isEditing,
    loadData,
  } = usePayrollData(yearMonth)

  // UI state
  const [expandedAllowances, setExpandedAllowances] = useState<Set<string>>(new Set())
  const [expandedDeductions, setExpandedDeductions] = useState<Set<string>>(new Set())
  const [columnSettingsAnchor, setColumnSettingsAnchor] = useState<null | HTMLElement>(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  
  // Column visibility with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(PAYROLL_STORAGE_KEYS.VISIBLE_COLUMNS)
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS
  })

  const { showSuccess, showError } = useNotification()

  // Handlers for expandable components
  const toggleAllowances = useCallback((rowId: string) => {
    setExpandedAllowances(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }, [])

  const toggleDeductions = useCallback((rowId: string) => {
    setExpandedDeductions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }, [])

  // Column visibility handlers
  const handleColumnVisibilityChange = (columnField: string, visible: boolean) => {
    const newVisibleColumns = { ...visibleColumns, [columnField]: visible }
    setVisibleColumns(newVisibleColumns)
    localStorage.setItem(PAYROLL_STORAGE_KEYS.VISIBLE_COLUMNS, JSON.stringify(newVisibleColumns))
  }

  const handleColumnSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setColumnSettingsAnchor(event.currentTarget)
  }

  const handleColumnSettingsClose = () => {
    setColumnSettingsAnchor(null)
  }

  // Ensure rowData is always an array with valid structure to prevent DataGrid footer errors
  const safeRowData = useMemo(() => {
    if (!Array.isArray(rowData) || rowData.length === 0) return []
    // Filter out any invalid rows and ensure each row has an id
    const validRows = rowData.filter(row => row && typeof row === 'object' && Object.keys(row).length > 0)
    if (validRows.length === 0) return []
    
    return validRows.map((row, index) => ({
      ...row,
      id: row.id || row._id || `row-${index}` // Ensure every row has an id
    }))
  }, [rowData])

  // Component renderers with proper props
  const ExpandableAllowancesRenderer = useCallback((params: any) => {
    // Safety check for params.row
    if (!params || !params.row) {
      return <div>-</div>;
    }
    return (
      <PayrollExpandableAllowances
        params={params}
        isExpanded={expandedAllowances.has(params.row.id)}
        onToggle={toggleAllowances}
      />
    );
  }, [expandedAllowances, toggleAllowances])

  const ExpandableDeductionsRenderer = useCallback((params: any) => {
    // Safety check for params.row
    if (!params || !params.row) {
      return <div>-</div>;
    }
    return (
      <PayrollExpandableDeductions
        params={params}
        isExpanded={expandedDeductions.has(params.row.id)}
        onToggle={toggleDeductions}
      />
    );
  }, [expandedDeductions, toggleDeductions])

  const EditableCellRenderer = useCallback((params: any) => {
    // Safety check for params.row
    if (!params || !params.row) {
      return <div>-</div>;
    }
    return (
      <PayrollEditableCell
        params={params}
        isEditing={isEditing(params.row.id)}
        onUpdate={updateCellValue}
      />
    );
  }, [isEditing, updateCellValue])

  const ActionCellRenderer = useCallback((params: any) => {
    // Safety check for params.row
    if (!params || !params.row) {
      return <div>-</div>;
    }
    return (
      <PayrollActionButtons
        params={params}
        isEditing={isEditing(params.row.id)}
        onEdit={startEditing}
        onSave={async (rowId, rowData) => {
          await savePayroll(rowId, rowData)
          onDataChange?.()
        }}
        onCancel={cancelEditing}
      />
    );
  }, [isEditing, startEditing, savePayroll, cancelEditing, onDataChange])

  // Get column definitions with renderers
  const columns = useMemo(() => {
    const cols = getColumnDefinitions(
      EditableCellRenderer,
      ExpandableAllowancesRenderer,
      ExpandableDeductionsRenderer,
      ActionCellRenderer
    ).filter(col => visibleColumns[col.field] !== false)
    return cols
  }, [
      EditableCellRenderer,
      ExpandableAllowancesRenderer,
      ExpandableDeductionsRenderer,
      ActionCellRenderer,
      visibleColumns
    ]
  )

  // Calculate summary using safeRowData to ensure consistency
  const summary = useMemo(() => calculatePayrollSummary(safeRowData), [safeRowData])

  // Print handling
  const handlePrint = () => {
    setPrintDialogOpen(true)
  }

  const handlePrintClose = () => {
    setPrintDialogOpen(false)
  }

  const handlePrintConfirm = (options: PrintOptions) => {
    // Print logic is handled by PrintPreviewDialog
    setPrintDialogOpen(false)
  }

  // Export handling
  const handleExport = async () => {
    try {
      // TODO: Implement Excel export
      showSuccess('Export 기능은 준비 중입니다')
    } catch (error) {
      showError('Export 중 오류가 발생했습니다')
    }
  }

  // Selection handling
  const handleSelectionChange = (selection: GridRowSelectionModel) => {
    setSelectedRows(selection)
  }

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {formatYearMonth(yearMonth)} 급여 관리
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<Settings />}
              onClick={handleColumnSettingsClick}
              size="small"
            >
              열 설정
            </Button>
            <Button
              startIcon={<Print />}
              onClick={handlePrint}
              size="small"
            >
              인쇄
            </Button>
            <Button
              startIcon={<Download />}
              onClick={handleExport}
              size="small"
              variant="contained"
            >
              Excel 내보내기
            </Button>
          </Box>
        </Box>

        {/* Summary */}
        {safeRowData.length > 0 && (
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              총 인원: <strong>{summary.totalEmployees}명</strong>
            </Typography>
            <Typography variant="body2">
              총 기본급: <strong>{formatCurrency(summary.totalBaseSalary)}</strong>
            </Typography>
            <Typography variant="body2">
              총 수당: <strong>{formatCurrency(summary.totalAllowances)}</strong>
            </Typography>
            <Typography variant="body2">
              총 공제: <strong>{formatCurrency(summary.totalDeductions)}</strong>
            </Typography>
            <Typography variant="body2">
              총 실지급액: <strong>{formatCurrency(summary.totalPayment)}</strong>
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 'calc(100% - 150px)' }}>
        {loading || !columns || columns.length === 0 || !safeRowData || safeRowData.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            {loading ? (
              <CircularProgress />
            ) : !columns || columns.length === 0 ? (
              <Typography>No columns available</Typography>
            ) : (
              <Typography>No data available</Typography>
            )}
          </Box>
        ) : (
          <DataGridErrorBoundary fallbackMessage="급여 데이터를 표시하는 중 오류가 발생했습니다. 새로고침을 시도해주세요.">
            <DataGrid
              key={`datagrid-${yearMonth}-${safeRowData.length}`}
              rows={safeRowData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
              columns={columns}
              getRowId={(row) => row.id || `row-${safeRowData.indexOf(row)}`}
              checkboxSelection={false}
              disableRowSelectionOnClick
              disableColumnSelector
              disableMultipleRowSelection
              autoPageSize={false}
              density="comfortable"
              hideFooter
              hideFooterPagination
              columnHeaderHeight={56}
              rowHeight={52}
              slots={{
                columnHeaderCheckbox: () => null,
                baseCheckbox: () => null,
                cellCheckbox: () => null,
                headerCheckbox: () => null,
              }}
              slotProps={{
                columnsPanel: {
                  disableHideAllButton: true,
                  disableShowAllButton: true,
                },
                row: {
                  'aria-selected': false,
                },
              }}
              sx={{
                '& .MuiDataGrid-cell': {
                  borderRight: '1px solid rgba(224, 224, 224, 1)',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f5f5f5',
                  fontWeight: 'bold',
                },
                '& .MuiDataGrid-columnHeaderCheckbox': {
                  display: 'none',
                },
                '& .MuiDataGrid-cellCheckbox': {
                  display: 'none',
                },
              }}
            />
          </DataGridErrorBoundary>
        )}
        {/* Custom Pagination */}
        {safeRowData.length > 0 && (
          <TablePagination
            component="div"
            count={safeRowData.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="페이지당 행:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}`}
          />
        )}
      </Paper>

      {/* Column Settings Menu */}
      <Menu
        anchorEl={columnSettingsAnchor}
        open={Boolean(columnSettingsAnchor)}
        onClose={handleColumnSettingsClose}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">표시할 열 선택</Typography>
        </MenuItem>
        <Divider />
        {Object.entries(DEFAULT_VISIBLE_COLUMNS).map(([field, defaultVisible]) => (
          <MenuItem key={field} sx={{ paddingY: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={visibleColumns[field] ?? defaultVisible}
                  onChange={(e) => handleColumnVisibilityChange(field, e.target.checked)}
                  size="small"
                />
              }
              label={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              sx={{ margin: 0, width: '100%' }}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => {
          setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
          localStorage.setItem(PAYROLL_STORAGE_KEYS.VISIBLE_COLUMNS, JSON.stringify(DEFAULT_VISIBLE_COLUMNS))
          handleColumnSettingsClose()
        }}>
          기본값으로 재설정
        </MenuItem>
      </Menu>

      {/* Print Preview Dialog */}
      <PrintPreviewDialog
        open={printDialogOpen}
        onClose={handlePrintClose}
        onPrint={handlePrintConfirm}
        totalEmployees={safeRowData.length}
        totalPayment={summary.totalPayment}
        selectedCount={selectedRows.length}
        yearMonth={yearMonth}
      />
    </Box>
  )
}

export default PayrollGrid