/*
 * AI-HEADER
 * Intent: Drag-and-drop zone for bulk payslip PDF uploads
 * Domain Meaning: File input interface for multiple payslip PDFs
 * Misleading Names: None
 * Data Contracts: Accepts PDF files and validates them
 * PII: None - file upload interface only
 * Invariants: Only accepts PDF files, validates before accepting
 * RAG Keywords: payslip, dropzone, upload, PDF, drag, drop, bulk
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-dropzone-upload-component
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface PayslipDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  disabled?: boolean;
}

export const PayslipDropzone: React.FC<PayslipDropzoneProps> = ({ 
  onDrop, 
  disabled = false 
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    disabled,
    multiple: true
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 4,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'divider',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: disabled ? 'divider' : 'primary.main',
          backgroundColor: disabled ? 'background.paper' : 'action.hover'
        }
      }}
    >
      <input {...getInputProps()} />
      <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {isDragActive
          ? 'PDF 파일을 여기에 놓으세요'
          : 'PDF 파일을 드래그하거나 클릭하여 업로드'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        여러 개의 급여명세서 PDF 파일을 한 번에 업로드할 수 있습니다
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        권장 파일명 형식: 급여명세서_YYYY-MM_이름.pdf
      </Typography>
    </Paper>
  );
};