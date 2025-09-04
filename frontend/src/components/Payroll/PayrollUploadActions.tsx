import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as ConfirmIcon,
  Refresh as RetryIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

interface PayrollUploadActionsProps {
  step: 'select' | 'preview' | 'result';
  hasFile: boolean;
  hasPreviewData: boolean;
  hasSelectedRecords: boolean;
  isLoading: boolean;
  isConfirming: boolean;
  uploadSuccess?: boolean;
  onPreview: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReset?: () => void;
  onDownloadTemplate?: () => void;
}

const PayrollUploadActions: React.FC<PayrollUploadActionsProps> = ({
  step,
  hasFile,
  hasPreviewData,
  hasSelectedRecords,
  isLoading,
  isConfirming,
  uploadSuccess,
  onPreview,
  onConfirm,
  onCancel,
  onReset,
  onDownloadTemplate
}) => {
  // File selection step actions
  if (step === 'select') {
    return (
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PreviewIcon />}
          onClick={onPreview}
          disabled={!hasFile || isLoading}
        >
          {isLoading ? '처리 중...' : '미리보기'}
        </Button>
        
        {onDownloadTemplate && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={onDownloadTemplate}
          >
            템플릿 다운로드
          </Button>
        )}
      </Box>
    );
  }

  // Preview step actions
  if (step === 'preview') {
    return (
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<CancelIcon />}
          onClick={onCancel}
          disabled={isConfirming}
        >
          취소
        </Button>

        <ButtonGroup variant="contained">
          <Tooltip 
            title={!hasSelectedRecords ? '처리할 레코드를 선택하세요' : ''}
            placement="top"
          >
            <span>
              <Button
                color="primary"
                startIcon={isConfirming ? 
                  <CircularProgress size={20} color="inherit" /> : 
                  <SaveIcon />
                }
                onClick={onConfirm}
                disabled={!hasSelectedRecords || isConfirming}
              >
                {isConfirming ? '저장 중...' : '데이터베이스에 저장'}
              </Button>
            </span>
          </Tooltip>
        </ButtonGroup>
      </Box>
    );
  }

  // Result step actions
  if (step === 'result') {
    return (
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {uploadSuccess ? (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              disabled
            >
              업로드 완료
            </Button>
            {onReset && (
              <Button
                variant="outlined"
                startIcon={<RetryIcon />}
                onClick={onReset}
              >
                새 파일 업로드
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="contained"
              color="error"
              startIcon={<RetryIcon />}
              onClick={onReset}
            >
              다시 시도
            </Button>
          </>
        )}
      </Box>
    );
  }

  return null;
};

export default PayrollUploadActions;