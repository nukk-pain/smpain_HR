/*
 * AI-HEADER
 * Intent: Payroll list component with AG Grid integration
 * Domain Meaning: Display payroll records in tabular format with filters
 * Misleading Names: None
 * Data Contracts: Expects payroll data with user information joined
 * PII: Contains salary information - handle with proper access control
 * Invariants: Must display columns for all payroll fields; Users see only own records
 * RAG Keywords: payroll, list, grid, ag-grid, table, salary
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-list-component-render-salary-data
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { CircularProgress, Alert, Box, Typography } from '@mui/material';
import { apiService } from '../services/api';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

interface PayrollRecord {
  _id: string;
  year: number;
  month: number;
  user: {
    name: string;
    department: string;
  };
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: 'pending' | 'approved' | 'paid' | 'cancelled';
}

interface PayrollListProps {
  filters?: {
    year: number;
    month: number;
    paymentStatus: string;
    department: string;
  };
  searchText?: string;
}

export const PayrollList: React.FC<PayrollListProps> = ({ filters, searchText }) => {
  const navigate = useNavigate();
  
  // State management
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch payroll data with filters
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare query parameters from filters
      const queryParams: any = {};
      
      if (filters?.year) {
        queryParams.year = filters.year;
      }
      
      if (filters?.month) {
        queryParams.month = filters.month;
      }
      
      if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
        queryParams.paymentStatus = filters.paymentStatus;
      }
      
      const response = await apiService.getPayrollRecords(queryParams);
      
      if (response.success) {
        let data = response.data || [];
        
        // Client-side filtering for department (since backend might not support it yet)
        if (filters?.department && filters.department !== 'all') {
          data = data.filter((record: PayrollRecord) => 
            record.user?.department === filters.department
          );
        }
        
        // Client-side filtering for search text
        if (searchText && searchText.trim()) {
          data = data.filter((record: PayrollRecord) => 
            record.user?.name?.toLowerCase().includes(searchText.toLowerCase().trim())
          );
        }
        
        setPayrollData(data);
      } else {
        setError(response.error || '급여 데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '급여 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [filters, searchText]);

  // Handle row double click to navigate to detail page
  const handleRowDoubleClick = (event: RowDoubleClickedEvent) => {
    const payrollId = event.data._id;
    if (payrollId) {
      navigate(`/payroll/detail/${payrollId}`);
    }
  };

  // AG Grid column definitions
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'yearMonth',
      headerName: '년월',
      width: 100,
      valueGetter: (params) => `${params.data.year}-${params.data.month.toString().padStart(2, '0')}`,
      sortable: true
    },
    {
      field: 'userName',
      headerName: '사원명',
      width: 120,
      valueGetter: (params) => params.data.user?.name || '',
      sortable: true
    },
    {
      field: 'department',
      headerName: '부서',
      width: 120,
      valueGetter: (params) => params.data.user?.department || '',
      sortable: true,
      filter: 'agTextColumnFilter'
    },
    {
      field: 'baseSalary',
      headerName: '기본급',
      width: 120,
      valueFormatter: (params) => params.value?.toLocaleString() || '0',
      type: 'numericColumn',
      sortable: true
    },
    {
      field: 'totalAllowances',
      headerName: '수당',
      width: 120,
      valueFormatter: (params) => params.value?.toLocaleString() || '0',
      type: 'numericColumn',
      sortable: true
    },
    {
      field: 'totalDeductions',
      headerName: '공제',
      width: 120,
      valueFormatter: (params) => params.value?.toLocaleString() || '0',
      type: 'numericColumn',
      sortable: true
    },
    {
      field: 'netSalary',
      headerName: '실수령액',
      width: 140,
      valueFormatter: (params) => params.value?.toLocaleString() || '0',
      type: 'numericColumn',
      sortable: true
    },
    {
      field: 'paymentStatus',
      headerName: '상태',
      width: 100,
      valueFormatter: (params) => {
        const statusMap = {
          pending: '대기',
          approved: '승인',
          paid: '지급완료',
          cancelled: '취소'
        };
        return statusMap[params.value] || params.value;
      },
      sortable: true,
      filter: 'agTextColumnFilter'
    }
  ], []);

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          급여 데이터를 불러오는 중...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '600px', width: '100%' }}>
      <div className="ag-theme-material" style={{ height: '100%', width: '100%' }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowData={payrollData || []}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true
          }}
          pagination={true}
          paginationPageSize={50}
          suppressRowClickSelection={false}
          rowSelection="single"
          animateRows={true}
          onRowDoubleClicked={handleRowDoubleClick}
        />
      </div>
    </Box>
  );
};