/*
 * AI-HEADER
 * Intent: Refactored bulk payslip upload component with modular architecture
 * Domain Meaning: Manages batch PDF upload and employee matching workflow
 * Misleading Names: None
 * Data Contracts: Uses PayslipFile types and API service for upload
 * PII: Handles employee payslip data through child components
 * Invariants: Must match all files before upload, validates PDF format
 * RAG Keywords: payslip, bulk, upload, PDF, matching, refactored
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-bulk-upload-refactored-component
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Grid,
  Divider,
  Paper
} from '@mui/material';
import { CloudUpload, History } from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import api from '../services/api';
import { 
  PayslipFile, 
  EmployeeUser, 
  UploadHistory 
} from '../types/PayslipUploadTypes';
import { 
  parsePayslipFileName, 
  validatePayslipFile 
} from '../utils/payslipFileParser';
import { PayslipDropzone } from './payslip/PayslipDropzone';
import { PayslipFileList } from './payslip/PayslipFileList';
import { PayslipMatchingDialog } from './payslip/PayslipMatchingDialog';
import { PayslipUploadSummary } from './payslip/PayslipUploadSummary';
import { PayslipUploadHistory } from './payslip/PayslipUploadHistory';

export const PayslipBulkUploadRefactored: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<PayslipFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [matchingInProgress, setMatchingInProgress] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PayslipFile | null>(null);
  const [matchingDialogOpen, setMatchingDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<EmployeeUser[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Calculate matched count
  const matchedCount = useMemo(() => 
    files.filter(f => f.matchStatus === 'matched' || f.matchStatus === 'manual').length,
    [files]
  );

  // Fetch available users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        const users = response.data
          .filter((u: any) => u.role !== 'Admin' && u.isActive)
          .map((u: any) => ({
            id: u._id,
            name: u.name,
            employeeId: u.employeeId,
            department: u.department
          }));
        setAvailableUsers(users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch upload history
  const fetchUploadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/payslips/history');
      setUploadHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch upload history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showHistory) {
      fetchUploadHistory();
    }
  }, [showHistory, fetchUploadHistory]);

  // Handle file drop
  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: PayslipFile[] = [];
    
    for (const file of acceptedFiles) {
      const error = validatePayslipFile(file);
      if (error) {
        setError(`${file.name}: ${error}`);
        continue;
      }

      const parsedData = parsePayslipFileName(file.name);
      newFiles.push({
        file,
        fileName: file.name,
        parsedData,
        matchStatus: 'pending',
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
      // Auto-match after adding files
      await matchEmployees([...files, ...newFiles]);
    }
  }, [files]);

  // Match employees
  const matchEmployees = async (filesToMatch: PayslipFile[]) => {
    setMatchingInProgress(true);
    
    const fileNames = filesToMatch.map(f => f.fileName);
    const parsedNames = filesToMatch.map(f => f.parsedData.employeeName || '');

    try {
      const response = await api.post('/payslips/match-employees', {
        fileNames,
        parsedNames
      });

      const matchResults = (response as any).matches;
      
      const updatedFiles = filesToMatch.map((file, index) => {
        const matchResult = matchResults.find(
          (m: any) => m.fileName === file.fileName
        );

        if (matchResult && matchResult.matched) {
          const matchedUser = availableUsers.find(u => u.id === matchResult.userId);
          return {
            ...file,
            matchStatus: 'matched' as const,
            matchedUserId: matchResult.userId,
            matchedUser: matchedUser ? {
              id: matchedUser.id,
              name: matchedUser.name,
              employeeId: matchedUser.employeeId,
              department: matchedUser.department
            } : undefined
          };
        } else {
          return {
            ...file,
            matchStatus: 'failed' as const,
            error: matchResult?.reason || '일치하는 직원을 찾을 수 없습니다'
          };
        }
      });

      setFiles(updatedFiles);
    } catch (error) {
      console.error('Failed to match employees:', error);
      setError('직원 매칭 중 오류가 발생했습니다.');
    } finally {
      setMatchingInProgress(false);
    }
  };

  // Handle manual match
  const handleManualMatch = (file: PayslipFile) => {
    setSelectedFile(file);
    setMatchingDialogOpen(true);
  };

  // Confirm manual match
  const handleManualMatchConfirm = async (userId: string) => {
    if (!selectedFile) return;

    const matchedUser = availableUsers.find(u => u.id === userId);
    if (!matchedUser) return;

    setFiles(prev => prev.map(f => 
      f.fileName === selectedFile.fileName
        ? {
            ...f,
            matchStatus: 'manual' as const,
            matchedUserId: userId,
            matchedUser: {
              id: matchedUser.id,
              name: matchedUser.name,
              employeeId: matchedUser.employeeId,
              department: matchedUser.department
            }
          }
        : f
    ));

    setMatchingDialogOpen(false);
    setSelectedFile(null);
  };

  // Remove file
  const handleRemoveFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.fileName !== fileName));
  };

  // Handle bulk upload
  const handleBulkUpload = useCallback(async () => {
    const matchedFiles = files.filter(
      f => f.matchStatus === 'matched' || f.matchStatus === 'manual'
    );

    if (matchedFiles.length === 0) {
      setError('업로드할 파일이 없습니다.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    const fileMapping: any[] = [];

    matchedFiles.forEach((file, index) => {
      formData.append('payslips', file.file);
      fileMapping.push({
        fileName: file.fileName,
        userId: file.matchedUserId,
        yearMonth: file.parsedData.yearMonth
      });
    });

    formData.append('fileMapping', JSON.stringify(fileMapping));

    try {
      const response = await api.post('/payslips/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        }
      });

      const result = response.data;
      setSuccess(
        `업로드 완료: 성공 ${result.successCount}건, 실패 ${result.failedCount}건`
      );
      
      // Clear uploaded files
      setFiles([]);
      
      // Refresh history
      if (showHistory) {
        fetchUploadHistory();
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(
        error.response?.data?.error || '업로드 중 오류가 발생했습니다.'
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [files, showHistory, fetchUploadHistory]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'u' && matchedCount > 0 && !uploading) {
        handleBulkUpload();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [matchedCount, uploading, handleBulkUpload]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        급여명세서 일괄 업로드
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        여러 개의 급여명세서 PDF 파일을 한 번에 업로드하고 직원별로 자동 배포합니다.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <PayslipDropzone 
            onDrop={handleDrop} 
            disabled={uploading || matchingInProgress}
          />
        </Grid>

        {files.length > 0 && (
          <>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  업로드 파일 목록
                </Typography>
                <PayslipFileList
                  files={files}
                  onManualMatch={handleManualMatch}
                  onRemoveFile={handleRemoveFile}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <PayslipUploadSummary
                files={files}
                uploading={uploading}
                uploadProgress={uploadProgress}
              />
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<CloudUpload />}
                  onClick={handleBulkUpload}
                  disabled={uploading || matchedCount === 0}
                >
                  {uploading 
                    ? `업로드 중... ${uploadProgress}%` 
                    : `${matchedCount}개 파일 업로드`}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                  단축키: Ctrl + U
                </Typography>
              </Box>
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              업로드 이력
            </Typography>
            <Button
              startIcon={<History />}
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? '이력 숨기기' : '이력 보기'}
            </Button>
          </Box>
          
          {showHistory && (
            <PayslipUploadHistory
              history={uploadHistory}
              loading={historyLoading}
            />
          )}
        </Grid>
      </Grid>

      <PayslipMatchingDialog
        open={matchingDialogOpen}
        file={selectedFile}
        availableUsers={availableUsers}
        onClose={() => {
          setMatchingDialogOpen(false);
          setSelectedFile(null);
        }}
        onConfirm={handleManualMatchConfirm}
      />
    </Box>
  );
};