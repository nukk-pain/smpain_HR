import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Stack,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Calculate,
  TrendingUp,
  AttachMoney,
  Person,
  Refresh,
  Download,
  Assessment,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
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

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography color="textSecondary" variant="body2" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h5" component="div">
                {formatValue(value)}
              </Typography>
            </Box>
            <Box sx={{ color: `${color}.main`, fontSize: '2rem' }}>
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })} 매출 관리
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSalesData}
          >
            새로고침
          </Button>
          <Button
            variant="outlined"
            startIcon={<Calculate />}
            onClick={handleBatchCalculateIncentives}
            disabled={calculatingIncentive || salesData.length === 0}
          >
            {calculatingIncentive ? <CircularProgress size={20} /> : '전체 인센티브 계산'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingSales(null);
              resetForm();
              setDialogOpen(true);
            }}
          >
            매출 추가
          </Button>
        </Stack>
      </Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="총 매출"
            value={totals.totalSales}
            icon={<AttachMoney />}
            color="primary"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="총 목표"
            value={totals.totalTarget}
            icon={<Assessment />}
            color="info"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="총 인센티브"
            value={totals.totalIncentive}
            icon={<TrendingUp />}
            color="success"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="평균 달성률"
            value={totals.avgAchievementRate}
            icon={<TrendingUp />}
            color="warning"
            format="percent"
          />
        </Grid>
      </Grid>
      {/* Sales Data Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>직원명</TableCell>
              <TableCell>부서</TableCell>
              <TableCell align="right">매출</TableCell>
              <TableCell align="right">목표</TableCell>
              <TableCell align="right">달성률</TableCell>
              <TableCell align="right">인센티브율</TableCell>
              <TableCell align="right">계산된 인센티브</TableCell>
              <TableCell>비고</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {salesData.map((sales) => (
              <TableRow key={sales._id}>
                <TableCell>{sales.employee_name}</TableCell>
                <TableCell>{sales.department}</TableCell>
                <TableCell align="right">{sales.sales_amount.toLocaleString()}원</TableCell>
                <TableCell align="right">{sales.target_amount.toLocaleString()}원</TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${sales.achievement_rate.toFixed(1)}%`}
                    color={
                      sales.achievement_rate >= 100 ? 'success' :
                      sales.achievement_rate >= 80 ? 'warning' : 'error'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{sales.incentive_rate.toFixed(2)}%</TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: sales.calculated_incentive > 0 ? 'success.main' : 'text.secondary'
                    }}
                  >
                    {sales.calculated_incentive.toLocaleString()}원
                  </Typography>
                </TableCell>
                <TableCell>{sales.notes}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="수정">
                      <IconButton size="small" onClick={() => handleEdit(sales)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="인센티브 계산">
                      <IconButton 
                        size="small" 
                        onClick={() => handleCalculateIncentive(sales)}
                        disabled={calculatingIncentive}
                        color="primary"
                      >
                        <Calculate fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(sales._id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {salesData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Alert severity="info">
                    매출 데이터가 없습니다. 새로운 매출 데이터를 추가해보세요.
                  </Alert>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSales ? '매출 데이터 수정' : '매출 데이터 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <FormControl fullWidth>
                <InputLabel>직원 선택</InputLabel>
                <Select
                  value={formData.user_id}
                  onChange={(e) => handleFormChange('user_id', e.target.value)}
                  label="직원 선택"
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee._id} value={employee._id}>
                      {employee.name} ({employee.department})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="매출 금액"
                type="number"
                value={formData.sales_amount}
                onChange={(e) => handleFormChange('sales_amount', Number(e.target.value))}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="목표 금액"
                type="number"
                value={formData.target_amount}
                onChange={(e) => handleFormChange('target_amount', Number(e.target.value))}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                fullWidth
                label="달성률"
                type="text"
                value={formData.target_amount > 0 ? 
                  ((formData.sales_amount / formData.target_amount) * 100).toFixed(1) + '%' : '0%'
                }
                InputProps={{ readOnly: true }}
                helperText="매출 금액과 목표 금액을 기준으로 자동 계산됩니다"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="추가 정보나 특이사항을 입력하세요"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSales ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Incentive Simulation Dialog */}
      <Dialog open={simulationOpen} onClose={() => setSimulationOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>인센티브 계산 결과</DialogTitle>
        <DialogContent>
          {simulation && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={12}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  인센티브가 성공적으로 계산되었습니다!
                </Alert>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  매출 금액
                </Typography>
                <Typography variant="h6">
                  {simulation.sales_amount.toLocaleString()}원
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  달성률
                </Typography>
                <Typography variant="h6">
                  {simulation.achievement_rate.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  인센티브 금액
                </Typography>
                <Typography variant="h6" color="success.main">
                  {simulation.incentive_amount.toLocaleString()}원
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  보너스 등급
                </Typography>
                <Typography variant="h6">
                  {simulation.bonus_tier}
                </Typography>
              </Grid>
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  총 커미션
                </Typography>
                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  {simulation.total_commission.toLocaleString()}원
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulationOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesManagement;