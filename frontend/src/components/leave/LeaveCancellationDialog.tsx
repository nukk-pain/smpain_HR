/*
 * AI-HEADER
 * Intent: Dialog component for leave request cancellation
 * Domain Meaning: Interface for cancelling approved leave requests
 * Misleading Names: None
 * Data Contracts: Uses LeaveRequest type for cancellation data
 * PII: Contains leave request details and cancellation reason
 * Invariants: Can only cancel approved requests, requires reason
 * RAG Keywords: leave, cancel, dialog, request, cancellation, reason
 * DuplicatePolicy: canonical
 * FunctionIdentity: leave-cancellation-dialog-component
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { LeaveCancellationDialogProps } from '../../types/LeaveManagementTypes';

export const LeaveCancellationDialog: React.FC<LeaveCancellationDialogProps> = ({
  open,
  request,
  reason,
  loading,
  onClose,
  onConfirm,
  onReasonChange
}) => {
  if (!request) return null;

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = format(parseISO(startDate), 'yyyy-MM-dd');
    const end = format(parseISO(endDate), 'yyyy-MM-dd');
    return start === end ? start : `${start} ~ ${end}`;
  };

  const isValidReason = reason.trim().length >= 10;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          연차 취소 요청
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          승인된 연차를 취소하시겠습니까? 취소 요청은 관리자의 승인이 필요합니다.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            취소할 연차 정보
          </Typography>
          
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                기간
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatDateRange(request.startDate, request.endDate)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                유형
              </Typography>
              <Chip 
                label={request.leaveType} 
                size="small" 
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                사유
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  maxWidth: 300,
                  textAlign: 'right'
                }}
              >
                {request.reason}
              </Typography>
            </Box>
          </Box>
        </Box>

        <TextField
          label="취소 사유"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          multiline
          rows={3}
          fullWidth
          required
          placeholder="연차 취소 사유를 상세히 입력해주세요 (최소 10자)"
          error={reason.length > 0 && !isValidReason}
          helperText={
            reason.length > 0 && !isValidReason
              ? `최소 10자 이상 입력해주세요 (현재: ${reason.length}자)`
              : `${reason.length}/10자`
          }
        />

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            취소 요청 후 진행 절차:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>
              <Typography variant="body2">
                관리자에게 취소 요청이 전달됩니다
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                승인 시 연차가 복구되며 이메일로 알림이 발송됩니다
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                취소 요청은 철회할 수 없습니다
              </Typography>
            </li>
          </Box>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          닫기
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained"
          color="warning"
          disabled={loading || !isValidReason}
          startIcon={loading && <CircularProgress size={20} />}
        >
          취소 요청
        </Button>
      </DialogActions>
    </Dialog>
  );
};