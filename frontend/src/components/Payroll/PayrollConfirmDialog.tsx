/*
 * AI-HEADER
 * Intent: Confirmation dialog component for payroll data upload
 * Domain Meaning: Final verification step before committing payroll data to database
 * Misleading Names: None
 * Data Contracts: Uses PreviewData type from payrollUpload types
 * PII: Shows aggregated counts only, no individual employee data
 * Invariants: Must show accurate counts and warnings before confirmation
 * RAG Keywords: payroll, confirm, dialog, upload, save, verification
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-upload-confirmation-dialog-component
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Typography,
  Box,
  Divider,
  Alert
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { PreviewData } from '../../types/payrollUpload';

interface PayrollConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: PreviewData | null;
  selectedRecordsCount: number;
  confirming: boolean;
}

export const PayrollConfirmDialog: React.FC<PayrollConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  previewData,
  selectedRecordsCount,
  confirming
}) => {
  if (!previewData) return null;

  const excludedCount = previewData.summary.totalRecords - selectedRecordsCount;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">
        급여 데이터 저장 확인
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          <Typography variant="body2" gutterBottom>
            선택한 급여 데이터를 데이터베이스에 저장하시겠습니까?
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="medium" color="primary.main">
              • 선택한 레코드: {selectedRecordsCount}건
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 제외될 레코드: {excludedCount}건
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">
              • 총 {previewData.summary.totalRecords}건 중 {selectedRecordsCount}건 저장 예정
            </Typography>
            {previewData.summary.warningRecords > 0 && (
              <Typography variant="body2" color="warning.main">
                • 경고가 있는 데이터 포함 가능
              </Typography>
            )}
          </Box>
          {excludedCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                선택하지 않은 {excludedCount}개 레코드는 저장되지 않습니다.
              </Typography>
            </Alert>
          )}
          <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
            저장 후에는 데이터를 수정할 수 없습니다.
          </Typography>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          취소
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={confirming}
          startIcon={<SaveIcon />}
        >
          {confirming ? '저장 중...' : '확인하고 저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};