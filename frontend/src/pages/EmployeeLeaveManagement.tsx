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
  Stack
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  BeachAccess as BeachAccessIcon,
  LocalHospital as SickIcon,
  Event as EventIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import { apiService } from '../services/api';

interface LeaveRequest {
  _id: string;
  userId: string;
  userName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  submittedAt: string;
  daysCount: number;
  requestDetails?: string;
}

const EmployeeLeaveManagement: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingLeaveRequests();
      setPendingRequests(response.data || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      showError('승인 대기 휴가 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadPendingRequests();
    }
  }, [user]);

  const handleApprove = async (requestId: string) => {
    try {
      await apiService.approveLeave(requestId, { status: 'approved' });
      showSuccess('휴가 신청이 승인되었습니다.');
      loadPendingRequests();
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
      loadPendingRequests();
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
        직원 휴가 관리
      </Typography>
      
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              승인 대기 목록
              <Badge badgeContent={pendingRequests.length} color="error" sx={{ ml: 2 }} />
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Typography>로딩 중...</Typography>
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
                    <TableCell>휴가 종류</TableCell>
                    <TableCell>기간</TableCell>
                    <TableCell>일수</TableCell>
                    <TableCell>사유</TableCell>
                    <TableCell>신청일</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                            {request.userName?.charAt(0) || '?'}
                          </Avatar>
                          {request.userName || '알 수 없음'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getLeaveTypeIcon(request.leaveType)}
                          <Typography sx={{ ml: 1 }}>
                            {getLeaveTypeText(request.leaveType)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {request.startDate || '-'} ~ {request.endDate || '-'}
                      </TableCell>
                      <TableCell>{request.daysCount || 0}일</TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {request.reason || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={request.status === 'pending' ? '대기중' : request.status}
                          color={getStatusColor(request.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="승인">
                            <IconButton
                              color="success"
                              onClick={() => handleApprove(request._id)}
                              size="small"
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="거부">
                            <IconButton
                              color="error"
                              onClick={() => openRejectDialog(request._id)}
                              size="small"
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
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
    </Box>
  );
};

export default EmployeeLeaveManagement;