import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Download,
  Settings,
  TrendingUp,
  AlertTriangle,
  Users,
  Calendar,
  Loader2,
} from 'lucide-react';
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
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getRiskTextColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
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
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>
          데이터를 불러올 수 없습니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          👥 휴가 현황 관리
        </h1>
        <Button
          variant="outline"
          onClick={handleExportExcel}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          데이터 내보내기
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-semibold">
                  {data.statistics.totalEmployees}명
                </div>
                <p className="text-sm text-gray-600">
                  전체 통계
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-semibold">
                  {data.statistics.averageUsageRate}%
                </div>
                <p className="text-sm text-gray-600">
                  부서별 현황
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-semibold">
                  {data.statistics.highRiskCount}명
                </div>
                <p className="text-sm text-gray-600">
                  미사용 위험
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="이름 또는 부서 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-filter">부서</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger id="department-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk-filter">위험도</Label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger id="risk-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="high">위험</SelectItem>
                  <SelectItem value="medium">주의</SelectItem>
                  <SelectItem value="low">정상</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort-filter">정렬</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="department">부서순</SelectItem>
                  <SelectItem value="usageRate">사용률순</SelectItem>
                  <SelectItem value="remainingDays">잔여일순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 직원 목록 테이블 */}
      <Card>
        <CardContent className="p-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead className="text-center">총연차</TableHead>
                  <TableHead className="text-center">사용</TableHead>
                  <TableHead className="text-center">잔여</TableHead>
                  <TableHead className="text-center">사용률</TableHead>
                  <TableHead className="text-center">위험도</TableHead>
                  <TableHead className="text-center">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredEmployees().map((employee) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.yearsOfService}년차
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium">
                        {employee.totalAnnualLeave}일
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>
                        {employee.usedAnnualLeave}일
                      </div>
                      {employee.pendingAnnualLeave > 0 && (
                        <div className="text-sm text-yellow-600">
                          (대기: {employee.pendingAnnualLeave}일)
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium">
                        {employee.remainingAnnualLeave}일
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {employee.usageRate}%
                        </div>
                        <Progress
                          value={employee.usageRate}
                          className="w-16 h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRiskColor(employee.riskLevel) as any}>
                        {getRiskIcon(employee.riskLevel)} {getRiskLabel(employee.riskLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAdjustLeave(employee.employeeId, employee.name)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>연차 조정</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
                {getFilteredEmployees().length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      <div className="text-gray-500 py-8">
                        조건에 맞는 직원이 없습니다.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
    </div>
  );
};

export default AdminLeaveOverview;