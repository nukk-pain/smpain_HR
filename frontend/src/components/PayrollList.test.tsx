/*
 * AI-HEADER
 * Intent: Test suite for PayrollList component
 * Domain Meaning: Payroll data table with grid functionality and filters
 * Misleading Names: None
 * Data Contracts: Expects payroll data with user information joined
 * PII: Contains salary information - test with mock data only
 * Invariants: Should display payroll records in tabular format
 * RAG Keywords: payroll, list, grid, ag-grid, test, table
 * DuplicatePolicy: canonical
 * FunctionIdentity: test-payroll-list-component-render-and-functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PayrollList } from './PayrollList';

// Mock AG Grid
jest.mock('ag-grid-react', () => ({
  AgGridReact: ({ columnDefs, rowData }: any) => (
    <div data-testid="ag-grid">
      <div data-testid="column-headers">
        {columnDefs?.map((col: any, index: number) => (
          <span key={index} data-testid={`header-${col.field}`}>
            {col.headerName}
          </span>
        ))}
      </div>
      <div data-testid="row-data">
        {rowData?.map((row: any, index: number) => (
          <div key={index} data-testid={`row-${index}`}>
            {JSON.stringify(row)}
          </div>
        ))}
      </div>
    </div>
  )
}));

// Mock API hook
jest.mock('../hooks/useApi', () => ({
  useApi: () => ({
    data: [
      {
        _id: '1',
        year: 2024,
        month: 8,
        user: { name: '김철수', department: '개발팀' },
        baseSalary: 3000000,
        totalAllowances: 500000,
        totalDeductions: 400000,
        netSalary: 3100000,
        paymentStatus: 'paid'
      }
    ],
    loading: false,
    error: null,
    refetch: jest.fn()
  })
}));

describe('PayrollList', () => {
  test('should render payroll data in AG Grid', async () => {
    render(<PayrollList />);
    
    // Should display AG Grid
    expect(screen.getByTestId('ag-grid')).toBeInTheDocument();
    
    // Should have correct column headers
    await waitFor(() => {
      expect(screen.getByTestId('header-yearMonth')).toHaveTextContent('년월');
      expect(screen.getByTestId('header-userName')).toHaveTextContent('사원명');
      expect(screen.getByTestId('header-department')).toHaveTextContent('부서');
      expect(screen.getByTestId('header-baseSalary')).toHaveTextContent('기본급');
      expect(screen.getByTestId('header-totalAllowances')).toHaveTextContent('수당');
      expect(screen.getByTestId('header-totalDeductions')).toHaveTextContent('공제');
      expect(screen.getByTestId('header-netSalary')).toHaveTextContent('실수령액');
      expect(screen.getByTestId('header-paymentStatus')).toHaveTextContent('상태');
    });
    
    // Should display payroll data
    await waitFor(() => {
      const rowData = screen.getByTestId('row-0');
      expect(rowData).toHaveTextContent('김철수');
      expect(rowData).toHaveTextContent('개발팀');
      expect(rowData).toHaveTextContent('3000000');
    });
  });

  test('should display loading state', () => {
    // Mock loading state
    jest.doMock('../hooks/useApi', () => ({
      useApi: () => ({
        data: null,
        loading: true,
        error: null,
        refetch: jest.fn()
      })
    }));

    const { PayrollList } = require('./PayrollList');
    render(<PayrollList />);
    
    expect(screen.getByText('급여 데이터를 불러오는 중...')).toBeInTheDocument();
  });

  test('should display error state', () => {
    // Mock error state
    jest.doMock('../hooks/useApi', () => ({
      useApi: () => ({
        data: null,
        loading: false,
        error: '급여 데이터를 불러올 수 없습니다.',
        refetch: jest.fn()
      })
    }));

    const { PayrollList } = require('./PayrollList');
    render(<PayrollList />);
    
    expect(screen.getByText('급여 데이터를 불러올 수 없습니다.')).toBeInTheDocument();
  });
});