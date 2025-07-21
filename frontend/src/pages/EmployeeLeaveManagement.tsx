import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Check,
  X,
  Calendar,
  User,
  Umbrella,
  Stethoscope,
  CalendarDays,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import { apiService } from '../services/api';

interface LeaveRequest {
  _id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  submittedAt: string;
  createdAt: string;
  daysCount: number;
  requestDetails?: string;
  cancellationRequested?: boolean;
  cancellationReason?: string;
  cancellationRequestedAt?: string;
  cancellationStatus?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalComment?: string;
}

const EmployeeLeaveManagement: React.FC = () => {
  // Tab management
  const [activeTab, setActiveTab] = useState('approval');
  
  // Leave requests data
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [pendingCancellations, setPendingCancellations] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Approval dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  
  // Legacy reject dialog (keep for compatibility)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const loadPendingRequests = async () => {
    try {
      if (user?.role === 'admin') {
        const response = await apiService.getPendingLeaveRequests();
        setPendingRequests(response.data || []);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
      showError('승인 대기 휴가 목록을 불러오는데 실패했습니다.');
    }
  };

  const loadPendingCancellations = async () => {
    try {
      if (user?.role === 'admin' || user?.role === 'manager') {
        const response = await apiService.getPendingCancellations();
        setPendingCancellations(response.data || []);
      }
    } catch (error) {
      console.error('Error loading pending cancellations:', error);
      showError('취소 승인 대기 목록을 불러오는데 실패했습니다.');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPendingRequests(),
        loadPendingCancellations()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadData();
    }
  }, [user]);

  // New approval dialog handlers
  const handleOpenApprovalDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setApprovalComment('');
    setApprovalDialogOpen(true);
  };

  const handleCloseApprovalDialog = () => {
    setApprovalDialogOpen(false);
    setSelectedRequest(null);
    setApprovalComment('');
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;

    try {
      await apiService.approveLeaveRequest(selectedRequest._id, action, approvalComment);
      showSuccess(
        action === 'approve' ? '휴가가 승인되었습니다.' : '휴가가 거부되었습니다.'
      );
      handleCloseApprovalDialog();
      await loadData();
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      const errorMessage = error.response?.data?.error || '승인 처리 중 오류가 발생했습니다.';
      showError(errorMessage);
    }
  };

  const handleCancellationApproval = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await apiService.approveLeaveCancellation(requestId, action, approvalComment);
      showSuccess(
        action === 'approve' ? '휴가 취소가 승인되었습니다.' : '휴가 취소가 거부되었습니다.'
      );
      handleCloseApprovalDialog();
      await loadData();
    } catch (error: any) {
      console.error('Error approving cancellation:', error);
      const errorMessage = error.response?.data?.error || '취소 승인 처리 중 오류가 발생했습니다.';
      showError(errorMessage);
    }
  };

  // Legacy handlers (keep for compatibility)
  const handleApprove = async (requestId: string) => {
    try {
      await apiService.approveLeave(requestId, { status: 'approved' });
      showSuccess('휴가 신청이 승인되었습니다.');
      loadData();
    } catch (error) {
      showError('휴가 승인 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async () => {
    try {
      await apiService.approveLeave(selectedRequestId, { 
        status: 'rejected', 
        rejectReason 
      });
      showSuccess('휴가 신청이 거부되었습니다.');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedRequestId('');
      loadData();
    } catch (error) {
      showError('휴가 거부 중 오류가 발생했습니다.');
    }
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectDialogOpen(true);
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'annual':
        return <Umbrella className="h-5 w-5 text-blue-500" />;
      case 'sick':
        return <Stethoscope className="h-5 w-5 text-red-500" />;
      case 'personal':
        return <User className="h-5 w-5 text-orange-500" />;
      case 'special':
        return <CalendarDays className="h-5 w-5 text-purple-500" />;
      case 'substitute':
        return <Briefcase className="h-5 w-5 text-gray-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-400" />;
    }
  };

  const getLeaveTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      annual: '연차',
      sick: '병가',
      personal: '개인사유',
      special: '특별휴가',
      substitute: '대체휴무'
    };
    return types[type] || type;
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

  const getLeaveTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      annual: '연차',
      sick: '병가',
      personal: '개인사유',
      special: '특별휴가',
      substitute: '대체휴무',
      family: '가족돌봄휴가'
    };
    return types[type] || type;
  };

  const safeFormatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('ko-KR');
    } catch (error) {
      return '-';
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            접근 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-blue-600">
        👥 직원 휴가 관리
      </h1>

      <Card>
        <CardContent className="p-6">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="approval" className="flex items-center gap-2">
                승인 관리
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cancellation" className="flex items-center gap-2">
                취소 승인
                {pendingCancellations.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600">
                    {pendingCancellations.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {loading && (
              <div className="mt-4">
                <Progress value={50} className="h-2" />
              </div>
            )}

            {/* Approval Management Tab */}
            <TabsContent value="approval" className="mt-6">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <p className="text-muted-foreground">
                    승인 대기 중인 휴가 신청이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>신청자</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead>휴가 종류</TableHead>
                        <TableHead>기간</TableHead>
                        <TableHead>일수</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>신청일</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {request.userName?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              {request.userName || '사용자 정보 없음'}
                            </div>
                          </TableCell>
                          <TableCell>{request.userDepartment || '부서 정보 없음'}</TableCell>
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
                          <TableCell>{request.daysCount || 0}일</TableCell>
                          <TableCell>{request.reason || '-'}</TableCell>
                          <TableCell>
                            {safeFormatDate(request.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (request) {
                                          setSelectedRequest(request);
                                          handleApproval('approve');
                                        }
                                      }}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>승인</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => request && handleOpenApprovalDialog(request)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>거부</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Cancellation Approval Tab */}
            <TabsContent value="cancellation" className="mt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>직원명</TableHead>
                      <TableHead>휴가 종류</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead>일수</TableHead>
                      <TableHead>원래 사유</TableHead>
                      <TableHead>취소 사유</TableHead>
                      <TableHead>취소 신청일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCancellations.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {request.userName?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {request.userName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {request.userDepartment}
                              </div>
                            </div>
                          </div>
                        </TableCell>
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
                        <TableCell>
                          <div className="text-sm max-w-48 truncate">
                            {request.reason}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-48 truncate">
                            {request.cancellationReason}
                          </div>
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(request.cancellationRequestedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setApprovalComment('');
                                      setApprovalDialogOpen(true);
                                    }}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>취소 승인</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setApprovalComment('');
                                      setApprovalDialogOpen(true);
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>취소 거부</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingCancellations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <p className="text-muted-foreground">
                            대기 중인 취소 신청이 없습니다.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 신청 거부</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">거부 사유</Label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거부 사유를 입력해주세요..."
                className="mt-1 w-full p-2 border border-input rounded-md bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRejectDialogOpen(false)} variant="outline">
              취소
            </Button>
            <Button 
              onClick={handleReject} 
              variant="destructive"
              disabled={!rejectReason.trim()}
            >
              거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.cancellationRequested ? '휴가 취소 승인 관리' : '휴가 승인 관리'}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">
                  {selectedRequest.cancellationRequested 
                    ? `${selectedRequest.userName}님의 휴가 취소 신청`
                    : `${selectedRequest.userName}님의 휴가 신청`
                  }
                </h4>
                <p className="text-sm text-muted-foreground">
                  {getLeaveTypeLabel(selectedRequest.leaveType)} • {selectedRequest.daysCount}일 • {' '}
                  {safeFormatDate(selectedRequest.startDate)} ~ {' '}
                  {safeFormatDate(selectedRequest.endDate)}
                </p>
                <p className="text-sm mt-2">
                  <strong>사유:</strong> {selectedRequest.reason}
                </p>
                {selectedRequest.cancellationRequested && selectedRequest.cancellationReason && (
                  <p className="text-sm mt-2">
                    <strong>취소 사유:</strong> {selectedRequest.cancellationReason}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="approval-comment">
                  {selectedRequest.cancellationRequested ? "취소 승인/거부 사유" : "승인/거부 사유"}
                </Label>
                <textarea
                  id="approval-comment"
                  rows={3}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="mt-1 w-full p-2 border border-input rounded-md bg-background"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCloseApprovalDialog} variant="outline">
              취소
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest?.cancellationRequested) {
                  handleCancellationApproval(selectedRequest._id, 'reject');
                } else {
                  handleApproval('reject');
                }
              }}
              variant="destructive"
            >
              {selectedRequest?.cancellationRequested ? '취소 거부' : '거부'}
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest?.cancellationRequested) {
                  handleCancellationApproval(selectedRequest._id, 'approve');
                } else {
                  handleApproval('approve');
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {selectedRequest?.cancellationRequested ? '취소 승인' : '승인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeLeaveManagement;