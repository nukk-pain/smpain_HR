import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CalendarToday,
  MonetizationOn,
  BeachAccess,
  TrendingUp,
  Person,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from './AuthProvider';
import { apiService } from '../services/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface UserStats {
  leaveBalance: {
    totalAnnualLeave: number;
    usedAnnualLeave: number;
    remainingAnnualLeave: number;
    pendingRequests: number;
  };
  payroll: {
    currentMonth: string;
    baseSalary: number;
    totalPayment: number;
    incentive: number;
    bonus: number;
  };
  recentLeaves: any[];
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user's personal stats
      const [leaveBalance, recentLeaves] = await Promise.all([
        apiService.getLeaveBalance(),
        apiService.getLeaveRequests()
      ]);

      const userStats: UserStats = {
        leaveBalance: {
          totalAnnualLeave: leaveBalance.data?.totalAnnualLeave || 0,
          usedAnnualLeave: leaveBalance.data?.usedAnnualLeave || 0,
          remainingAnnualLeave: leaveBalance.data?.remainingAnnualLeave || 0,
          pendingRequests: leaveBalance.data?.pendingAnnualLeave || 0
        },
        payroll: {
          currentMonth: new Date().toISOString().substring(0, 7),
          baseSalary: user?.baseSalary || 0,
          totalPayment: 0,
          incentive: 0,
          bonus: 0
        },
        recentLeaves: recentLeaves.data || []
      };

      setStats(userStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'approved':
        return <Chip label="승인됨" color="success" size="small" />;
      case 'pending':
        return <Chip label="대기중" color="warning" size="small" />;
      case 'rejected':
        return <Chip label="거부됨" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual':
        return '연차';
      case 'family':
        return '경조사';
      case 'personal':
        return '개인휴가';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        👋 {user?.name}님의 대시보드
      </Typography>

      <Grid container spacing={3}>
        {/* 개인 정보 카드 */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Person sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">개인 정보</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                부서: {user?.department}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                직급: {user?.position}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 휴가 현황 */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BeachAccess sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">휴가 현황</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats?.leaveBalance.remainingAnnualLeave || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                잔여 연차 / {stats?.leaveBalance.totalAnnualLeave || 0}일
              </Typography>
              <Typography variant="body2" color="text.secondary">
                사용: {stats?.leaveBalance.usedAnnualLeave || 0}일
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 급여 정보 */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MonetizationOn sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">급여 정보</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {(stats?.payroll.baseSalary || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                기본급 (원)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats?.payroll.currentMonth} 기준
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 대기중인 신청 */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Schedule sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">대기중인 신청</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {stats?.recentLeaves.filter(leave => leave.status === 'pending').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                승인 대기중
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 휴가 신청 내역 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 최근 휴가 신청 내역
              </Typography>
              {stats?.recentLeaves && stats.recentLeaves.length > 0 ? (
                <TableContainer component={Paper} elevation={0}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>휴가 유형</TableCell>
                        <TableCell>시작일</TableCell>
                        <TableCell>종료일</TableCell>
                        <TableCell>일수</TableCell>
                        <TableCell>사유</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>신청일</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.recentLeaves.slice(0, 10).map((leave, index) => (
                        <TableRow key={index}>
                          <TableCell>{getLeaveTypeLabel(leave.leaveType)}</TableCell>
                          <TableCell>
                            {format(new Date(leave.startDate), 'yyyy.MM.dd', { locale: ko })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(leave.endDate), 'yyyy.MM.dd', { locale: ko })}
                          </TableCell>
                          <TableCell>{leave.daysCount}일</TableCell>
                          <TableCell>{leave.reason}</TableCell>
                          <TableCell>{getStatusChip(leave.status)}</TableCell>
                          <TableCell>
                            {format(new Date(leave.createdAt), 'yyyy.MM.dd', { locale: ko })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  아직 휴가 신청 내역이 없습니다.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 빠른 액션 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 빠른 액션
              </Typography>
              <Box display="flex" gap={2}>
                <Button 
                  variant="contained" 
                  startIcon={<BeachAccess />}
                  onClick={() => window.location.href = '/leave'}
                >
                  휴가 신청하기
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<CalendarToday />}
                  onClick={() => window.location.href = '/leave'}
                >
                  휴가 내역 보기
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserDashboard;