import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Box,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapHorizIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNotification } from './NotificationProvider';
import { ApiService } from '../services/api';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  hireDate: string;
  yearsOfService: number;
}

interface LeaveStatus {
  baseAnnualLeave: number;
  carryOverLeave: number;
  totalAdjustments: number;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  remainingAnnualLeave: number;
}

interface AdjustmentHistory {
  _id: string;
  type: 'add' | 'subtract' | 'carry_over' | 'cancel_usage';
  amount: number;
  reason: string;
  adjustedBy: string;
  adjustedByName: string;
  adjustedAt: string;
  beforeBalance: number;
  afterBalance: number;
}

interface EmployeeLeaveDetails {
  employee: Employee;
  leaveStatus: LeaveStatus;
  adjustmentHistory: AdjustmentHistory[];
}

interface LeaveAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onAdjustmentComplete: () => void;
}

const LeaveAdjustmentDialog: React.FC<LeaveAdjustmentDialogProps> = ({
  open,
  onClose,
  employeeId,
  employeeName,
  onAdjustmentComplete
}) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeLeaveDetails | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'carry_over' | 'cancel_usage'>('add');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const apiService = new ApiService();

  useEffect(() => {
    if (open && employeeId) {
      loadEmployeeDetails();
    }
  }, [open, employeeId]);

  const loadEmployeeDetails = async () => {
    try {
      setDetailsLoading(true);
      const response = await apiService.getEmployeeLeaveDetails(employeeId);
      console.log('Employee details received:', response.data);
      setEmployeeDetails(response.data);
    } catch (error) {
      console.error('Error loading employee details:', error);
      showError('직원 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      showError('조정 일수를 입력해주세요.');
      return;
    }

    if (!reason.trim()) {
      showError('조정 사유를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await apiService.adjustEmployeeLeave(employeeId, {
        type: adjustmentType,
        amount: amount,
        reason: reason.trim()
      });

      showSuccess('연차 조정이 완료되었습니다.');
      onAdjustmentComplete();
      handleClose();
    } catch (error: any) {
      console.error('Error adjusting leave:', error);
      const errorMessage = error.response?.data?.error || '연차 조정 중 오류가 발생했습니다.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount(0);
    setReason('');
    setAdjustmentType('add');
    setPreviewMode(false);
    onClose();
  };

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case 'add':
        return '추가 지급';
      case 'subtract':
        return '차감';
      case 'carry_over':
        return '이월 조정';
      case 'cancel_usage':
        return '사용 취소';
      default:
        return type;
    }
  };

  const getAdjustmentTypeIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <TrendingUpIcon color="success" />;
      case 'subtract':
        return <TrendingDownIcon color="error" />;
      case 'carry_over':
        return <SwapHorizIcon color="info" />;
      case 'cancel_usage':
        return <CancelIcon color="warning" />;
      default:
        return null;
    }
  };

  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'success';
      case 'subtract':
        return 'error';
      case 'carry_over':
        return 'info';
      case 'cancel_usage':
        return 'warning';
      default:
        return 'default';
    }
  };

  const calculatePreviewBalance = () => {
    if (!employeeDetails) return 0;
    const adjustmentAmount = adjustmentType === 'add' ? amount : -amount;
    return (employeeDetails?.leaveInfo?.currentBalance || 0) + adjustmentAmount;
  };

  if (detailsLoading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        ⚙️ {employeeName}님 연차 조정
      </DialogTitle>
      <DialogContent>
        {employeeDetails && employeeDetails.leaveInfo ? (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* 현재 연차 현황 */}
            <Grid xs={12}>
              <Typography variant="h6" gutterBottom>
                현재 연차 현황
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      기본 연차
                    </Typography>
                    <Typography variant="h6">
                      {employeeDetails?.leaveInfo?.annualEntitlement || 0}일
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({employeeDetails?.employee?.yearsOfService || 0}년차)
                    </Typography>
                  </Grid>
                  <Grid xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      이월 연차
                    </Typography>
                    <Typography variant="h6">
                      0일
                    </Typography>
                  </Grid>
                  <Grid xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      조정 연차
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {employeeDetails?.adjustments?.length || 0}건
                    </Typography>
                  </Grid>
                  <Grid xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      총 연차
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {employeeDetails?.leaveInfo?.annualEntitlement || 0}일
                    </Typography>
                  </Grid>
                  <Grid xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      사용 연차
                    </Typography>
                    <Typography variant="h6">
                      {employeeDetails?.leaveInfo?.totalUsedThisYear || 0}일
                    </Typography>
                  </Grid>
                  <Grid xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      잔여 연차
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {employeeDetails?.leaveInfo?.currentBalance || 0}일
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            <Grid xs={12}>
              <Divider />
            </Grid>

            {/* 조정 옵션 */}
            <Grid xs={12}>
              <Typography variant="h6" gutterBottom>
                🔧 조정 옵션
              </Typography>
              <Grid container spacing={2}>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="조정 유형"
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as any)}
                  >
                    <MenuItem value="add">추가 지급</MenuItem>
                    <MenuItem value="subtract">차감</MenuItem>
                    <MenuItem value="carry_over">이월 조정</MenuItem>
                    <MenuItem value="cancel_usage">사용 취소</MenuItem>
                  </TextField>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="조정 일수"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    inputProps={{ min: 0, max: 50 }}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label="조정 사유"
                    multiline
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="연차 조정 사유를 입력하세요..."
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* 미리보기 */}
            {amount > 0 && (
              <Grid xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>조정 미리보기:</strong><br />
                    현재 잔여 연차: {employeeDetails?.leaveInfo?.currentBalance || 0}일<br />
                    조정 후 잔여 연차: {calculatePreviewBalance()}일<br />
                    변경량: {adjustmentType === 'add' ? '+' : '-'}{amount}일
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* 조정 히스토리 */}
            {(employeeDetails?.adjustments?.length || 0) > 0 && (
              <Grid xs={12}>
                <Typography variant="h6" gutterBottom>
                  조정 히스토리
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>날짜</TableCell>
                        <TableCell>유형</TableCell>
                        <TableCell align="center">일수</TableCell>
                        <TableCell>사유</TableCell>
                        <TableCell>조정자</TableCell>
                        <TableCell align="center">조정 전</TableCell>
                        <TableCell align="center">조정 후</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(employeeDetails?.adjustments || []).slice(0, 5).map((adjustment) => (
                        <TableRow key={adjustment._id}>
                          <TableCell>
                            {format(new Date(adjustment.adjustedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getAdjustmentTypeIcon(adjustment.type)}
                              label={getAdjustmentTypeLabel(adjustment.type)}
                              color={getAdjustmentTypeColor(adjustment.type) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {adjustment.type === 'add' ? '+' : '-'}{adjustment.amount}일
                          </TableCell>
                          <TableCell>{adjustment.reason}</TableCell>
                          <TableCell>{adjustment.adjustedByName}</TableCell>
                          <TableCell align="center">{adjustment.beforeBalance}일</TableCell>
                          <TableCell align="center">{adjustment.afterBalance}일</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}
          </Grid>
        ) : (
          !detailsLoading && (
            <Alert severity="warning">
              직원 연차 정보를 불러올 수 없습니다.
            </Alert>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !amount || !reason.trim()}
        >
          {loading ? <CircularProgress size={20} /> : '적용하기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveAdjustmentDialog;