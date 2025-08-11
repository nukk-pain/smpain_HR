/*
 * AI-HEADER
 * Intent: Enhanced payroll Excel upload component with preview functionality
 * Domain Meaning: Two-phase upload process with data validation before DB save
 * Misleading Names: None
 * Data Contracts: Uses payrollUpload types, integrates with preview/confirm API
 * PII: Displays employee salary data in preview mode
 * Invariants: Must complete preview before confirmation, token expiry validation
 * RAG Keywords: payroll, excel, upload, preview, confirm, two-phase
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-excel-upload-with-preview-component
 */

import React, { useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  Stepper,
  Step,
  StepLabel,
  IconButton
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  GetApp as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { usePayrollUpload } from '../hooks/usePayrollUpload';
import { PreviewDataTable } from './PayrollPreviewTable';
import { PreviewSummaryCard } from './PayrollPreviewSummary';
import { PreviewApiResponse, ConfirmApiResponse } from '../types/payrollUpload';

const steps = ['파일 선택', '데이터 확인', '저장 완료'];

export const PayrollExcelUploadWithPreview: React.FC = () => {
  const { state, actions, helpers } = usePayrollUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current step index for stepper
  const getStepIndex = () => {
    switch (state.step) {
      case 'select': return 0;
      case 'preview': return 1;
      case 'confirmed':
      case 'completed': return 2;
      default: return 0;
    }
  };

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return '지원하지 않는 파일 형식입니다. Excel 파일만 업로드 가능합니다.';
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return '파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.';
    }
    
    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      actions.setError(validationError);
      actions.setSelectedFile(null);
      return;
    }
    
    actions.clearError();
    actions.setSelectedFile(file);
  }, [validateFile, actions]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle preview
  const handlePreview = async () => {
    if (!state.selectedFile) return;
    
    try {
      actions.setUploading(true);
      actions.clearError();
      
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await apiService.previewPayrollExcel(
        state.selectedFile,
        year,
        month
      ) as unknown as PreviewApiResponse;
      
      if (response.success && response.summary && response.records) {
        actions.setPreviewData(
          {
            summary: response.summary,
            records: response.records,
            errors: response.errors || [],
            warnings: response.warnings || []
          },
          response.previewToken || null,
          response.expiresIn || null
        );
      } else {
        actions.setError(response.error || '프리뷰 생성에 실패했습니다.');
      }
    } catch (err: any) {
      actions.setError(err.message || '프리뷰 생성에 실패했습니다.');
    } finally {
      actions.setUploading(false);
    }
  };

  // Handle confirm
  const handleConfirm = async () => {
    if (!state.previewToken) {
      actions.setError('프리뷰 토큰이 없습니다. 다시 업로드해주세요.');
      return;
    }

    if (helpers.isPreviewExpired()) {
      actions.setError('프리뷰가 만료되었습니다. 다시 업로드해주세요.');
      actions.reset();
      return;
    }
    
    try {
      actions.setConfirming(true);
      actions.clearError();
      
      const response = await apiService.confirmPayrollExcel(
        state.previewToken
      ) as unknown as ConfirmApiResponse;
      
      if (response.success && response.summary) {
        actions.setResult({
          success: true,
          message: response.message || '데이터가 성공적으로 저장되었습니다.',
          totalRecords: response.totalRecords || 0,
          successfulImports: response.successfulImports || 0,
          errors: response.errors,
          summary: response.summary
        });
      } else {
        actions.setError(response.error || '데이터 저장에 실패했습니다.');
      }
    } catch (err: any) {
      actions.setError(err.message || '데이터 저장에 실패했습니다.');
    } finally {
      actions.setConfirming(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    actions.reset();
  };

  // Handle template download
  const handleTemplateDownload = async () => {
    try {
      const blob = await apiService.downloadPayrollTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payroll-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Template download failed:', error);
      actions.setError('템플릿 다운로드에 실패했습니다.');
    }
  };

  // Render file selection step
  const renderFileSelectStep = () => (
    <>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleTemplateDownload}
        >
          템플릿 다운로드
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          표준 형식의 Excel 템플릿을 다운로드하여 데이터를 입력하세요.
        </Typography>
      </Box>

      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: 'grey.300',
          backgroundColor: 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Excel 파일을 드래그하여 놓거나 클릭하여 업로드하세요
        </Typography>
        <Typography variant="body2" color="text.secondary">
          지원 파일 형식: .xlsx, .xls (최대 10MB)
        </Typography>
      </Paper>

      {state.selectedFile && (
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <FileIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {state.selectedFile.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(state.selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handlePreview}
                    disabled={state.uploading}
                    startIcon={<PreviewIcon />}
                  >
                    {state.uploading ? '처리 중...' : '미리보기'}
                  </Button>
                  <IconButton
                    onClick={() => actions.setSelectedFile(null)}
                    disabled={state.uploading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              
              {state.uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    파일을 분석하고 있습니다...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );

  // Render preview step
  const renderPreviewStep = () => {
    if (!state.previewData) return null;

    return (
      <>
        <PreviewSummaryCard summary={state.previewData.summary} />
        
        {state.previewData.errors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {state.previewData.errors.length}개의 오류가 발견되었습니다:
            </Typography>
            {state.previewData.errors.slice(0, 5).map((error, index) => (
              <Typography key={index} variant="body2">
                • {error.row}행: {error.message}
              </Typography>
            ))}
            {state.previewData.errors.length > 5 && (
              <Typography variant="body2">
                ... 외 {state.previewData.errors.length - 5}개
              </Typography>
            )}
          </Alert>
        )}

        {state.previewData.warnings.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {state.previewData.warnings.length}개의 경고사항:
            </Typography>
            {state.previewData.warnings.slice(0, 5).map((warning, index) => (
              <Typography key={index} variant="body2">
                • {warning.row}행: {warning.message}
              </Typography>
            ))}
            {state.previewData.warnings.length > 5 && (
              <Typography variant="body2">
                ... 외 {state.previewData.warnings.length - 5}개
              </Typography>
            )}
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <PreviewDataTable records={state.previewData.records} />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            startIcon={<CancelIcon />}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={
              state.confirming ||
              state.previewData.summary.invalidRecords > 0
            }
            startIcon={<SaveIcon />}
          >
            {state.confirming ? '저장 중...' : '데이터베이스에 저장'}
          </Button>
        </Box>

        {state.confirming && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              데이터를 저장하고 있습니다...
            </Typography>
          </Box>
        )}
      </>
    );
  };

  // Render result step
  const renderResultStep = () => {
    if (!state.result) return null;

    return (
      <Box>
        <Alert
          severity={state.result.success ? 'success' : 'error'}
          icon={state.result.success ? <SuccessIcon /> : <ErrorIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="h6" gutterBottom>
            {state.result.message}
          </Typography>
          <Typography variant="body2">
            총 {state.result.totalRecords}건 중 {state.result.successfulImports}건 저장 완료
          </Typography>
        </Alert>

        {state.result.errors && state.result.errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              저장 실패 항목:
            </Typography>
            {state.result.errors.map((error, index) => (
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
                  {state.result.summary.fileName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  처리 시간
                </Typography>
                <Typography variant="body1">
                  {new Date(state.result.summary.processedAt).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  대상 기간
                </Typography>
                <Typography variant="body1">
                  {state.result.summary.year}년 {state.result.summary.month}월
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  성공률
                </Typography>
                <Typography variant="body1">
                  {((state.result.successfulImports / state.result.totalRecords) * 100).toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleCancel}
            startIcon={<UploadIcon />}
          >
            새 파일 업로드
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        급여 데이터 업로드
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Excel 파일을 업로드하여 급여 데이터를 확인 후 저장할 수 있습니다.
      </Typography>

      <Stepper activeStep={getStepIndex()} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={actions.clearError}>
          {state.error}
        </Alert>
      )}

      {state.step === 'select' && renderFileSelectStep()}
      {state.step === 'preview' && renderPreviewStep()}
      {(state.step === 'confirmed' || state.step === 'completed') && renderResultStep()}
    </Box>
  );
};