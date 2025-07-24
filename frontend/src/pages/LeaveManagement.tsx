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
  
  // Cancellation states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationHistory, setCancellationHistory] = useState<LeaveRequest[]>([]);

  const apiService = new ApiService();

  useEffect(() => {
    loadData();
    
    // 페이지가 다시 포커스될 때 연차 잔여일수 업데이트
    const handleFocus = () => {
      loadLeaveBalance();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // 다른 탭에서 변경사항이 있을 때도 업데이트 (storage event)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'leaveUpdated') {
        loadLeaveBalance();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadLeaveRequests(),
        loadLeaveBalance(),
        loadCancellationHistory()
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


  const loadCancellationHistory = async () => {
    try {
      const response = await apiService.getCancellationHistory();
      setCancellationHistory(response.data || []);
    } catch (error) {
      console.error('Error loading cancellation history:', error);
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
      await loadLeaveRequests();
      await loadLeaveBalance();
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
        await loadLeaveRequests();
      await loadLeaveBalance();
      } catch (error: any) {
        console.error('Error deleting leave request:', error);
        const errorMessage = error.response?.data?.error || '휴가 신청 취소 중 오류가 발생했습니다.';
        showError(errorMessage);
      }
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
      await loadLeaveRequests();
      await loadLeaveBalance();
    } catch (error: any) {
      console.error('Error canceling leave request:', error);
      const errorMessage = error.response?.data?.error || '취소 신청 중 오류가 발생했습니다.';
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
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
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
              <Tab label='내 휴가 신청' />
              {user?.role !== 'admin' && (
                <Tab
                  label={
                    <Badge badgeContent={cancellationHistory.length} color="info">
                      취소 내역
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

          {/* 취소 내역 탭 (일반 사용자용) */}
          {user?.role !== 'admin' && (
            <TabPanel value={tabValue} index={1}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>휴가 종류</TableCell>
                      <TableCell>기간</TableCell>
                      <TableCell>일수</TableCell>
                      <TableCell>신청 사유</TableCell>
                      <TableCell>취소 사유</TableCell>
                      <TableCell>취소 상태</TableCell>
                      <TableCell>취소 신청일</TableCell>
                      <TableCell>처리일</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cancellationHistory.map((request) => (
                      <TableRow key={request._id}>
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
                          <Chip
                            label={
                              request.cancellationStatus === 'pending' ? '대기' :
                              request.cancellationStatus === 'approved' ? '승인됨' : '거부됨'
                            }
                            size="small"
                            color={
                              request.cancellationStatus === 'pending' ? 'warning' :
                              request.cancellationStatus === 'approved' ? 'success' : 'error'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(request.cancellationRequestedAt)}
                        </TableCell>
                        <TableCell>
                          {request.cancellationApprovedAt 
                            ? safeFormatDate(request.cancellationApprovedAt) 
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                    {cancellationHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            취소 신청 내역이 없습니다.
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
              {/* 첫 번째 줄: 휴가 종류, 대체 인력 */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="대체 인력 (선택사항)"
                      value={formData.substituteEmployee}
                      onChange={(e) => setFormData({ ...formData, substituteEmployee: e.target.value })}
                      helperText="필요시 대체 인력을 입력하세요"
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              {/* 두 번째 줄: 시작일, 종료일 */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12} sm={6}>
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
                </Grid>
              </Grid>
              
              {/* 세 번째 줄: 신청 사유 */}
              <Grid item xs={12}>
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
                <Grid item xs={12}>
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