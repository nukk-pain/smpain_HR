import React from 'react'
import { Box, Typography, IconButton, Collapse } from '@mui/material'
import { ExpandMore, ExpandLess } from '@mui/icons-material'
import { GridRenderCellParams } from '@mui/x-data-grid'
import { formatCurrency } from '@/utils/payrollFormatters'

interface PayrollExpandableAllowancesProps {
  params: GridRenderCellParams
  isExpanded: boolean
  onToggle: (rowId: string) => void
}

/**
 * Expandable allowances component for PayrollGrid
 * Shows total allowances with expandable detail view
 */
const PayrollExpandableAllowances: React.FC<PayrollExpandableAllowancesProps> = ({ 
  params, 
  isExpanded, 
  onToggle 
}) => {
  // Safety check for params.row
  if (!params?.row) {
    return <div>-</div>;
  }
  
  const rowId = params.row.id
  const totalAllowances = params.row.total_allowances || 0
  const allowances = params.row.allowances || {}

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(rowId)
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
        onClick={handleToggle}
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

export default PayrollExpandableAllowances