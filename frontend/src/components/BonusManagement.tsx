import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit as EditIcon,
  Trash2,
  DollarSign,
  Trophy,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import { useAuth } from './AuthProvider';

interface Bonus {
  _id: string;
  user_id: string;
  employee_name: string;
  department: string;
  type: 'bonus' | 'award';
  amount: number;
  reason: string;
  date: string;
  year_month: string;
  created_by: string;
  created_at: string;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
}

interface BonusFormData {
  user_id: string;
  type: 'bonus' | 'award';
  amount: number;
  reason: string;
  date: string;
  year_month: string;
}

interface BonusManagementProps {
  yearMonth: string;
}

const BonusManagement: React.FC<BonusManagementProps> = ({ yearMonth }) => {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);
  const [formData, setFormData] = useState<BonusFormData>({
    user_id: '',
    type: 'bonus',
    amount: 0,
    reason: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    year_month: yearMonth,
  });
  const [filterType, setFilterType] = useState<'all' | 'bonus' | 'award'>('all');
  const [filterApproved, setFilterApproved] = useState<'all' | 'approved' | 'pending'>('all');

  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Load bonuses
  const loadBonuses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get(`/payroll/bonuses/${yearMonth}`);
      if (response.success) {
        setBonuses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load bonuses');
    } finally {
      setLoading(false);
    }
  }, [yearMonth, showNotification]);

  // Load employees
  const loadEmployees = useCallback(async () => {
    try {
      const response = await apiService.getUsers();
      if (response.success) {
        setEmployees(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }, []);

  useEffect(() => {
    loadBonuses();
    loadEmployees();
  }, [loadBonuses, loadEmployees]);

  // Handle form changes
  const handleFormChange = (field: keyof BonusFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.user_id || !formData.amount || !formData.reason) {
      showNotification('warning', 'Warning', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingBonus) {
        await apiService.put(`/payroll/bonus/${editingBonus._id}`, formData);
        showNotification('success', 'Success', 'Bonus updated successfully');
      } else {
        await apiService.addBonus(formData);
        showNotification('success', 'Success', 'Bonus added successfully');
      }
      
      setDialogOpen(false);
      setEditingBonus(null);
      resetForm();
      loadBonuses();
    } catch (error) {
      showNotification('error', 'Error', 'Failed to save bonus');
    }
  };

  // Handle edit
  const handleEdit = (bonus: Bonus) => {
    setEditingBonus(bonus);
    setFormData({
      user_id: bonus.user_id,
      type: bonus.type,
      amount: bonus.amount,
      reason: bonus.reason,
      date: bonus.date,
      year_month: bonus.year_month,
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (bonusId: string) => {
    if (!confirm('Are you sure you want to delete this bonus?')) return;

    try {
      await apiService.delete(`/payroll/bonus/${bonusId}`);
      showNotification('success', 'Success', 'Bonus deleted successfully');
      loadBonuses();
    } catch (error) {
      showNotification('error', 'Error', 'Failed to delete bonus');
    }
  };

  // Handle approve
  const handleApprove = async (bonusId: string) => {
    try {
      await apiService.put(`/payroll/bonus/${bonusId}/approve`);
      showNotification('success', 'Success', 'Bonus approved successfully');
      loadBonuses();
    } catch (error) {
      showNotification('error', 'Error', 'Failed to approve bonus');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      user_id: '',
      type: 'bonus',
      amount: 0,
      reason: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      year_month: yearMonth,
    });
  };

  // Filter bonuses
  const filteredBonuses = bonuses.filter(bonus => {
    if (filterType !== 'all' && bonus.type !== filterType) return false;
    if (filterApproved !== 'all') {
      if (filterApproved === 'approved' && !bonus.approved) return false;
      if (filterApproved === 'pending' && bonus.approved) return false;
    }
    return true;
  });

  // Calculate totals
  const totals = filteredBonuses.reduce((acc, bonus) => {
    acc.total += bonus.amount;
    if (bonus.type === 'bonus') acc.bonusTotal += bonus.amount;
    if (bonus.type === 'award') acc.awardTotal += bonus.amount;
    if (bonus.approved) acc.approvedTotal += bonus.amount;
    return acc;
  }, { total: 0, bonusTotal: 0, awardTotal: 0, approvedTotal: 0 });

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => {
    const getColorClass = (color: string) => {
      switch (color) {
        case 'primary':
          return 'text-blue-600';
        case 'success':
          return 'text-green-600';
        case 'warning':
          return 'text-yellow-600';
        case 'info':
          return 'text-purple-600';
        default:
          return 'text-gray-600';
      }
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {title}
              </p>
              <p className={`text-2xl font-bold ${getColorClass(color)}`}>
                {value.toLocaleString()}원
              </p>
            </div>
            <div className={`text-3xl ${getColorClass(color)}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })} 성과급 관리
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadBonuses}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button
            onClick={() => {
              setEditingBonus(null);
              resetForm();
              setDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="총 금액"
          value={totals.total}
          icon={<DollarSign />}
          color="primary"
        />
        <StatCard
          title="상여금 총계"
          value={totals.bonusTotal}
          icon={<DollarSign />}
          color="success"
        />
        <StatCard
          title="포상금 총계"
          value={totals.awardTotal}
          icon={<Trophy />}
          color="warning"
        />
        <StatCard
          title="승인된 금액"
          value={totals.approvedTotal}
          icon={<Trophy />}
          color="info"
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5" />
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-type">유형</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type" className="w-32">
                  <SelectValue placeholder="유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="bonus">상여금</SelectItem>
                  <SelectItem value="award">포상금</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-approved">승인상태</Label>
              <Select value={filterApproved} onValueChange={setFilterApproved}>
                <SelectTrigger id="filter-approved" className="w-32">
                  <SelectValue placeholder="승인상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground ml-auto">
              총 {filteredBonuses.length}건
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bonuses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>직원명</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>사유</TableHead>
                <TableHead>지급일</TableHead>
                <TableHead>승인상태</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="text-center">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBonuses.map((bonus) => (
                <TableRow key={bonus._id}>
                  <TableCell>{bonus.employee_name}</TableCell>
                  <TableCell>{bonus.department}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={bonus.type === 'bonus' ? 'default' : 'secondary'}
                      className={bonus.type === 'bonus' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}
                    >
                      {bonus.type === 'bonus' ? '상여금' : '포상금'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{bonus.amount.toLocaleString()}원</TableCell>
                  <TableCell>{bonus.reason}</TableCell>
                  <TableCell>{format(new Date(bonus.date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={bonus.approved ? 'default' : 'secondary'}
                      className={bonus.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {bonus.approved ? '승인됨' : '대기중'}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(bonus.created_at), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(bonus)}
                        className="h-8 w-8 p-0"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      {!bonus.approved && user?.role === 'admin' && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(bonus._id)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bonus._id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBonuses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    <Alert>
                      <AlertDescription>
                        선택한 조건에 해당하는 성과급이 없습니다
                      </AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBonus ? '상여금/포상금 수정' : '상여금/포상금 추가'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="employee-select">직원 선택</Label>
              <Select 
                value={formData.user_id} 
                onValueChange={(value) => handleFormChange('user_id', value)}
              >
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="직원을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.name} ({employee.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type-select">유형</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleFormChange('type', value)}
              >
                <SelectTrigger id="type-select">
                  <SelectValue placeholder="유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">상여금</SelectItem>
                  <SelectItem value="award">포상금</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount-input">금액</Label>
              <Input
                id="amount-input"
                type="number"
                value={formData.amount}
                onChange={(e) => handleFormChange('amount', Number(e.target.value))}
                min="0"
                placeholder="금액을 입력하세요"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-input">지급일</Label>
              <Input
                id="date-input"
                type="date"
                value={formData.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reason-input">사유</Label>
              <Textarea
                id="reason-input"
                value={formData.reason}
                onChange={(e) => handleFormChange('reason', e.target.value)}
                placeholder="상여금/포상금 지급 사유를 입력하세요"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit}>
              {editingBonus ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BonusManagement;