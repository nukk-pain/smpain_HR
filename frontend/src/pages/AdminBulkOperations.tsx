import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Autorenew as ProcessIcon,
  FilterList as FilterIcon,
  Event as CarryOverIcon
} from '@mui/icons-material';
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
      const response = await apiService.bulkApproveLeaveRequests(
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
      <Alert severity="error">
        관리자 권한이 필요한 페이지입니다.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          🔄 휴가 일괄 처리
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CarryOverIcon />}
            onClick={() => setCarryOverDialog(true)}
          >
            연차 이월 처리
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={resetFilters}
          >
            필터 초기화
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            필터 설정
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>부서</InputLabel>
                <Select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  label="부서"
                >
                  <MenuItem value="all">전체</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>휴가 유형</InputLabel>
                <Select
                  value={filters.leaveType}
                  onChange={(e) => handleFilterChange('leaveType', e.target.value)}
                  label="휴가 유형"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="annual">연차</MenuItem>
                  <MenuItem value="sick">병가</MenuItem>
                  <MenuItem value="personal">개인휴가</MenuItem>
                  <MenuItem value="family">경조사</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="시작일 (이후)"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="종료일 (이전)"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {selectedRequests.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                {selectedRequests.length}건의 휴가 신청이 선택되었습니다.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => {
                    setBulkAction('approve');
                    setBulkActionDialog(true);
                  }}
                >
                  일괄 승인
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => {
                    setBulkAction('reject');
                    setBulkActionDialog(true);
                  }}
                >
                  일괄 거부
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              대기중인 휴가 신청 ({pendingRequests.length}건)
            </Typography>
            {loading && <CircularProgress size={24} />}
          </Box>

          {pendingRequests.length === 0 ? (
            <Alert severity="info">
              현재 대기중인 휴가 신청이 없습니다.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRequests.length === pendingRequests.length}
                        indeterminate={selectedRequests.length > 0 && selectedRequests.length < pendingRequests.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>직원명</TableCell>
                    <TableCell>부서</TableCell>
                    <TableCell>직급</TableCell>
                    <TableCell>휴가 유형</TableCell>
                    <TableCell>시작일</TableCell>
                    <TableCell>종료일</TableCell>
                    <TableCell>일수</TableCell>
                    <TableCell>사유</TableCell>
                    <TableCell>신청일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request._id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRequests.includes(request._id)}
                          onChange={(e) => handleSelectRequest(request._id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>{request.user.name}</TableCell>
                      <TableCell>{request.user.department}</TableCell>
                      <TableCell>{request.user.position}</TableCell>
                      <TableCell>
                        <Chip
                          label={getLeaveTypeLabel(request.leaveType)}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>{format(new Date(request.startDate), 'yyyy.MM.dd')}</TableCell>
                      <TableCell>{format(new Date(request.endDate), 'yyyy.MM.dd')}</TableCell>
                      <TableCell>{request.daysCount}일</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap title={request.reason}>
                          {request.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>{format(new Date(request.requestedAt), 'yyyy.MM.dd')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Last Result Summary */}
      {lastResult && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              마지막 처리 결과
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="success.main">
                  성공: {lastResult.successful.length}건
                </Typography>
                {lastResult.successful.slice(0, 3).map((item, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                    • {item.employeeName} - {getLeaveTypeLabel(item.leaveType)}
                  </Typography>
                ))}
                {lastResult.successful.length > 3 && (
                  <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                    외 {lastResult.successful.length - 3}건...
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="error.main">
                  실패: {lastResult.failed.length}건
                </Typography>
                {lastResult.failed.slice(0, 3).map((item, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                    • {item.error}
                  </Typography>
                ))}
                {lastResult.failed.length > 3 && (
                  <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                    외 {lastResult.failed.length - 3}건...
                  </Typography>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onClose={() => setBulkActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          휴가 신청 일괄 {bulkAction === 'approve' ? '승인' : '거부'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedRequests.length}건의 휴가 신청을 일괄 {bulkAction === 'approve' ? '승인' : '거부'}하시겠습니까?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="코멘트 (선택사항)"
            value={bulkComment}
            onChange={(e) => setBulkComment(e.target.value)}
            placeholder={`일괄 ${bulkAction === 'approve' ? '승인' : '거부'} 사유를 입력하세요.`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialog(false)}>취소</Button>
          <Button
            variant="contained"
            color={bulkAction === 'approve' ? 'success' : 'error'}
            onClick={handleBulkAction}
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} /> : `일괄 ${bulkAction === 'approve' ? '승인' : '거부'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Carry-over Dialog */}
      <Dialog open={carryOverDialog} onClose={() => setCarryOverDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          연차 이월 처리
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            선택한 연도의 미사용 연차를 다음 연도로 이월 처리합니다.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>이월 대상 연도</InputLabel>
            <Select
              value={carryOverYear}
              onChange={(e) => setCarryOverYear(Number(e.target.value))}
              label="이월 대상 연도"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 1 - i;
                return (
                  <MenuItem key={year} value={year}>
                    {year}년
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 모든 직원의 {carryOverYear}년도 미사용 연차를 {carryOverYear + 1}년도로 이월합니다. 
            이미 이월 처리된 연차가 있는 경우 중복 처리되지 않습니다.
          </Alert>
          <Alert severity="info">
            이월 규칙은 현재 설정된 휴가 정책을 따릅니다. (최대 이월 가능 일수 등)
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCarryOverDialog(false)}>취소</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCarryOverProcess}
            disabled={carryOverProcessing}
          >
            {carryOverProcessing ? <CircularProgress size={20} /> : '이월 처리 실행'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBulkOperations;