import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Download,
  Building,
  Star,
  Trophy,
} from 'lucide-react';
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
      const response = await apiService.getPayrollReport(yearMonth);
      if (response.success) {
        setStats(response.data);
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

    const getColorClass = (color: string) => {
      switch (color) {
        case 'primary':
          return 'text-blue-600';
        case 'success':
          return 'text-green-600';
        case 'warning':
          return 'text-yellow-600';
        case 'error':
          return 'text-red-600';
        default:
          return 'text-gray-600';
      }
    };

    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">
                {title}
              </p>
              <p className={`text-2xl font-bold ${getColorClass(color)}`}>
                {formatValue(value)}
              </p>
              {growth !== undefined && (
                <div className="flex items-center mt-2">
                  <TrendingUp 
                    className={`h-4 w-4 mr-1 ${
                      growth >= 0 ? 'text-green-500' : 'text-red-500'
                    }`} 
                  />
                  <span 
                    className={`text-sm ${
                      growth >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className={`ml-4 text-4xl ${getColorClass(color)}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <Progress value={undefined} className="w-full" />
        <p className="mt-4 text-sm text-center text-muted-foreground">
          Loading payroll statistics...
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            No payroll data available for {yearMonth}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })} 급여 대시보드
        </h1>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="view-select">View</Label>
            <Select value={selectedView} onValueChange={setSelectedView}>
              <SelectTrigger id="view-select" className="min-w-32">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="trends">Trends</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="총 직원 수"
          value={stats.totalEmployees}
          icon={<Users className="h-8 w-8" />}
          color="primary"
          growth={growthRates?.employeeGrowth}
          format="number"
        />
        <StatCard
          title="총 급여"
          value={stats.totalPayroll}
          icon={<DollarSign className="h-8 w-8" />}
          color="success"
          growth={growthRates?.payrollGrowth}
        />
        <StatCard
          title="총 인센티브"
          value={stats.totalIncentive}
          icon={<TrendingUp className="h-8 w-8" />}
          color="warning"
          growth={growthRates?.incentiveGrowth}
        />
        <StatCard
          title="평균 급여"
          value={stats.totalEmployees > 0 ? stats.totalPayroll / stats.totalEmployees : 0}
          icon={<Building className="h-8 w-8" />}
          color="info"
        />
      </div>

      {/* Breakdown Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <StatCard
            title="기본급"
            value={stats.totalBaseSalary}
            icon={<Building className="h-8 w-8" />}
            color="primary"
          />
        </div>
        <div>
          <StatCard
            title="상여금"
            value={stats.totalBonus}
            icon={<Star className="h-8 w-8" />}
            color="secondary"
          />
        </div>
        <div>
          <StatCard
            title="포상금"
            value={stats.totalAward}
            icon={<Trophy className="h-8 w-8" />}
            color="warning"
          />
        </div>
        <div>
          <StatCard
            title="인센티브 비율"
            value={stats.totalPayroll > 0 ? (stats.totalIncentive / stats.totalPayroll) * 100 : 0}
            icon={<BarChart3 className="h-8 w-8" />}
            color="info"
            format="percent"
          />
        </div>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Department Stats */}
          <div>
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">
                  부서별 현황
                </h3>
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>부서</TableHead>
                        <TableHead className="text-right">직원 수</TableHead>
                        <TableHead className="text-right">총 급여</TableHead>
                        <TableHead className="text-right">평균 급여</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.departmentStats?.map((dept) => (
                        <TableRow key={dept.department}>
                          <TableCell>{dept.department}</TableCell>
                          <TableCell className="text-right">{dept.employeeCount}명</TableCell>
                          <TableCell className="text-right">{dept.totalSalary.toLocaleString()}원</TableCell>
                          <TableCell className="text-right">{dept.averageSalary.toLocaleString()}원</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <div>
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">
                  우수 직원 (Top 5)
                </h3>
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>직원명</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead className="text-right">총 급여</TableHead>
                        <TableHead className="text-right">인센티브</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.topPerformers?.slice(0, 5).map((performer, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div sx={{ display: 'flex', alignItems: 'center' }}>
                              {performer.name}
                              {index < 3 && (
                                <Chip 
                                  size="small" 
                                  label={index + 1} 
                                  color={index === 0 ? 'warning' : index === 1 ? 'default' : 'default'}
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{performer.department}</TableCell>
                          <TableCell className="text-right">{performer.totalPay.toLocaleString()}원</TableCell>
                          <TableCell className="text-right">{performer.incentive.toLocaleString()}원</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedView === 'department' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.departmentStats?.map((dept) => (
            <div key={dept.department}>
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold mb-2">
                    {dept.department}
                  </h3>
                  <div sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <span className="text-sm text-gray-600">
                      직원 수
                    </span>
                    <span className="text-sm font-bold">
                      {dept.employeeCount}명
                    </span>
                  </div>
                  <div sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <span className="text-sm text-gray-600">
                      총 급여
                    </span>
                    <span className="text-sm font-bold">
                      {dept.totalSalary.toLocaleString()}원
                    </span>
                  </div>
                  <div sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <span className="text-sm text-gray-600">
                      평균 급여
                    </span>
                    <span className="text-sm font-bold">
                      {dept.averageSalary.toLocaleString()}원
                    </span>
                  </div>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.totalPayroll > 0 ? (dept.totalSalary / stats.totalPayroll) * 100 : 0} 
                    sx={{ mt: 2 }}
                  />
                  <span className="text-xs text-gray-600 mt-1 block">
                    전체 급여의 {stats.totalPayroll > 0 ? ((dept.totalSalary / stats.totalPayroll) * 100).toFixed(1) : 0}%
                  </span>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {selectedView === 'trends' && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">
                  월별 급여 추이 (최근 6개월)
                </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>월</TableHead>
                        <TableHead className="text-right">직원 수</TableHead>
                        <TableHead className="text-right">총 급여</TableHead>
                        <TableHead className="text-right">총 인센티브</TableHead>
                        <TableHead className="text-right">평균 급여</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.monthlyTrends?.map((trend) => (
                        <TableRow key={trend.month}>
                          <TableCell>{trend.month}</TableCell>
                          <TableCell className="text-right">{trend.employeeCount}명</TableCell>
                          <TableCell className="text-right">{trend.totalPayroll.toLocaleString()}원</TableCell>
                          <TableCell className="text-right">{trend.totalIncentive.toLocaleString()}원</TableCell>
                          <TableCell className="text-right">
                            {trend.employeeCount > 0 ? (trend.totalPayroll / trend.employeeCount).toLocaleString() : 0}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollDashboard;