import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ArrowLeftRight as SwapHorizIcon,
  X as CancelIcon,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNotification } from './NotificationProvider';
import { ApiService } from '../services/api';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  hireDate: string;
  yearsOfService: number;
}

interface LeaveStatus {
  baseAnnualLeave: number;
  carryOverLeave: number;
  totalAdjustments: number;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  remainingAnnualLeave: number;
}

interface AdjustmentHistory {
  _id: string;
  type: 'add' | 'subtract' | 'carry_over' | 'cancel_usage';
  amount: number;
  reason: string;
  adjustedBy: string;
  adjustedByName: string;
  adjustedAt: string;
  beforeBalance: number;
  afterBalance: number;
}

interface EmployeeLeaveDetails {
  employee: Employee;
  leaveStatus: LeaveStatus;
  adjustmentHistory: AdjustmentHistory[];
}

interface LeaveAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onAdjustmentComplete: () => void;
}

const LeaveAdjustmentDialog: React.FC<LeaveAdjustmentDialogProps> = ({
  open,
  onClose,
  employeeId,
  employeeName,
  onAdjustmentComplete
}) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeLeaveDetails | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'carry_over' | 'cancel_usage'>('add');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const apiService = new ApiService();

  useEffect(() => {
    if (open && employeeId) {
      loadEmployeeDetails();
    }
  }, [open, employeeId]);

  const loadEmployeeDetails = async () => {
    try {
      setDetailsLoading(true);
      const response = await apiService.getEmployeeLeaveDetails(employeeId);
      console.log('Employee details received:', response.data);
      setEmployeeDetails(response.data);
    } catch (error) {
      console.error('Error loading employee details:', error);
      showError('직원 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      showError('조정 일수를 입력해주세요.');
      return;
    }

    if (!reason.trim()) {
      showError('조정 사유를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await apiService.adjustEmployeeLeave(employeeId, {
        type: adjustmentType,
        amount: amount,
        reason: reason.trim()
      });

      showSuccess('연차 조정이 완료되었습니다.');
      onAdjustmentComplete();
      handleClose();
    } catch (error: any) {
      console.error('Error adjusting leave:', error);
      const errorMessage = error.response?.data?.error || '연차 조정 중 오류가 발생했습니다.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount(0);
    setReason('');
    setAdjustmentType('add');
    setPreviewMode(false);
    onClose();
  };

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case 'add':
        return '추가 지급';
      case 'subtract':
        return '차감';
      case 'carry_over':
        return '이월 조정';
      case 'cancel_usage':
        return '사용 취소';
      default:
        return type;
    }
  };

  const getAdjustmentTypeIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
      case 'subtract':
        return <TrendingDownIcon className="h-4 w-4 text-red-600" />;
      case 'carry_over':
        return <SwapHorizIcon className="h-4 w-4 text-blue-600" />;
      case 'cancel_usage':
        return <CancelIcon className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'success';
      case 'subtract':
        return 'error';
      case 'carry_over':
        return 'info';
      case 'cancel_usage':
        return 'warning';
      default:
        return 'default';
    }
  };

  const calculatePreviewBalance = () => {
    if (!employeeDetails) return 0;
    const adjustmentAmount = adjustmentType === 'add' ? amount : -amount;
    return (employeeDetails?.leaveInfo?.currentBalance || 0) + adjustmentAmount;
  };

  if (detailsLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            ⚙️ {employeeName}님 연차 조정
          </DialogTitle>
        </DialogHeader>
        {employeeDetails && employeeDetails.leaveInfo ? (
          <div className="space-y-6 mt-4">
            {/* 현재 연차 현황 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                현재 연차 현황
              </h3>
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">기본 연차</p>
                      <p className="text-xl font-semibold">
                        {employeeDetails?.leaveInfo?.annualEntitlement || 0}일
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({employeeDetails?.employee?.yearsOfService || 0}년차)
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">이월 연차</p>
                      <p className="text-xl font-semibold">0일</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">조정 연차</p>
                      <p className="text-xl font-semibold text-blue-600">
                        {employeeDetails?.adjustments?.length || 0}건
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">총 연차</p>
                      <p className="text-xl font-semibold text-blue-600">
                        {employeeDetails?.leaveInfo?.annualEntitlement || 0}일
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">사용 연차</p>
                      <p className="text-xl font-semibold">
                        {employeeDetails?.leaveInfo?.totalUsedThisYear || 0}일
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">잔여 연차</p>
                      <p className="text-xl font-semibold text-green-600">
                        {employeeDetails?.leaveInfo?.currentBalance || 0}일
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="border-b"></div>

            {/* 조정 옵션 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                🔧 조정 옵션
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustmentType">조정 유형</Label>
                  <Select value={adjustmentType} onValueChange={(value) => setAdjustmentType(value as any)}>
                    <SelectTrigger id="adjustmentType">
                      <SelectValue placeholder="조정 유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">추가 지급</SelectItem>
                      <SelectItem value="subtract">차감</SelectItem>
                      <SelectItem value="carry_over">이월 조정</SelectItem>
                      <SelectItem value="cancel_usage">사용 취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">조정 일수</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={0}
                    max={50}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reason">조정 사유</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="연차 조정 사유를 입력하세요..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* 미리보기 */}
            {amount > 0 && (
              <div>
                <Alert>
                  <AlertDescription>
                    <strong>조정 미리보기:</strong><br />
                    현재 잔여 연차: {employeeDetails?.leaveInfo?.currentBalance || 0}일<br />
                    조정 후 잔여 연차: {calculatePreviewBalance()}일<br />
                    변경량: {adjustmentType === 'add' ? '+' : '-'}{amount}일
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* 조정 히스토리 */}
            {(employeeDetails?.adjustments?.length || 0) > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  조정 히스토리
                </h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead className="text-center">일수</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>조정자</TableHead>
                        <TableHead className="text-center">조정 전</TableHead>
                        <TableHead className="text-center">조정 후</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(employeeDetails?.adjustments || []).slice(0, 5).map((adjustment) => (
                        <TableRow key={adjustment._id}>
                          <TableCell>
                            {format(new Date(adjustment.adjustedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getAdjustmentTypeIcon(adjustment.type)}
                              {getAdjustmentTypeLabel(adjustment.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {adjustment.type === 'add' ? '+' : '-'}{adjustment.amount}일
                          </TableCell>
                          <TableCell>{adjustment.reason}</TableCell>
                          <TableCell>{adjustment.adjustedByName}</TableCell>
                          <TableCell className="text-center">{adjustment.beforeBalance}일</TableCell>
                          <TableCell className="text-center">{adjustment.afterBalance}일</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        ) : (
          !detailsLoading && (
            <Alert>
              <AlertDescription>
                직원 연차 정보를 불러올 수 없습니다.
              </AlertDescription>
            </Alert>
          )
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>취소</Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !amount || !reason.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '적용하기'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default LeaveAdjustmentDialog;