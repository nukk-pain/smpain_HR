import React from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import { Edit, Save, Cancel } from '@mui/icons-material'
import { GridRenderCellParams } from '@mui/x-data-grid'

interface PayrollActionButtonsProps {
  params: GridRenderCellParams
  isEditing: boolean
  onEdit: (rowId: string) => void
  onSave: (rowId: string, rowData: any) => Promise<void>
  onCancel: (rowId: string) => void
}

/**
 * Action buttons component for PayrollGrid
 * Provides edit, save, and cancel functionality for each row
 */
const PayrollActionButtons: React.FC<PayrollActionButtonsProps> = ({ 
  params, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel 
}) => {
  const handleEdit = () => {
    onEdit(params.row.id)
  }

  const handleSave = async () => {
    await onSave(params.row.id, params.row)
  }

  const handleCancel = () => {
    onCancel(params.row.id)
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

export default PayrollActionButtons