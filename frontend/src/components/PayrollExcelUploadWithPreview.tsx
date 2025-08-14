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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  TextField
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
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
import { PayrollUnmatchedSection } from './PayrollUnmatchedSection';
import { PayrollUploadSummary } from './PayrollUploadSummary';
import { PreviewApiResponse, ConfirmApiResponse } from '../types/payrollUpload';

export const PayrollExcelUploadWithPreview: React.FC = () => {
  const { state, actions, helpers } = usePayrollUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [submitAttempted, setSubmitAttempted] = React.useState(false);
  
  // Year and month state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = React.useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(currentDate.getMonth() + 1);
  
  // State for managing record actions and employee list
  const [recordActions, setRecordActions] = React.useState<Map<number, {action: 'skip' | 'manual', userId?: string}>>(new Map());
  const [employeeList, setEmployeeList] = React.useState<Array<{id: string; name: string; department: string; employeeId: string}>>([]);
  
  // State for managing selected records
  const [selectedRecords, setSelectedRecords] = React.useState<Set<number>>(new Set());
  
  // Fetch employee list when preview data is available
  React.useEffect(() => {
    if (state.previewData) {
      const fetchEmployees = async () => {
        try {
          const response = await apiService.get('/users');
          if (response.success && response.data) {
            // Transform to simple format for the component
            const simpleList = response.data
              .filter((user: any) => user.role !== 'admin' && user.role !== 'Admin')
              .map((user: any) => ({
                id: user._id || user.id,
                name: user.name || '',
                department: user.department || 'Unassigned',
                employeeId: user.employeeId || ''
              }));
            setEmployeeList(simpleList);
          }
        } catch (error) {
          console.error('Failed to fetch employee list:', error);
        }
      };
      fetchEmployees();
      
      // Initialize selected records (select valid and warning records by default)
      const initialSelected = new Set<number>();
      state.previewData.records.forEach((record, index) => {
        const rowNumber = index + 1;
        if (record.status === 'valid' || record.status === 'warning') {
          initialSelected.add(rowNumber);
        }
      });
      setSelectedRecords(initialSelected);
    }
  }, [state.previewData]);
  
  // Handle record selection changes
  const handleRecordSelectionChange = (rowNumber: number, selected: boolean) => {
    const newSelected = new Set(selectedRecords);
    const updated = new Map(recordActions);
    
    if (selected) {
      newSelected.add(rowNumber);
      // Remove skip action if record is selected
      if (updated.get(rowNumber)?.action === 'skip') {
        updated.delete(rowNumber);
      }
    } else {
      newSelected.delete(rowNumber);
      // Add skip action if record is deselected (unless it's manually matched)
      if (!updated.has(rowNumber) || updated.get(rowNumber)?.action !== 'manual') {
        updated.set(rowNumber, { action: 'skip' });
      }
    }
    
    setSelectedRecords(newSelected);
    setRecordActions(updated);
  };
  
  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected && state.previewData) {
      const allRecords = new Set<number>();
      state.previewData.records.forEach((_, index) => {
        allRecords.add(index + 1);
      });
      setSelectedRecords(allRecords);
      // Clear all skip actions
      setRecordActions(new Map());
    } else {
      setSelectedRecords(new Set());
      // Mark all as skip
      if (state.previewData) {
        const allSkip = new Map<number, {action: 'skip' | 'manual', userId?: string}>();
        state.previewData.records.forEach((_, index) => {
          allSkip.set(index + 1, { action: 'skip' });
        });
        setRecordActions(allSkip);
      }
    }
  };
  
  // Handle record action changes (for manual matching)
  const handleRecordActionChange = (rowNumber: number, action: 'process' | 'skip' | 'manual', userId?: string) => {
    const updated = new Map(recordActions);
    const newSelected = new Set(selectedRecords);
    
    if (action === 'skip') {
      updated.set(rowNumber, { action: 'skip' });
      newSelected.delete(rowNumber);
    } else if (action === 'manual' && userId) {
      updated.set(rowNumber, { action: 'manual', userId });
      newSelected.add(rowNumber); // Auto-select manually matched records
    } else if (action === 'process') {
      updated.delete(rowNumber); // Remove from manual actions if it's auto-processed
      newSelected.add(rowNumber);
    }
    
    setRecordActions(updated);
    setSelectedRecords(newSelected);
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
    // Clear previous preview when new file is selected
    if (state.previewData) {
      actions.setPreviewData(null, null, null);
    }
  }, [validateFile, actions, state.previewData]);

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

  // Enhanced error handling with retry logic
  const executeWithRetry = async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    delay: number = 1000
  ) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} failed:`, err);
        
        if (attempt === maxRetries) {
          // On final failure, provide user-friendly error message
          if (err.response?.status === 413) {
            throw new Error('파일 크기가 너무 큽니다. 10MB 이하의 파일을 업로드해주세요.');
          } else if (err.response?.status === 400) {
            throw new Error(err.response?.data?.error || '파일 형식이 올바르지 않습니다.');
          } else if (err.response?.status >= 500) {
            throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
          } else if (err.code === 'NETWORK_ERROR' || !navigator.onLine) {
            throw new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
          } else {
            throw err;
          }
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
        }
      }
    }
  };

  // Handle preview with retry logic
  const handlePreview = async () => {
    if (!state.selectedFile) return;
    
    try {
      actions.setUploading(true);
      actions.clearError();
      
      const response = await executeWithRetry(async () => {
        return await apiService.previewPayrollExcel(
          state.selectedFile!,
          selectedYear,
          selectedMonth
        ) as unknown as PreviewApiResponse;
      });
      
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

  // Generate idempotency key for this confirm operation
  const generateIdempotencyKey = useCallback(() => {
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const randomString = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `confirm_${timestamp}_${randomString}`;
  }, []);

  // Handle confirm with retry logic
  // Show confirmation dialog
  const handleConfirmClick = () => {
    // Prevent duplicate submission attempts
    if (submitAttempted) {
      actions.setError('이미 저장 요청이 진행 중입니다. 잠시만 기다려주세요.');
      return;
    }
    setConfirmDialogOpen(true);
  };

  // Handle actual confirm with retry logic  
  const handleConfirm = async () => {
    setConfirmDialogOpen(false);
    
    // Set submit attempted flag to prevent duplicate submissions
    if (submitAttempted) {
      console.log('⚠️ Duplicate submission prevented');
      return;
    }
    setSubmitAttempted(true);
    
    if (!state.previewToken) {
      actions.setError('프리뷰 토큰이 없습니다. 다시 업로드해주세요.');
      setSubmitAttempted(false);
      return;
    }

    if (helpers.isPreviewExpired()) {
      actions.setError('프리뷰가 만료되었습니다. 다시 업로드해주세요.');
      actions.reset();
      setSubmitAttempted(false);
      return;
    }
    
    try {
      actions.setConfirming(true);
      actions.clearError();
      
      // Generate idempotency key for this operation
      const idempotencyKey = generateIdempotencyKey();
      console.log('🔑 Generated idempotency key:', idempotencyKey);
      
      // Convert recordActions Map to array format for API
      // Include all unselected records as 'skip' actions
      const recordActionsArray = [];
      
      if (state.previewData) {
        state.previewData.records.forEach((record, index) => {
          const rowNumber = index + 1;
          
          // If record is not selected, mark it as skip
          if (!selectedRecords.has(rowNumber)) {
            recordActionsArray.push({
              rowNumber,
              action: 'skip',
              userId: undefined
            });
          }
          // If record has manual matching, include it
          else if (recordActions.has(rowNumber)) {
            const action = recordActions.get(rowNumber);
            recordActionsArray.push({
              rowNumber,
              action: action.action,
              userId: action.userId
            });
          }
          // Selected records without special actions will be processed normally
        });
      }
      
      const response = await executeWithRetry(async () => {
        return await apiService.confirmPayrollExcel(
          state.previewToken!,
          idempotencyKey,
          state.duplicateMode,
          recordActionsArray
        ) as unknown as ConfirmApiResponse;
      });
      
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
      setSubmitAttempted(false); // Reset flag after operation completes
    }
  };

  // Handle cancel
  const handleCancel = () => {
    actions.reset();
  };

  // Render file selection step
  const renderFileSelectStep = () => (
    <>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>처리 연월</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="년도"
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 2020, max: 2030 }}
            />
            <TextField
              label="월"
              type="number"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              size="small"
              sx={{ width: 80 }}
              inputProps={{ min: 1, max: 12 }}
            />
          </Box>
        </Box>
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
                      {(state.selectedFile.size / 1024 / 1024).toFixed(2)} MB | {selectedYear}년 {selectedMonth}월 데이터
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
        {/* Enhanced summary with action counts */}
        <PayrollUploadSummary 
          records={state.previewData.records} 
          recordActions={recordActions}
        />
        
        {/* Show unmatched records section first for user attention */}
        <PayrollUnmatchedSection
          records={state.previewData.records}
          employeeList={employeeList}
          onRecordActionChange={handleRecordActionChange}
        />
        
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

        {/* 중복 레코드가 있을 때 처리 옵션 표시 */}
        {state.previewData.summary.duplicateRecords && state.previewData.summary.duplicateRecords > 0 && (
          <Paper sx={{ p: 2, mt: 2, mb: 2, bgcolor: 'background.default' }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">
                {state.previewData.summary.duplicateRecords}개의 중복 레코드 발견 - 처리 방법을 선택하세요:
              </FormLabel>
              <RadioGroup
                value={state.duplicateMode}
                onChange={(e) => actions.setDuplicateMode(e.target.value as any)}
                sx={{ mt: 1 }}
              >
                <FormControlLabel 
                  value="skip" 
                  control={<Radio />} 
                  label="건너뛰기 (기존 데이터 유지)" 
                />
                <FormControlLabel 
                  value="update" 
                  control={<Radio />} 
                  label="업데이트 (새 데이터로 덮어쓰기)" 
                />
              </RadioGroup>
            </FormControl>
          </Paper>
        )}

        <Box sx={{ mt: 3 }}>
          <PreviewDataTable 
            records={state.previewData.records} 
            selectedRecords={selectedRecords}
            onRecordSelectionChange={handleRecordSelectionChange}
            onSelectAll={handleSelectAll}
            onRecordActionChange={handleRecordActionChange}
          />
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
            onClick={handleConfirmClick}
            disabled={
              state.confirming ||
              submitAttempted ||
              selectedRecords.size === 0  // Changed: Must have at least 1 record selected
            }
            startIcon={<SaveIcon />}
          >
            {submitAttempted ? '처리 중...' : state.confirming ? '저장 중...' : `선택한 ${selectedRecords.size}개 레코드 저장`}
          </Button>
        </Box>

        {(state.confirming || submitAttempted) && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              데이터를 저장하고 있습니다...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              중복 제출 방지가 활성화되어 있습니다.
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
                  {state.result?.summary?.fileName || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  처리 시간
                </Typography>
                <Typography variant="body1">
                  {state.result?.summary?.processedAt 
                    ? new Date(state.result.summary.processedAt).toLocaleString() 
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
                  {state.result?.totalRecords && state.result?.successfulImports
                    ? `${((state.result.successfulImports / state.result.totalRecords) * 100).toFixed(1)}%`
                    : 'N/A'}
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

      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={actions.clearError}>
          {state.error}
        </Alert>
      )}

      {/* File Selection Area - Always Visible */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            파일 업로드
          </Typography>
          {renderFileSelectStep()}
        </CardContent>
      </Card>

      {/* Preview Area - Shows when preview data is available */}
      {state.previewData && (
        <>
          <Divider sx={{ my: 3 }} />
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                데이터 미리보기
              </Typography>
              {renderPreviewStep()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Result Area - Shows after confirmation */}
      {(state.step === 'confirmed' || state.step === 'completed') && (
        <>
          <Divider sx={{ my: 3 }} />
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                업로드 결과
              </Typography>
              {renderResultStep()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          급여 데이터 저장 확인
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {state.previewData && (
              <>
                <Typography variant="body2" gutterBottom>
                  선택한 급여 데이터를 데이터베이스에 저장하시겠습니까?
                </Typography>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="medium" color="primary.main">
                    • 선택한 레코드: {selectedRecords.size}건
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 제외될 레코드: {state.previewData.summary.totalRecords - selectedRecords.size}건
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    • 총 {state.previewData.summary.totalRecords}건 중 {selectedRecords.size}건 저장 예정
                  </Typography>
                  {state.previewData.summary.warningRecords > 0 && (
                    <Typography variant="body2" color="warning.main">
                      • 경고가 있는 데이터 포함 가능
                    </Typography>
                  )}
                </Box>
                {selectedRecords.size < state.previewData.summary.totalRecords && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      선택하지 않은 {state.previewData.summary.totalRecords - selectedRecords.size}개 레코드는 저장되지 않습니다.
                    </Typography>
                  </Alert>
                )}
                <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                  저장 후에는 데이터를 수정할 수 없습니다.
                </Typography>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={state.confirming}
            startIcon={<SaveIcon />}
          >
            {state.confirming ? '저장 중...' : '확인하고 저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};