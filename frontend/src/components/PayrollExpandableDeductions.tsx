import React from 'react'
import { Box, Typography, IconButton, Collapse } from '@mui/material'
import { ExpandMore, ExpandLess } from '@mui/icons-material'
import { GridRenderCellParams } from '@mui/x-data-grid'
import { formatCurrency } from '@/utils/payrollFormatters'

interface PayrollExpandableDeductionsProps {
  params: GridRenderCellParams
  isExpanded: boolean
  onToggle: (rowId: string) => void
}

/**
 * Expandable deductions component for PayrollGrid
 * Shows total deductions with expandable detail view
 */
const PayrollExpandableDeductions: React.FC<PayrollExpandableDeductionsProps> = ({ 
  params, 
  isExpanded, 
  onToggle 
}) => {
  // Safety check for params.row
  if (!params?.row) {
    return <div>-</div>;
  }
  
  const rowId = params.row.id
  const totalDeductions = params.row.total_deductions || 0
  const deductions = params.row.deductions || {}

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
          backgroundColor: totalDeductions > 0 ? '#ffebee' : 'transparent',
          p: 0.5,
          borderRadius: 1
        }}
        onClick={handleToggle}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: totalDeductions > 0 ? 'bold' : 'normal', 
            color: totalDeductions > 0 ? '#d32f2f' : 'inherit' 
          }}
        >
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
          {deductions.nationalPension > 0 && (
            <div>국민연금: {formatCurrency(deductions.nationalPension)}</div>
          )}
          {deductions.healthInsurance > 0 && (
            <div>건강보험: {formatCurrency(deductions.healthInsurance)}</div>
          )}
          {deductions.employmentInsurance > 0 && (
            <div>고용보험: {formatCurrency(deductions.employmentInsurance)}</div>
          )}
          {deductions.incomeTax > 0 && (
            <div>소득세: {formatCurrency(deductions.incomeTax)}</div>
          )}
          {deductions.localIncomeTax > 0 && (
            <div>지방소득세: {formatCurrency(deductions.localIncomeTax)}</div>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

export default PayrollExpandableDeductions