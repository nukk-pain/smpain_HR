/*
 * AI-HEADER
 * Intent: Summary card component for payroll preview data overview
 * Domain Meaning: Shows high-level statistics of parsed Excel data
 * Misleading Names: None
 * Data Contracts: Uses PreviewSummary type from payrollUpload types
 * PII: Contains aggregated statistics, no direct PII exposure
 * Invariants: Must display accurate counts and file information
 * RAG Keywords: payroll, preview, summary, statistics, overview, card
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-preview-summary-card-component
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Description as FileIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Assessment as TotalIcon
} from '@mui/icons-material';
import { PreviewSummary } from '../types/payrollUpload';

interface PreviewSummaryCardProps {
  summary: PreviewSummary;
}

export const PreviewSummaryCard: React.FC<PreviewSummaryCardProps> = ({ summary }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSuccessRate = () => {
    if (summary.totalRecords === 0) return 0;
    return Math.round((summary.validRecords / summary.totalRecords) * 100);
  };

  const getProgressColor = (rate: number): 'success' | 'warning' | 'error' => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'error';
  };

  const successRate = getSuccessRate();

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FileIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            파일 분석 결과
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* File Information */}
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                파일 정보
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>파일명:</strong> {summary.fileName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>파일 크기:</strong> {formatFileSize(summary.fileSize)}
              </Typography>
              <Typography variant="body2">
                <strong>대상 기간:</strong> {summary.year}년 {summary.month}월
              </Typography>
            </Box>
          </Grid>

          {/* Processing Statistics */}
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                처리 통계
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip
                    icon={<TotalIcon />}
                    label={`총 ${summary.totalRecords}건`}
                    color="default"
                    variant="outlined"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip
                    icon={<ValidIcon />}
                    label={`정상 ${summary.validRecords}건`}
                    color="success"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip
                    icon={<WarningIcon />}
                    label={`경고 ${summary.warningRecords}건`}
                    color="warning"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip
                    icon={<ErrorIcon />}
                    label={`오류 ${summary.invalidRecords}건`}
                    color="error"
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Success Rate */}
          <Grid item xs={12} md={4}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                처리 성공률
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" color={getProgressColor(successRate)} sx={{ mr: 1 }}>
                  {successRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({summary.validRecords}/{summary.totalRecords})
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={successRate}
                color={getProgressColor(successRate)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Status Messages */}
        <Box>
          {summary.invalidRecords > 0 ? (
            <Typography variant="body2" color="error.main">
              ⚠️ {summary.invalidRecords}건의 오류가 있어 저장할 수 없습니다. 오류를 수정해주세요.
            </Typography>
          ) : summary.warningRecords > 0 ? (
            <Typography variant="body2" color="warning.main">
              ⚠️ {summary.warningRecords}건의 경고사항이 있습니다. 확인 후 저장하세요.
            </Typography>
          ) : (
            <Typography variant="body2" color="success.main">
              ✅ 모든 데이터가 정상적으로 처리되었습니다. 저장할 수 있습니다.
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};