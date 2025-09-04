/*
 * AI-HEADER
 * Intent: Display history of payslip upload batches
 * Domain Meaning: Shows previous upload sessions with success/failure statistics
 * Misleading Names: None
 * Data Contracts: Uses UploadHistory type for historical data display
 * PII: Shows employee names in upload history
 * Invariants: Must accurately display historical upload data
 * RAG Keywords: payslip, history, upload, batch, statistics, accordion
 * DuplicatePolicy: canonical
 * FunctionIdentity: payslip-upload-history-display-component
 */

import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import { ExpandMore, History, CheckCircle, Error } from '@mui/icons-material';
import { UploadHistory } from '../../types/PayslipUploadTypes';

interface PayslipUploadHistoryProps {
  history: UploadHistory[];
  loading: boolean;
}

export const PayslipUploadHistory: React.FC<PayslipUploadHistoryProps> = ({
  history,
  loading
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (history.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <History sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          업로드 이력이 없습니다
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {history.map((upload) => (
        <Accordion key={upload._id}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              width: '100%' 
            }}>
              <History />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1">
                  {formatDate(upload.uploadedAt)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  업로드: {upload.uploadedBy.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  size="small"
                  label={`성공: ${upload.successCount}`}
                  color="success"
                  variant="outlined"
                />
                {upload.failedCount > 0 && (
                  <Chip
                    size="small"
                    label={`실패: ${upload.failedCount}`}
                    color="error"
                    variant="outlined"
                  />
                )}
                <Chip
                  size="small"
                  label={`전체: ${upload.totalFiles}`}
                  variant="outlined"
                />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>파일명</TableCell>
                    <TableCell>직원</TableCell>
                    <TableCell>급여월</TableCell>
                    <TableCell align="center">상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upload.payslips.map((payslip, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {payslip.fileName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {payslip.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {payslip.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>{payslip.yearMonth}</TableCell>
                      <TableCell align="center">
                        {payslip.uploadStatus === 'success' ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <Error color="error" fontSize="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};