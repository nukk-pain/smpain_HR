/*
 * AI-HEADER
 * Intent: Result display step component for payroll upload workflow
 * Domain Meaning: Shows upload completion status and summary after confirmation
 * Misleading Names: None
 * Data Contracts: Uses UploadResult type from payrollUpload types
 * PII: None - aggregated results only
 * Invariants: Must accurately display success/failure counts
 * RAG Keywords: payroll, upload, result, success, error, summary, completion
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-upload-result-step-component
 */

import React from 'react';
import {
  Box,
  Alert,
  Typography,
  Card,
  CardContent,
  Grid,
  Button
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { UploadResult } from '../../types/payrollUpload';

interface PayrollUploadResultStepProps {
  result: UploadResult | null;
  selectedYear: number;
  selectedMonth: number;
  onNewUpload: () => void;
}

export const PayrollUploadResultStep: React.FC<PayrollUploadResultStepProps> = ({
  result,
  selectedYear,
  selectedMonth,
  onNewUpload
}) => {
  if (!result) return null;

  const successRate = result.totalRecords > 0 
    ? ((result.successfulImports / result.totalRecords) * 100).toFixed(1)
    : '0';

  return (
    <Box>
      <Alert
        severity={result.success ? 'success' : 'error'}
        icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="h6" gutterBottom>
          {result.message}
        </Typography>
        <Typography variant="body2">
          총 {result.totalRecords}건 중 {result.successfulImports}건 저장 완료
        </Typography>
      </Alert>

      {result.errors && result.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            저장 실패 항목:
          </Typography>
          {result.errors.map((error, index) => (
            <Typography key={index} variant="body2">
              • {error.record}: {error.error}
            </Typography>
          ))}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            처리 요약
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                파일명
              </Typography>
              <Typography variant="body1">
                {result.summary?.fileName || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                처리 시간
              </Typography>
              <Typography variant="body1">
                {result.summary?.processedAt 
                  ? new Date(result.summary.processedAt).toLocaleString() 
                  : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                대상 기간
              </Typography>
              <Typography variant="body1">
                {selectedYear}년 {selectedMonth}월
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                성공률
              </Typography>
              <Typography variant="body1">
                {successRate}%
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained"
          onClick={onNewUpload}
          startIcon={<UploadIcon />}
        >
          새 파일 업로드
        </Button>
      </Box>
    </Box>
  );
};