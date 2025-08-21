/*
 * AI-HEADER
 * Intent: Manual employee matching dialog for unmatched payslip files
 * Domain Meaning: Allows admin to manually assign payslips to employees
 * Misleading Names: None
 * Data Contracts: Uses PayslipFile and MatchingDialogProps types
 * PII: Displays employee names and IDs for selection
 * Invariants: Must select a user before confirming match
 * RAG Keywords: payslip, matching, dialog, manual, employee, select
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-manual-matching-dialog-component
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { MatchingDialogProps } from '../../types/PayslipUploadTypes';

export const PayslipMatchingDialog: React.FC<MatchingDialogProps> = ({
  open,
  file,
  availableUsers,
  onClose,
  onConfirm,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleConfirm = () => {
    if (selectedUserId) {
      onConfirm(selectedUserId);
      setSelectedUserId('');
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    onClose();
  };

  if (!file) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>수동 매칭</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            파일명
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {file.fileName}
          </Typography>

          {file.parsedData.employeeName && (
            <Alert severity="info" sx={{ mb: 2 }}>
              파일명에서 추출된 이름: <strong>{file.parsedData.employeeName}</strong>
            </Alert>
          )}

          {file.parsedData.yearMonth && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`${file.parsedData.yearMonth} 급여명세서`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
        </Box>

        <FormControl fullWidth>
          <InputLabel id="employee-select-label">직원 선택</InputLabel>
          <Select
            labelId="employee-select-label"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            label="직원 선택"
          >
            <MenuItem value="">
              <em>선택하세요</em>
            </MenuItem>
            {availableUsers.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person fontSize="small" />
                  <Box>
                    <Typography variant="body2">
                      {user.name} ({user.employeeId})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.department}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {file.error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            자동 매칭 실패 사유: {file.error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={!selectedUserId}
        >
          매칭 확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};