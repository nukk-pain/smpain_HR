/*
 * AI-HEADER
 * Intent: File selection step component for payroll upload workflow
 * Domain Meaning: Initial file input and year/month selection interface
 * Misleading Names: None
 * Data Contracts: Uses File object and upload state from usePayrollUpload hook
 * PII: None - file selection only
 * Invariants: Must validate file before accepting, must have year/month selected
 * RAG Keywords: payroll, file, select, upload, step, excel, year, month
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-file-select-step-component
 */

import React, { useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { formatFileSize } from '../../utils/payrollUploadUtils';

interface PayrollFileSelectStepProps {
  selectedFile: File | null;
  selectedYear: number;
  selectedMonth: number;
  uploading: boolean;
  onFileSelect: (files: FileList | null) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onPreview: () => void;
  onFileRemove: () => void;
}

export const PayrollFileSelectStep: React.FC<PayrollFileSelectStepProps> = ({
  selectedFile,
  selectedYear,
  selectedMonth,
  uploading,
  onFileSelect,
  onYearChange,
  onMonthChange,
  onPreview,
  onFileRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    onFileSelect(files);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>처리 연월</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="년도"
              type="number"
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 2020, max: 2030 }}
            />
            <TextField
              label="월"
              type="number"
              value={selectedMonth}
              onChange={(e) => onMonthChange(parseInt(e.target.value))}
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
          onChange={(e) => onFileSelect(e.target.files)}
        />
        
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Excel 파일을 드래그하여 놓거나 클릭하여 업로드하세요
        </Typography>
        <Typography variant="body2" color="text.secondary">
          지원 파일 형식: .xlsx, .xls (최대 10MB)
        </Typography>
      </Paper>

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
                      {formatFileSize(selectedFile.size)} | {selectedYear}년 {selectedMonth}월 데이터
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={onPreview}
                    disabled={uploading}
                    startIcon={<PreviewIcon />}
                  >
                    {uploading ? '처리 중...' : '미리보기'}
                  </Button>
                  <IconButton
                    onClick={onFileRemove}
                    disabled={uploading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              
              {uploading && (
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
};