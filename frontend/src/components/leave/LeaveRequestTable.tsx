/*
 * AI-HEADER
 * Intent: Table component for displaying leave requests with actions
 * Domain Meaning: Shows list of leave applications with status and controls
 * Misleading Names: None
 * Data Contracts: Uses LeaveRequest type for request display
 * PII: Shows employee names and leave details
 * Invariants: Must accurately display request status and available actions
 * RAG Keywords: leave, request, table, list, status, actions
 * DuplicatePolicy: canonical
 * FunctionIdentity: leave-request-table-display-component
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useConfig, useConfigProps } from '../../hooks/useConfig';
import { LeaveRequestTableProps } from '../../types/LeaveManagementTypes';

export const LeaveRequestTable: React.FC<LeaveRequestTableProps> = ({
  requests,
  loading,
  currentUserId,
  onEdit,
  onDelete,
  onCancel
}) => {
  const { leave } = useConfig();
  const { getStatusChipProps } = useConfigProps();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckIcon fontSize="small" />;
      case 'rejected':
        return <CloseIcon fontSize="small" />;
      case 'cancelled':
        return <CancelIcon fontSize="small" />;
      case 'pending':
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    return leave.typeLabels[type as keyof typeof leave.typeLabels] || type;
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = format(parseISO(startDate), 'MM/dd');
    const end = format(parseISO(endDate), 'MM/dd');
    return start === end ? start : `${start} - ${end}`;
  };

  const calculateDays = (request: any) => {
    if (!request.startDate || !request.endDate) return 0;
    
    const start = parseISO(request.startDate);
    const end = parseISO(request.endDate);
    let days = 0;
    let current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = format(current, 'yyyy-MM-dd');
      
      // Skip if it's a personal off day
      if (request.personalOffDays?.includes(dateStr)) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      
      // Count weekdays as 1, Saturday as 0.5, skip Sunday
      if (dayOfWeek !== 0) {
        days += dayOfWeek === 6 ? 0.5 : 1;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (requests.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          신청한 연차가 없습니다.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>신청일</TableCell>
            <TableCell>유형</TableCell>
            <TableCell>기간</TableCell>
            <TableCell align="center">일수</TableCell>
            <TableCell>사유</TableCell>
            <TableCell align="center">상태</TableCell>
            <TableCell align="center">작업</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map((request) => {
            const isOwner = request.user._id === currentUserId;
            const canEdit = isOwner && request.status === 'pending' && !request.cancelRequested;
            const canDelete = isOwner && request.status === 'pending' && !request.cancelRequested;
            const canCancel = isOwner && request.status === 'approved' && !request.cancelRequested;
            const days = calculateDays(request);

            return (
              <TableRow key={request._id}>
                <TableCell>
                  <Typography variant="body2">
                    {format(parseISO(request.appliedAt), 'yyyy-MM-dd')}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={getLeaveTypeLabel(request.leaveType)}
                    size="small"
                    variant="outlined"
                    color={request.leaveType === 'sick' ? 'error' : 'primary'}
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDateRange(request.startDate, request.endDate)}
                  </Typography>
                </TableCell>
                
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="medium">
                    {days}일
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      maxWidth: 200, 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={request.reason}
                  >
                    {request.reason}
                  </Typography>
                  {request.substituteEmployee && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      대체: {request.substituteEmployee}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell align="center">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      {...getStatusChipProps(request.status)}
                      icon={getStatusIcon(request.status)}
                      size="small"
                    />
                    {request.cancelRequested && (
                      <Chip
                        label="취소 요청"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  {request.reviewedBy && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {request.reviewedBy.name}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    {canEdit && (
                      <Tooltip title="수정">
                        <IconButton 
                          size="small" 
                          onClick={() => onEdit(request)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {canDelete && (
                      <Tooltip title="삭제">
                        <IconButton 
                          size="small" 
                          onClick={() => onDelete(request._id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {canCancel && (
                      <Tooltip title="취소 요청">
                        <IconButton 
                          size="small" 
                          onClick={() => onCancel(request)}
                          color="warning"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {!canEdit && !canDelete && !canCancel && (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};