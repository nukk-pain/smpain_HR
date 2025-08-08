/**
 * DeactivationDialog Component
 * 
 * Confirmation dialog for user deactivation with reason input
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Box,
  IconButton
} from '@mui/material';
import {
  Warning as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { User } from '../types';

export interface DeactivationDialogProps {
  open: boolean;
  user: User | null;
  loading?: boolean;
  onConfirm: (user: User, reason: string) => void;
  onCancel: () => void;
}

/**
 * DeactivationDialog component for confirming user deactivation
 */
export const DeactivationDialog: React.FC<DeactivationDialogProps> = ({
  open,
  user,
  loading = false,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');

  // Clear reason when dialog opens/closes
  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (user) {
      onConfirm(user, reason);
    }
  }, [user, reason, onConfirm]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleReasonChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setReason(event.target.value);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.currentTarget === event.target) {
      // Only handle Enter if not typing in a text field
      if ((event.target as HTMLElement).tagName !== 'INPUT') {
        handleConfirm();
      }
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  }, [handleConfirm, handleCancel]);

  if (!user) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      onKeyDown={handleKeyDown}
      aria-labelledby="deactivation-dialog-title"
    >
      <DialogTitle id="deactivation-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" data-testid="warning-icon" />
          사용자 비활성화 확인
          <Box flexGrow={1} />
          <IconButton
            onClick={handleCancel}
            disabled={loading}
            size="small"
            aria-label="닫기"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          정말로 <strong>{user.name}</strong> 사용자를 비활성화 하시겠습니까?
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          비활성화된 사용자는 로그인할 수 없으며, 시스템에 접근할 수 없습니다.
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={3}
          margin="normal"
          label="비활성화 사유"
          value={reason}
          onChange={handleReasonChange}
          disabled={loading}
          helperText="비활성화 사유를 입력해주세요 (선택사항)"
          placeholder="예: 퇴사, 휴직, 징계 등..."
        />
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={handleCancel}
          disabled={loading}
          color="inherit"
        >
          취소
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading}
          color="error"
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? '처리 중...' : '비활성화'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};