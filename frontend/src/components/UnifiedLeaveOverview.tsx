import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Button,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tooltip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
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
import LeaveAdjustmentDialog from './LeaveAdjustmentDialog';

// Interfaces from AdminLeaveOverview
interface EmployeeLeaveOverview {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  pendingAnnualLeave: number;
  remainingAnnualLeave: number;
  usageRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  yearsOfService: number;
}

interface LeaveOverviewData {
  statistics: {
    totalEmployees: number;
    averageUsageRate: number;
    highRiskCount: number;
  };
  employees: EmployeeLeaveOverview[];
}

// Interfaces from TeamLeaveStatus
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

// Props for unified component
interface UnifiedLeaveOverviewProps {
  userRole: 'admin' | 'supervisor';
  initialViewMode?: 'overview' | 'team' | 'department';
}

const UnifiedLeaveOverview: React.FC<UnifiedLeaveOverviewProps> = ({
  userRole,
  initialViewMode = userRole === 'admin' ? 'overview' : 'team'
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Unified state variables
  const [loading, setLoading] = useState(false); // Start with false (from TeamLeaveStatus pattern)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all'); // Using TeamLeaveStatus naming
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null); // Unified naming
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'overview' | 'team' | 'department'>(initialViewMode);

  // Admin-specific state (conditionally used)
  const [overviewData, setOverviewData] = useState<LeaveOverviewData | null>(null);
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedEmployeeForAdjustment, setSelectedEmployeeForAdjustment] = useState<{id: string, name: string} | null>(null);

  // Team-specific state (conditionally used)
  const [departments, setDepartments] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);
  const [employeeLeaveLog, setEmployeeLeaveLog] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Unified data loading function
  const loadLeaveData = async () => {
    setLoading(true);
    try {
      if (userRole === 'admin' && viewMode === 'overview') {
        // Load admin overview data
        const response = await apiService.get('/admin/leave/overview');
        setOverviewData(response.data);
      } else if (viewMode === 'team') {
        // Load team members data
        const response = await apiService.get('/leave/team-status', {
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
          year: selectedYear
        });
        setTeamMembers(response.data?.members || []);
        setDepartments(response.data?.departments || []);
      } else if (viewMode === 'department') {
        // Load department statistics
        const response = await apiService.get('/leave/department-stats', {
          year: selectedYear
        });
        setDepartmentStats(response.data || []);
      }
    } catch (error) {
      console.error('Error loading leave data:', error);
      showError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadLeaveData();
  }, [viewMode, selectedDepartment, selectedYear, userRole]);

  // Unified utility functions
  const getStatusColor = (status: string, type: 'risk' | 'leave' = 'leave') => {
    if (type === 'risk') {
      // Original getRiskColor logic
      switch (status) {
        case 'high': return 'error';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'default';
      }
    } else {
      // Original getStatusColor logic
      switch (status) {
        case 'pending': return 'warning';
        case 'approved': return 'success';
        case 'rejected': return 'error';
        default: return 'default';
      }
    }
  };

  const getStatusLabel = (status: string, type: 'risk' | 'leave' = 'leave') => {
    if (type === 'risk') {
      // Original getRiskLabel logic
      switch (status) {
        case 'high': return '위험';
        case 'medium': return '주의';
        case 'low': return '정상';
        default: return '알 수 없음';
      }
    } else {
      // Original getStatusLabel logic
      switch (status) {
        case 'pending': return '대기중';
        case 'approved': return '승인됨';
        case 'rejected': return '거부됨';
        default: return status;
      }
    }
  };

  // Keep unique functions from AdminLeaveOverview
  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getFilteredEmployees = () => {
    if (!overviewData) return [];
    
    return overviewData.employees.filter((employee) => {
      const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
      const matchesRisk = riskFilter === 'all' || employee.riskLevel === riskFilter;
      
      return matchesSearch && matchesDepartment && matchesRisk;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'department':
          return a.department.localeCompare(b.department);
        case 'usageRate':
          return b.usageRate - a.usageRate;
        case 'remainingDays':
          return b.remainingAnnualLeave - a.remainingAnnualLeave;
        default:
          return 0;
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      showSuccess('엑셀 다운로드 기능은 준비 중입니다.');
    } catch (error) {
      showError('엑셀 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleAdjustLeave = (employeeId: string, employeeName: string) => {
    setSelectedEmployeeForAdjustment({ id: employeeId, name: employeeName });
    setAdjustmentDialogOpen(true);
  };

  const handleAdjustmentComplete = async () => {
    await loadLeaveData();
    setAdjustmentDialogOpen(false);
    setSelectedEmployeeForAdjustment(null);
  };

  // Keep unique functions from TeamLeaveStatus
  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return '연차';
      case 'sick': return '병가';
      case 'personal': return '개인휴가';
      case 'family': return '경조사';
      default: return type;
    }
  };

  const getLeaveUsageColor = (usagePercentage: number) => {
    if (usagePercentage < 30) return 'success';
    if (usagePercentage < 70) return 'warning';
    return 'error';
  };

  const handleMemberClick = (member: TeamMember) => {
    setSelectedEmployee(member);
    setDetailDialogOpen(true);
  };

  const handleViewDetail = async (member: TeamMember) => {
    try {
      setLoadingDetail(true);
      setSelectedEmployee(member);
      
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
    setSelectedEmployee(null);
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'overview' | 'team' | 'department'
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Role-based view mode selector
  const renderViewModeSelector = () => {
    if (userRole === 'admin') {
      return (
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
        >
          <ToggleButton value="overview" aria-label="overview view">
            <Assessment sx={{ mr: 1 }} />
            전체 현황
          </ToggleButton>
          <ToggleButton value="team" aria-label="team view">
            <Group sx={{ mr: 1 }} />
            팀 현황
          </ToggleButton>
          <ToggleButton value="department" aria-label="department view">
            <Assessment sx={{ mr: 1 }} />
            부서 통계
          </ToggleButton>
        </ToggleButtonGroup>
      );
    } else {
      // Supervisor only sees team/department
      return (
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
        >
          <ToggleButton value="team" aria-label="team view">
            <Group sx={{ mr: 1 }} />
            팀 현황
          </ToggleButton>
          <ToggleButton value="department" aria-label="department view">
            <Assessment sx={{ mr: 1 }} />
            부서 통계
          </ToggleButton>
        </ToggleButtonGroup>
      );
    }
  };

  // Get available years for selection
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Render content based on view mode
  const renderContent = () => {
    if (userRole === 'admin' && viewMode === 'overview') {
      // Render admin overview content
      return renderAdminOverview();
    } else if (viewMode === 'team') {
      // Render team view content
      return renderTeamView();
    } else if (viewMode === 'department') {
      // Render department statistics
      return renderDepartmentView();
    }
    return null;
  };

  // Admin overview rendering
  const renderAdminOverview = () => {
    if (!overviewData) {
      return (
        <Alert severity="error">
          데이터를 불러올 수 없습니다.
        </Alert>
      );
    }

    const departmentsList = overviewData ? [...new Set(overviewData.employees.map(emp => emp.department))] : [];

    return (
      <>
        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PeopleIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {overviewData.statistics.totalEmployees}명
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      총 직원 수
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingUpIcon color="success" fontSize="large" />
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {overviewData.statistics.averageUsageRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      평균 사용률
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <WarningIcon color="error" fontSize="large" />
                  <Box>
                    <Typography variant="h4" fontWeight={600}>
                      {overviewData.statistics.highRiskCount}명
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      미사용 위험
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  placeholder="이름 또는 부서 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="부서"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <MenuItem value="all">전체 부서</MenuItem>
                  {departmentsList.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="위험도"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="high">위험</MenuItem>
                  <MenuItem value="medium">주의</MenuItem>
                  <MenuItem value="low">정상</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="정렬"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="name">이름순</MenuItem>
                  <MenuItem value="department">부서순</MenuItem>
                  <MenuItem value="usageRate">사용률순</MenuItem>
                  <MenuItem value="remainingDays">잔여일순</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell>부서</TableCell>
                    <TableCell>직급</TableCell>
                    <TableCell align="center">총연차</TableCell>
                    <TableCell align="center">사용</TableCell>
                    <TableCell align="center">잔여</TableCell>
                    <TableCell align="center">사용률</TableCell>
                    <TableCell align="center">위험도</TableCell>
                    <TableCell align="center">액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredEmployees().map((employee) => (
                    <TableRow key={employee.employeeId}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {employee.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {employee.yearsOfService}년차
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" fontWeight={500}>
                          {employee.totalAnnualLeave}일
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1">
                          {employee.usedAnnualLeave}일
                        </Typography>
                        {employee.pendingAnnualLeave > 0 && (
                          <Typography variant="caption" color="warning.main">
                            (대기: {employee.pendingAnnualLeave}일)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" fontWeight={500}>
                          {employee.remainingAnnualLeave}일
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {employee.usageRate}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={employee.usageRate}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                            color={employee.usageRate < 30 ? 'error' : employee.usageRate < 60 ? 'warning' : 'success'}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${getRiskIcon(employee.riskLevel)} ${getStatusLabel(employee.riskLevel, 'risk')}`}
                          color={getStatusColor(employee.riskLevel, 'risk') as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="연차 조정">
                          <IconButton
                            size="small"
                            onClick={() => handleAdjustLeave(employee.employeeId, employee.name)}
                          >
                            <SettingsIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {getFilteredEmployees().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography color="text.secondary">
                          조건에 맞는 직원이 없습니다.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </>
    );
  };

  // Team view rendering
  const renderTeamView = () => {
    return (
      <>
        {/* Team Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 3 }}>
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
          
          <Grid size={{ xs: 12, md: 3 }}>
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
          
          <Grid size={{ xs: 12, md: 3 }}>
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
          
          <Grid size={{ xs: 12, md: 3 }}>
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
                {user?.role === 'supervisor' ? 
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
                    {teamMembers.map((member) => (
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
                            {/* Admin-only action */}
                            {userRole === 'admin' && (
                              <Tooltip title="연차 조정">
                                <IconButton
                                  size="small"
                                  onClick={() => handleAdjustLeave(member._id, member.name)}
                                >
                                  <SettingsIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  // Department view rendering
  const renderDepartmentView = () => {
    return (
      <Grid container spacing={3}>
        {departmentStats.map((dept) => (
          <Grid key={dept.department} size={{ xs: 12, md: 6, lg: 4 }}>
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
    );
  };

  return (
    <Box>
      {/* Header with view mode selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          {viewMode === 'overview' && '👥 전체 직원 휴가 현황'}
          {viewMode === 'team' && '팀 휴가 현황'}
          {viewMode === 'department' && '부서별 휴가 통계'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* View mode selector */}
          {renderViewModeSelector()}
          
          {/* Year selector for team/department views */}
          {viewMode !== 'overview' && (
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
          )}
          
          {/* Department filter for team view */}
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
          
          {/* Excel export for admin */}
          {userRole === 'admin' && viewMode === 'overview' && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
            >
              엑셀 다운로드
            </Button>
          )}
        </Box>
      </Box>

      {/* Main content */}
      {renderContent()}

      {/* Member Detail Dialog (from TeamLeaveStatus) */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedEmployee?.name} 휴가 상세 현황
        </DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Box>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    기본 정보
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>부서:</strong> {selectedEmployee.department}
                    </Typography>
                    <Typography variant="body2">
                      <strong>직급:</strong> {selectedEmployee.position}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>
                    휴가 잔여 현황
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>총 연차:</strong> {selectedEmployee.leaveBalance.totalAnnualLeave}일
                    </Typography>
                    <Typography variant="body2">
                      <strong>사용 연차:</strong> {selectedEmployee.leaveBalance.usedAnnualLeave}일
                    </Typography>
                    <Typography variant="body2">
                      <strong>잔여 연차:</strong> {selectedEmployee.leaveBalance.remainingAnnualLeave}일
                    </Typography>
                    <Typography variant="body2">
                      <strong>대기중인 신청:</strong> {selectedEmployee.leaveBalance.pendingAnnualLeave}일
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    최근 휴가 내역
                  </Typography>
                  <List dense>
                    {selectedEmployee.recentLeaves?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        최근 휴가 내역이 없습니다.
                      </Typography>
                    ) : (
                      selectedEmployee.recentLeaves?.slice(0, 5).map((leave, index) => (
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
                  
                  {selectedEmployee.upcomingLeaves?.length > 0 && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        예정된 휴가
                      </Typography>
                      <List dense>
                        {selectedEmployee.upcomingLeaves.map((leave, index) => (
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

      {/* Employee Leave Log Dialog (from TeamLeaveStatus) */}
      <Dialog
        open={employeeDetailOpen}
        onClose={() => setEmployeeDetailOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedEmployee?.name} 휴가 로그 ({selectedYear}년)
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

      {/* Leave Adjustment Dialog (Admin only) */}
      {selectedEmployeeForAdjustment && (
        <LeaveAdjustmentDialog
          open={adjustmentDialogOpen}
          onClose={() => setAdjustmentDialogOpen(false)}
          employeeId={selectedEmployeeForAdjustment.id}
          employeeName={selectedEmployeeForAdjustment.name}
          onAdjustmentComplete={handleAdjustmentComplete}
        />
      )}
    </Box>
  );
};

export default UnifiedLeaveOverview;