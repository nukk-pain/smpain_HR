/*
 * AI-HEADER
 * Intent: Excel upload component with drag & drop functionality for payroll data
 * Domain Meaning: Bulk payroll data import interface with validation and preview
 * Misleading Names: None
 * Data Contracts: Expects Excel files with specific payroll data structure
 * PII: Contains salary information - secure upload and processing required
 * Invariants: Must validate file types, size limits, and data structure
 * RAG Keywords: excel, upload, payroll, bulk, drag-drop, validation
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-excel-upload-component-bulk-data-import
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  GetApp as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Description as FileIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface UploadResult {
  summary: {
    totalRecords: number;
    successCount: number;
    errorCount: number;
  };
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export const PayrollExcelUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type validation
  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return '지원하지 않는 파일 형식입니다. Excel 파일만 업로드 가능합니다.';
    }
    
    // Check file size (10MB limit)
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
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    
    setError(null);
    setSelectedFile(file);
    setUploadResult(null);
  }, [validateFile]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  // Handle upload button click
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setUploading(true);
      setError(null);
      
      const response = await apiService.uploadPayrollExcel(selectedFile);
      
      if (response.success) {
        setUploadResult(response.data);
      } else {
        setError(response.error || '업로드에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
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
      setError('템플릿 다운로드에 실패했습니다.');
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        급여 데이터 업로드
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Excel 파일을 업로드하여 급여 데이터를 일괄 등록할 수 있습니다.
      </Typography>

      {/* Template Download */}
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

      {/* Upload Area */}
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          border: `2px dashed ${dragActive ? 'primary.main' : 'grey.300'}`,
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
        data-testid="upload-dropzone"
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
        
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Excel 파일을 드래그하여 놓거나 클릭하여 업로드하세요
        </Typography>
        <Typography variant="body2" color="text.secondary">
          지원 파일 형식: .xlsx, .xls (최대 10MB)
        </Typography>
      </Paper>

      {/* Selected File Display */}
      {selectedFile && (
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <FileIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleUpload}
                    disabled={uploading}
                    startIcon={<UploadIcon />}
                  >
                    {uploading ? '업로드 중...' : '업로드'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleRemoveFile}
                    disabled={uploading}
                    startIcon={<DeleteIcon />}
                  >
                    제거
                  </Button>
                </Box>
              </Box>
              
              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    파일을 업로드하고 있습니다...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SuccessIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">
                  업로드 완료
                </Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <Chip
                    label={`총 ${uploadResult.summary.totalRecords}건`}
                    color="default"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Chip
                    label={`성공 ${uploadResult.summary.successCount}건`}
                    color="success"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Chip
                    label={`오류 ${uploadResult.summary.errorCount}건`}
                    color={uploadResult.summary.errorCount > 0 ? 'error' : 'default'}
                  />
                </Grid>
              </Grid>

              <Typography variant="body1" sx={{ mb: 1 }}>
                총 {uploadResult.summary.totalRecords}건 중 {uploadResult.summary.successCount}건 성공, {uploadResult.summary.errorCount}건 오류
              </Typography>

              {/* Error Details */}
              {uploadResult.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    오류 상세
                  </Typography>
                  <List dense>
                    {uploadResult.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${error.row}행: ${error.message}`}
                          secondary={error.message}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};