import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  useTheme,
  useMediaQuery,
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
  Analytics as AnalyticsIcon,
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
import { LeaveAnalyticsCharts } from './charts/LeaveAnalyticsCharts';
import MobileLeaveOverview from './MobileLeaveOverview';
import LeaveOverviewView from './leave/views/LeaveOverviewView';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [searchTerm, setSearchTerm] = useState('');  // Unified state
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'overview' | 'team' | 'department'>(
    userRole === 'supervisor' && initialViewMode === 'overview' ? 'team' : initialViewMode
  );

  const [sortBy, setSortBy] = useState('name');  // Admin-specific state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: overviewResponse, isLoading: overviewLoading, refetch: refetchOverview } = useLeaveOverview(  // React Query hooks
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

  const adjustmentMutation = useLeaveAdjustment();  // Leave adjustment mutation

  const { prefetchOverview, prefetchTeamStatus } = usePrefetchLeaveData();  // Prefetch hooks

  const { data: employeeLeaveLog, isLoading: loadingDetail } = useEmployeeLeaveLog(  // Employee leave log query
    selectedEmployee?._id || selectedEmployee?.employeeId || '',
    selectedYear,
    !!selectedEmployee && employeeDetailOpen
  );

  // Transform data for backward compatibility
  const overviewData = useMemo(() => {
    if (!overviewResponse) return null;
    // React Query의 useQuery는 이미 response.data를 반환
    const apiData = overviewResponse as any;
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
    // React Query의 useQuery는 response.data를 반환하므로
    // teamResponse는 이미 response.data 부분임
    return (teamResponse as any)?.members || [];
  }, [teamResponse]);

  const departmentStats = useMemo(() => {
    // React Query의 useQuery는 이미 response.data를 반환
    return (departmentStatsResponse as any) || [];
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

  // Calculate analytics data
  const calculateRiskDistribution = () => {
    const employees = getFilteredEmployees();
    const distribution = { high: 0, medium: 0, low: 0 };
    
    employees.forEach(emp => {
      if (emp.riskLevel === 'high') distribution.high++;
      else if (emp.riskLevel === 'medium') distribution.medium++;
      else distribution.low++;
    });
    
    return distribution;
  };

  const calculateDepartmentStats = () => {
    const employees = overviewData?.employees || [];
    const deptMap = new Map<string, { totalUsage: number; count: number }>();
    
    employees.forEach(emp => {
      if (!deptMap.has(emp.department)) {
        deptMap.set(emp.department, { totalUsage: 0, count: 0 });
      }
      const dept = deptMap.get(emp.department)!;
      dept.totalUsage += emp.usageRate;
      dept.count++;
    });
    
    return Array.from(deptMap.entries()).map(([department, stats]) => ({
      department,
      avgUsage: Math.round(stats.totalUsage / stats.count),
      totalEmployees: stats.count
    }));
  };

  const calculateStatistics = () => {
    const employees = getFilteredEmployees();
    const totalEmployees = employees.length;
    const totalUsage = employees.reduce((sum, emp) => sum + emp.usageRate, 0);
    const averageUsage = totalEmployees > 0 ? Math.round(totalUsage / totalEmployees) : 0;
    const highRiskCount = employees.filter(emp => emp.riskLevel === 'high').length;
    const pendingRequests = employees.reduce((sum, emp) => sum + (emp.pendingAnnualLeave > 0 ? 1 : 0), 0);
    
    return {
      totalEmployees,
      averageUsage,
      highRiskCount,
      pendingRequests
    };
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
  const renderDepartmentView = () => (<Alert severity="info">부서별 통계 뷰 - 추후 별도 컴포넌트로 분리 예정</Alert>);


  // Mobile view - use dedicated mobile component
  if (isMobile && viewMode === 'overview') {
    return (
      <Box>
        <MobileLeaveOverview 
          employees={getFilteredEmployees()}
          isLoading={overviewLoading}
        />
      </Box>
    );
  }

  // Desktop view - existing implementation
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
          {viewMode === 'overview' && userRole === 'admin' && (
            <LeaveOverviewView
              overviewData={overviewData}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              sortBy={sortBy}
              setSortBy={setSortBy}
              showAnalytics={showAnalytics}
              setShowAnalytics={setShowAnalytics}
              getFilteredEmployees={getFilteredEmployees}
              handleExportExcel={handleExportExcel}
              handleAdjustLeave={handleAdjustLeave}
              handleViewDetail={handleViewDetail}
              calculateRiskDistribution={calculateRiskDistribution}
              calculateDepartmentStats={calculateDepartmentStats}
              calculateStatistics={calculateStatistics}
              overviewLoading={overviewLoading}
            />
          )}
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