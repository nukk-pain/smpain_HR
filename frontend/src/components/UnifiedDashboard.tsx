import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  TrendingUp,
  People,
  AttachMoney,
  Assessment,
  Refresh,
  Download,
  Warning,
  CheckCircle,
  Schedule,
  BusinessCenter,
  AccountBalance,
  EmojiEvents,
  Speed,
  Security,
  Storage,
  Timeline,
} from '@mui/icons-material';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import { useAuth } from './AuthProvider';

interface SystemStats {
  users: {
    total: number;
    active: number;
    byDepartment: { [key: string]: number };
    byRole: { [key: string]: number };
    newThisMonth: number;
  };
  payroll: {
    currentMonth: {
      totalEmployees: number;
      totalPayroll: number;
      totalIncentive: number;
      totalBonus: number;
      avgSalary: number;
    };
    trends: Array<{
      month: string;
      totalPayroll: number;
      employeeCount: number;
    }>;
  };
  performance: {
    topPerformers: Array<{
      name: string;
      department: string;
      achievementRate: number;
      totalEarnings: number;
    }>;
    departmentRankings: Array<{
      department: string;
      avgPerformance: number;
      totalSales: number;
    }>;
  };
  system: {
    dbHealth: string;
    apiResponseTime: number;
    activeUsers: number;
    systemLoad: number;
    lastBackup: string;
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
  }>;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

const UnifiedDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  // Check if user has payroll permissions
  const hasPayrollPermission = user?.permissions?.includes('payroll:view') || user?.permissions?.includes('payroll:manage');

  // Load comprehensive system statistics
  const loadSystemStats = useCallback(async () => {
    setLoading(true);
    try {
      // 기본 통계 (모든 사용자)
      const [
        userStats,
        payrollStats
      ] = await Promise.all([
        apiService.getUserStats(),
        apiService.getDashboardStats()
      ]);

      // 관리자 전용 통계
      let performanceStats = { data: null };
      let systemHealth = { data: null };
      let alerts = { data: [] };

      if (user?.role === 'admin') {
        try {
          [performanceStats, systemHealth, alerts] = await Promise.all([
            apiService.get('/admin/performance-stats'),
            apiService.get('/admin/system-health'),
            apiService.get('/admin/alerts')
          ]);
        } catch (error) {
          console.warn('Admin stats not available:', error);
        }
      }

      const combinedStats: SystemStats = {
        users: {
          total: userStats.data?.totalUsers || 0,
          active: userStats.data?.activeUsers || 0,
          byDepartment: userStats.data?.byDepartment || {},
          byRole: userStats.data?.byRole || {},
          newThisMonth: userStats.data?.newThisMonth || 0,
        },
        payroll: {
          currentMonth: {
            totalEmployees: payrollStats.data?.total_employees || 0,
            totalPayroll: payrollStats.data?.total_payroll || 0,
            totalIncentive: payrollStats.data?.total_incentive || 0,
            totalBonus: payrollStats.data?.total_bonus || 0,
            avgSalary: payrollStats.data?.avg_salary || 0,
          },
          trends: payrollStats.data?.trends || [],
        },
        performance: {
          topPerformers: performanceStats.data?.topPerformers || [],
          departmentRankings: performanceStats.data?.departmentRankings || [],
        },
        system: {
          dbHealth: systemHealth.data?.dbHealth || 'unknown',
          apiResponseTime: systemHealth.data?.avgResponseTime || 0,
          activeUsers: systemHealth.data?.activeConnections || 0,
          systemLoad: systemHealth.data?.systemLoad || 0,
          lastBackup: systemHealth.data?.lastBackup || 'Never',
        },
        alerts: alerts.data || [],
      };

      setStats(combinedStats);
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load system statistics');
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, [showNotification, user?.role]);

  // Initial load
  useEffect(() => {
    loadSystemStats();
  }, [loadSystemStats]);

  // Auto refresh setup
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadSystemStats, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, loadSystemStats]);

  // Quick actions for different user roles
  const getQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    if (user?.role === 'admin') {
      actions.push(
        {
          title: '사용자 관리',
          description: '직원 추가/수정/비활성화',
          icon: <People />,
          action: () => window.location.href = '/users',
          color: 'primary'
        }
      );
      
      if (hasPayrollPermission) {
        actions.push(
          {
            title: '급여 보고서',
            description: '월별 급여 보고서 생성',
            icon: <Assessment />,
            action: () => window.location.href = '/reports',
            color: 'success'
          },
          {
            title: '파일 업로드',
            description: '급여 확정 파일 검증',
            icon: <Download />,
            action: () => window.location.href = '/files',
            color: 'warning'
          },
          {
            title: '시스템 설정',
            description: '인센티브 수식 관리',
            icon: <Security />,
            action: () => window.location.href = '/payroll?tab=4',
            color: 'info'
          }
        );
      }
    }

    if (hasPayrollPermission) {
      actions.push(
        {
          title: '급여 관리',
          description: '월별 급여 현황 확인',
          icon: <AttachMoney />,
          action: () => window.location.href = '/payroll',
          color: 'primary'
        },
        {
          title: '매출 입력',
          description: '직원별 매출 데이터 관리',
          icon: <TrendingUp />,
          action: () => window.location.href = '/payroll?tab=2',
          color: 'success'
        }
      );
    }

    actions.push(
      {
        title: '휴가 관리',
        description: '휴가 신청 및 승인',
        icon: <Schedule />,
        action: () => window.location.href = '/leave',
        color: 'info'
      }
    );

    return actions;
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: {
      value: number;
      isPositive: boolean;
    };
    subtitle?: string;
  }> = ({ title, value, icon, color, trend, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp 
                  sx={{ 
                    fontSize: 16, 
                    color: trend.isPositive ? 'success.main' : 'error.main',
                    mr: 0.5,
                    transform: trend.isPositive ? 'none' : 'rotate(180deg)'
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ color: trend.isPositive ? 'success.main' : 'error.main' }}
                >
                  {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const SystemHealthIndicator: React.FC = () => {
    if (!stats) return null;

    const getHealthColor = (health: string) => {
      switch (health) {
        case 'excellent': return 'success';
        case 'good': return 'info';
        case 'fair': return 'warning';
        case 'poor': return 'error';
        default: return 'default';
      }
    };

    const getLoadColor = (load: number) => {
      if (load < 50) return 'success.main';
      if (load < 80) return 'warning.main';
      return 'error.main';
    };

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            시스템 상태
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  데이터베이스 상태
                </Typography>
                <Chip 
                  label={stats.system.dbHealth}
                  color={getHealthColor(stats.system.dbHealth) as any}
                  size="small"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  API 응답 시간
                </Typography>
                <Typography variant="body1">
                  {stats.system.apiResponseTime}ms
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  시스템 부하
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.system.systemLoad} 
                    sx={{ 
                      flexGrow: 1, 
                      mr: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getLoadColor(stats.system.systemLoad)
                      }
                    }}
                  />
                  <Typography variant="body2">
                    {stats.system.systemLoad}%
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  활성 사용자
                </Typography>
                <Typography variant="body1">
                  {stats.system.activeUsers}명
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          통합 대시보드
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>기간</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              label="기간"
            >
              <MenuItem value="current">이번 달</MenuItem>
              <MenuItem value="last3">최근 3개월</MenuItem>
              <MenuItem value="last6">최근 6개월</MenuItem>
              <MenuItem value="year">올해</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSystemStats}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant={autoRefresh ? 'contained' : 'outlined'}
            startIcon={<Speed />}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '자동새로고침 ON' : '자동새로고침 OFF'}
          </Button>
        </Stack>
      </Box>

      {/* Key Metrics */}
      {stats && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="총 직원 수"
                value={stats.users.total}
                subtitle={`활성: ${stats.users.active}명`}
                icon={<People />}
                color="primary"
              />
            </Grid>
            {hasPayrollPermission && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="월 총 급여"
                    value={`${stats.payroll.currentMonth.totalPayroll.toLocaleString()}원`}
                    subtitle={`평균: ${stats.payroll.currentMonth.avgSalary.toLocaleString()}원`}
                    icon={<AttachMoney />}
                    color="success"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="총 인센티브"
                    value={`${stats.payroll.currentMonth.totalIncentive.toLocaleString()}원`}
                    icon={<TrendingUp />}
                    color="warning"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="상여금/포상금"
                    value={`${stats.payroll.currentMonth.totalBonus.toLocaleString()}원`}
                    icon={<EmojiEvents />}
                    color="info"
                  />
                </Grid>
              </>
            )}
          </Grid>

          {/* Quick Actions */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    빠른 작업
                  </Typography>
                  <Grid container spacing={2}>
                    {getQuickActions().map((action, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                              transform: 'translateY(-2px)',
                              boxShadow: 2
                            }
                          }}
                          onClick={action.action}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar sx={{ bgcolor: `${action.color}.main`, mr: 2, width: 40, height: 40 }}>
                              {action.icon}
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {action.title}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            {action.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* System Health and Alerts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <SystemHealthIndicator />
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    시스템 알림
                  </Typography>
                  {stats.alerts.length > 0 ? (
                    <List>
                      {stats.alerts.slice(0, 5).map((alert) => (
                        <ListItem key={alert.id} divider>
                          <ListItemIcon>
                            {alert.type === 'error' ? <Warning color="error" /> :
                             alert.type === 'warning' ? <Warning color="warning" /> :
                             alert.type === 'success' ? <CheckCircle color="success" /> :
                             <Assessment color="info" />}
                          </ListItemIcon>
                          <ListItemText
                            primary={alert.title}
                            secondary={
                              <>
                                <Typography variant="body2" component="span" display="block">
                                  {alert.message}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" component="span">
                                  {format(new Date(alert.timestamp), 'MM/dd HH:mm')}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">
                      현재 시스템 알림이 없습니다.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Performance Overview */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    부서별 직원 현황
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(stats.users.byDepartment).map(([dept, count]) => (
                      <Grid item xs={6} key={dept}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
                          <Typography variant="body2">{dept}</Typography>
                          <Typography variant="body2" fontWeight="bold">{count}명</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    역할별 사용자
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(stats.users.byRole).map(([role, count]) => (
                      <Grid item xs={6} key={role}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
                          <Typography variant="body2">
                            {role === 'admin' ? '관리자' : 
                             role === 'manager' ? '매니저' : '사용자'}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">{count}명</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default UnifiedDashboard;