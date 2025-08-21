import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { validateExcelFile, formatFileSize } from '@/utils/payrollExcelReader';

interface PayrollFileDropZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  error?: string | null;
}

const PayrollFileDropZone: React.FC<PayrollFileDropZoneProps> = ({
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileValidation = (selectedFile: File) => {
    const validation = validateExcelFile(selectedFile);
    
    if (!validation.isValid) {
      setValidationError(validation.error || '파일 검증 실패');
      return false;
    }
    
    setValidationError(null);
    return true;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const selectedFile = files[0];
    if (handleFileValidation(selectedFile)) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const displayError = error || validationError;

  return (
    <Box>
      <Paper
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          backgroundColor: isDragging ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: disabled ? 0.6 : 1,
          '&:hover': {
            borderColor: disabled ? 'divider' : 'primary.main',
            backgroundColor: disabled ? 'background.paper' : 'action.hover'
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          disabled={disabled}
        />

        {!file ? (
          <Box sx={{ textAlign: 'center' }}>
            <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Excel 파일을 드래그하거나 클릭하여 업로드
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              지원 형식: .xlsx, .xls (최대 10MB)
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleButtonClick}
              disabled={disabled}
              sx={{ mt: 2 }}
            >
              파일 선택
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FileIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
                setValidationError(null);
              }}
              disabled={disabled}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        )}
      </Paper>

      {displayError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {displayError}
        </Alert>
      )}
    </Box>
  );
};

export default PayrollFileDropZone;