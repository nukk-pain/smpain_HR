/*
 * AI-HEADER
 * Intent: Data table component for displaying payroll preview records
 * Domain Meaning: Shows parsed Excel data with validation status before saving
 * Misleading Names: None
 * Data Contracts: Uses PreviewRecord type from payrollUpload types
 * PII: Displays employee names and salary information
 * Invariants: Must show all records with appropriate status indicators
 * RAG Keywords: payroll, preview, table, data-grid, validation, matching
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-preview-data-table-component
 */

import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Typography
} from '@mui/material';
import {
  CheckCircle as MatchedIcon,
  Cancel as NotMatchedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle
} from '@mui/icons-material';
import { PreviewRecord } from '../types/payrollUpload';

interface PreviewDataTableProps {
  records: PreviewRecord[];
}

export const PreviewDataTable: React.FC<PreviewDataTableProps> = ({ records }) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusChip = (status: PreviewRecord['status']) => {
    switch (status) {
      case 'valid':
        return (
          <Chip
            label="정상"
            color="success"
            size="small"
            icon={<CheckCircle />}
          />
        );
      case 'warning':
        return (
          <Chip
            label="경고"
            color="warning"
            size="small"
            icon={<WarningIcon />}
          />
        );
      case 'invalid':
        return (
          <Chip
            label="오류"
            color="error"
            size="small"
            icon={<ErrorIcon />}
          />
        );
      default:
        return null;
    }
  };

  const getMatchingChip = (matched: PreviewRecord['matchedUser']) => {
    if (matched.found) {
      return (
        <Chip
          label="매칭됨"
          color="success"
          size="small"
          icon={<MatchedIcon />}
          variant="outlined"
        />
      );
    } else {
      return (
        <Chip
          label="매칭 실패"
          color="error"
          size="small"
          icon={<NotMatchedIcon />}
          variant="outlined"
        />
      );
    }
  };

  const paginatedRecords = records.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        데이터 미리보기
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 1000 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>행</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>직원명</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>사번</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>매칭 상태</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>기본급</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>총 수당</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>총 공제</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>실수령액</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRecords.map((record) => (
              <TableRow
                key={record.rowIndex}
                sx={{
                  backgroundColor:
                    record.status === 'invalid' ? 'error.50' :
                    record.status === 'warning' ? 'warning.50' :
                    'inherit',
                  '&:hover': {
                    backgroundColor:
                      record.status === 'invalid' ? 'error.100' :
                      record.status === 'warning' ? 'warning.100' :
                      'action.hover'
                  }
                }}
              >
                <TableCell align="center">{record.rowIndex}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {record.employeeName}
                  </Typography>
                  {record.matchedUser.found && record.matchedUser.name !== record.employeeName && (
                    <Typography variant="caption" color="text.secondary">
                      ({record.matchedUser.name})
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {record.employeeId || '-'}
                  {record.matchedUser.found && record.matchedUser.employeeId && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      ({record.matchedUser.employeeId})
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  {getMatchingChip(record.matchedUser)}
                </TableCell>
                <TableCell align="right">{formatCurrency(record.baseSalary)}</TableCell>
                <TableCell align="right">{formatCurrency(record.totalAllowances)}</TableCell>
                <TableCell align="right">{formatCurrency(record.totalDeductions)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(record.netSalary)}
                </TableCell>
                <TableCell align="center">
                  {getStatusChip(record.status)}
                </TableCell>
              </TableRow>
            ))}
            {paginatedRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    표시할 데이터가 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={records.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="페이지당 행 수:"
        labelDisplayedRows={({ from, to, count }) =>
          `${count}개 중 ${from}-${to}`
        }
      />
    </Box>
  );
};