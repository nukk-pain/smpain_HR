/*
 * AI-HEADER
 * Intent: Refactored leave management page with modular components
 * Domain Meaning: Main page for employee leave request management
 * Misleading Names: None
 * Data Contracts: Orchestrates leave components with API service
 * PII: Handles employee leave data through child components
 * Invariants: Must maintain accurate leave balance and request state
 * RAG Keywords: leave, management, vacation, request, balance, refactored
 * DuplicatePolicy: canonical
 * FunctionIdentity: leave-management-refactored-page-component
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Alert,
  Stack,
  MenuItem,
  TextField
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../components/NotificationProvider';
import { ApiService } from '../services/api';
import { 
  LeaveRequest, 
  LeaveBalance, 
  LeaveForm 
} from '../types/LeaveManagementTypes';
import { LeaveBalanceCard } from '../components/leave/LeaveBalanceCard';
import { LeaveRequestDialog } from '../components/leave/LeaveRequestDialog';
import { LeaveRequestTable } from '../components/leave/LeaveRequestTable';
import { LeaveCancellationDialog } from '../components/leave/LeaveCancellationDialog';
import { 
  calculateLeaveDays, 
  validateLeaveDates,
  calculateRemainingBalance 
} from '../utils/leaveCalculations';
import { useConfig } from '../hooks/useConfig';

const LeaveManagementRefactored: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { leave } = useConfig();
  const apiService = new ApiService();

  // State management
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState<LeaveForm>({
    leaveType: leave.types.ANNUAL,
    startDate: '',
    endDate: '',
    reason: '',
    substituteEmployee: '',
    personalOffDays: []
  });
  
  // Cancellation dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Fetch leave data
  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [requestsResponse, balanceResponse] = await Promise.all([
        apiService.get(`/leave/requests?year=${selectedYear}`),
        apiService.get(`/leave/balance/${selectedYear}`)
      ]);

      if (requestsResponse.success) {
        setLeaveRequests(requestsResponse.data);
      }
      
      if (balanceResponse.success) {
        setLeaveBalance(balanceResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
      showError('연차 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [selectedYear]);

  // Handle dialog open
  const handleOpenDialog = (request?: LeaveRequest) => {
    if (request) {
      setEditingRequest(request);
      setFormData({
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        substituteEmployee: request.substituteEmployee || '',
        personalOffDays: request.personalOffDays || []
      });
    } else {
      setEditingRequest(null);
      setFormData({
        leaveType: leave.types.ANNUAL,
        startDate: '',
        endDate: '',
        reason: '',
        substituteEmployee: '',
        personalOffDays: []
      });
    }
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRequest(null);
  };

  // Handle form submit
  const handleSubmit = async () => {
    // Validate dates
    const validation = validateLeaveDates(
      formData.startDate,
      formData.endDate,
      leaveRequests.filter(r => r._id !== editingRequest?._id)
    );
    
    if (!validation.valid) {
      showError(validation.error || '날짜를 확인해주세요.');
      return;
    }

    // Calculate days and check balance
    const days = calculateLeaveDays(
      formData.startDate,
      formData.endDate,
      formData.personalOffDays
    );
    
    if (leaveBalance && formData.leaveType === leave.types.ANNUAL) {
      const balanceCheck = calculateRemainingBalance(
        leaveBalance.remaining.annual,
        days,
        true,
        3
      );
      
      if (!balanceCheck.canRequest) {
        showError(balanceCheck.warning || '연차 신청이 불가능합니다.');
        return;
      }
      
      if (balanceCheck.warning) {
        // Show warning but allow to proceed
        console.warn(balanceCheck.warning);
      }
    }

    setLoading(true);
    try {
      const endpoint = editingRequest
        ? `/leave/requests/${editingRequest._id}`
        : '/leave/requests';
      
      const method = editingRequest ? 'put' : 'post';
      
      const response = await apiService[method](endpoint, formData);
      
      if (response.success) {
        showSuccess(
          editingRequest 
            ? '연차 신청이 수정되었습니다.' 
            : '연차 신청이 완료되었습니다.'
        );
        handleCloseDialog();
        fetchLeaveData();
      } else {
        showError(response.error || '연차 신청에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      showError('연차 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.delete(`/leave/requests/${id}`);
      
      if (response.success) {
        showSuccess('연차 신청이 삭제되었습니다.');
        fetchLeaveData();
      } else {
        showError(response.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete leave request:', error);
      showError('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel request
  const handleCancelRequest = (request: LeaveRequest) => {
    setCancelRequest(request);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  // Handle cancel dialog close
  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setCancelRequest(null);
    setCancelReason('');
  };

  // Handle confirm cancellation
  const handleConfirmCancellation = async () => {
    if (!cancelRequest || !cancelReason.trim()) {
      return;
    }

    setCancelLoading(true);
    try {
      const response = await apiService.post(
        `/leave/requests/${cancelRequest._id}/cancel`,
        { reason: cancelReason }
      );
      
      if (response.success) {
        showSuccess('취소 요청이 제출되었습니다.');
        handleCloseCancelDialog();
        fetchLeaveData();
      } else {
        showError(response.error || '취소 요청에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to request cancellation:', error);
      showError('취소 요청 중 오류가 발생했습니다.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Filter requests for current user
  const userRequests = useMemo(() => {
    return leaveRequests.filter(r => r.user._id === user?._id);
  }, [leaveRequests, user]);

  // Year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          연차 관리
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <TextField
            select
            label="년도"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {yearOptions.map(year => (
              <MenuItem key={year} value={year}>
                {year}년
              </MenuItem>
            ))}
          </TextField>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            연차 신청
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Leave Balance Card */}
        <Grid item xs={12}>
          <LeaveBalanceCard
            leaveBalance={leaveBalance}
            leaveRequests={userRequests}
            selectedYear={selectedYear}
          />
        </Grid>

        {/* Leave Requests Table */}
        <Grid item xs={12}>
          <Paper>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                신청 내역
              </Typography>
              <LeaveRequestTable
                requests={userRequests}
                loading={loading}
                currentUserId={user?._id || ''}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
                onCancel={handleCancelRequest}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Leave Request Dialog */}
      <LeaveRequestDialog
        open={dialogOpen}
        editingRequest={editingRequest}
        formData={formData}
        loading={loading}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        onFormDataChange={setFormData}
      />

      {/* Leave Cancellation Dialog */}
      <LeaveCancellationDialog
        open={cancelDialogOpen}
        request={cancelRequest}
        reason={cancelReason}
        loading={cancelLoading}
        onClose={handleCloseCancelDialog}
        onConfirm={handleConfirmCancellation}
        onReasonChange={setCancelReason}
      />
    </Box>
  );
};

export default LeaveManagementRefactored;