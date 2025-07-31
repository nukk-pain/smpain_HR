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
  Stack
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import { ApiService } from '../services/api';
import LeaveAdjustmentDialog from '../components/LeaveAdjustmentDialog';

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

const AdminLeaveOverview: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaveOverviewData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{id: string, name: string} | null>(null);

  const apiService = new ApiService();

  useEffect(() => {
    loadLeaveOverview();
  }, []);

  const loadLeaveOverview = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/admin/leave/overview');
      setData(response.data);
    } catch (error) {
      console.error('Error loading leave overview:', error);
      showError('직원 휴가 현황을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return '위험';
      case 'medium':
        return '주의';
      case 'low':
        return '정상';
      default:
        return '알 수 없음';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getFilteredEmployees = () => {
    if (!data) return [];
    
    return data.employees.filter((employee) => {
      const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
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
    setSelectedEmployee({ id: employeeId, name: employeeName });
    setAdjustmentDialogOpen(true);
  };

  const handleAdjustmentComplete = async () => {
    await loadLeaveOverview();
    setAdjustmentDialogOpen(false);
    setSelectedEmployee(null);
  };

  const departments = data ? [...new Set(data.employees.map(emp => emp.department))] : [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Alert severity="error">
        데이터를 불러올 수 없습니다.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          👥 전체 직원 휴가 현황
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportExcel}
        >
          엑셀 다운로드
        </Button>
      </Box>
      {/* 통계 카드 */}
      <Grid container spacing={3} mb={3}>
        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PeopleIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight={600}>
                    {data.statistics.totalEmployees}명
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 직원 수
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUpIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight={600}>
                    {data.statistics.averageUsageRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    평균 사용률
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WarningIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="h4" fontWeight={600}>
                    {data.statistics.highRiskCount}명
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
      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
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
            <Grid
              size={{
                xs: 12,
                md: 2
              }}>
              <TextField
                fullWidth
                select
                label="부서"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="all">전체 부서</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 2
              }}>
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
            <Grid
              size={{
                xs: 12,
                md: 2
              }}>
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
      {/* 직원 목록 테이블 */}
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
                        label={`${getRiskIcon(employee.riskLevel)} ${getRiskLabel(employee.riskLevel)}`}
                        color={getRiskColor(employee.riskLevel) as any}
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
      {/* 연차 조정 다이얼로그 */}
      {selectedEmployee && (
        <LeaveAdjustmentDialog
          open={adjustmentDialogOpen}
          onClose={() => setAdjustmentDialogOpen(false)}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          onAdjustmentComplete={handleAdjustmentComplete}
        />
      )}
    </Box>
  );
};

export default AdminLeaveOverview;