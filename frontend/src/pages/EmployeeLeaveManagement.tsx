import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Stack,
  Tab,
  Tabs,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  BeachAccess as BeachAccessIcon,
  LocalHospital as SickIcon,
  Event as EventIcon,
  Work as WorkIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import { apiService } from '../services/api';

interface LeaveRequest {
  _id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  submittedAt: string;
  createdAt: string;
  daysCount: number;
  requestDetails?: string;
  cancellationRequested?: boolean;
  cancellationReason?: string;
  cancellationRequestedAt?: string;
  cancellationStatus?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalComment?: string;
}

// TabPanel 컴포넌트
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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

const EmployeeLeaveManagement: React.FC = () => {
  // Tab management
  const [tabValue, setTabValue] = useState(0);
  
  // Leave requests data
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [pendingCancellations, setPendingCancellations] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Approval dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  
  // Legacy reject dialog (keep for compatibility)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const loadPendingRequests = async () => {
    try {
      if (user?.role === 'admin') {
        const response = await apiService.getPendingLeaveRequests();
        setPendingRequests(response.data || []);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
      showError('승인 대기 휴가 목록을 불러오는데 실패했습니다.');
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
      showError('취소 승인 대기 목록을 불러오는데 실패했습니다.');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
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

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadData();
    }
  }, [user]);

  // New approval dialog handlers
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

  // Legacy handlers (keep for compatibility)
  const handleApprove = async (requestId: string) => {
    try {
      await apiService.approveLeave(requestId, { status: 'approved' });
      showSuccess('휴가 신청이 승인되었습니다.');
      loadData();
    } catch (error) {
      showError('휴가 승인 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async () => {
    try {
      await apiService.approveLeave(selectedRequestId, { 
        status: 'rejected', 
        rejectReason 
      });
      showSuccess('휴가 신청이 거부되었습니다.');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedRequestId('');
      loadData();
    } catch (error) {
      showError('휴가 거부 중 오류가 발생했습니다.');
    }
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectDialogOpen(true);
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'annual':
        return <BeachAccessIcon sx={{ color: '#2196f3' }} />;
      case 'sick':
        return <SickIcon sx={{ color: '#f44336' }} />;
      case 'personal':
        return <PersonIcon sx={{ color: '#ff9800' }} />;
      case 'special':
        return <EventIcon sx={{ color: '#9c27b0' }} />;
      case 'substitute':
        return <WorkIcon sx={{ color: '#607d8b' }} />;
      default:
        return <CalendarIcon sx={{ color: '#9e9e9e' }} />;
    }
  };

  const getLeaveTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      annual: '연차',
      sick: '병가',
      personal: '개인사유',
      special: '특별휴가',
      substitute: '대체휴무'
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      annual: '연차',
      sick: '병가',
      personal: '개인사유',
      special: '특별휴가',
      substitute: '대체휴무',
      family: '가족돌봄휴가'
    };
    return types[type] || type;
  };

  const safeFormatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('ko-KR');
    } catch (error) {
      return '-';
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <Box p={3}>
        <Alert severity="error">
          접근 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        👥 직원 휴가 관리
      </Typography>

      <Card>
        <CardContent>
          {/* 탭 네비게이션 */}
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="leave management tabs">
            <Tab
              label={
                <Badge badgeContent={pendingRequests.length} color="error">
                  승인 관리
                </Badge>
              }
            />
            <Tab
              label={
                <Badge badgeContent={pendingCancellations.length} color="warning">
                  취소 승인
                </Badge>
              }
            />
          </Tabs>
        </CardContent>
        
        {loading && (
          <LinearProgress />
        )}

        {/* 승인 관리 탭 */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : pendingRequests.length === 0 ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Typography color="text.secondary">
                승인 대기 중인 휴가 신청이 없습니다.
              </Typography>
            </Box>
          ) : (
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
                  {pendingRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {request.userName?.[0] || '?'}
                          </Avatar>
                          {request.userName || '사용자 정보 없음'}
                        </Box>
                      </TableCell>
                      <TableCell>{request.userDepartment || '부서 정보 없음'}</TableCell>
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
                      <TableCell>{request.daysCount || 0}일</TableCell>
                      <TableCell>{request.reason || '-'}</TableCell>
                      <TableCell>
                        {safeFormatDate(request.createdAt)}
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
          )}
        </TabPanel>

        {/* 취소 승인 탭 */}
        <TabPanel value={tabValue} index={1}>
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
      </Card>

      {/* 거부 사유 입력 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>휴가 신청 거부</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="거부 사유"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="거부 사유를 입력해주세요..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            variant="contained"
            disabled={!rejectReason.trim()}
          >
            거부
          </Button>
        </DialogActions>
      </Dialog>

      {/* 새로운 승인 다이얼로그 */}
      <Dialog open={approvalDialogOpen} onClose={handleCloseApprovalDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedRequest?.cancellationRequested ? '휴가 취소 승인 관리' : '휴가 승인 관리'}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {selectedRequest.cancellationRequested 
                  ? `${selectedRequest.userName}님의 휴가 취소 신청`
                  : `${selectedRequest.userName}님의 휴가 신청`
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getLeaveTypeLabel(selectedRequest.leaveType)} • {selectedRequest.daysCount}일 • {' '}
                {safeFormatDate(selectedRequest.startDate)} ~ {' '}
                {safeFormatDate(selectedRequest.endDate)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>사유:</strong> {selectedRequest.reason}
              </Typography>
              {selectedRequest.cancellationRequested && selectedRequest.cancellationReason && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>취소 사유:</strong> {selectedRequest.cancellationReason}
                </Typography>
              )}
              <TextField
                fullWidth
                label={selectedRequest.cancellationRequested ? "취소 승인/거부 사유" : "승인/거부 사유"}
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
            {selectedRequest?.cancellationRequested ? '취소 거부' : '거부'}
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
            {selectedRequest?.cancellationRequested ? '취소 승인' : '승인'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeLeaveManagement;