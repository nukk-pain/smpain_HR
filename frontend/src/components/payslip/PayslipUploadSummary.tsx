/*
 * AI-HEADER
 * Intent: Summary statistics for current payslip upload batch
 * Domain Meaning: Shows overview of file matching status before upload
 * Misleading Names: None
 * Data Contracts: Calculates statistics from PayslipFile array
 * PII: None - aggregated statistics only
 * Invariants: Must accurately count file statuses
 * RAG Keywords: payslip, summary, statistics, upload, batch, status
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-upload-summary-statistics-component
 */

import React, { useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Alert
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  CloudUpload
} from '@mui/icons-material';
import { PayslipFile } from '../../types/PayslipUploadTypes';

interface PayslipUploadSummaryProps {
  files: PayslipFile[];
  uploading: boolean;
  uploadProgress: number;
}

export const PayslipUploadSummary: React.FC<PayslipUploadSummaryProps> = ({
  files,
  uploading,
  uploadProgress
}) => {
  const statistics = useMemo(() => {
    return {
      total: files.length,
      matched: files.filter(f => f.matchStatus === 'matched').length,
      manual: files.filter(f => f.matchStatus === 'manual').length,
      failed: files.filter(f => f.matchStatus === 'failed').length,
      pending: files.filter(f => f.matchStatus === 'pending').length
    };
  }, [files]);

  const readyCount = statistics.matched + statistics.manual;
  const readyPercentage = statistics.total > 0 
    ? Math.round((readyCount / statistics.total) * 100) 
    : 0;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        업로드 요약
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {statistics.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              전체 파일
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {statistics.matched}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              자동 매칭
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {statistics.manual}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              수동 매칭
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="error.main">
              {statistics.failed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              매칭 실패
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {!uploading && (
        <>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">업로드 준비 상태</Typography>
              <Typography variant="body2" fontWeight="bold">
                {readyPercentage}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={readyPercentage}
              color={readyPercentage === 100 ? 'success' : 'primary'}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          {statistics.total > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircle />}
                label={`업로드 가능: ${readyCount}건`}
                size="small"
                color="success"
                variant="outlined"
              />
              {statistics.failed > 0 && (
                <Chip
                  icon={<Error />}
                  label={`수동 매칭 필요: ${statistics.failed}건`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </>
      )}

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CloudUpload />
            <Typography variant="body2">
              업로드 중... {uploadProgress}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
      )}

      {statistics.failed > 0 && !uploading && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {statistics.failed}개 파일이 자동 매칭에 실패했습니다. 
          수동으로 직원을 선택해주세요.
        </Alert>
      )}

      {readyCount === statistics.total && statistics.total > 0 && !uploading && (
        <Alert severity="success" sx={{ mt: 2 }}>
          모든 파일이 매칭되었습니다. 업로드를 진행할 수 있습니다.
        </Alert>
      )}
    </Paper>
  );
};