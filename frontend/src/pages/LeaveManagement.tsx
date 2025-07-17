import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tab,
  Tabs,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  Divider,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  BeachAccess as BeachAccessIcon,
  LocalHospital as SickIcon,
  Event as EventIcon,
  Work as WorkIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';
import { useAuth } from '@/components/AuthProvider';
import { useNotification } from '@/components/NotificationProvider';
import { ApiService } from '@/services/api';
import { LeaveRequest, LeaveBalance, LeaveForm, LeaveApprovalForm } from '@/types';
import { useConfig, useConfigProps } from '@/hooks/useConfig';
import { LeaveType, LeaveStatus } from '@/types/config';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`leave-tabpanel-${index}`}
      aria-labelledby={`leave-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { leave, date, message } = useConfig();
  const { getLeaveSelectProps, getStatusChipProps } = useConfigProps();
  const [tabValue, setTabValue] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState<LeaveForm>({
    leaveType: leave.types.ANNUAL as any,
    startDate: '',
    endDate: '',
    reason: '',
    substituteEmployee: ''
  });
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  
  // Cancellation states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [pendingCancellations, setPendingCancellations] = useState<LeaveRequest[]>([]);

  const apiService = new ApiService();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadLeaveRequests(),
        loadLeaveBalance(),
        loadPendingRequests(),
        loadPendingCancellations()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await apiService.getLeaveRequests();
      setLeaveRequests(response.data || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
  };

  const loadLeaveBalance = async () => {
    try {
      const response = await apiService.getLeaveBalance();
      setLeaveBalance(response.data);
    } catch (error) {
      console.error('Error loading leave balance:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      if (user?.role === 'admin') {
        const response = await apiService.getPendingLeaveRequests();
        setPendingRequests(response.data || []);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadPendingCancellations = async () => {
    try {
      if (user?.role === 'admin' || user?.role === 'manager') {
        const response = await apiService.getPendingCancellations();
        setPendingCancellations(response.data || []);
      }
    } catch (error) {
      console.error('Error loading pending cancellations:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (request?: LeaveRequest) => {
    if (request) {
      setEditingRequest(request);
      setFormData({
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        substituteEmployee: request.substituteEmployee || ''
      });
    } else {
      setEditingRequest(null);
      setFormData({
        leaveType: leave.types.ANNUAL as any,
        startDate: '',
        endDate: '',
        reason: '',
        substituteEmployee: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRequest(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingRequest) {
        await apiService.updateLeaveRequest(editingRequest.id, formData);
        showSuccess(message.getSuccessMessage('UPDATE_SUCCESS'));
      } else {
        await apiService.createLeaveRequest(formData);
        showSuccess(message.getSuccessMessage('SAVE_SUCCESS'));
      }
      handleCloseDialog();
      await loadData();
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      const errorMessage = error.response?.data?.error || '휴가 신청 중 오류가 발생했습니다.';
      showError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 이 휴가 신청을 취소하시겠습니까?')) {
      try {
        await apiService.deleteLeaveRequest(id);
        showSuccess(message.getSuccessMessage('DELETE_SUCCESS'));
        await loadData();
      } catch (error: any) {
        console.error('Error deleting leave request:', error);
        const errorMessage = error.response?.data?.error || '휴가 신청 취소 중 오류가 발생했습니다.';
        showError(errorMessage);
      }
    }
  };

  const handleOpenApprovalDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setApprovalComment('');
    setApprovalDialogOpen(true);
  };

  const handleCloseApprovalDialog = () => {
    setApprovalDialogOpen(false);
    setSelectedRequest(null);
    setApprovalComment('');
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;

    try {
      await apiService.approveLeaveRequest(selectedRequest._id, action, approvalComment);
      showSuccess(
        action === 'approve' ? '휴가가 승인되었습니다.' : '휴가가 거부되었습니다.'
      );
      handleCloseApprovalDialog();
      await loadData();
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      const errorMessage = error.response?.data?.error || '승인 처리 중 오류가 발생했습니다.';
      showError(errorMessage);
    }
  };

  // Cancellation handlers
  const handleCancelRequest = async (request: LeaveRequest) => {
    // Check if cancellation is already requested
    if (request.cancellationRequested) {
      showError('이미 취소 신청이 진행 중입니다.');
      return;
    }
    
    // Check if leave start date is in the future
    const today = new Date().toISOString().split('T')[0];
    if (request.startDate <= today) {
      showError('이미 시작된 휴가는 취소할 수 없습니다.');
      return;
    }
    
    setCancelRequest(request);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setCancelRequest(null);
    setCancelReason('');
  };

  const handleConfirmCancellation = async () => {
    if (!cancelRequest) return;
    
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      showError('취소 사유를 5자 이상 입력해주세요.');
      return;
    }

    try {
      await apiService.cancelLeaveRequest(cancelRequest._id, cancelReason.trim());
      showSuccess('휴가 취소 신청이 완료되었습니다. 관리자 승인을 기다려주세요.');
      handleCloseCancelDialog();
      await loadData();
    } catch (error: any) {
      console.error('Error canceling leave request:', error);
      const errorMessage = error.response?.data?.error || '취소 신청 중 오류가 발생했습니다.';
      showError(errorMessage);
    }
  };

  const handleCancellationApproval = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await apiService.approveLeaveCancellation(requestId, action, approvalComment);
      showSuccess(
        action === 'approve' ? '휴가 취소가 승인되었습니다.' : '휴가 취소가 거부되었습니다.'
      );
      handleCloseApprovalDialog();
      await loadData();
    } catch (error: any) {
      console.error('Error approving cancellation:', error);
      const errorMessage = error.response?.data?.error || '취소 승인 처리 중 오류가 발생했습니다.';
      showError(errorMessage);
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case leave.types.ANNUAL:
        return <BeachAccessIcon />;
      case leave.types.FAMILY:
        return <EventIcon />;
      case leave.types.PERSONAL:
        return <PersonIcon />;
      default:
        return <WorkIcon />;
    }
  };

  // Hook에서 제공하는 함수 사용
  const getLeaveTypeLabel = leave.getTypeLabel;
  const getStatusLabel = leave.getStatusLabel;

  const getStatusColor = (status: string) => {
    switch (status) {
      case leave.status.PENDING:
        return 'warning';
      case leave.status.APPROVED:
        return 'success';
      case leave.status.REJECTED:
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const safeFormatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), date.formats.DISPLAY);
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return dateString;
    }
  };

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      let daysCount = 0;
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0) { 
          // 일요일 - 0일
        } else if (dayOfWeek === 6) { 
          // 토요일 - 0.5일
          daysCount += 0.5;
        } else { 
          // 월~금 - 1일
          daysCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return daysCount;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" fontWeight={600}>
            휴가 관리
          </Typography>
          {user?.role !== 'admin' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              휴가 신청
            </Button>
          )}
        </Box>

        {/* 휴가 잔여일수 카드 - admin은 휴가가 없으므로 표시하지 않음 */}
        {leaveBalance && user?.role !== 'admin' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 내 휴가 현황 ({leaveBalance.year}년)
              </Typography>
              <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box flex={1}>
                      <Typography variant="body2" color="text.secondary">
                        연차 사용률
                      </Typography>
                      <Typography variant="h4">
                        {leaveBalance.usedAnnualLeave}/{leaveBalance.totalAnnualLeave}일
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(leaveBalance.usedAnnualLeave / leaveBalance.totalAnnualLeave) * 100}
                        sx={{ mt: 1, height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid xs={12} md={6}>
                  <Grid container spacing={2}>
                    <Grid xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        잔여 연차
                      </Typography>
                      <Typography 
                        variant="h5" 
                        color={leaveBalance.remainingAnnualLeave < 0 ? "error" : "primary"}
                      >
                        {leaveBalance.remainingAnnualLeave}일
                      </Typography>
                      {leaveBalance.remainingAnnualLeave < 0 && (
                        <Typography variant="caption" color="error">
                          (최대 -3일까지 가능)
                        </Typography>
                      )}
                    </Grid>
                    <Grid xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        대기중
                      </Typography>
                      <Typography variant="h5" color="warning.main">
                        {leaveBalance.pendingAnnualLeave}일
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label={user?.role === 'admin' ? '휴가 내역' : '내 휴가 신청'} />
              {user?.role === 'admin' && (
                <Tab
                  label={
                    <Badge badgeContent={pendingRequests.length} color="error">
                      승인 관리
                    </Badge>
                  }
                />
              )}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <Tab
                  label={
                    <Badge badgeContent={pendingCancellations.length} color="warning">
                      취소 승인
                    </Badge>
                  }
                />
              )}
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>휴가 종류</TableCell>
                    <TableCell>기간</TableCell>
                    <TableCell>일수</TableCell>
                    <TableCell>사유</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>신청일</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getLeaveTypeIcon(request.leaveType)}
                          {getLeaveTypeLabel(request.leaveType)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(request.startDate)} ~{' '}
                        {safeFormatDate(request.endDate)}
                      </TableCell>
                      <TableCell>{request.daysCount}일</TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(request.status)}
                          color={getStatusColor(request.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(request.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {request.status === leave.status.PENDING && (
                            <>
                              <Tooltip title="수정">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(request)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="취소">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(request._id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {request.status === leave.status.APPROVED && !request.cancellationRequested && (
                            <Tooltip title="휴가 취소 신청">
                              <IconButton
                                size="small"
                                onClick={() => handleCancelRequest(request)}
                                color="warning"
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {request.cancellationRequested && (
                            <Chip
                              label={`취소 ${request.cancellationStatus === 'pending' ? '대기' : request.cancellationStatus === 'approved' ? '승인' : '거부'}`}
                              size="small"
                              color={
                                request.cancellationStatus === 'pending' ? 'warning' :
                                request.cancellationStatus === 'approved' ? 'success' : 'error'
                              }
                            />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaveRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                          휴가 신청 내역이 없습니다.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {user?.role === 'admin' && (
            <TabPanel value={tabValue} index={1}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>신청자</TableCell>
                      <TableCell>부서</TableCell>
                      <TableCell>휴가 종류</TableCell>
                      <TableCell>기간</TableCell>
                      <TableCell>일수</TableCell>
                      <TableCell>사유</TableCell>
                      <TableCell>신청일</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingRequests?.map((request) => (
                      <TableRow key={request?.id || request?._id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {request?.userName?.[0] || '?'}
                            </Avatar>
                            {request?.userName || '사용자 정보 없음'}
                          </Box>
                        </TableCell>
                        <TableCell>{request?.userDepartment || '부서 정보 없음'}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getLeaveTypeIcon(request?.leaveType)}
                            {getLeaveTypeLabel(request?.leaveType)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(request?.startDate)} ~{' '}
                          {safeFormatDate(request?.endDate)}
                        </TableCell>
                        <TableCell>{request?.daysCount || 0}일</TableCell>
                        <TableCell>{request?.reason || '-'}</TableCell>
                        <TableCell>
                          {safeFormatDate(request?.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="승인">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  if (request) {
                                    setSelectedRequest(request);
                                    handleApproval('approve');
                                  }
                                }}
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="거부">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => request && handleOpenApprovalDialog(request)}
                              >
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pendingRequests || pendingRequests.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary">
                            승인 대기 중인 휴가 신청이 없습니다.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          )}

          {/* 취소 승인 탭 */}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <TabPanel value={tabValue} index={2}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>직원명</TableCell>
                      <TableCell>휴가 종류</TableCell>
                      <TableCell>기간</TableCell>
                      <TableCell>일수</TableCell>
                      <TableCell>원래 사유</TableCell>
                      <TableCell>취소 사유</TableCell>
                      <TableCell>취소 신청일</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingCancellations.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {request.userName?.[0] || '?'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {request.userName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {request.userDepartment}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getLeaveTypeIcon(request.leaveType)}
                            {getLeaveTypeLabel(request.leaveType)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {request.startDate === request.endDate
                            ? safeFormatDate(request.startDate)
                            : `${safeFormatDate(request.startDate)} ~ ${safeFormatDate(request.endDate)}`
                          }
                        </TableCell>
                        <TableCell>{request.daysCount}일</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {request.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {request.cancellationReason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(request.cancellationRequestedAt)}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="취소 승인">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setApprovalComment('');
                                  setApprovalDialogOpen(true);
                                }}
                                color="success"
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="취소 거부">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setApprovalComment('');
                                  setApprovalDialogOpen(true);
                                }}
                                color="error"
                              >
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingCancellations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                            대기 중인 취소 신청이 없습니다.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          )}
        </Card>

        {/* 휴가 신청 다이얼로그 */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingRequest ? '휴가 신청 수정' : '휴가 신청'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="휴가 종류"
                  select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as any })}
                >
                  <MenuItem value={leave.types.ANNUAL}>연차</MenuItem>
                  <MenuItem value={leave.types.FAMILY}>경조사</MenuItem>
                  <MenuItem value={leave.types.PERSONAL}>개인휴가 (무급)</MenuItem>
                </TextField>
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="대체 인력 (선택사항)"
                  value={formData.substituteEmployee}
                  onChange={(e) => setFormData({ ...formData, substituteEmployee: e.target.value })}
                  helperText="필요시 대체 인력을 입력하세요"
                />
              </Grid>
              <Grid xs={12} md={6}>
                <DatePicker
                  label="시작일"
                  value={formData.startDate ? parseISO(formData.startDate) : null}
                  onChange={(date) => {
                    const dateString = date ? format(date, 'yyyy-MM-dd') : '';
                    setFormData({ ...formData, startDate: dateString });
                  }}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      required: true
                    } 
                  }}
                  format="yyyy-MM-dd"
                />
              </Grid>
              <Grid xs={12} md={6}>
                <DatePicker
                  label="종료일"
                  value={formData.endDate ? parseISO(formData.endDate) : null}
                  onChange={(date) => {
                    const dateString = date ? format(date, 'yyyy-MM-dd') : '';
                    setFormData({ ...formData, endDate: dateString });
                  }}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      required: true
                    } 
                  }}
                  format="yyyy-MM-dd"
                  minDate={formData.startDate ? parseISO(formData.startDate) : undefined}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="신청 사유"
                  multiline
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </Grid>
              {formData.startDate && formData.endDate && (
                <Grid xs={12}>
                  <Alert severity="info">
                    총 휴가 일수: {calculateDays(formData.startDate, formData.endDate)}일
                    (일요일 제외, 토요일 0.5일 계산)
                  </Alert>
                  {formData.leaveType === 'annual' && leaveBalance && (
                    (() => {
                      const requestedDays = calculateDays(formData.startDate, formData.endDate);
                      const remainingAfterRequest = leaveBalance.remainingAnnualLeave - requestedDays;
                      
                      if (remainingAfterRequest < 0 && remainingAfterRequest >= -3) {
                        return (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            이 요청 후 잔여 연차: {remainingAfterRequest}일 (미리 사용 중)
                          </Alert>
                        );
                      } else if (remainingAfterRequest < -3) {
                        return (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            연차 한도를 초과합니다. 최대 3일까지만 미리 사용할 수 있습니다.
                          </Alert>
                        );
                      }
                      return null;
                    })()
                  )}
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.startDate || !formData.endDate || !formData.reason}
            >
              {editingRequest ? '수정' : '신청'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 승인 다이얼로그 */}
        <Dialog open={approvalDialogOpen} onClose={handleCloseApprovalDialog} maxWidth="sm" fullWidth>
          <DialogTitle>휴가 승인 관리</DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {selectedRequest.userName}님의 휴가 신청
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getLeaveTypeLabel(selectedRequest.leaveType)} • {selectedRequest.daysCount}일 • {' '}
                  {safeFormatDate(selectedRequest.startDate)} ~ {' '}
                  {safeFormatDate(selectedRequest.endDate)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>사유:</strong> {selectedRequest.reason}
                </Typography>
                <TextField
                  fullWidth
                  label="승인/거부 사유"
                  multiline
                  rows={3}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  sx={{ mt: 2 }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseApprovalDialog}>취소</Button>
            <Button
              onClick={() => {
                if (selectedRequest?.cancellationRequested) {
                  handleCancellationApproval(selectedRequest._id, 'reject');
                } else {
                  handleApproval('reject');
                }
              }}
              color="error"
              variant="outlined"
            >
              거부
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest?.cancellationRequested) {
                  handleCancellationApproval(selectedRequest._id, 'approve');
                } else {
                  handleApproval('approve');
                }
              }}
              color="success"
              variant="contained"
            >
              승인
            </Button>
          </DialogActions>
        </Dialog>

        {/* 휴가 취소 신청 다이얼로그 */}
        <Dialog open={cancelDialogOpen} onClose={handleCloseCancelDialog} maxWidth="sm" fullWidth>
          <DialogTitle>휴가 취소 신청</DialogTitle>
          <DialogContent>
            {cancelRequest && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  취소하려는 휴가 정보
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  휴가 종류: {getLeaveTypeLabel(cancelRequest.leaveType)}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  기간: {cancelRequest.startDate === cancelRequest.endDate
                    ? safeFormatDate(cancelRequest.startDate)
                    : `${safeFormatDate(cancelRequest.startDate)} ~ ${safeFormatDate(cancelRequest.endDate)}`
                  } ({cancelRequest.daysCount}일)
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  원래 사유: {cancelRequest.reason}
                </Typography>
                <TextField
                  fullWidth
                  label="취소 사유"
                  placeholder="휴가를 취소하는 이유를 5자 이상 입력해주세요."
                  multiline
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  sx={{ mt: 2 }}
                  helperText={`${cancelReason.length}/5자 이상`}
                  error={cancelReason.length > 0 && cancelReason.length < 5}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCancelDialog}>취소</Button>
            <Button 
              onClick={handleConfirmCancellation} 
              color="warning" 
              variant="contained"
              disabled={!cancelReason.trim() || cancelReason.trim().length < 5}
            >
              취소 신청
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default LeaveManagement;