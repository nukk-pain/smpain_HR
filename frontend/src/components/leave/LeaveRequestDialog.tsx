/*
 * AI-HEADER
 * Intent: Dialog component for creating and editing leave requests
 * Domain Meaning: Form interface for leave application submission
 * Misleading Names: None
 * Data Contracts: Uses LeaveForm type for form data management
 * PII: Contains employee leave request details
 * Invariants: Start date must be before or equal to end date
 * RAG Keywords: leave, request, dialog, form, application, submit
 * DuplicatePolicy: canonical
 * FunctionIdentity: leave-request-dialog-form-component
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';
import { useConfig } from '../../hooks/useConfig';
import { LeaveDialogProps } from '../../types/LeaveManagementTypes';

export const LeaveRequestDialog: React.FC<LeaveDialogProps> = ({
  open,
  editingRequest,
  formData,
  loading,
  onClose,
  onSubmit,
  onFormDataChange
}) => {
  const { leave } = useConfig();

  // Calculate leave days
  const leaveDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = parseISO(formData.startDate);
    const end = parseISO(formData.endDate);
    let days = 0;
    let current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = format(current, 'yyyy-MM-dd');
      
      // Skip if it's a personal off day
      if (formData.personalOffDays?.includes(dateStr)) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      
      // Count weekdays as 1, Saturday as 0.5, skip Sunday
      if (dayOfWeek !== 0) {
        days += dayOfWeek === 6 ? 0.5 : 1;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [formData.startDate, formData.endDate, formData.personalOffDays]);

  const handleDateChange = (field: 'startDate' | 'endDate', date: Date | null) => {
    if (date) {
      onFormDataChange({
        ...formData,
        [field]: format(date, 'yyyy-MM-dd')
      });
    }
  };

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  const isFormValid = () => {
    return formData.leaveType && 
           formData.startDate && 
           formData.endDate && 
           formData.reason.trim().length > 0;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRequest ? '연차 신청 수정' : '연차 신청'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="휴가 유형"
              value={formData.leaveType}
              onChange={(e) => handleFieldChange('leaveType', e.target.value)}
              fullWidth
              required
            >
              {Object.entries(leave.types).map(([key, value]) => (
                <MenuItem key={key} value={value}>
                  {leave.typeLabels[value as keyof typeof leave.typeLabels]}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <DatePicker
                label="시작일"
                value={formData.startDate ? parseISO(formData.startDate) : null}
                onChange={(date) => handleDateChange('startDate', date)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    required: true 
                  } 
                }}
              />
              
              <DatePicker
                label="종료일"
                value={formData.endDate ? parseISO(formData.endDate) : null}
                onChange={(date) => handleDateChange('endDate', date)}
                minDate={formData.startDate ? parseISO(formData.startDate) : undefined}
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    required: true 
                  } 
                }}
              />
            </Box>

            {leaveDays > 0 && (
              <Alert severity="info">
                신청 일수: <strong>{leaveDays}일</strong>
                {formData.personalOffDays && formData.personalOffDays.length > 0 && (
                  <Typography variant="caption" display="block">
                    (개인연차 {formData.personalOffDays.length}일 제외)
                  </Typography>
                )}
              </Alert>
            )}

            <TextField
              label="사유"
              value={formData.reason}
              onChange={(e) => handleFieldChange('reason', e.target.value)}
              multiline
              rows={3}
              fullWidth
              required
              placeholder="연차 사용 사유를 입력해주세요"
            />

            <TextField
              label="대체 근무자"
              value={formData.substituteEmployee}
              onChange={(e) => handleFieldChange('substituteEmployee', e.target.value)}
              fullWidth
              placeholder="업무 대체자 이름 (선택)"
            />

            {formData.leaveType === leave.types.PERSONAL && (
              <Alert severity="warning">
                개인연차는 무급 휴가입니다. 급여에서 차감될 수 있습니다.
              </Alert>
            )}

            {leaveDays > 5 && (
              <Alert severity="info">
                5일 이상의 연차는 팀장 승인이 필요합니다.
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button 
            onClick={onSubmit} 
            variant="contained" 
            disabled={loading || !isFormValid()}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {editingRequest ? '수정' : '신청'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};