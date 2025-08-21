import React, { useState, useMemo, useCallback } from 'react'
import { DataGrid } from '@mui/x-data-grid'
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
  CircularProgress 
} from '@mui/material'
import { Settings, Print, Download } from '@mui/icons-material'

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
  const [selectedRows, setSelectedRows] = useState<any>([])
  
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

  // Component renderers with proper props
  const ExpandableAllowancesRenderer = useCallback((params: any) => (
    <PayrollExpandableAllowances
      params={params}
      isExpanded={expandedAllowances.has(params.row.id)}
      onToggle={toggleAllowances}
    />
  ), [expandedAllowances, toggleAllowances])

  const ExpandableDeductionsRenderer = useCallback((params: any) => (
    <PayrollExpandableDeductions
      params={params}
      isExpanded={expandedDeductions.has(params.row.id)}
      onToggle={toggleDeductions}
    />
  ), [expandedDeductions, toggleDeductions])

  const EditableCellRenderer = useCallback((params: any) => (
    <PayrollEditableCell
      params={params}
      isEditing={isEditing(params.row.id)}
      onUpdate={updateCellValue}
    />
  ), [isEditing, updateCellValue])

  const ActionCellRenderer = useCallback((params: any) => (
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
  ), [isEditing, startEditing, savePayroll, cancelEditing, onDataChange])

  // Get column definitions with renderers
  const columns = useMemo(() => 
    getColumnDefinitions(
      EditableCellRenderer,
      ExpandableAllowancesRenderer,
      ExpandableDeductionsRenderer,
      ActionCellRenderer
    ).filter(col => visibleColumns[col.field] !== false),
    [
      EditableCellRenderer,
      ExpandableAllowancesRenderer,
      ExpandableDeductionsRenderer,
      ActionCellRenderer,
      visibleColumns
    ]
  )

  // Calculate summary
  const summary = useMemo(() => calculatePayrollSummary(rowData), [rowData])

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
  const handleSelectionChange = (selection: any) => {
    setSelectedRows(selection)
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
        {rowData.length > 0 && (
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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={rowData}
            columns={columns}
            {...defaultGridOptions}
            checkboxSelection
            onRowSelectionModelChange={handleSelectionChange}
            rowSelectionModel={selectedRows}
            sx={{
              '& .MuiDataGrid-cell': {
                borderRight: '1px solid rgba(224, 224, 224, 1)',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold',
              },
            }}
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
        totalEmployees={rowData.length}
        totalPayment={summary.totalPayment}
        selectedCount={Array.isArray(selectedRows) ? selectedRows.length : 0}
        yearMonth={yearMonth}
      />
    </Box>
  )
}

export default PayrollGrid