import React from 'react';
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
  LinearProgress,
  CircularProgress,
  InputAdornment,
  IconButton,
  Tooltip,
  Stack,
  Grid
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
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import VirtualEmployeeList from '../../VirtualEmployeeList';
import { LeaveAnalyticsCharts } from '../../charts/LeaveAnalyticsCharts';
import { EmployeeLeaveOverview, LeaveOverviewData } from '../../../types/leave';

interface LeaveOverviewViewProps {
  overviewData: LeaveOverviewData | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  showAnalytics: boolean;
  setShowAnalytics: (value: boolean) => void;
  getFilteredEmployees: () => EmployeeLeaveOverview[];
  handleExportExcel: () => void;
  handleAdjustLeave: (employeeId: string, name: string) => void;
  handleViewDetail: (employee: any) => void;
  calculateRiskDistribution: () => any;
  calculateDepartmentStats: () => any;
  calculateStatistics: () => any;
  overviewLoading: boolean;
}

const LeaveOverviewView: React.FC<LeaveOverviewViewProps> = ({
  overviewData,
  searchTerm,
  setSearchTerm,
  selectedDepartment,
  setSelectedDepartment,
  sortBy,
  setSortBy,
  showAnalytics,
  setShowAnalytics,
  getFilteredEmployees,
  handleExportExcel,
  handleAdjustLeave,
  handleViewDetail,
  calculateRiskDistribution,
  calculateDepartmentStats,
  calculateStatistics,
  overviewLoading
}) => {
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
              <Typography variant="h4">{(overviewData.summary.averageUsageRate ?? 0).toFixed(1)}%</Typography>
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
          sx={{ mr: 1 }}
        >
          Excel 내보내기
        </Button>
        <Button
          variant={showAnalytics ? "contained" : "outlined"}
          startIcon={<AnalyticsIcon />}
          onClick={() => setShowAnalytics(!showAnalytics)}
          color={showAnalytics ? "primary" : "inherit"}
        >
          {showAnalytics ? '차트 숨기기' : '분석 차트'}
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
                        value={Math.min(100, Math.max(0, employee.usageRate ?? 0))}
                        sx={{ flexGrow: 1 }}
                        color={(employee.usageRate ?? 0) > 80 ? 'error' : (employee.usageRate ?? 0) > 50 ? 'warning' : 'success'}
                      />
                      <Typography variant="body2">{(employee.usageRate ?? 0).toFixed(1)}%</Typography>
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

      {/* Analytics Charts Section */}
      {showAnalytics && (
        <Box sx={{ mt: 3 }}>
          <LeaveAnalyticsCharts
            riskDistribution={calculateRiskDistribution()}
            departmentStats={calculateDepartmentStats()}
            statistics={calculateStatistics()}
            isLoading={overviewLoading}
          />
        </Box>
      )}
    </>
  );
};

export default LeaveOverviewView;