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
  InputAdornment,
  Autocomplete,
  Alert,
  Checkbox,
  Button
} from '@mui/material';
import {
  CheckCircle as MatchedIcon,
  Cancel as NotMatchedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
} from '@mui/icons-material';
import { PreviewRecord } from '../types/payrollUpload';
import { useAuth } from './AuthProvider';
import { apiService } from '../services/api';

interface PreviewDataTableProps {
  records: PreviewRecord[];
  onRecordActionChange?: (rowNumber: number, action: 'process' | 'skip' | 'manual', userId?: string) => void;
  selectedRecords?: Set<number>;  // Optional for backward compatibility
  onRecordSelectionChange?: (rowNumber: number, selected: boolean) => void;  // Optional
  onSelectAll?: (selected: boolean) => void;  // Optional
}

export const PreviewDataTable: React.FC<PreviewDataTableProps> = ({ 
  records, 
  onRecordActionChange,
  selectedRecords,
  onRecordSelectionChange,
  onSelectAll 
}) => {
  const { user } = useAuth();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [matchingFilter, setMatchingFilter] = React.useState<string>('all');
  
  // State for employee list and record actions
  const [employeeList, setEmployeeList] = React.useState<Array<{id: string; name: string; department: string; employeeId: string}>>([]);
  const [recordActions, setRecordActions] = React.useState<Map<number, {action: 'skip' | 'manual', userId?: string}>>(new Map());
  
  // Fetch employee list on mount
  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await apiService.get('/users');
        if (response.success && response.data) {
          // Transform to simple format for the component
          const simpleList = response.data
            .filter((user: any) => user.role !== 'admin' && user.role !== 'Admin')
            .map((user: any) => ({
              id: user._id || user.id,
              name: user.name || '',
              department: user.department || 'Unassigned',
              employeeId: user.employeeId || ''
            }));
          setEmployeeList(simpleList);
        }
      } catch (error) {
        console.error('Failed to fetch employee list:', error);
      }
    };
    fetchEmployees();
  }, []);
  
  // Handle action change for unmatched records
  const handleActionChange = (rowNumber: number, action: 'skip' | 'manual') => {
    const updated = new Map(recordActions);
    if (action === 'skip') {
      updated.set(rowNumber, { action: 'skip' });
      onRecordActionChange?.(rowNumber, 'skip');
    } else if (action === 'manual') {
      updated.set(rowNumber, { action: 'manual' });
    }
    setRecordActions(updated);
  };
  
  // Handle employee selection for manual matching
  const handleEmployeeSelect = (rowNumber: number, employeeId: string | null) => {
    if (employeeId) {
      const updated = new Map(recordActions);
      updated.set(rowNumber, { action: 'manual', userId: employeeId });
      setRecordActions(updated);
      onRecordActionChange?.(rowNumber, 'manual', employeeId);
    }
  };

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

  // Check if all visible records are selected
  const isAllPageSelected = React.useMemo(() => {
    if (!selectedRecords || paginatedRecords.length === 0) return false;
    return paginatedRecords.every(record => selectedRecords.has(record.rowNumber));
  }, [selectedRecords, paginatedRecords]);

  // Check if some visible records are selected
  const isSomePageSelected = React.useMemo(() => {
    if (!selectedRecords || paginatedRecords.length === 0) return false;
    return paginatedRecords.some(record => selectedRecords.has(record.rowNumber)) && !isAllPageSelected;
  }, [selectedRecords, paginatedRecords, isAllPageSelected]);

  // Handle select all on current page
  const handleSelectAllPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectAll && onRecordSelectionChange) {
      paginatedRecords.forEach(record => {
        onRecordSelectionChange(record.rowNumber, event.target.checked);
      });
    }
  };

  // Calculate selection summary
  const selectionSummary = React.useMemo(() => {
    if (!selectedRecords) return null;
    const selectedCount = selectedRecords.size;
    const totalCount = records.length;
    return { selectedCount, totalCount };
  }, [selectedRecords, records]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          데이터 미리보기 ({filteredRecords.length}건)
        </Typography>
        {selectionSummary && onRecordSelectionChange && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {selectionSummary.selectedCount}개 선택됨 / 전체 {selectionSummary.totalCount}개
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                records.forEach(record => {
                  if (record.status === 'valid' || record.status === 'warning') {
                    onRecordSelectionChange(record.rowNumber, true);
                  }
                });
              }}
            >
              유효한 레코드만 선택
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                if (onSelectAll) {
                  onSelectAll(true);
                }
              }}
            >
              모두 선택
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                if (onSelectAll) {
                  onSelectAll(false);
                }
              }}
            >
              모두 해제
            </Button>
          </Box>
        )}
      </Box>
      
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
              {onRecordSelectionChange && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isSomePageSelected}
                    checked={isAllPageSelected}
                    onChange={handleSelectAllPage}
                  />
                </TableCell>
              )}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>행</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>직원명</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>사번</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>매칭 상태</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>인센티브</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>세전총액</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>총 공제</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>실수령액</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRecords.map((record) => {
              const isSelected = selectedRecords?.has(record.rowNumber) || false;
              return (
                <TableRow
                  key={record.rowIndex}
                  selected={isSelected}
                  sx={{
                    backgroundColor:
                      isSelected ? 'action.selected' :
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
                  {onRecordSelectionChange && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) => onRecordSelectionChange(record.rowNumber, event.target.checked)}
                        color={record.status === 'invalid' ? 'error' : record.status === 'warning' ? 'warning' : 'primary'}
                      />
                    </TableCell>
                  )}
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
                <TableCell align="right">{formatCurrency(record.incentive || 0, true)}</TableCell>
                <TableCell align="right">{formatCurrency(record.grossSalaryPreTax || 0, true)}</TableCell>
                <TableCell align="right">{formatCurrency(record.totalDeductions, true)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(record.netSalary, true)}
                </TableCell>
                <TableCell align="center">
                  {getStatusChip(record.status)}
                </TableCell>
              </TableRow>
              );
            })}
            {paginatedRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={onRecordSelectionChange ? 10 : 9} align="center">
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