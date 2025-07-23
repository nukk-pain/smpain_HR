import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit,
  Trash2,
  Calculator,
  TrendingUp,
  DollarSign,
  User,
  RefreshCw,
  Download,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { apiService } from '../services/api';
import { useNotification } from './NotificationProvider';
import { useAuth } from './AuthProvider';

interface SalesData {
  _id: string;
  user_id: string;
  employee_name: string;
  department: string;
  sales_amount: number;
  target_amount: number;
  achievement_rate: number;
  incentive_rate: number;
  calculated_incentive: number;
  year_month: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface SalesFormData {
  user_id: string;
  sales_amount: number;
  target_amount: number;
  notes: string;
  year_month: string;
}

interface IncentiveSimulation {
  sales_amount: number;
  incentive_amount: number;
  achievement_rate: number;
  bonus_tier: string;
  total_commission: number;
}

interface SalesManagementProps {
  yearMonth: string;
}

const SalesManagement: React.FC<SalesManagementProps> = ({ yearMonth }) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSales, setEditingSales] = useState<SalesData | null>(null);
  const [calculatingIncentive, setCalculatingIncentive] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simulation, setSimulation] = useState<IncentiveSimulation | null>(null);
  const [formData, setFormData] = useState<SalesFormData>({
    user_id: '',
    sales_amount: 0,
    target_amount: 0,
    notes: '',
    year_month: yearMonth,
  });

  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Load sales data
  const loadSalesData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getSalesData(yearMonth);
      if (response.success) {
        setSalesData(response.data || []);
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [yearMonth, showNotification]);

  // Load employees
  const loadEmployees = useCallback(async () => {
    try {
      const response = await apiService.getUsers();
      if (response.success) {
        setEmployees(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }, []);

  useEffect(() => {
    loadSalesData();
    loadEmployees();
  }, [loadSalesData, loadEmployees]);

  // Handle form changes
  const handleFormChange = (field: keyof SalesFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.user_id || !formData.sales_amount) {
      showNotification('warning', 'Warning', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingSales) {
        await apiService.put(`/payroll/sales/${editingSales._id}`, formData);
        showNotification('success', 'Success', 'Sales data updated successfully');
      } else {
        await apiService.post('/payroll/sales', formData);
        showNotification('success', 'Success', 'Sales data added successfully');
      }
      
      setDialogOpen(false);
      setEditingSales(null);
      resetForm();
      loadSalesData();
    } catch (error) {
      showNotification('error', 'Error', 'Failed to save sales data');
    }
  };

  // Handle edit
  const handleEdit = (sales: SalesData) => {
    setEditingSales(sales);
    setFormData({
      user_id: sales.user_id,
      sales_amount: sales.sales_amount,
      target_amount: sales.target_amount,
      notes: sales.notes,
      year_month: sales.year_month,
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (salesId: string) => {
    if (!confirm('Are you sure you want to delete this sales record?')) return;

    try {
      await apiService.delete(`/payroll/sales/${salesId}`);
      showNotification('success', 'Success', 'Sales record deleted successfully');
      loadSalesData();
    } catch (error) {
      showNotification('error', 'Error', 'Failed to delete sales record');
    }
  };

  // Calculate incentive
  const handleCalculateIncentive = async (sales: SalesData) => {
    setCalculatingIncentive(true);
    try {
      const response = await apiService.calculateIncentive(
        sales.user_id,
        sales.year_month,
        sales.sales_amount
      );
      
      if (response.success) {
        setSimulation(response.data);
        setSimulationOpen(true);
        showNotification('success', 'Success', 'Incentive calculated successfully');
      }
    } catch (error) {
      showNotification('error', 'Error', 'Failed to calculate incentive');
    } finally {
      setCalculatingIncentive(false);
    }
  };

  // Batch calculate all incentives
  const handleBatchCalculateIncentives = async () => {
    if (!confirm('Calculate incentives for all employees this month?')) return;

    setCalculatingIncentive(true);
    try {
      const promises = salesData.map(sales => 
        apiService.calculateIncentive(sales.user_id, sales.year_month, sales.sales_amount)
      );
      
      await Promise.all(promises);
      showNotification('success', 'Success', 'All incentives calculated successfully');
      loadSalesData();
    } catch (error) {
      showNotification('error', 'Error', 'Failed to calculate incentives');
    } finally {
      setCalculatingIncentive(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      user_id: '',
      sales_amount: 0,
      target_amount: 0,
      notes: '',
      year_month: yearMonth,
    });
  };

  // Calculate totals
  const totals = salesData.reduce((acc, sales) => {
    acc.totalSales += sales.sales_amount;
    acc.totalTarget += sales.target_amount;
    acc.totalIncentive += sales.calculated_incentive;
    acc.avgAchievementRate += sales.achievement_rate;
    return acc;
  }, { totalSales: 0, totalTarget: 0, totalIncentive: 0, avgAchievementRate: 0 });

  if (salesData.length > 0) {
    totals.avgAchievementRate = totals.avgAchievementRate / salesData.length;
  }

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    format?: 'currency' | 'percent';
  }> = ({ title, value, icon, color, format = 'currency' }) => {
    const formatValue = (val: number) => {
      if (format === 'percent') {
        return `${val.toFixed(1)}%`;
      }
      return `${val.toLocaleString()}원`;
    };

    const iconColorClass = color === 'primary' ? 'text-blue-500' : 
                          color === 'secondary' ? 'text-purple-500' : 
                          color === 'success' ? 'text-green-500' : 
                          color === 'warning' ? 'text-yellow-500' : 'text-gray-500';

    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {title}
              </p>
              <div className="text-2xl font-semibold">
                {formatValue(value)}
              </div>
            </div>
            <div className={cn(iconColorClass, 'text-3xl')}>
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
          {format(new Date(yearMonth + '-01'), 'yyyy년 MM월')} 매출 관리
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadSalesData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button
            variant="outline"
            onClick={handleBatchCalculateIncentives}
            disabled={calculatingIncentive || salesData.length === 0}
          >
            {calculatingIncentive ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            전체 인센티브 계산
          </Button>
          <Button
            onClick={() => {
              setEditingSales(null);
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            매출 추가
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="총 매출"
          value={totals.totalSales}
          icon={<DollarSign />}
          color="primary"
        />
        <StatCard
          title="총 목표"
          value={totals.totalTarget}
          icon={<BarChart3 />}
          color="info"
        />
        <StatCard
          title="총 인센티브"
          value={totals.totalIncentive}
          icon={<DollarSign />}
          color="success"
        />
        <StatCard
          title="평균 달성률"
          value={totals.avgAchievementRate}
          icon={<TrendingUp />}
          color="warning"
          format="percent"
        />
      </div>

      {/* Sales Data Table */}
      <Card>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직원명</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead className="text-right">매출</TableHead>
                  <TableHead className="text-right">목표</TableHead>
                  <TableHead className="text-right">달성률</TableHead>
                  <TableHead className="text-right">인센티브율</TableHead>
                  <TableHead className="text-right">계산된 인센티브</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead className="text-center">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((sales) => (
                  <TableRow key={sales._id}>
                    <TableCell>{sales.employee_name}</TableCell>
                    <TableCell>{sales.department}</TableCell>
                    <TableCell className="text-right">{sales.sales_amount.toLocaleString()}원</TableCell>
                    <TableCell className="text-right">{sales.target_amount.toLocaleString()}원</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={
                        sales.achievement_rate >= 100 ? 'default' :
                        sales.achievement_rate >= 80 ? 'secondary' : 'destructive'
                      }>
                        {sales.achievement_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{sales.incentive_rate.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${
                        sales.calculated_incentive > 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {sales.calculated_incentive.toLocaleString()}원
                      </span>
                    </TableCell>
                    <TableCell>{sales.notes}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(sales)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>수정</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCalculateIncentive(sales)}
                                disabled={calculatingIncentive}
                              >
                                <Calculator className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>인센티브 계산</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(sales._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>삭제</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {salesData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      <Alert>
                        <AlertDescription>
                          매출 데이터가 없습니다. 새로운 매출 데이터를 추가해보세요.
                        </AlertDescription>
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSales ? '매출 데이터 수정' : '매출 데이터 추가'}
            </DialogTitle>
            <DialogDescription>
              매출 데이터를 {editingSales ? '수정' : '추가'}하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">직원 선택</Label>
              <Select value={formData.user_id} onValueChange={(value) => handleFormChange('user_id', value)}>
                <SelectTrigger>
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
              <Label htmlFor="sales_amount">매출 금액</Label>
              <Input
                id="sales_amount"
                type="number"
                value={formData.sales_amount}
                onChange={(e) => handleFormChange('sales_amount', Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_amount">목표 금액</Label>
              <Input
                id="target_amount"
                type="number"
                value={formData.target_amount}
                onChange={(e) => handleFormChange('target_amount', Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achievement_rate">달성률</Label>
              <Input
                id="achievement_rate"
                type="text"
                value={formData.target_amount > 0 ? 
                  ((formData.sales_amount / formData.target_amount) * 100).toFixed(1) + '%' : '0%'
                }
                readOnly
              />
              <p className="text-sm text-gray-600">매출 금액과 목표 금액을 기준으로 자동 계산됩니다</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">비고</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="추가 정보나 특이사항을 입력하세요"
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
          <Button onClick={handleSubmit}>
            {editingSales ? '수정' : '추가'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Incentive Simulation Dialog */}
      <Dialog open={simulationOpen} onOpenChange={setSimulationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>인센티브 계산 결과</DialogTitle>
          </DialogHeader>
          {simulation && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  인센티브가 성공적으로 계산되었습니다!
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">매출 금액</p>
                  <p className="text-lg font-semibold">
                    {simulation.sales_amount.toLocaleString()}원
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">달성률</p>
                  <p className="text-lg font-semibold">
                    {simulation.achievement_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">인센티브 금액</p>
                  <p className="text-lg font-semibold text-green-600">
                    {simulation.incentive_amount.toLocaleString()}원
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">보너스 등급</p>
                  <p className="text-lg font-semibold">
                    {simulation.bonus_tier}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">총 커미션</p>
                <p className="text-xl font-bold text-blue-600">
                  {simulation.total_commission.toLocaleString()}원
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSimulationOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesManagement;