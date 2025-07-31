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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Stack,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  AttachMoney,
  EmojiEvents,
  FilterList,
  Refresh,
} from '@mui/icons-material';
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
  }> = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h5" component="div">
              {value.toLocaleString()}원
            </Typography>
          </Box>
          <Box sx={{ color: `${color}.main`, fontSize: '2rem' }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {format(new Date(yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })} 상여금/포상금 관리
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadBonuses}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingBonus(null);
              resetForm();
              setDialogOpen(true);
            }}
          >
            추가
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
            title="총 금액"
            value={totals.total}
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
            title="상여금 총계"
            value={totals.bonusTotal}
            icon={<AttachMoney />}
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
            title="포상금 총계"
            value={totals.awardTotal}
            icon={<EmojiEvents />}
            color="warning"
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <StatCard
            title="승인된 금액"
            value={totals.approvedTotal}
            icon={<EmojiEvents />}
            color="info"
          />
        </Grid>
      </Grid>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FilterList />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>유형</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              label="유형"
            >
              <MenuItem value="all">전체</MenuItem>
              <MenuItem value="bonus">상여금</MenuItem>
              <MenuItem value="award">포상금</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>승인상태</InputLabel>
            <Select
              value={filterApproved}
              onChange={(e) => setFilterApproved(e.target.value as any)}
              label="승인상태"
            >
              <MenuItem value="all">전체</MenuItem>
              <MenuItem value="approved">승인됨</MenuItem>
              <MenuItem value="pending">대기중</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" sx={{ ml: 'auto' }}>
            총 {filteredBonuses.length}건
          </Typography>
        </Box>
      </Paper>
      {/* Bonuses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>직원명</TableCell>
              <TableCell>부서</TableCell>
              <TableCell>유형</TableCell>
              <TableCell align="right">금액</TableCell>
              <TableCell>사유</TableCell>
              <TableCell>지급일</TableCell>
              <TableCell>승인상태</TableCell>
              <TableCell>등록일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBonuses.map((bonus) => (
              <TableRow key={bonus._id}>
                <TableCell>{bonus.employee_name}</TableCell>
                <TableCell>{bonus.department}</TableCell>
                <TableCell>
                  <Chip
                    label={bonus.type === 'bonus' ? '상여금' : '포상금'}
                    color={bonus.type === 'bonus' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{bonus.amount.toLocaleString()}원</TableCell>
                <TableCell>{bonus.reason}</TableCell>
                <TableCell>{format(new Date(bonus.date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>
                  <Chip
                    label={bonus.approved ? '승인됨' : '대기중'}
                    color={bonus.approved ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{format(new Date(bonus.created_at), 'yyyy-MM-dd')}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="수정">
                      <IconButton size="small" onClick={() => handleEdit(bonus)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!bonus.approved && user?.role === 'admin' && (
                      <Tooltip title="승인">
                        <IconButton 
                          size="small" 
                          onClick={() => handleApprove(bonus._id)}
                          color="success"
                        >
                          <EmojiEvents fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="삭제">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(bonus._id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredBonuses.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Alert severity="info">
                    No bonuses found for the selected criteria
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
          {editingBonus ? '상여금/포상금 수정' : '상여금/포상금 추가'}
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
              <FormControl fullWidth>
                <InputLabel>유형</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleFormChange('type', e.target.value)}
                  label="유형"
                >
                  <MenuItem value="bonus">상여금</MenuItem>
                  <MenuItem value="award">포상금</MenuItem>
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
                label="금액"
                type="number"
                value={formData.amount}
                onChange={(e) => handleFormChange('amount', Number(e.target.value))}
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
                label="지급일"
                type="date"
                value={formData.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="사유"
                multiline
                rows={3}
                value={formData.reason}
                onChange={(e) => handleFormChange('reason', e.target.value)}
                placeholder="상여금/포상금 지급 사유를 입력하세요"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingBonus ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BonusManagement;