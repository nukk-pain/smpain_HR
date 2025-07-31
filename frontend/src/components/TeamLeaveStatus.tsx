import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Person,
  BeachAccess,
  TrendingUp,
  Group,
  CalendarToday,
  Warning,
  CheckCircle,
  Schedule,
  Info,
  Assessment,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from './AuthProvider';
import { useNotification } from './NotificationProvider';
import { apiService } from '../services/api';

interface TeamMember {
  _id: string;
  name: string;
  employeeId: string;
  position: string;
  department: string;
  leaveBalance: {
    totalAnnualLeave: number;
    usedAnnualLeave: number;
    remainingAnnualLeave: number;
    pendingAnnualLeave: number;
  };
  recentLeaves: {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    status: string;
    reason: string;
  }[];
  upcomingLeaves: {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    status: string;
    reason: string;
  }[];
}

interface DepartmentStats {
  department: string;
  totalMembers: number;
  activeMembers: number;
  avgLeaveUsage: number;
  totalLeaveUsed: number;
  totalLeaveRemaining: number;
  pendingRequests: number;
  approvalRate: number;
}

interface TeamLeaveStatusProps {
  viewMode?: 'team' | 'department';
}

const TeamLeaveStatus: React.FC<TeamLeaveStatusProps> = ({ viewMode = 'team' }) => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);
  const [employeeLeaveLog, setEmployeeLeaveLog] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [selectedDepartment, selectedYear]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      if (viewMode === 'team') {
        // Load team members data
        const response = await apiService.get('/leave/team-status', {
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
          year: selectedYear
        });
        
        setTeamMembers(response.data?.members || []);
        setDepartments(response.data?.departments || []);
      } else {
        // Load department statistics
        const response = await apiService.get('/leave/department-stats', {
          year: selectedYear
        });
        
        setDepartmentStats(response.data || []);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      showError('팀 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setDetailDialogOpen(true);
  };

  const handleViewDetail = async (member: TeamMember) => {
    try {
      setLoadingDetail(true);
      setSelectedMember(member);
      
      const response = await apiService.getEmployeeLeaveLog(member._id, selectedYear);
      setEmployeeLeaveLog(response.data);
      setEmployeeDetailOpen(true);
    } catch (error) {
      console.error('Error loading employee leave log:', error);
      showError('직원 휴가 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedMember(null);
  };

  const getLeaveUsageColor = (usagePercentage: number) => {
    if (usagePercentage < 30) return 'success';
    if (usagePercentage < 70) return 'warning';
    return 'error';
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual':
        return '연차';
      case 'sick':
        return '병가';
      case 'personal':
        return '개인휴가';
      case 'family':
        return '경조사';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거부됨';
      default:
        return status;
    }
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          {viewMode === 'team' ? '팀 휴가 현황' : '부서별 휴가 통계'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>연도</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              label="연도"
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>{year}년</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {viewMode === 'team' && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>부서</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="부서"
              >
                <MenuItem value="all">전체</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>
      {viewMode === 'team' ? (
        <>
          {/* Team Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Group />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">
                        {teamMembers.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        팀원 수
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <BeachAccess />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">
                        {teamMembers.reduce((sum, member) => sum + member.leaveBalance.usedAnnualLeave, 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        총 사용 연차
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <Schedule />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">
                        {teamMembers.reduce((sum, member) => sum + member.leaveBalance.pendingAnnualLeave, 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        대기중인 신청
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <TrendingUp />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">
                        {teamMembers.length > 0 
                          ? Math.round(teamMembers.reduce((sum, member) => 
                              sum + (member.leaveBalance.usedAnnualLeave / member.leaveBalance.totalAnnualLeave * 100), 0) / teamMembers.length)
                          : 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        평균 사용률
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Team Members Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                팀원 휴가 현황
              </Typography>
              
              {teamMembers.length === 0 ? (
                <Alert severity="info">
                  {user?.role === 'manager' ? 
                    '팀 연차 현황을 보려면 관리자에게 권한을 요청하세요.' : 
                    '선택한 조건에 해당하는 팀원이 없습니다.'
                  }
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>팀원</TableCell>
                        <TableCell>직급</TableCell>
                        <TableCell>총 연차</TableCell>
                        <TableCell>사용 연차</TableCell>
                        <TableCell>잔여 연차</TableCell>
                        <TableCell>대기중</TableCell>
                        <TableCell>상세/로그</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teamMembers.map((member) => {
                        return (
                          <TableRow key={member._id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                  {member.name?.[0] || '?'}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2">
                                    {member.name}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{member.position}</TableCell>
                            <TableCell>{member.leaveBalance.totalAnnualLeave}일</TableCell>
                            <TableCell>{member.leaveBalance.usedAnnualLeave}일</TableCell>
                            <TableCell>{member.leaveBalance.remainingAnnualLeave}일</TableCell>
                            <TableCell>
                              {member.leaveBalance.pendingAnnualLeave > 0 ? (
                                <Chip
                                  label={`${member.leaveBalance.pendingAnnualLeave}일`}
                                  size="small"
                                  color="warning"
                                />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="상세 보기">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleMemberClick(member)}
                                  >
                                    <Info />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="휴가 로그 보기">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewDetail(member)}
                                    disabled={loadingDetail}
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Department Statistics */}
          <Grid container spacing={3}>
            {departmentStats.map((dept) => (
              <Grid
                key={dept.department}
                size={{
                  xs: 12,
                  md: 6,
                  lg: 4
                }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {dept.department}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        총 인원: {dept.totalMembers}명 (활성: {dept.activeMembers}명)
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">평균 휴가 사용률</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {dept.avgLeaveUsage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={dept.avgLeaveUsage}
                        color={getLeaveUsageColor(dept.avgLeaveUsage)}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Typography variant="body2">
                        사용: {dept.totalLeaveUsed}일
                      </Typography>
                      <Typography variant="body2">
                        잔여: {dept.totalLeaveRemaining}일
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2">
                        대기: {dept.pendingRequests}건
                      </Typography>
                      <Typography variant="body2">
                        승인률: {dept.approvalRate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
      {/* Member Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedMember?.name} 휴가 상세 현황
        </DialogTitle>
        <DialogContent>
          {selectedMember && (
            <Box>
              <Grid container spacing={3}>
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Typography variant="h6" gutterBottom>
                    기본 정보
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>부서:</strong> {selectedMember.department}
                    </Typography>
                    <Typography variant="body2">
                      <strong>직급:</strong> {selectedMember.position}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>
                    휴가 잔여 현황
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>총 연차:</strong> {selectedMember.leaveBalance.totalAnnualLeave}일
                    </Typography>
                    <Typography variant="body2">
                      <strong>사용 연차:</strong> {selectedMember.leaveBalance.usedAnnualLeave}일
                    </Typography>
                    <Typography variant="body2">
                      <strong>잔여 연차:</strong> {selectedMember.leaveBalance.remainingAnnualLeave}일
                    </Typography>
                    <Typography variant="body2">
                      <strong>대기중인 신청:</strong> {selectedMember.leaveBalance.pendingAnnualLeave}일
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Typography variant="h6" gutterBottom>
                    최근 휴가 내역
                  </Typography>
                  <List dense>
                    {selectedMember.recentLeaves.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        최근 휴가 내역이 없습니다.
                      </Typography>
                    ) : (
                      selectedMember.recentLeaves.slice(0, 5).map((leave, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {getLeaveTypeLabel(leave.leaveType)} ({leave.daysCount}일)
                                </Typography>
                                <Chip
                                  label={getStatusLabel(leave.status)}
                                  size="small"
                                  color={getStatusColor(leave.status) as any}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption">
                                {format(new Date(leave.startDate), 'yyyy.MM.dd')} - {format(new Date(leave.endDate), 'yyyy.MM.dd')}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))
                    )}
                  </List>
                  
                  {selectedMember.upcomingLeaves.length > 0 && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        예정된 휴가
                      </Typography>
                      <List dense>
                        {selectedMember.upcomingLeaves.map((leave, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    {getLeaveTypeLabel(leave.leaveType)} ({leave.daysCount}일)
                                  </Typography>
                                  <Chip
                                    label={getStatusLabel(leave.status)}
                                    size="small"
                                    color={getStatusColor(leave.status) as any}
                                  />
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption">
                                  {format(new Date(leave.startDate), 'yyyy.MM.dd')} - {format(new Date(leave.endDate), 'yyyy.MM.dd')}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>닫기</Button>
        </DialogActions>
      </Dialog>
      {/* Employee Leave Log Dialog */}
      <Dialog
        open={employeeDetailOpen}
        onClose={() => setEmployeeDetailOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedMember?.name} 휴가 로그 ({selectedYear}년)
        </DialogTitle>
        <DialogContent>
          {loadingDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : employeeLeaveLog ? (
            <Box>
              {/* Leave Balance Summary */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    휴가 잔여 현황
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">총 연차</Typography>
                      <Typography variant="h6">{employeeLeaveLog.balance?.totalAnnualLeave || 0}일</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">사용 연차</Typography>
                      <Typography variant="h6">{employeeLeaveLog.balance?.usedAnnualLeave || 0}일</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">잔여 연차</Typography>
                      <Typography variant="h6">{employeeLeaveLog.balance?.remainingAnnualLeave || 0}일</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">대기중</Typography>
                      <Typography variant="h6">{employeeLeaveLog.balance?.pendingAnnualLeave || 0}일</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Leave History Table */}
              <Typography variant="h6" gutterBottom>
                휴가 내역
              </Typography>
              {employeeLeaveLog.leaveHistory && employeeLeaveLog.leaveHistory.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>휴가 유형</TableCell>
                        <TableCell>시작일</TableCell>
                        <TableCell>종료일</TableCell>
                        <TableCell>일수</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>취소 상태</TableCell>
                        <TableCell>사유</TableCell>
                        <TableCell>신청일</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employeeLeaveLog.leaveHistory.map((leave: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{getLeaveTypeLabel(leave.leaveType)}</TableCell>
                          <TableCell>{format(new Date(leave.startDate), 'yyyy.MM.dd')}</TableCell>
                          <TableCell>{format(new Date(leave.endDate), 'yyyy.MM.dd')}</TableCell>
                          <TableCell>{leave.daysCount}일</TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(leave.status)}
                              size="small"
                              color={getStatusColor(leave.status) as any}
                            />
                          </TableCell>
                          <TableCell>
                            {leave.cancellationRequested ? (
                              <Chip
                                label={
                                  leave.cancellationStatus === 'pending' ? '취소 대기중' :
                                  leave.cancellationStatus === 'approved' ? '취소 승인' :
                                  leave.cancellationStatus === 'rejected' ? '취소 거부' : '취소 신청'
                                }
                                size="small"
                                color={
                                  leave.cancellationStatus === 'pending' ? 'warning' :
                                  leave.cancellationStatus === 'approved' ? 'success' :
                                  leave.cancellationStatus === 'rejected' ? 'error' : 'info'
                                }
                              />
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={leave.reason || ''}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {leave.reason || '-'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{format(new Date(leave.createdAt || leave.requestedAt), 'yyyy.MM.dd')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  해당 연도에 휴가 내역이 없습니다.
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="error">
              휴가 로그를 불러올 수 없습니다.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDetailOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamLeaveStatus;