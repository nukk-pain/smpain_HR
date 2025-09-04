/*
 * AI-HEADER
 * Intent: Refactored payroll Excel upload component with preview functionality
 * Domain Meaning: Orchestrates two-phase upload process with modular components
 * Misleading Names: None
 * Data Contracts: Uses payrollUpload types, integrates with preview/confirm API
 * PII: Delegates PII handling to child components
 * Invariants: Must complete preview before confirmation, token expiry validation
 * RAG Keywords: payroll, excel, upload, preview, confirm, refactored, modular
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-excel-upload-preview-refactored-component
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Divider,
  Button,
  LinearProgress,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { apiService } from '../services/api';
import { usePayrollUpload } from '../hooks/usePayrollUpload';
import { PreviewDataTable } from './PayrollPreviewTable';
import { PreviewSummaryCard } from './PayrollPreviewSummary';
import { PayrollUnmatchedSection } from './PayrollUnmatchedSection';
import { PayrollUploadSummary } from './PayrollUploadSummary';
import { PayrollConfirmDialog } from './Payroll/PayrollConfirmDialog';
import { PayrollFileSelectStep } from './Payroll/PayrollFileSelectStep';
import { PayrollUploadResultStep } from './Payroll/PayrollUploadResultStep';
import { 
  validatePayrollFile, 
  executeWithRetry, 
  generateIdempotencyKey 
} from '../utils/payrollUploadUtils';
import { PreviewApiResponse, ConfirmApiResponse } from '../types/payrollUpload';

export const PayrollExcelUploadWithPreviewRefactored: React.FC = () => {
  const { state, actions, helpers } = usePayrollUpload();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  // Year and month state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  
  // State for managing record actions and employee list
  const [recordActions, setRecordActions] = useState<Map<number, {action: 'skip' | 'manual', userId?: string}>>(new Map());
  const [employeeList, setEmployeeList] = useState<Array<{id: string; name: string; department: string; employeeId: string}>>([]);
  
  // State for managing selected records
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  
  // Fetch employee list when preview data is available
  useEffect(() => {
    if (state.previewData) {
      const fetchEmployees = async () => {
        try {
          const response = await apiService.get('/users');
          if (response.success && response.data) {
            const simpleList = (response.data as any[])
              .filter((user: any) => user.role !== 'admin')
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
      
      // Initialize selected records
      const initialSelected = new Set<number>();
      state.previewData.records.forEach((record, index) => {
        const rowNumber = index + 1;
        if (!record.status || record.status !== 'invalid') {
          initialSelected.add(rowNumber);
        }
      });
      
      setSelectedRecords(initialSelected);
      
      if (initialSelected.size === 0 && state.previewData.records.length > 0) {
        actions.setError('⚠️ 처리 가능한 레코드가 없습니다. 모든 레코드가 오류 상태입니다.');
      }
    }
  }, [state.previewData, actions]);
  
  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validationError = validatePayrollFile(file);
    
    if (validationError) {
      actions.setError(validationError);
      actions.setSelectedFile(null);
      return;
    }
    
    actions.clearError();
    actions.setSelectedFile(file);
    if (state.previewData) {
      actions.setPreviewData(null, null, null);
    }
  }, [actions, state.previewData]);

  // Handle preview
  const handlePreview = useCallback(async () => {
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
  }, [state.selectedFile, actions, selectedYear, selectedMonth]);

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    setConfirmDialogOpen(false);
    
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
      
      const idempotencyKey = generateIdempotencyKey();
      const recordActionsArray: any[] = [];
      
      if (state.previewData) {
        state.previewData.records.forEach((record, index) => {
          const rowNumber = index + 1;
          
          if (!selectedRecords.has(rowNumber)) {
            recordActionsArray.push({
              rowNumber,
              action: 'skip',
              userId: undefined
            });
          } else if (recordActions.has(rowNumber)) {
            const action = recordActions.get(rowNumber)!;
            recordActionsArray.push({
              rowNumber,
              action: action.action,
              userId: action.userId
            });
          }
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
      setSubmitAttempted(false);
    }
  }, [state, actions, helpers, selectedRecords, recordActions, submitAttempted]);

  // Handle record selection changes
  const handleRecordSelectionChange = useCallback((rowNumber: number, selected: boolean) => {
    const newSelected = new Set(selectedRecords);
    const updated = new Map(recordActions);
    
    if (selected) {
      newSelected.add(rowNumber);
      if (updated.get(rowNumber)?.action === 'skip') {
        updated.delete(rowNumber);
      }
    } else {
      newSelected.delete(rowNumber);
      if (!updated.has(rowNumber) || updated.get(rowNumber)?.action !== 'manual') {
        updated.set(rowNumber, { action: 'skip' });
      }
    }
    
    setSelectedRecords(newSelected);
    setRecordActions(updated);
  }, [selectedRecords, recordActions]);
  
  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && state.previewData) {
      const allRecords = new Set<number>();
      state.previewData.records.forEach((record, index) => {
        const rowNumber = index + 1;
        if (!record.status || record.status !== 'invalid') {
          allRecords.add(rowNumber);
        }
      });
      setSelectedRecords(allRecords);
      setRecordActions(new Map());
    } else {
      setSelectedRecords(new Set());
      if (state.previewData) {
        const allSkip = new Map<number, {action: 'skip' | 'manual', userId?: string}>();
        state.previewData.records.forEach((_, index) => {
          allSkip.set(index + 1, { action: 'skip' });
        });
        setRecordActions(allSkip);
      }
    }
  }, [state.previewData]);
  
  // Handle record action changes
  const handleRecordActionChange = useCallback((rowNumber: number, action: 'process' | 'skip' | 'manual', userId?: string) => {
    const updated = new Map(recordActions);
    const newSelected = new Set(selectedRecords);
    
    if (action === 'skip') {
      updated.set(rowNumber, { action: 'skip' });
      newSelected.delete(rowNumber);
    } else if (action === 'manual' && userId) {
      updated.set(rowNumber, { action: 'manual', userId });
      newSelected.add(rowNumber);
    } else if (action === 'process') {
      updated.delete(rowNumber);
      newSelected.add(rowNumber);
    }
    
    setRecordActions(updated);
    setSelectedRecords(newSelected);
  }, [recordActions, selectedRecords]);

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

      {/* File Selection Area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            파일 업로드
          </Typography>
          <PayrollFileSelectStep
            selectedFile={state.selectedFile}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            uploading={state.uploading}
            onFileSelect={handleFileSelect}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
            onPreview={handlePreview}
            onFileRemove={() => actions.setSelectedFile(null)}
          />
        </CardContent>
      </Card>

      {/* Preview Area */}
      {state.previewData && (
        <>
          <Divider sx={{ my: 3 }} />
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                데이터 미리보기
              </Typography>
              
              <PayrollUploadSummary 
                records={state.previewData.records} 
                recordActions={recordActions}
              />
              
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
                </Alert>
              )}

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
                      <FormControlLabel value="skip" control={<Radio />} label="건너뛰기 (기존 데이터 유지)" />
                      <FormControlLabel value="update" control={<Radio />} label="업데이트 (새 데이터로 덮어쓰기)" />
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
                  onClick={actions.reset}
                  startIcon={<CancelIcon />}
                >
                  취소
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={state.confirming || submitAttempted || selectedRecords.size === 0}
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
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Result Area */}
      {(state.step === 'confirmed' || state.step === 'completed') && (
        <>
          <Divider sx={{ my: 3 }} />
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                업로드 결과
              </Typography>
              <PayrollUploadResultStep
                result={state.result}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onNewUpload={actions.reset}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirmation Dialog */}
      <PayrollConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirm}
        previewData={state.previewData}
        selectedRecordsCount={selectedRecords.size}
        confirming={state.confirming}
      />
    </Box>
  );
};