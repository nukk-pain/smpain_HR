import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  User,
  Umbrella,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  BarChart3,
  Eye,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from './AuthProvider';
import { useNotification } from './NotificationProvider';
import { apiService } from '../services/api';

interface TeamMember {
  _id: string;
  name: string;
  employeeId: string;
  position: string;
  department: string;
  leaveBalance: {
    totalAnnualLeave: number;
    usedAnnualLeave: number;
    remainingAnnualLeave: number;
    pendingAnnualLeave: number;
  };
  recentLeaves: {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    status: string;
    reason: string;
  }[];
  upcomingLeaves: {
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    status: string;
    reason: string;
  }[];
}

interface DepartmentStats {
  department: string;
  totalMembers: number;
  activeMembers: number;
  avgLeaveUsage: number;
  totalLeaveUsed: number;
  totalLeaveRemaining: number;
  pendingRequests: number;
  approvalRate: number;
}

interface TeamLeaveStatusProps {
  viewMode?: 'team' | 'department';
}

const TeamLeaveStatus: React.FC<TeamLeaveStatusProps> = ({ viewMode = 'team' }) => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);
  const [employeeLeaveLog, setEmployeeLeaveLog] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [selectedDepartment, selectedYear]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      if (viewMode === 'team') {
        // Load team members data
        const response = await apiService.get('/leave/team-status', {
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
          year: selectedYear
        });
        
        setTeamMembers(response.data?.members || []);
        setDepartments(response.data?.departments || []);
      } else {
        // Load department statistics
        const response = await apiService.get('/leave/department-stats', {
          year: selectedYear
        });
        
        setDepartmentStats(response.data || []);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      showError('팀 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setDetailDialogOpen(true);
  };

  const handleViewDetail = async (member: TeamMember) => {
    try {
      setLoadingDetail(true);
      setSelectedMember(member);
      
      const response = await apiService.getEmployeeLeaveLog(member._id, selectedYear);
      setEmployeeLeaveLog(response.data);
      setEmployeeDetailOpen(true);
    } catch (error) {
      console.error('Error loading employee leave log:', error);
      showError('직원 휴가 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedMember(null);
  };

  const getLeaveUsageColor = (usagePercentage: number) => {
    if (usagePercentage < 30) return 'bg-green-500';
    if (usagePercentage < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual':
        return '연차';
      case 'sick':
        return '병가';
      case 'personal':
        return '개인휴가';
      case 'family':
        return '경조사';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거부됨';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {viewMode === 'team' ? '팀 휴가 현황' : '부서별 휴가 통계'}
        </h1>
        
        <div className="flex items-center gap-4">
          <div className="min-w-32">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {viewMode === 'team' && (
            <div className="min-w-32">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="부서" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'team' ? (
        <>
          {/* Team Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {teamMembers.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      팀원 수
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Umbrella className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {teamMembers.reduce((sum, member) => sum + member.leaveBalance.usedAnnualLeave, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      총 사용 연차
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {teamMembers.reduce((sum, member) => sum + member.leaveBalance.pendingAnnualLeave, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      대기중인 신청
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {teamMembers.length > 0 
                        ? Math.round(teamMembers.reduce((sum, member) => 
                            sum + (member.leaveBalance.usedAnnualLeave / member.leaveBalance.totalAnnualLeave * 100), 0) / teamMembers.length)
                        : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      평균 사용률
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members Table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                팀원 휴가 현황
              </h3>
              
              {teamMembers.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    선택한 조건에 해당하는 팀원이 없습니다.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>팀원</TableHead>
                        <TableHead>직급</TableHead>
                        <TableHead>총 연차</TableHead>
                        <TableHead>사용 연차</TableHead>
                        <TableHead>잔여 연차</TableHead>
                        <TableHead>대기중</TableHead>
                        <TableHead>상세/로그</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => {
                        return (
                          <TableRow key={member._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {member.name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">
                                    {member.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{member.position}</TableCell>
                            <TableCell>{member.leaveBalance.totalAnnualLeave}일</TableCell>
                            <TableCell>{member.leaveBalance.usedAnnualLeave}일</TableCell>
                            <TableCell>{member.leaveBalance.remainingAnnualLeave}일</TableCell>
                            <TableCell>
                              {member.leaveBalance.pendingAnnualLeave > 0 ? (
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                  {member.leaveBalance.pendingAnnualLeave}일
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMemberClick(member)}
                                      >
                                        <Info className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>상세 보기</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewDetail(member)}
                                        disabled={loadingDetail}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>휴가 로그 보기</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Department Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departmentStats.map((dept) => (
              <Card key={dept.department}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {dept.department}
                  </h3>
                  
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      총 인원: {dept.totalMembers}명 (활성: {dept.activeMembers}명)
                    </p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">평균 휴가 사용률</span>
                        <span className="text-sm font-semibold">
                          {dept.avgLeaveUsage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={dept.avgLeaveUsage} 
                        className="mt-2" 
                      />
                    </div>
                    
                    <div className="flex justify-between mt-4">
                      <span className="text-sm">
                        사용: {dept.totalLeaveUsed}일
                      </span>
                      <span className="text-sm">
                        잔여: {dept.totalLeaveRemaining}일
                      </span>
                    </div>
                    
                    <div className="flex justify-between mt-2">
                      <span className="text-sm">
                        대기: {dept.pendingRequests}건
                      </span>
                      <span className="text-sm">
                        승인률: {dept.approvalRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Member Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMember?.name} 휴가 상세 현황
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">
                    기본 정보
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>부서:</strong> {selectedMember.department}
                    </p>
                    <p className="text-sm">
                      <strong>직급:</strong> {selectedMember.position}
                    </p>
                  </div>
                  
                  <h4 className="text-lg font-semibold mb-4 mt-6">
                    휴가 잔여 현황
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>총 연차:</strong> {selectedMember.leaveBalance.totalAnnualLeave}일
                    </p>
                    <p className="text-sm">
                      <strong>사용 연차:</strong> {selectedMember.leaveBalance.usedAnnualLeave}일
                    </p>
                    <p className="text-sm">
                      <strong>잔여 연차:</strong> {selectedMember.leaveBalance.remainingAnnualLeave}일
                    </p>
                    <p className="text-sm">
                      <strong>대기중인 신청:</strong> {selectedMember.leaveBalance.pendingAnnualLeave}일
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-4">
                    최근 휴가 내역
                  </h4>
                  <div className="space-y-3">
                    {selectedMember.recentLeaves.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        최근 휴가 내역이 없습니다.
                      </p>
                    ) : (
                      selectedMember.recentLeaves.slice(0, 5).map((leave, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">
                              {getLeaveTypeLabel(leave.leaveType)} ({leave.daysCount}일)
                            </span>
                            <Badge
                              className={`${getStatusColor(leave.status)} hover:${getStatusColor(leave.status)}`}
                            >
                              {getStatusLabel(leave.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(leave.startDate), 'yyyy.MM.dd')} - {format(new Date(leave.endDate), 'yyyy.MM.dd')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {selectedMember.upcomingLeaves.length > 0 && (
                    <>
                      <h4 className="text-lg font-semibold mb-4 mt-6">
                        예정된 휴가
                      </h4>
                      <div className="space-y-3">
                        {selectedMember.upcomingLeaves.map((leave, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">
                                {getLeaveTypeLabel(leave.leaveType)} ({leave.daysCount}일)
                              </span>
                              <Badge
                                className={`${getStatusColor(leave.status)} hover:${getStatusColor(leave.status)}`}
                              >
                                {getStatusLabel(leave.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(leave.startDate), 'yyyy.MM.dd')} - {format(new Date(leave.endDate), 'yyyy.MM.dd')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCloseDetail}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Leave Log Dialog */}
      <Dialog open={employeeDetailOpen} onOpenChange={setEmployeeDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMember?.name} 휴가 로그 ({selectedYear}년)
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex justify-center items-center min-h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : employeeLeaveLog ? (
            <div className="space-y-6">
              {/* Leave Balance Summary */}
              <Card>
                <CardContent className="p-6">
                  <h4 className="text-lg font-semibold mb-4">
                    휴가 잔여 현황
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">총 연차</p>
                      <p className="text-xl font-semibold">{employeeLeaveLog.balance?.totalAnnualLeave || 0}일</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">사용 연차</p>
                      <p className="text-xl font-semibold">{employeeLeaveLog.balance?.usedAnnualLeave || 0}일</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">잔여 연차</p>
                      <p className="text-xl font-semibold">{employeeLeaveLog.balance?.remainingAnnualLeave || 0}일</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">대기중</p>
                      <p className="text-xl font-semibold">{employeeLeaveLog.balance?.pendingAnnualLeave || 0}일</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave History Table */}
              <div>
                <h4 className="text-lg font-semibold mb-4">
                  휴가 내역
                </h4>
                {employeeLeaveLog.leaveHistory && employeeLeaveLog.leaveHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>휴가 유형</TableHead>
                          <TableHead>시작일</TableHead>
                          <TableHead>종료일</TableHead>
                          <TableHead>일수</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>취소 상태</TableHead>
                          <TableHead>사유</TableHead>
                          <TableHead>신청일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeLeaveLog.leaveHistory.map((leave: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{getLeaveTypeLabel(leave.leaveType)}</TableCell>
                            <TableCell>{format(new Date(leave.startDate), 'yyyy.MM.dd')}</TableCell>
                            <TableCell>{format(new Date(leave.endDate), 'yyyy.MM.dd')}</TableCell>
                            <TableCell>{leave.daysCount}일</TableCell>
                            <TableCell>
                              <Badge
                                className={`${getStatusColor(leave.status)} hover:${getStatusColor(leave.status)}`}
                              >
                                {getStatusLabel(leave.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {leave.cancellationRequested ? (
                                <Badge
                                  className={`
                                    ${leave.cancellationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      leave.cancellationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                      leave.cancellationStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                    } hover:${leave.cancellationStatus === 'pending' ? 'bg-yellow-100' :
                                      leave.cancellationStatus === 'approved' ? 'bg-green-100' :
                                      leave.cancellationStatus === 'rejected' ? 'bg-red-100' : 'bg-blue-100'
                                    }
                                  `}
                                >
                                  {leave.cancellationStatus === 'pending' ? '취소 대기중' :
                                   leave.cancellationStatus === 'approved' ? '취소 승인' :
                                   leave.cancellationStatus === 'rejected' ? '취소 거부' : '취소 신청'}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm truncate max-w-48 block">
                                      {leave.reason || '-'}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{leave.reason || ''}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>{format(new Date(leave.createdAt || leave.requestedAt), 'yyyy.MM.dd')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      해당 연도에 휴가 내역이 없습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                휴가 로그를 불러올 수 없습니다.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button onClick={() => setEmployeeDetailOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamLeaveStatus;