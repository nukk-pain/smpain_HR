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
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment
} from '@mui/material';
import {
  CheckCircle as MatchedIcon,
  Cancel as NotMatchedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { PreviewRecord } from '../types/payrollUpload';
import { useAuth } from './AuthProvider';

interface PreviewDataTableProps {
  records: PreviewRecord[];
}

export const PreviewDataTable: React.FC<PreviewDataTableProps> = ({ records }) => {
  const { user } = useAuth();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [matchingFilter, setMatchingFilter] = React.useState<string>('all');

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const maskSalaryAmount = (amount: number): string => {
    // Admin users can see full amounts
    if (user?.role === 'Admin' || user?.role === 'admin') {
      return amount.toString();
    }
    
    // Non-admin users see masked amounts
    if (!amount || amount === 0) return '0';
    const amountStr = amount.toString();
    if (amountStr.length <= 3) return '***';
    
    const firstPart = amountStr.substring(0, 2);
    const lastPart = amountStr.substring(amountStr.length - 1);
    const middleLength = amountStr.length - 3;
    return `${firstPart}${'*'.repeat(middleLength)}${lastPart}`;
  };

  const formatCurrency = (amount: number, shouldMask: boolean = false) => {
    const displayAmount = shouldMask ? maskSalaryAmount(amount) : amount;
    
    if (shouldMask && user?.role !== 'Admin' && user?.role !== 'admin') {
      // For masked amounts, show with asterisks
      return `₩${displayAmount}`;
    }
    
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

  // Filter records based on search term and filters
  const filteredRecords = React.useMemo(() => {
    return records.filter((record) => {
      // Search term filter (employee name and ID)
      const matchesSearch = searchTerm === '' || 
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.employeeId && record.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.matchedUser.found && record.matchedUser.name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      
      // Matching filter
      const matchesMatching = matchingFilter === 'all' || 
        (matchingFilter === 'matched' && record.matchedUser.found) ||
        (matchingFilter === 'unmatched' && !record.matchedUser.found);
      
      return matchesSearch && matchesStatus && matchesMatching;
    });
  }, [records, searchTerm, statusFilter, matchingFilter]);

  const paginatedRecords = filteredRecords.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        데이터 미리보기 ({filteredRecords.length}건)
      </Typography>
      
      {/* Filter Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="직원명 또는 사번으로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>검증 상태</InputLabel>
              <Select
                value={statusFilter}
                label="검증 상태"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="valid">정상</MenuItem>
                <MenuItem value="warning">경고</MenuItem>
                <MenuItem value="invalid">오류</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>매칭 상태</InputLabel>
              <Select
                value={matchingFilter}
                label="매칭 상태"
                onChange={(e) => setMatchingFilter(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="matched">매칭됨</MenuItem>
                <MenuItem value="unmatched">매칭 실패</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
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
                <TableCell align="right">{formatCurrency(record.baseSalary, true)}</TableCell>
                <TableCell align="right">{formatCurrency(record.totalAllowances, true)}</TableCell>
                <TableCell align="right">{formatCurrency(record.totalDeductions, true)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(record.netSalary, true)}
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
        count={filteredRecords.length}
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