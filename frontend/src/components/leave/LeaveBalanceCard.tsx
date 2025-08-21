/*
 * AI-HEADER
 * Intent: Display leave balance statistics and usage
 * Domain Meaning: Shows employee's available and used leave days
 * Misleading Names: None
 * Data Contracts: Uses LeaveBalance type for balance display
 * PII: Shows employee leave balance information
 * Invariants: Balance calculations must be accurate
 * RAG Keywords: leave, balance, statistics, card, usage, remaining
 * DuplicatePolicy: canonical
 * FunctionIdentity: leave-balance-statistics-card-component
 */

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
  Grid,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  BeachAccess as BeachAccessIcon,
  LocalHospital as SickIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { LeaveStatisticsCardProps } from '../../types/LeaveManagementTypes';

export const LeaveBalanceCard: React.FC<LeaveStatisticsCardProps> = ({
  leaveBalance,
  leaveRequests,
  selectedYear
}) => {
  // Calculate pending requests
  const pendingRequests = useMemo(() => {
    return leaveRequests.filter(r => r.status === 'pending').length;
  }, [leaveRequests]);

  // Calculate upcoming leaves
  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    return leaveRequests.filter(r => {
      const startDate = new Date(r.startDate);
      return r.status === 'approved' && startDate > today;
    }).length;
  }, [leaveRequests]);

  if (!leaveBalance) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            연차 정보를 불러오는 중...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const annualUsagePercentage = leaveBalance.annual > 0 
    ? (leaveBalance.used.annual / leaveBalance.annual) * 100 
    : 0;

  const sickUsagePercentage = leaveBalance.sick > 0 
    ? (leaveBalance.used.sick / leaveBalance.sick) * 100 
    : 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {selectedYear}년 연차 현황
        </Typography>
        
        <Grid container spacing={3}>
          {/* Annual Leave */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}>
                <BeachAccessIcon fontSize="small" />
              </Avatar>
              <Typography variant="subtitle1">연차</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  사용: {leaveBalance.used.annual}일
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  잔여: {leaveBalance.remaining.annual}일
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={annualUsagePercentage} 
                sx={{ height: 8, borderRadius: 1 }}
                color={annualUsagePercentage > 80 ? 'warning' : 'primary'}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                총 {leaveBalance.annual}일 중 {annualUsagePercentage.toFixed(0)}% 사용
              </Typography>
            </Box>
          </Grid>

          {/* Sick Leave */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar sx={{ bgcolor: 'error.main', mr: 1, width: 32, height: 32 }}>
                <SickIcon fontSize="small" />
              </Avatar>
              <Typography variant="subtitle1">병가</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  사용: {leaveBalance.used.sick}일
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  잔여: {leaveBalance.remaining.sick}일
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={sickUsagePercentage} 
                sx={{ height: 8, borderRadius: 1 }}
                color="error"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                총 {leaveBalance.sick}일 중 {sickUsagePercentage.toFixed(0)}% 사용
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Additional Stats */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                개인연차
              </Typography>
              <Typography variant="h6">
                {leaveBalance.used.personal}일
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                이월연차
              </Typography>
              <Typography variant="h6">
                {leaveBalance.carryOver}일
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                대기중
              </Typography>
              <Typography variant="h6" color="warning.main">
                {pendingRequests}건
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                예정
              </Typography>
              <Typography variant="h6" color="info.main">
                {upcomingLeaves}건
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Warnings */}
        {leaveBalance.remaining.annual <= 3 && leaveBalance.remaining.annual > 0 && (
          <Box sx={{ mt: 2 }}>
            <Chip
              icon={<WarningIcon />}
              label={`잔여 연차가 ${leaveBalance.remaining.annual}일 남았습니다`}
              color="warning"
              size="small"
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};