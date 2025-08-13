import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Grid,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { PreviewRecord } from '../types/payrollUpload';

interface PayrollUploadSummaryProps {
  records: PreviewRecord[];
  recordActions?: Map<number, {action: 'skip' | 'manual', userId?: string}>;
}

export const PayrollUploadSummary: React.FC<PayrollUploadSummaryProps> = ({
  records,
  recordActions = new Map()
}) => {
  // Calculate statistics
  const totalRecords = records.length;
  const matchedCount = records.filter(r => r.matched).length;
  const unmatchedCount = records.filter(r => !r.matched).length;
  
  // Calculate action counts
  let skipCount = 0;
  let manualMatchCount = 0;
  let pendingCount = unmatchedCount;
  
  recordActions.forEach((action) => {
    if (action.action === 'skip') {
      skipCount++;
      pendingCount--;
    } else if (action.action === 'manual' && action.userId) {
      manualMatchCount++;
      pendingCount--;
    }
  });
  
  const processableCount = matchedCount + manualMatchCount;
  const readyToProcess = pendingCount === 0;
  
  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          업로드 요약
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {totalRecords}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전체 레코드
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {matchedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                자동 매칭
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {manualMatchCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                수동 매칭
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {skipCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                건너뛰기
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">처리 준비 상태</Typography>
            <Typography variant="body2" fontWeight="bold">
              {totalRecords > 0 ? Math.round((processableCount / totalRecords) * 100) : 0}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={totalRecords > 0 ? (processableCount / totalRecords) * 100 : 0}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
        
        {/* Status Messages */}
        {readyToProcess ? (
          <Alert severity="success" icon={<SuccessIcon />}>
            모든 레코드 처리 방법이 결정되었습니다. 저장을 진행할 수 있습니다.
            <Box sx={{ mt: 1 }}>
              <Chip 
                label={`${processableCount}건 저장 예정`} 
                size="small" 
                color="success" 
                sx={{ mr: 1 }}
              />
              {skipCount > 0 && (
                <Chip 
                  label={`${skipCount}건 건너뛰기`} 
                  size="small" 
                  color="warning" 
                />
              )}
            </Box>
          </Alert>
        ) : (
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2">
              {pendingCount}개의 매칭되지 않은 레코드에 대한 처리 방법을 선택해주세요.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              각 레코드를 수동으로 매칭하거나 건너뛸 수 있습니다.
            </Typography>
          </Alert>
        )}
        
        {/* Detail Stats */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  처리 가능: <strong>{processableCount}</strong>건
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon fontSize="small" color="warning" />
                <Typography variant="body2">
                  미결정: <strong>{pendingCount}</strong>건
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};