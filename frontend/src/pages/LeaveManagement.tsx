import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Calendar,
  User,
  Clock,
  TrendingUp,
  AlertTriangle,
  Umbrella,
  Stethoscope,
  CalendarDays,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { ko } from 'date-fns/locale';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';
import { useAuth } from '@/components/AuthProvider';
import { useNotification } from '@/components/NotificationProvider';
import { ApiService } from '@/services/api';
import { LeaveRequest, LeaveBalance, LeaveForm, LeaveApprovalForm } from '@/types';
import { useConfig, useConfigProps } from '@/hooks/useConfig';
import { LeaveType, LeaveStatus } from '@/types/config';

const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { leave, date, message } = useConfig();
  const { getLeaveSelectProps, getStatusChipProps } = useConfigProps();
  const [activeTab, setActiveTab] = useState('requests');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState<LeaveForm>({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    substituteEmployee: ''
  });
  
  // Cancellation states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationHistory, setCancellationHistory] = useState<LeaveRequest[]>([]);

  const apiService = new ApiService();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadLeaveRequests(),
        loadLeaveBalance(),
        loadCancellationHistory()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await apiService.getLeaveRequests();
      setLeaveRequests(response.data || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
  };

  const loadLeaveBalance = async () => {
    try {
      const response = await apiService.getLeaveBalance();
      setLeaveBalance(response.data);
    } catch (error) {
      console.error('Error loading leave balance:', error);
    }
  };

  const loadCancellationHistory = async () => {
    try {
      const response = await apiService.getCancellationHistory();
      setCancellationHistory(response.data || []);
    } catch (error) {
      console.error('Error loading cancellation history:', error);
    }
  };

  const handleOpenDialog = (request?: LeaveRequest) => {
    if (request) {
      setEditingRequest(request);
      setFormData({
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        substituteEmployee: request.substituteEmployee || ''
      });
    } else {
      setEditingRequest(null);
      setFormData({
        leaveType: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
        substituteEmployee: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRequest(null);
    setFormData({
      leaveType: 'annual',
      startDate: '',
      endDate: '',
      reason: '',
      substituteEmployee: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingRequest) {
        await apiService.updateLeaveRequest(editingRequest.id, formData);
        showSuccess('휴가 신청이 수정되었습니다.');
      } else {
        await apiService.createLeaveRequest(formData);
        showSuccess('휴가 신청이 완료되었습니다.');
      }
      handleCloseDialog();
      await loadData();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showError('휴가 신청 처리 중 오류가 발생했습니다.');
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'annual':
        return <Umbrella className="h-4 w-4 text-blue-500" />;
      case 'sick':
        return <Stethoscope className="h-4 w-4 text-red-500" />;
      case 'personal':
        return <User className="h-4 w-4 text-green-500" />;
      case 'special':
        return <CalendarDays className="h-4 w-4 text-purple-500" />;
      case 'substitute':
        return <Briefcase className="h-4 w-4 text-orange-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      annual: '연차',
      sick: '병가',
      personal: '개인휴가',
      special: '특별휴가'
    };
    return typeMap[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: '대기중',
      approved: '승인됨',
      rejected: '거부됨',
      cancelled: '취소됨'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const safeFormatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'yyyy-MM-dd');
    } catch (error) {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          휴가 관리
        </h1>
        {user?.role !== 'admin' && (
          <Button
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            휴가 신청
          </Button>
        )}
      </div>

      {/* 휴가 잔여일수 카드 - admin은 휴가가 없으므로 표시하지 않음 */}
      {leaveBalance && user?.role !== 'admin' && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              📊 내 휴가 현황 ({leaveBalance.year}년)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">연차 사용률</p>
                  <p className="text-2xl font-bold">
                    {leaveBalance.usedAnnualLeave}/{leaveBalance.totalAnnualLeave}일
                  </p>
                  <Progress 
                    value={(leaveBalance.usedAnnualLeave / leaveBalance.totalAnnualLeave) * 100}
                    className="mt-2 h-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">총 연차</p>
                  <p className="text-lg font-semibold">
                    {leaveBalance.totalAnnualLeave}일
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">사용 연차</p>
                  <p className="text-lg font-semibold">
                    {leaveBalance.usedAnnualLeave}일
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">잔여 연차</p>
                  <p className="text-lg font-semibold">
                    {leaveBalance.remainingAnnualLeave}일
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">대기중 신청</p>
                  <p className="text-lg font-semibold">
                    {leaveBalance.pendingAnnualLeave || 0}일
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 탭 네비게이션 */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="requests">내 휴가 신청</TabsTrigger>
              <TabsTrigger value="statistics">휴가 통계</TabsTrigger>
              <TabsTrigger value="history">취소 내역</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">내 휴가 신청 현황</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>휴가 종류</TableHead>
                        <TableHead>시작일</TableHead>
                        <TableHead>종료일</TableHead>
                        <TableHead>일수</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getLeaveTypeIcon(request.leaveType)}
                              {getLeaveTypeLabel(request.leaveType)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {safeFormatDate(request.startDate)} ~{' '}
                            {safeFormatDate(request.endDate)}
                          </TableCell>
                          <TableCell>{request.daysCount}일</TableCell>
                          <TableCell>{request.reason}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(request.status)}>
                              {getStatusLabel(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenDialog(request)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>수정</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="statistics" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">휴가 통계</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">총 신청</div>
                      <div className="text-sm text-muted-foreground">
                        {leaveRequests.length}건
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">승인됨</div>
                      <div className="text-sm text-muted-foreground">
                        {leaveRequests.filter(r => r.status === 'approved').length}건
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">대기중</div>
                      <div className="text-sm text-muted-foreground">
                        {leaveRequests.filter(r => r.status === 'pending').length}건
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">거부됨</div>
                      <div className="text-sm text-muted-foreground">
                        {leaveRequests.filter(r => r.status === 'rejected').length}건
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">취소 내역</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>휴가 종류</TableHead>
                        <TableHead>기간</TableHead>
                        <TableHead>일수</TableHead>
                        <TableHead>취소 사유</TableHead>
                        <TableHead>취소일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancellationHistory.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getLeaveTypeIcon(request.leaveType)}
                              {getLeaveTypeLabel(request.leaveType)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.startDate === request.endDate
                              ? safeFormatDate(request.startDate)
                              : `${safeFormatDate(request.startDate)} ~ ${safeFormatDate(request.endDate)}`
                            }
                          </TableCell>
                          <TableCell>{request.daysCount}일</TableCell>
                          <TableCell>{request.cancellationReason || '-'}</TableCell>
                          <TableCell>{safeFormatDate(request.cancelledAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 휴가 신청 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRequest ? '휴가 신청 수정' : '새 휴가 신청'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="leaveType">휴가 종류</Label>
              <Select value={formData.leaveType} onValueChange={(value) => setFormData({...formData, leaveType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="휴가 종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">연차</SelectItem>
                  <SelectItem value="sick">병가</SelectItem>
                  <SelectItem value="personal">개인휴가</SelectItem>
                  <SelectItem value="special">특별휴가</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="reason">사유</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="휴가 사유를 입력하세요"
              />
            </div>
            {!formData.startDate && (
              <Alert>
                <AlertDescription>
                  시작일을 선택해주세요.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              취소
            </Button>
            <Button onClick={handleSubmit}>
              {editingRequest ? '수정하기' : '신청하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagement;