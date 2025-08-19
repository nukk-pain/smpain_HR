/**
 * AI-HEADER
 * @intent: Page for managing employee incentive configurations
 * @domain_meaning: UI for viewing and editing all employee commission settings
 * @misleading_names: None
 * @data_contracts: Uses User and IncentiveConfig types
 * @pii: Shows employee names and IDs
 * @invariants: Admin-only access, valid user selection
 * @rag_keywords: incentive management page, commission settings, admin UI
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Settings,
  Calculate,
  Edit,
  TrendingUp,
  Search,
  PlayArrow,
  Download,
  AttachMoney
} from '@mui/icons-material';
import { format } from 'date-fns';
import { apiService } from '../services/api';
import { useNotification } from '../components/NotificationProvider';
import { useAuth } from '../components/AuthProvider';
import { IncentiveConfig } from '../components/Incentive';
import { 
  INCENTIVE_TYPE_LABELS,
  IncentiveConfig as IIncentiveConfig 
} from '../types/incentive';
import { User } from '../types';

const IncentiveManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [yearMonth, setYearMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { user: currentUser } = useAuth();
  const { showNotification } = useNotification();

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Memoize average rate calculation
  const averageRate = useMemo(() => {
    const rates = users
      .map((u: any) => u.incentiveConfig?.parameters?.rate)
      .filter(r => r !== undefined);
    if (rates.length === 0) return '0%';
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    return `${(avg * 100).toFixed(1)}%`;
  }, [users]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, departmentFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      showNotification('error', 'Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(user => user.department === departmentFilter);
    }

    // Status filter - check incentiveConfig status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        const isActive = (user as any).incentiveConfig?.isActive || false;
        return statusFilter === 'active' ? isActive : !isActive;
      });
    }

    setFilteredUsers(filtered);
  };

  const handleOpenConfig = (user: User) => {
    setSelectedUser(user);
    setConfigDialogOpen(true);
  };

  const handleCloseConfig = () => {
    setSelectedUser(null);
    setConfigDialogOpen(false);
    loadUsers(); // Reload to get updated config
  };

  const handleBatchCalculate = async () => {
    try {
      const response = await apiService.batchCalculateIncentives(yearMonth);
      if (response.success && response.data) {
        const { summary } = response.data;
        showNotification(
          'success',
          'Batch Calculation Complete',
          `Processed: ${summary.processed}, Failed: ${summary.failed}, Total: ${summary.totalAmount.toLocaleString()}원`
        );
        setBatchDialogOpen(false);
      }
    } catch (error) {
      console.error('Batch calculation failed:', error);
      showNotification('error', 'Error', 'Batch calculation failed');
    }
  };

  const getIncentiveStatus = (user: any): { label: string; color: 'success' | 'default' | 'warning' } => {
    if (!user.incentiveConfig) {
      return { label: '미설정', color: 'warning' };
    }
    return user.incentiveConfig.isActive 
      ? { label: '활성', color: 'success' }
      : { label: '비활성', color: 'default' };
  };

  const getIncentiveType = (user: any): string => {
    if (!user.incentiveConfig || !user.incentiveConfig.type) {
      return '-';
    }
    return INCENTIVE_TYPE_LABELS[user.incentiveConfig.type] || user.incentiveConfig.type;
  };

  const getIncentiveRate = (user: any): string => {
    if (!user.incentiveConfig || !user.incentiveConfig.parameters) {
      return '-';
    }
    const rate = user.incentiveConfig.parameters.rate;
    if (rate !== undefined) {
      return `${(rate * 100).toFixed(1)}%`;
    }
    return '-';
  };

  // Get unique departments
  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          관리자 권한이 필요합니다
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          인센티브 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          직원별 인센티브 계산 방식을 설정하고 관리합니다
        </Typography>
      </Box>

      {/* Actions Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="직원 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>부서</InputLabel>
                <Select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  label="부서"
                >
                  <MenuItem value="all">전체</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>상태</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  label="상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  disabled
                >
                  내보내기
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Calculate />}
                  onClick={() => setBatchDialogOpen(true)}
                >
                  일괄 계산
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                전체 직원
              </Typography>
              <Typography variant="h4">
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                활성 인센티브
              </Typography>
              <Typography variant="h4">
                {users.filter((u: any) => u.incentiveConfig?.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                비활성
              </Typography>
              <Typography variant="h4">
                {users.filter((u: any) => !u.incentiveConfig?.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                평균 요율
              </Typography>
              <Typography variant="h4">
                {averageRate}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>사원번호</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>부서</TableCell>
              <TableCell>인센티브 유형</TableCell>
              <TableCell align="center">요율</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => {
              const status = getIncentiveStatus(user);
              return (
                <TableRow key={user._id}>
                  <TableCell>{user.employeeId}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>{getIncentiveType(user)}</TableCell>
                  <TableCell align="center">{getIncentiveRate(user)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="설정">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenConfig(user)}
                      >
                        <Settings />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={handleCloseConfig}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          인센티브 설정 - {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <IncentiveConfig
              userId={selectedUser._id}
              userName={selectedUser.name}
              onConfigChange={handleCloseConfig}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfig}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* Batch Calculation Dialog */}
      <Dialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
      >
        <DialogTitle>일괄 인센티브 계산</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            모든 활성 인센티브 설정에 대해 계산을 실행합니다.
          </Typography>
          <TextField
            fullWidth
            label="계산 월"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={handleBatchCalculate}
            startIcon={<PlayArrow />}
          >
            실행
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncentiveManagement;