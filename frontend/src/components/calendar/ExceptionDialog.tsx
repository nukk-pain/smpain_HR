import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ExceptionDialogProps } from '../../types/LeaveCalendarTypes';

const ExceptionDialog: React.FC<ExceptionDialogProps> = ({
  open,
  date,
  formData,
  existingException,
  onClose,
  onSave,
  onDelete,
  onFormChange
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {date && format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko })} 예외 설정
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="최대 동시 휴가 허용 인원"
            type="number"
            value={formData.maxConcurrentLeaves}
            onChange={(e) => onFormChange({
              ...formData,
              maxConcurrentLeaves: parseInt(e.target.value) || 2
            })}
            inputProps={{ min: 2, max: 10 }}
            sx={{ mb: 2 }}
            helperText="2명 이상의 직원이 동시에 휴가를 신청할 수 있습니다."
          />
          <TextField
            fullWidth
            label="설정 사유 (선택사항)"
            multiline
            rows={3}
            value={formData.reason}
            onChange={(e) => onFormChange({
              ...formData,
              reason: e.target.value
            })}
            placeholder="예: 연말연시, 회사 휴무일, 특별 행사일 등"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        {existingException && onDelete && (
          <Button onClick={onDelete} color="error" startIcon={<Delete />}>
            삭제
          </Button>
        )}
        <Button onClick={onClose}>
          취소
        </Button>
        <Button onClick={() => onSave(formData)} variant="contained">
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExceptionDialog;