import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarDays as CalendarToday,
  DollarSign as MonetizationOn,
  Umbrella as BeachAccess,
  TrendingUp,
  User as Person,
  Clock as Schedule,
  Loader2,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { apiService } from '../services/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface UserStats {
  leaveBalance: {
    totalAnnualLeave: number;
    usedAnnualLeave: number;
    remainingAnnualLeave: number;
    pendingRequests: number;
  };
  payroll: {
    currentMonth: string;
    baseSalary: number;
    totalPayment: number;
    incentive: number;
    bonus: number;
  };
  recentLeaves: any[];
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user's personal stats
      const [leaveBalance, recentLeaves] = await Promise.all([
        apiService.getLeaveBalance(),
        apiService.getLeaveRequests()
      ]);

      const userStats: UserStats = {
        leaveBalance: {
          totalAnnualLeave: leaveBalance.data?.totalAnnualLeave || 0,
          usedAnnualLeave: leaveBalance.data?.usedAnnualLeave || 0,
          remainingAnnualLeave: leaveBalance.data?.remainingAnnualLeave || 0,
          pendingRequests: leaveBalance.data?.pendingAnnualLeave || 0
        },
        payroll: user?.role === 'admin' ? {
          currentMonth: new Date().toISOString().substring(0, 7),
          baseSalary: user?.baseSalary || 0,
          totalPayment: 0,
          incentive: 0,
          bonus: 0
        } : {
          currentMonth: '',
          baseSalary: 0,
          totalPayment: 0,
          incentive: 0,
          bonus: 0
        },
        recentLeaves: recentLeaves.data || []
      };

      setStats(userStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">승인됨</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">대기중</Badge>;
      case 'rejected':
        return <Badge variant="destructive">거부됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual':
        return '연차';
      case 'family':
        return '경조사';
      case 'personal':
        return '개인휴가';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        👋 {user?.name}님의 대시보드
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 개인 정보 카드 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Person className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-semibold">개인 정보</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              부서: {user?.department}
            </p>
            <p className="text-sm text-muted-foreground">
              직급: {user?.position}
            </p>
          </CardContent>
        </Card>

        {/* 휴가 현황 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <BeachAccess className="h-5 w-5 mr-2 text-green-600" />
              <h3 className="text-lg font-semibold">휴가 현황</h3>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats?.leaveBalance.remainingAnnualLeave || 0}
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              잔여 연차 / {stats?.leaveBalance.totalAnnualLeave || 0}일
            </p>
            <p className="text-sm text-muted-foreground">
              사용: {stats?.leaveBalance.usedAnnualLeave || 0}일
            </p>
          </CardContent>
        </Card>

        {/* 급여 정보 - Admin만 표시 */}
        {user?.role === 'admin' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <MonetizationOn className="h-5 w-5 mr-2 text-amber-600" />
                <h3 className="text-lg font-semibold">급여 정보</h3>
              </div>
              <div className="text-3xl font-bold text-amber-600 mb-2">
                {(stats?.payroll.baseSalary || 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                기본급 (원)
              </p>
              <p className="text-sm text-muted-foreground">
                {stats?.payroll.currentMonth} 기준
              </p>
            </CardContent>
          </Card>
        )}

        {/* 대기중인 신청 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Schedule className="h-5 w-5 mr-2 text-blue-600" />
              <h3 className="text-lg font-semibold">대기중인 신청</h3>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats?.recentLeaves.filter(leave => leave.status === 'pending').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              승인 대기중
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 휴가 신청 내역 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            📋 최근 휴가 신청 내역
          </h3>
          {stats?.recentLeaves && stats.recentLeaves.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>휴가 유형</TableHead>
                    <TableHead>시작일</TableHead>
                    <TableHead>종료일</TableHead>
                    <TableHead>일수</TableHead>
                    <TableHead>사유</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>신청일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentLeaves.slice(0, 10).map((leave, index) => (
                    <TableRow key={index}>
                      <TableCell>{getLeaveTypeLabel(leave.leaveType)}</TableCell>
                      <TableCell>
                        {format(new Date(leave.startDate), 'yyyy.MM.dd', { locale: ko })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(leave.endDate), 'yyyy.MM.dd', { locale: ko })}
                      </TableCell>
                      <TableCell>{leave.daysCount}일</TableCell>
                      <TableCell>{leave.reason}</TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell>
                        {format(new Date(leave.createdAt), 'yyyy.MM.dd', { locale: ko })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 휴가 신청 내역이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            🚀 빠른 액션
          </h3>
          <div className="flex gap-4">
            <Button 
              onClick={() => window.location.href = '/leave'}
              className="flex items-center gap-2"
            >
              <BeachAccess className="h-4 w-4" />
              휴가 신청하기
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/leave'}
              className="flex items-center gap-2"
            >
              <CalendarToday className="h-4 w-4" />
              휴가 내역 보기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;