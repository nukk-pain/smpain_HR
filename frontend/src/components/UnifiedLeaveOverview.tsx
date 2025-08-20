import React, { useState, useEffect, useMemo } from 'react';
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
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Skeleton
} from '@mui/material';
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
  Group,
  CheckCircle,
  Schedule,
  Info,
  Assessment,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from './AuthProvider';
import { useNotification } from './NotificationProvider';
import { apiService } from '../services/api';
import LeaveAdjustmentDialog from './LeaveAdjustmentDialog';
import VirtualEmployeeList from './VirtualEmployeeList';
import { 
  useLeaveOverview, 
  useTeamStatus, 
  useDepartmentStats, 
  useDepartments,
  useEmployeeLeaveLog,
  useLeaveAdjustment,
  usePrefetchLeaveData
} from '../hooks/useLeaveData';

interface UnifiedLeaveOverviewProps {
  userRole: 'admin' | 'supervisor';
  initialViewMode?: 'overview' | 'team' | 'department';
}

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
}

interface LeaveOverviewData {
  summary: {
    totalEmployees: number;
    averageUsageRate: number;
    highRiskCount: number;
    pendingRequests: number;
  };
  employees: EmployeeLeaveOverview[];
  departments: string[];
  lastUpdated: string;
}

interface TeamMember {
  _id: string;
  name: string;
  position: string;
  department: string;
  leaveBalance: {
    annual: number;
    used: number;
    remaining: number;
    pending: number;
  };
  currentStatus: string;
  recentLeaves: Array<{
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

interface DepartmentStats {
  department: string;
  totalMembers: number;
  onLeave: number;
  avgLeaveUsage: number;
  pendingRequests: number;
}

const UnifiedLeaveOverview: React.FC<UnifiedLeaveOverviewProps> = ({
  userRole,
  initialViewMode = 'overview'
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Unified state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'overview' | 'team' | 'department'>(
    userRole === 'supervisor' && initialViewMode === 'overview' ? 'team' : initialViewMode
  );

  // Admin-specific state (conditionally initialized)
  const [sortBy, setSortBy] = useState('name');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);

  // React Query hooks for data fetching
  const { data: overviewResponse, isLoading: overviewLoading, refetch: refetchOverview } = useLeaveOverview(
    selectedYear,
    userRole === 'admin' && viewMode === 'overview'
  );

  const { data: teamResponse, isLoading: teamLoading, refetch: refetchTeam } = useTeamStatus(
    user?.department || '',
    selectedYear,
    viewMode === 'team'
  );

  const { data: departmentStatsResponse, isLoading: departmentStatsLoading, refetch: refetchDepartmentStats } = useDepartmentStats(
    selectedYear,
    viewMode === 'department'
  );

  const { data: departmentsData } = useDepartments();

  // Leave adjustment mutation
  const adjustmentMutation = useLeaveAdjustment();

  // Prefetch hooks for performance
  const { prefetchOverview, prefetchTeamStatus } = usePrefetchLeaveData();

  // Employee leave log query (only when needed)
  const { data: employeeLeaveLog, isLoading: loadingDetail } = useEmployeeLeaveLog(
    selectedEmployee?._id || selectedEmployee?.employeeId || '',
    selectedYear,
    !!selectedEmployee && employeeDetailOpen
  );

  // Transform data for backward compatibility
  const overviewData = useMemo(() => {
    if (!overviewResponse) return null;
    const apiData = (overviewResponse as any)?.data;
    if (!apiData) return null;
    
    return {
      summary: {
        totalEmployees: apiData.statistics?.totalEmployees || 0,
        averageUsageRate: apiData.statistics?.averageUsageRate || 0,
        highRiskCount: apiData.statistics?.highRiskCount || 0,
        pendingRequests: apiData.statistics?.pendingRequests || 0,
      },
      employees: apiData.employees || [],
      departments: apiData.departments || [],
      lastUpdated: new Date().toISOString(),
    } as LeaveOverviewData;
  }, [overviewResponse]);

  const teamMembers = useMemo(() => {
    return (teamResponse as any)?.data?.members || [];
  }, [teamResponse]);

  const departmentStats = useMemo(() => {
    return (departmentStatsResponse as any)?.data || [];
  }, [departmentStatsResponse]);

  const departments = useMemo(() => {
    return departmentsData?.map((dept: any) => dept.name) || [];
  }, [departmentsData]);

  // Determine loading state based on current view
  const loading = viewMode === 'overview' ? overviewLoading :
                  viewMode === 'team' ? teamLoading :
                  viewMode === 'department' ? departmentStatsLoading : false;

  // Unified data refresh function using React Query
  const refreshData = () => {
    if (viewMode === 'overview') {
      refetchOverview();
    } else if (viewMode === 'team') {
      refetchTeam();
    } else if (viewMode === 'department') {
      refetchDepartmentStats();
    }
  };

  // Unified color function
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  // Unified label function
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      default: return status;
    }
  };


  const getFilteredEmployees = () => {
    if (!overviewData || !overviewData.employees) return [];
    
    let filtered = overviewData.employees;
    
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'usage': return b.usageRate - a.usageRate;
        case 'remaining': return a.remainingAnnualLeave - b.remainingAnnualLeave;
        default: return 0;
      }
    });
  };

  // Keep unique functions from TeamLeaveStatus
  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return '연차';
      case 'half': return '반차';
      case 'sick': return '병가';
      case 'special': return '특별휴가';
      case 'unpaid': return '무급휴가';
      default: return type;
    }
  };

  const getLeaveUsageColor = (percentage: number) => {
    if (percentage >= 80) return 'error';
    if (percentage >= 50) return 'warning';
    return 'success';
  };

  // Handler functions
  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (newMode !== null) {
      setViewMode(newMode as 'overview' | 'team' | 'department');
    }
  };

  const handleExportExcel = async () => {
    try {
      // Show loading state (could add a loading spinner in the button)
      showSuccess('Excel 파일을 생성중입니다...');
      
      await apiService.exportLeaveToExcel({
        view: viewMode,
        year: selectedYear,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        riskLevel: undefined // Can add risk level filter if needed
      });
      
      showSuccess('Excel 파일이 다운로드되었습니다.');
    } catch (error) {
      console.error('Excel export failed:', error);
      showError('Excel 내보내기에 실패했습니다.');
    }
  };

  const handleAdjustLeave = (employeeId: string, employeeName: string) => {
    setSelectedEmployee({ id: employeeId, name: employeeName });
    setAdjustmentDialogOpen(true);
  };

  const handleAdjustmentComplete = () => {
    setAdjustmentDialogOpen(false);
    refreshData();
  };

  const handleViewDetail = (member: any) => {
    setSelectedEmployee(member);
    setEmployeeDetailOpen(true);
    // Data will be fetched automatically by useEmployeeLeaveLog hook
  };

  const handleCloseDetail = () => {
    setEmployeeDetailOpen(false);
    setSelectedEmployee(null);
  };

  const handleMemberClick = (member: TeamMember) => {
    setSelectedEmployee(member);
    setDetailDialogOpen(true);
  };

  // Prefetch data when hovering over tabs for better UX
  useEffect(() => {
    if (userRole === 'admin') {
      // Prefetch next likely views
      if (viewMode === 'overview') {
        prefetchTeamStatus(user?.department || '', selectedYear);
      }
    }
  }, [viewMode, selectedYear, userRole, user?.department, prefetchTeamStatus]);

  // Auto-refetch when year changes
  useEffect(() => {
    refreshData();
  }, [selectedYear]);

  // Render view mode selector
  const renderViewModeSelector = () => {
    const availableModes = userRole === 'admin' 
      ? ['overview', 'team', 'department']
      : ['team', 'department'];

    return (
      <ToggleButtonGroup 
        value={viewMode} 
        exclusive 
        onChange={handleViewModeChange}
        size="small"
      >
        {availableModes.includes('overview') && (
          <ToggleButton value="overview">전체 현황</ToggleButton>
        )}
        <ToggleButton value="team">팀 현황</ToggleButton>
        <ToggleButton value="department">부서 통계</ToggleButton>
      </ToggleButtonGroup>
    );
  };

  // Render overview view (Admin only)
  const renderOverviewView = () => {
    if (!overviewData || !overviewData.summary) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    return (
      <>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    전체 직원
                  </Typography>
                </Box>
                <Typography variant="h4">{overviewData.summary.totalEmployees}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    평균 사용률
                  </Typography>
                </Box>
                <Typography variant="h4">{overviewData.summary.averageUsageRate.toFixed(1)}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarIcon color="warning" sx={{ mr: 1 }} />
                  <Typography color="textSecondary" variant="subtitle2">
                    대기 중인 요청
                  </Typography>
                </Box>
                <Typography variant="h4">{overviewData.summary.pendingRequests}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="직원 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            label="부서"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">전체</MenuItem>
            {overviewData.departments.map(dept => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="정렬"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="name">이름순</MenuItem>
            <MenuItem value="usage">사용률순</MenuItem>
            <MenuItem value="remaining">잔여일순</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
          >
            Excel 내보내기
          </Button>
        </Box>

        {/* Use virtual scrolling for large datasets (>100 employees) */}
        {getFilteredEmployees().length > 100 ? (
          <VirtualEmployeeList
            employees={getFilteredEmployees()}
            onAdjustClick={(employee) => handleAdjustLeave(employee.employeeId, employee.name)}
            onViewDetail={handleViewDetail}
            height={600}
          />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>직원명</TableCell>
                  <TableCell>부서</TableCell>
                  <TableCell>직급</TableCell>
                  <TableCell align="center">총 연차</TableCell>
                  <TableCell align="center">사용</TableCell>
                  <TableCell align="center">대기</TableCell>
                  <TableCell align="center">잔여</TableCell>
                  <TableCell align="center">사용률</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredEmployees().map((employee, index) => (
                  <TableRow key={employee.employeeId} data-testid={`employee-row-${index}`}>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell align="center">{employee.totalAnnualLeave}</TableCell>
                    <TableCell align="center">{employee.usedAnnualLeave}</TableCell>
                    <TableCell align="center">{employee.pendingAnnualLeave}</TableCell>
                    <TableCell align="center">{employee.remainingAnnualLeave}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={employee.usageRate}
                          sx={{ flexGrow: 1 }}
                          color={employee.usageRate > 80 ? 'error' : employee.usageRate > 50 ? 'warning' : 'success'}
                        />
                        <Typography variant="body2">{employee.usageRate.toFixed(1)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="상세보기">
                          <IconButton size="small" onClick={() => handleViewDetail(employee)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="휴가 조정">
                          <IconButton size="small" onClick={() => handleAdjustLeave(employee.employeeId, employee.name)}>
                            <SettingsIcon fontSize="small" />
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
      </>
    );
  };

  // Render team view
  const renderTeamView = () => {
    return (
      <>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>부서 선택</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="부서 선택"
            >
              <MenuItem value="all">전체</MenuItem>
              {departments.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            select
            label="연도"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {[2023, 2024, 2025].map(year => (
              <MenuItem key={year} value={year}>{year}년</MenuItem>
            ))}
          </TextField>
        </Box>

        {teamMembers.length === 0 ? (
          <Alert severity="info">선택한 조건에 해당하는 팀원이 없습니다.</Alert>
        ) : (
          <Grid container spacing={3}>
            {teamMembers.map((member) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={member._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ mr: 2 }}>
                        <Person />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{member.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {member.position} · {member.department}
                        </Typography>
                      </Box>
                      <Chip
                        label={member.currentStatus === 'on_leave' ? '휴가중' : '근무중'}
                        color={member.currentStatus === 'on_leave' ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        연차 사용 현황
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(member.leaveBalance.used / member.leaveBalance.annual) * 100}
                        color={getLeaveUsageColor((member.leaveBalance.used / member.leaveBalance.annual) * 100) as any}
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          사용: {member.leaveBalance.used}일
                        </Typography>
                        <Typography variant="body2">
                          잔여: {member.leaveBalance.remaining}일
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Button
                        size="small"
                        onClick={() => handleMemberClick(member)}
                      >
                        상세보기
                      </Button>
                      {userRole === 'admin' && (
                        <Button
                          size="small"
                          onClick={() => handleViewDetail(member)}
                        >
                          휴가 내역
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </>
    );
  };

  // Render department view
  const renderDepartmentView = () => {
    return (
      <>
        <Box sx={{ mb: 3 }}>
          <TextField
            select
            label="연도"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {[2023, 2024, 2025].map(year => (
              <MenuItem key={year} value={year}>{year}년</MenuItem>
            ))}
          </TextField>
        </Box>

        <Grid container spacing={3}>
          {departmentStats.map((dept) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={dept.department}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Group color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">{dept.department}</Typography>
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="전체 인원"
                        secondary={`${dept.totalMembers}명`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="현재 휴가중"
                        secondary={`${dept.onLeave}명`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="평균 사용률"
                        secondary={
                          <LinearProgress
                            variant="determinate"
                            value={dept.avgLeaveUsage}
                            color={getLeaveUsageColor(dept.avgLeaveUsage) as any}
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="대기중 요청"
                        secondary={`${dept.pendingRequests}건`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          휴가 현황 관리
        </Typography>
        {renderViewModeSelector()}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {viewMode === 'overview' && userRole === 'admin' && renderOverviewView()}
          {viewMode === 'team' && renderTeamView()}
          {viewMode === 'department' && renderDepartmentView()}
        </>
      )}

      {/* Leave Adjustment Dialog (Admin only) */}
      {userRole === 'admin' && selectedEmployee && (
        <LeaveAdjustmentDialog
          open={adjustmentDialogOpen}
          onClose={() => setAdjustmentDialogOpen(false)}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          onAdjustmentComplete={handleAdjustmentComplete}
        />
      )}

      {/* Employee Detail Dialog */}
      <Dialog
        open={employeeDetailOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        {loadingDetail ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : employeeLeaveLog ? (
          <>
            <DialogTitle>
              {selectedEmployee?.name} - {selectedYear}년 휴가 내역
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  총 연차: {(employeeLeaveLog as any)?.totalAnnualLeave}일
                </Typography>
                <Typography variant="subtitle1">
                  사용: {(employeeLeaveLog as any)?.usedLeave}일
                </Typography>
                <Typography variant="subtitle1">
                  잔여: {(employeeLeaveLog as any)?.remainingLeave}일
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>휴가 유형</TableCell>
                      <TableCell>시작일</TableCell>
                      <TableCell>종료일</TableCell>
                      <TableCell>일수</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(employeeLeaveLog as any)?.leaves?.map((leave: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{getLeaveTypeLabel(leave.type)}</TableCell>
                        <TableCell>{format(new Date(leave.startDate), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{format(new Date(leave.endDate), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(leave.status)}
                            color={getStatusColor(leave.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>닫기</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      {/* Team Member Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedEmployee && (
          <>
            <DialogTitle>{selectedEmployee.name} 상세 정보</DialogTitle>
            <DialogContent>
              <List>
                <ListItem>
                  <ListItemText primary="부서" secondary={selectedEmployee.department} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="직급" secondary={selectedEmployee.position} />
                </ListItem>
                {selectedEmployee.leaveBalance && (
                  <>
                    <ListItem>
                      <ListItemText
                        primary="연차 현황"
                        secondary={`${selectedEmployee.leaveBalance.used} / ${selectedEmployee.leaveBalance.annual}일 사용`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="잔여 연차"
                        secondary={`${selectedEmployee.leaveBalance.remaining}일`}
                      />
                    </ListItem>
                    {selectedEmployee.leaveBalance.pending > 0 && (
                      <ListItem>
                        <ListItemText
                          primary="대기중"
                          secondary={`${selectedEmployee.leaveBalance.pending}일`}
                        />
                      </ListItem>
                    )}
                  </>
                )}
              </List>

              {selectedEmployee.recentLeaves && selectedEmployee.recentLeaves.length > 0 && (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    최근 휴가 내역
                  </Typography>
                  <List dense>
                    {selectedEmployee.recentLeaves.map((leave: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${getLeaveTypeLabel(leave.type)} (${format(new Date(leave.startDate), 'MM/dd')} - ${format(new Date(leave.endDate), 'MM/dd')})`}
                          secondary={
                            <Chip
                              label={getStatusLabel(leave.status)}
                              color={getStatusColor(leave.status) as any}
                              size="small"
                            />
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default UnifiedLeaveOverview;