import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  TrendingUp,
  People,
  AttachMoney,
  Assessment,
  Download,
  AccountBalance,
  Stars,
  EmojiEvents,
} from '@mui/icons-material';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';

interface PayrollStats {
  totalEmployees: number;
  totalBaseSalary: number;
  totalIncentive: number;
  totalBonus: number;
  totalAward: number;
  totalPayroll: number;
  departmentStats: DepartmentStat[];
  monthlyTrends: MonthlyTrend[];
  topPerformers: TopPerformer[];
}

interface DepartmentStat {
  department: string;
  employeeCount: number;
  totalSalary: number;
  averageSalary: number;
}

interface MonthlyTrend {
  month: string;
  totalPayroll: number;
  totalIncentive: number;
  employeeCount: number;
}

interface TopPerformer {
  name: string;
  department: string;
  totalPay: number;
  incentive: number;
  performance: number;
}

interface PayrollDashboardProps {
  yearMonth: string;
  onMonthChange?: (month: string) => void;
}

const PayrollDashboard: React.FC<PayrollDashboardProps> = ({ yearMonth, onMonthChange }) => {
  const [stats, setStats] = useState<PayrollStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'department' | 'trends'>('overview');
  const { showNotification } = useNotification();

  // Load payroll statistics
  const loadStats = async () => {
    setLoading(true);
    try {
      // Convert yyyy-MM format to YYYYMM for API
      const apiYearMonth = yearMonth.replace('-', '');
      const response = await apiService.getPayrollReport(apiYearMonth);
      if (response.success && (response as any).data?.summary) {
        // Map summary data to stats structure
        setStats({
          ...(response as any).data.summary,
          departmentStats: [],  // Empty for now - can be calculated from reportData later
          monthlyTrends: [],    // Empty for now - requires multiple months data
          topPerformers: []     // Empty for now - can be calculated from reportData later
        });
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load payroll statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [yearMonth]);

  // Calculate growth rates
  const growthRates = useMemo(() => {
    if (!stats?.monthlyTrends || stats.monthlyTrends.length < 2) return null;
    
    const current = stats.monthlyTrends[stats.monthlyTrends.length - 1];
    const previous = stats.monthlyTrends[stats.monthlyTrends.length - 2];
    
    return {
      payrollGrowth: ((current.totalPayroll - previous.totalPayroll) / previous.totalPayroll) * 100,
      incentiveGrowth: ((current.totalIncentive - previous.totalIncentive) / previous.totalIncentive) * 100,
      employeeGrowth: ((current.employeeCount - previous.employeeCount) / previous.employeeCount) * 100,
    };
  }, [stats]);

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await apiService.downloadPayrollReport(yearMonth);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll_report_${yearMonth}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showNotification('success', 'Success', 'Report downloaded successfully');
    } catch (error) {
      showNotification('error', 'Error', 'Failed to download report');
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    growth?: number;
    format?: 'currency' | 'number' | 'percent';
  }> = ({ title, value, icon, color, growth, format = 'currency' }) => {
    const formatValue = (val: number) => {
      if (val === null || val === undefined) {
        return format === 'currency' ? '0원' : '0';
      }
      switch (format) {
        case 'currency':
          return `${val.toLocaleString()}원`;
        case 'number':
          return val.toLocaleString();
        case 'percent':
          return `${val.toFixed(1)}%`;
        default:
          return val.toString();
      }
    };

    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Typography color="textSecondary" variant="body2" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: `${color}.main` }}>
                {formatValue(value)}
              </Typography>
              {growth !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TrendingUp 
                    sx={{ 
                      fontSize: 16, 
                      color: growth >= 0 ? 'success.main' : 'error.main',
                      mr: 0.5 
                    }} 
                  />
                  <Typography 
                    variant="body2" 
                    sx={{ color: growth >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ color: `${color}.main`, fontSize: '2.5rem' }}>
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading payroll statistics...
        </Typography>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info" sx={{ m: 3 }}>
        No payroll data available for {yearMonth}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })} 급여 대시보드
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>View</InputLabel>
            <Select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value as any)}
              label="View"
            >
              <MenuItem value="overview">Overview</MenuItem>
              <MenuItem value="department">Department</MenuItem>
              <MenuItem value="trends">Trends</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>
      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="총 직원 수"
            value={stats.totalEmployees}
            icon={<People />}
            color="primary"
            growth={growthRates?.employeeGrowth}
            format="number"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="총 급여"
            value={stats.totalPayroll}
            icon={<AttachMoney />}
            color="success"
            growth={growthRates?.payrollGrowth}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="총 인센티브"
            value={stats.totalIncentive}
            icon={<TrendingUp />}
            color="warning"
            growth={growthRates?.incentiveGrowth}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="평균 급여"
            value={stats.totalEmployees > 0 ? stats.totalPayroll / stats.totalEmployees : 0}
            icon={<AccountBalance />}
            color="info"
          />
        </Grid>
      </Grid>
      {/* Breakdown Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="기본급"
            value={stats.totalBaseSalary}
            icon={<AccountBalance />}
            color="primary"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="상여금"
            value={stats.totalBonus}
            icon={<Stars />}
            color="secondary"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="포상금"
            value={stats.totalAward}
            icon={<EmojiEvents />}
            color="warning"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="인센티브 비율"
            value={stats.totalPayroll > 0 ? (stats.totalIncentive / stats.totalPayroll) * 100 : 0}
            icon={<Assessment />}
            color="info"
            format="percent"
          />
        </Grid>
      </Grid>
      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <Grid container spacing={3}>
          {/* Department Stats */}
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  부서별 현황
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>부서</TableCell>
                        <TableCell align="right">직원 수</TableCell>
                        <TableCell align="right">총 급여</TableCell>
                        <TableCell align="right">평균 급여</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.departmentStats?.map((dept) => (
                        <TableRow key={dept.department}>
                          <TableCell>{dept.department}</TableCell>
                          <TableCell align="right">{dept.employeeCount}명</TableCell>
                          <TableCell align="right">{dept.totalSalary ? dept.totalSalary.toLocaleString() : '0'}원</TableCell>
                          <TableCell align="right">{dept.averageSalary ? dept.averageSalary.toLocaleString() : '0'}원</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Performers */}
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  우수 직원 (Top 5)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>직원명</TableCell>
                        <TableCell>부서</TableCell>
                        <TableCell align="right">총 급여</TableCell>
                        <TableCell align="right">인센티브</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.topPerformers?.slice(0, 5).map((performer, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {performer.name}
                              {index < 3 && (
                                <Chip 
                                  size="small" 
                                  label={index + 1} 
                                  color={index === 0 ? 'warning' : index === 1 ? 'default' : 'default'}
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{performer.department}</TableCell>
                          <TableCell align="right">{performer.totalPay ? performer.totalPay.toLocaleString() : '0'}원</TableCell>
                          <TableCell align="right">{performer.incentive ? performer.incentive.toLocaleString() : '0'}원</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      {selectedView === 'department' && (
        <Grid container spacing={3}>
          {stats.departmentStats?.map((dept) => (
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      직원 수
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {dept.employeeCount}명
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      총 급여
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {dept.totalSalary ? dept.totalSalary.toLocaleString() : '0'}원
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      평균 급여
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {dept.averageSalary ? dept.averageSalary.toLocaleString() : '0'}원
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.totalPayroll > 0 ? (dept.totalSalary / stats.totalPayroll) * 100 : 0} 
                    sx={{ mt: 2 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    전체 급여의 {stats.totalPayroll > 0 ? ((dept.totalSalary / stats.totalPayroll) * 100).toFixed(1) : 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {selectedView === 'trends' && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  월별 급여 추이 (최근 6개월)
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>월</TableCell>
                        <TableCell align="right">직원 수</TableCell>
                        <TableCell align="right">총 급여</TableCell>
                        <TableCell align="right">총 인센티브</TableCell>
                        <TableCell align="right">평균 급여</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.monthlyTrends?.map((trend) => (
                        <TableRow key={trend.month}>
                          <TableCell>{trend.month}</TableCell>
                          <TableCell align="right">{trend.employeeCount}명</TableCell>
                          <TableCell align="right">{trend.totalPayroll ? trend.totalPayroll.toLocaleString() : '0'}원</TableCell>
                          <TableCell align="right">{trend.totalIncentive ? trend.totalIncentive.toLocaleString() : '0'}원</TableCell>
                          <TableCell align="right">
                            {trend.employeeCount > 0 && trend.totalPayroll ? (trend.totalPayroll / trend.employeeCount).toLocaleString() : '0'}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PayrollDashboard;