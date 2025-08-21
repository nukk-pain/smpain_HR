/*
 * AI-HEADER
 * Intent: Display list of payslip files with their matching status
 * Domain Meaning: Shows uploaded PDFs and their employee matching results
 * Misleading Names: None
 * Data Contracts: Uses PayslipFile type for file display
 * PII: Shows employee names and matching status
 * Invariants: Must accurately display file status and allow actions
 * RAG Keywords: payslip, file, list, status, matching, display
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-file-list-display-component
 */

import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Typography,
  Tooltip,
  Paper
} from '@mui/material';
import {
  PictureAsPdf,
  CheckCircle,
  Error,
  Warning,
  Delete,
  Edit,
  Info
} from '@mui/icons-material';
import { PayslipFile } from '../../types/PayslipUploadTypes';
import { formatFileSize, getStatusColor } from '../../utils/payslipFileParser';

interface PayslipFileListProps {
  files: PayslipFile[];
  onManualMatch: (file: PayslipFile) => void;
  onRemoveFile: (fileName: string) => void;
}

export const PayslipFileList: React.FC<PayslipFileListProps> = ({
  files,
  onManualMatch,
  onRemoveFile
}) => {
  const getStatusIcon = (status: PayslipFile['matchStatus']) => {
    switch (status) {
      case 'matched':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'manual':
        return <Warning color="warning" />;
      case 'pending':
      default:
        return <Info color="disabled" />;
    }
  };

  const getStatusLabel = (status: PayslipFile['matchStatus']) => {
    switch (status) {
      case 'matched':
        return '매칭 완료';
      case 'failed':
        return '매칭 실패';
      case 'manual':
        return '수동 매칭';
      case 'pending':
      default:
        return '대기중';
    }
  };

  if (files.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          업로드된 파일이 없습니다.
        </Typography>
      </Paper>
    );
  }

  return (
    <List>
      {files.map((file) => (
        <ListItem
          key={file.fileName}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 'none' }
          }}
        >
          <ListItemIcon>
            <PictureAsPdf color="error" />
          </ListItemIcon>
          
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">
                  {file.fileName}
                </Typography>
                <Chip
                  label={getStatusLabel(file.matchStatus)}
                  size="small"
                  color={getStatusColor(file.matchStatus) as any}
                  icon={getStatusIcon(file.matchStatus)}
                />
              </Box>
            }
            secondary={
              <Box sx={{ mt: 1 }}>
                {file.parsedData.yearMonth && (
                  <Typography variant="caption" component="span" sx={{ mr: 2 }}>
                    기간: {file.parsedData.yearMonth}
                  </Typography>
                )}
                {file.matchedUser ? (
                  <Typography variant="caption" component="span">
                    매칭: {file.matchedUser.name} ({file.matchedUser.employeeId})
                  </Typography>
                ) : file.parsedData.employeeName ? (
                  <Typography variant="caption" component="span">
                    추출된 이름: {file.parsedData.employeeName}
                  </Typography>
                ) : null}
                {file.error && (
                  <Typography variant="caption" color="error" display="block">
                    오류: {file.error}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  크기: {formatFileSize(file.file.size)}
                </Typography>
              </Box>
            }
          />
          
          <ListItemSecondaryAction>
            {file.matchStatus === 'failed' && (
              <Tooltip title="수동 매칭">
                <IconButton
                  edge="end"
                  onClick={() => onManualMatch(file)}
                  sx={{ mr: 1 }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="파일 제거">
              <IconButton
                edge="end"
                onClick={() => onRemoveFile(file.fileName)}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};