/*
 * AI-HEADER
 * Intent: Payroll list page with filters and Excel export functionality
 * Domain Meaning: Administrative view of all payroll records with management capabilities
 * Misleading Names: None
 * Data Contracts: Expects payroll records from API with user data joined
 * PII: Contains salary information - role-based access control required
 * Invariants: Admin sees all records, Users see only their own
 * RAG Keywords: payroll, admin, list, filters, excel, export
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-list-page-admin-view-management
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  TextField, 
  MenuItem, 
  Card, 
  CardContent 
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { PayrollList } from '../../components/PayrollList';
import { apiService } from '../../services/api';

export const PayrollListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    paymentStatus: 'all',
    department: 'all'
  });
  const [searchText, setSearchText] = useState('');

  // Handle filter changes
  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const params = {
        year: filters.year,
        month: filters.month,
        ...(filters.paymentStatus !== 'all' && { paymentStatus: filters.paymentStatus })
      };
      
      const blob = await apiService.exportPayrollData(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${filters.year}-${filters.month.toString().padStart(2, '0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Excel export failed:', error);
    }
  };

  // Navigate to upload page
  const handleUploadClick = () => {
    navigate('/payroll/excel-upload');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          급여 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleUploadClick}
          >
            엑셀 업로드
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
          >
            엑셀 내보내기
          </Button>
        </Box>
      </Box>

      {/* Filter Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            필터
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="년도"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <MenuItem key={year} value={year}>
                    {year}년
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="월"
                value={filters.month}
                onChange={(e) => handleFilterChange('month', parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <MenuItem key={month} value={month}>
                    {month}월
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="상태"
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="pending">대기</MenuItem>
                <MenuItem value="approved">승인</MenuItem>
                <MenuItem value="paid">지급완료</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="부서"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <MenuItem value="all">전체 부서</MenuItem>
                <MenuItem value="개발팀">개발팀</MenuItem>
                <MenuItem value="경영관리팀">경영관리팀</MenuItem>
                <MenuItem value="영업팀">영업팀</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="사원명 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="사원명을 입력하세요"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payroll Data Grid */}
      <Paper sx={{ p: 2 }}>
        <PayrollList filters={filters} searchText={searchText} />
      </Paper>
    </Box>
  );
};