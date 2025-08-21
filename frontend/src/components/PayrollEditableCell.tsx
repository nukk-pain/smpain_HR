import React, { useState, useEffect } from 'react'
import { TextField } from '@mui/material'
import { GridRenderCellParams } from '@mui/x-data-grid'
import { currencyFormatter } from '@/utils/payrollFormatters'

interface PayrollEditableCellProps {
  params: GridRenderCellParams
  isEditing: boolean
  onUpdate: (rowId: string, field: string, value: number) => void
}

/**
 * Editable cell component for PayrollGrid
 * Switches between display and edit mode based on row editing state
 */
const PayrollEditableCell: React.FC<PayrollEditableCellProps> = ({ 
  params, 
  isEditing, 
  onUpdate 
}) => {
  const [value, setValue] = useState(params.value || 0)

  useEffect(() => {
    setValue(params.value || 0)
  }, [params.value])

  if (!isEditing) {
    return <>{currencyFormatter({ value: params.value })}</>
  }

  const handleBlur = () => {
    onUpdate(params.row.id, params.field, value)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value)
    if (!isNaN(newValue)) {
      setValue(newValue)
    }
  }

  return (
    <TextField
      type="number"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      size="small"
      sx={{ width: '100%' }}
      inputProps={{
        min: 0,
        step: 1000
      }}
    />
  )
}

export default PayrollEditableCell