import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  X,
  Download,
  RotateCcw,
  Filter,
  Calendar,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNotification } from '../components/NotificationProvider';
import { useAuth } from '../components/AuthProvider';
import { apiService } from '../services/api';

interface PendingRequest {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  requestedAt: string;
  user: {
    name: string;
    department: string;
    position: string;
  };
}

interface BulkActionResult {
  successful: {
    requestId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    action: string;
  }[];
  failed: {
    requestId: string;
    error: string;
  }[];
}

const AdminBulkOperations: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [bulkComment, setBulkComment] = useState('');
  const [filters, setFilters] = useState({
    department: 'all',
    leaveType: 'all',
    startDate: '',
    endDate: ''
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<BulkActionResult | null>(null);
  const [carryOverDialog, setCarryOverDialog] = useState(false);
  const [carryOverYear, setCarryOverYear] = useState(new Date().getFullYear() - 1);
  const [carryOverProcessing, setCarryOverProcessing] = useState(false);

  useEffect(() => {
    loadPendingRequests();
    loadDepartments();
  }, [filters]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBulkPendingRequests(filters);
      
      if (response.success) {
        setPendingRequests(response.data);
      } else {
        showError('대기중인 휴가 신청을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
      showError('대기중인 휴가 신청을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await apiService.getDepartments();
      if (response.success) {
        const deptNames = response.data.map((dept: any) => dept.name);
        setDepartments(deptNames);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(pendingRequests.map(req => req._id));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests([...selectedRequests, requestId]);
    } else {
      setSelectedRequests(selectedRequests.filter(id => id !== requestId));
    }
  };

  const handleBulkAction = async () => {
    if (selectedRequests.length === 0) {
      showError('처리할 휴가 신청을 선택해주세요.');
      return;
    }

    try {
      setProcessing(true);
      const response = await apiService.bulkApproveRequests(
        selectedRequests,
        bulkAction,
        bulkComment || undefined
      );

      if (response.success) {
        setLastResult(response.data.results);
        showSuccess(`${response.data.successful}건의 휴가 신청이 ${bulkAction === 'approve' ? '승인' : '거부'}되었습니다.`);
        
        // Reset selections and reload data
        setSelectedRequests([]);
        setBulkActionDialog(false);
        setBulkComment('');
        await loadPendingRequests();
      } else {
        showError(response.error || '일괄 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error in bulk action:', error);
      showError('일괄 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      department: 'all',
      leaveType: 'all',
      startDate: '',
      endDate: ''
    });
  };

  const handleCarryOverProcess = async () => {
    try {
      setCarryOverProcessing(true);
      const response = await apiService.post(`/leave/carry-over/${carryOverYear}`, {});
      
      if (response.success) {
        showSuccess(`${carryOverYear}년도 연차 이월 처리가 완료되었습니다.`);
        setCarryOverDialog(false);
      } else {
        showError(response.error || '연차 이월 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error in carry-over process:', error);
      showError('연차 이월 처리 중 오류가 발생했습니다.');
    } finally {
      setCarryOverProcessing(false);
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return '연차';
      case 'sick': return '병가';
      case 'personal': return '개인휴가';
      case 'family': return '경조사';
      default: return type;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Alert>
        <AlertDescription>
          관리자 권한이 필요한 페이지입니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          🔄 휴가 일괄 처리
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setCarryOverDialog(true)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            연차 이월 처리
          </Button>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            필터 초기화
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">
            필터 설정
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department-filter">부서</Label>
              <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger id="department-filter">
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-type-filter">휴가 유형</Label>
              <Select value={filters.leaveType} onValueChange={(value) => handleFilterChange('leaveType', value)}>
                <SelectTrigger id="leave-type-filter">
                  <SelectValue placeholder="휴가 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="annual">연차</SelectItem>
                  <SelectItem value="sick">병가</SelectItem>
                  <SelectItem value="personal">개인휴가</SelectItem>
                  <SelectItem value="family">경조사</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date-filter">시작일 (이후)</Label>
              <Input
                id="start-date-filter"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date-filter">종료일 (이전)</Label>
              <Input
                id="end-date-filter"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {selectedRequests.length > 0 && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedRequests.length}건의 휴가 신청이 선택되었습니다.
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setBulkAction('approve');
                    setBulkActionDialog(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  일괄 승인
                </Button>
                <Button
                  onClick={() => {
                    setBulkAction('reject');
                    setBulkActionDialog(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  일괄 거부
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              대기중인 휴가 신청 ({pendingRequests.length}건)
            </h3>
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          </div>

          {pendingRequests.length === 0 ? (
            <Alert>
              <AlertDescription>
                현재 대기중인 휴가 신청이 없습니다.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRequests.length === pendingRequests.length && pendingRequests.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>직원명</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>직급</TableHead>
                    <TableHead>휴가 유형</TableHead>
                    <TableHead>시작일</TableHead>
                    <TableHead>종료일</TableHead>
                    <TableHead>일수</TableHead>
                    <TableHead>사유</TableHead>
                    <TableHead>신청일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRequests.includes(request._id)}
                          onCheckedChange={(checked) => handleSelectRequest(request._id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>{request.user.name}</TableCell>
                      <TableCell>{request.user.department}</TableCell>
                      <TableCell>{request.user.position}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getLeaveTypeLabel(request.leaveType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(request.startDate), 'yyyy.MM.dd')}</TableCell>
                      <TableCell>{format(new Date(request.endDate), 'yyyy.MM.dd')}</TableCell>
                      <TableCell>{request.daysCount}일</TableCell>
                      <TableCell className="max-w-48">
                        <span className="text-sm truncate block" title={request.reason}>
                          {request.reason}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(request.requestedAt), 'yyyy.MM.dd')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Result Summary */}
      {lastResult && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">
              마지막 처리 결과
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-green-600 mb-2">
                  성공: {lastResult.successful.length}건
                </h4>
                {lastResult.successful.slice(0, 3).map((item, index) => (
                  <p key={index} className="text-sm ml-4">
                    • {item.employeeName} - {getLeaveTypeLabel(item.leaveType)}
                  </p>
                ))}
                {lastResult.successful.length > 3 && (
                  <p className="text-sm ml-4 text-gray-500">
                    외 {lastResult.successful.length - 3}건...
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">
                  실패: {lastResult.failed.length}건
                </h4>
                {lastResult.failed.slice(0, 3).map((item, index) => (
                  <p key={index} className="text-sm ml-4">
                    • {item.error}
                  </p>
                ))}
                {lastResult.failed.length > 3 && (
                  <p className="text-sm ml-4 text-gray-500">
                    외 {lastResult.failed.length - 3}건...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              휴가 신청 일괄 {bulkAction === 'approve' ? '승인' : '거부'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequests.length}건의 휴가 신청을 일괄 {bulkAction === 'approve' ? '승인' : '거부'}하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-comment">코멘트 (선택사항)</Label>
              <Textarea
                id="bulk-comment"
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                placeholder={`일괄 ${bulkAction === 'approve' ? '승인' : '거부'} 사유를 입력하세요.`}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(false)}>취소</Button>
            <Button
              onClick={handleBulkAction}
              disabled={processing}
              className={bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              일괄 {bulkAction === 'approve' ? '승인' : '거부'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carry-over Dialog */}
      <Dialog open={carryOverDialog} onOpenChange={setCarryOverDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              연차 이월 처리
            </DialogTitle>
            <DialogDescription>
              선택한 연도의 미사용 연차를 다음 연도로 이월 처리합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carry-over-year">이월 대상 연도</Label>
              <Select value={carryOverYear.toString()} onValueChange={(value) => setCarryOverYear(Number(value))}>
                <SelectTrigger id="carry-over-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <Alert>
              <AlertDescription>
                이 작업은 모든 직원의 {carryOverYear}년도 미사용 연차를 {carryOverYear + 1}년도로 이월합니다. 
                이미 이월 처리된 연차가 있는 경우 중복 처리되지 않습니다.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertDescription>
                이월 규칙은 현재 설정된 휴가 정책을 따릅니다. (최대 이월 가능 일수 등)
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarryOverDialog(false)}>취소</Button>
            <Button
              onClick={handleCarryOverProcess}
              disabled={carryOverProcessing}
            >
              {carryOverProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              이월 처리 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBulkOperations;