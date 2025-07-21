import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  Users as People,
  DollarSign as AttachMoney,
  BarChart3 as Assessment,
  RefreshCw as Refresh,
  Download,
  AlertTriangle as Warning,
  CheckCircle,
  Clock as Schedule,
  Briefcase as BusinessCenter,
  Building as AccountBalance,
  Trophy as EmojiEvents,
  Gauge as Speed,
  Shield as Security,
  Database as Storage,
  Activity as Timeline,
  Loader2,
} from 'lucide-react';
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
          icon: <People className="h-5 w-5" />,
          action: () => window.location.href = '/users',
          color: 'primary'
        }
      );
      
      if (hasPayrollPermission) {
        actions.push(
          {
            title: '급여 보고서',
            description: '월별 급여 보고서 생성',
            icon: <Assessment className="h-5 w-5" />,
            action: () => window.location.href = '/reports',
            color: 'success'
          },
          {
            title: '파일 업로드',
            description: '급여 확정 파일 검증',
            icon: <Download className="h-5 w-5" />,
            action: () => window.location.href = '/files',
            color: 'warning'
          },
          {
            title: '시스템 설정',
            description: '인센티브 수식 관리',
            icon: <Security className="h-5 w-5" />,
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
          icon: <AttachMoney className="h-5 w-5" />,
          action: () => window.location.href = '/payroll',
          color: 'primary'
        },
        {
          title: '매출 입력',
          description: '직원별 매출 데이터 관리',
          icon: <TrendingUp className="h-5 w-5" />,
          action: () => window.location.href = '/payroll?tab=2',
          color: 'success'
        }
      );
    }

    actions.push(
      {
        title: '휴가 관리',
        description: '휴가 신청 및 승인',
        icon: <Schedule className="h-5 w-5" />,
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
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">
              {title}
            </p>
            <div className="text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <TrendingUp 
                  className={`h-4 w-4 mr-1 ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600 rotate-180'
                  }`}
                />
                <span className={`text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <Avatar className={`h-14 w-14 ${
            color === 'primary' ? 'bg-primary' :
            color === 'success' ? 'bg-green-600' :
            color === 'warning' ? 'bg-amber-600' :
            color === 'info' ? 'bg-blue-600' :
            'bg-gray-600'
          }`}>
            <AvatarFallback className="text-white">
              {icon}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );

  const SystemHealthIndicator: React.FC = () => {
    if (!stats) return null;

    const getHealthColor = (health: string) => {
      switch (health) {
        case 'excellent': return 'bg-green-500';
        case 'good': return 'bg-blue-500';
        case 'fair': return 'bg-amber-500';
        case 'poor': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    };

    const getLoadColor = (load: number) => {
      if (load < 50) return 'bg-green-600';
      if (load < 80) return 'bg-amber-600';
      return 'bg-red-600';
    };

    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            시스템 상태
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  데이터베이스 상태
                </p>
                <Badge className={getHealthColor(stats.system.dbHealth)}>
                  {stats.system.dbHealth}
                </Badge>
              </div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  API 응답 시간
                </p>
                <p className="text-base">
                  {stats.system.apiResponseTime}ms
                </p>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  시스템 부하
                </p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={stats.system.systemLoad}
                    className={`flex-1 h-2`}
                  />
                  <span className="text-sm">
                    {stats.system.systemLoad}%
                  </span>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  활성 사용자
                </p>
                <p className="text-base">
                  {stats.system.activeUsers}명
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          관리자 대시보드
        </h1>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="기간" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">이번 달</SelectItem>
              <SelectItem value="last3">최근 3개월</SelectItem>
              <SelectItem value="last6">최근 6개월</SelectItem>
              <SelectItem value="year">올해</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={loadSystemStats}
            disabled={loading}
          >
            <Refresh className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Speed className="h-4 w-4 mr-2" />
            {autoRefresh ? '자동새로고침 ON' : '자동새로고침 OFF'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="전체 직원"
              value={stats.users.total}
              subtitle={`재직 중: ${stats.users.active}명`}
              icon={<People />}
              color="primary"
            />
            {hasPayrollPermission && (
              <>
                <StatCard
                  title="월 총 급여"
                  value={`${stats.payroll.currentMonth.totalPayroll.toLocaleString()}원`}
                  subtitle={`평균: ${stats.payroll.currentMonth.avgSalary.toLocaleString()}원`}
                  icon={<AttachMoney />}
                  color="success"
                />
                <StatCard
                  title="총 인센티브"
                  value={`${stats.payroll.currentMonth.totalIncentive.toLocaleString()}원`}
                  icon={<TrendingUp />}
                  color="warning"
                />
                <StatCard
                  title="상여금/포상금"
                  value={`${stats.payroll.currentMonth.totalBonus.toLocaleString()}원`}
                  icon={<EmojiEvents />}
                  color="info"
                />
              </>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                빠른 작업
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {getQuickActions().map((action, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent hover:-translate-y-0.5 hover:shadow-md"
                    onClick={action.action}
                  >
                    <div className="flex items-center mb-2">
                      <Avatar className={`h-10 w-10 mr-3 ${
                        action.color === 'primary' ? 'bg-primary' :
                        action.color === 'success' ? 'bg-green-600' :
                        action.color === 'warning' ? 'bg-amber-600' :
                        action.color === 'info' ? 'bg-blue-600' :
                        'bg-gray-600'
                      }`}>
                        <AvatarFallback className="text-white">
                          {action.icon}
                        </AvatarFallback>
                      </Avatar>
                      <h4 className="font-semibold">
                        {action.title}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Health and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SystemHealthIndicator />
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  시스템 알림
                </h3>
                {stats.alerts.length > 0 ? (
                  <div className="space-y-3">
                    {stats.alerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                        <div className="mt-0.5">
                          {alert.type === 'error' ? <Warning className="h-5 w-5 text-red-600" /> :
                           alert.type === 'warning' ? <Warning className="h-5 w-5 text-amber-600" /> :
                           alert.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                           <Assessment className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(alert.timestamp), 'MM/dd HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      현재 시스템 알림이 없습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  부서별 직원 현황
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.users.byDepartment).map(([dept, count]) => (
                    <div key={dept} className="flex justify-between p-2">
                      <span className="text-sm">{dept}</span>
                      <span className="text-sm font-medium">{count}명</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  역할별 사용자
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.users.byRole).map(([role, count]) => (
                    <div key={role} className="flex justify-between p-2">
                      <span className="text-sm">
                        {role === 'admin' ? '관리자' : 
                         role === 'manager' ? '매니저' : '사용자'}
                      </span>
                      <span className="text-sm font-medium">{count}명</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedDashboard;