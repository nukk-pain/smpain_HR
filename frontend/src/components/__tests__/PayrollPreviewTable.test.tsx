import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
/*
 * AI-HEADER
 * Intent: Unit tests for PayrollPreviewTable component
 * Domain Meaning: Tests data table rendering, filtering, and user interactions
 * Misleading Names: None
 * Data Contracts: Tests against PreviewRecord types
 * PII: Test data uses anonymized employee information
 * Invariants: Tests must verify correct data display and filtering
 * RAG Keywords: payroll, preview, table, filtering, pagination, rendering
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-preview-table-component-tests
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreviewDataTable } from '../PayrollPreviewTable';
import { PreviewRecord } from '../../types/payrollUpload';
import { useAuth } from '../../hooks/useAuth';

// Mock useAuth hook
vi.mock('../../hooks/useAuth');
const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

describe('PayrollPreviewTable', () => {
  const mockRecords: PreviewRecord[] = [
    {
      rowIndex: 1,
      employeeName: '홍길동',
      employeeId: 'EMP001',
      baseSalary: 3000000,
      totalAllowances: 500000,
      totalDeductions: 350000,
      netSalary: 3150000,
      status: 'valid',
      matchedUser: {
        found: true,
        id: 'user-1',
        name: '홍길동',
        employeeId: 'EMP001'
      },
      warnings: [],
      errors: []
    },
    {
      rowIndex: 2,
      employeeName: '김철수',
      employeeId: 'EMP002',
      baseSalary: 3500000,
      totalAllowances: 600000,
      totalDeductions: 400000,
      netSalary: 3700000,
      status: 'warning',
      matchedUser: {
        found: true,
        id: 'user-2',
        name: '김철수',
        employeeId: 'EMP002'
      },
      warnings: ['급여가 평균보다 높습니다'],
      errors: []
    },
    {
      rowIndex: 3,
      employeeName: '이영희',
      employeeId: 'EMP003',
      baseSalary: 2800000,
      totalAllowances: 450000,
      totalDeductions: 320000,
      netSalary: 2930000,
      status: 'invalid',
      matchedUser: {
        found: false,
        id: null,
        name: null,
        employeeId: null
      },
      warnings: [],
      errors: ['직원을 찾을 수 없습니다']
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default admin user
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test Admin', role: 'Admin' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn()
    } as any);
  });

  describe('Data Rendering', () => {
    test('should render all records correctly', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Check if all employee names are rendered
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('이영희')).toBeInTheDocument();
      
      // Check if employee IDs are rendered
      expect(screen.getByText('EMP001')).toBeInTheDocument();
      expect(screen.getByText('EMP002')).toBeInTheDocument();
      expect(screen.getByText('EMP003')).toBeInTheDocument();
    });

    test('should display currency values correctly for admin users', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Check if amounts are formatted as Korean Won
      expect(screen.getByText('₩3,000,000')).toBeInTheDocument();
      expect(screen.getByText('₩3,150,000')).toBeInTheDocument();
    });

    test('should mask salary amounts for non-admin users', () => {
      // Mock non-admin user
      mockUseAuth.mockReturnValue({
        user: { id: '2', name: 'Test User', role: 'User' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn()
      } as any);
      
      render(<PreviewDataTable records={mockRecords} />);
      
      // Check if amounts are masked
      expect(screen.getByText(/₩30\*\*\*\*0/)).toBeInTheDocument();
      expect(screen.queryByText('₩3,000,000')).not.toBeInTheDocument();
    });

    test('should display status chips correctly', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Check status chips
      expect(screen.getByText('정상')).toBeInTheDocument();
      expect(screen.getByText('경고')).toBeInTheDocument();
      expect(screen.getByText('오류')).toBeInTheDocument();
    });

    test('should display matching status chips', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Check matching status
      const matchedChips = screen.getAllByText('매칭됨');
      expect(matchedChips).toHaveLength(2); // 2 matched records
      
      expect(screen.getByText('매칭 실패')).toBeInTheDocument();
    });

    test('should highlight rows based on status', () => {
      const { container } = render(<PreviewDataTable records={mockRecords} />);
      
      // Get all table rows (excluding header)
      const rows = container.querySelectorAll('tbody tr');
      
      // Check background colors (this would need actual style checking)
      expect(rows[0]).toHaveStyle({ backgroundColor: 'inherit' }); // valid
      expect(rows[1]).toHaveStyle({ backgroundColor: 'warning.50' }); // warning
      expect(rows[2]).toHaveStyle({ backgroundColor: 'error.50' }); // invalid
    });
  });

  describe('Filtering and Search', () => {
    test('should filter by search term', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      const searchInput = screen.getByPlaceholderText(/직원명 또는 사번으로 검색/i);
      
      // Search for specific employee
      fireEvent.change(searchInput, { target: { value: '홍길동' } });
      
      // Check filtered results
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.queryByText('김철수')).not.toBeInTheDocument();
      expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    });

    test('should filter by status', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Open status filter dropdown
      const statusFilter = screen.getByLabelText(/검증 상태/i);
      fireEvent.mouseDown(statusFilter);
      
      // Select "경고" option
      const warningOption = screen.getByRole('option', { name: /경고/i });
      fireEvent.click(warningOption);
      
      // Check filtered results
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.queryByText('홍길동')).not.toBeInTheDocument();
      expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    });

    test('should filter by matching status', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Open matching filter dropdown
      const matchingFilter = screen.getByLabelText(/매칭 상태/i);
      fireEvent.mouseDown(matchingFilter);
      
      // Select "매칭 실패" option
      const unmatchedOption = screen.getByRole('option', { name: /매칭 실패/i });
      fireEvent.click(unmatchedOption);
      
      // Check filtered results
      expect(screen.getByText('이영희')).toBeInTheDocument();
      expect(screen.queryByText('홍길동')).not.toBeInTheDocument();
      expect(screen.queryByText('김철수')).not.toBeInTheDocument();
    });

    test('should combine multiple filters', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Set search term
      const searchInput = screen.getByPlaceholderText(/직원명 또는 사번으로 검색/i);
      fireEvent.change(searchInput, { target: { value: 'EMP00' } });
      
      // Set status filter
      const statusFilter = screen.getByLabelText(/검증 상태/i);
      fireEvent.mouseDown(statusFilter);
      const validOption = screen.getByRole('option', { name: /정상/i });
      fireEvent.click(validOption);
      
      // Check combined filter results - only EMP001 (홍길동) should show
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.queryByText('김철수')).not.toBeInTheDocument();
      expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    });

    test('should show no data message when filtered results are empty', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      const searchInput = screen.getByPlaceholderText(/직원명 또는 사번으로 검색/i);
      fireEvent.change(searchInput, { target: { value: '존재하지않는직원' } });
      
      expect(screen.getByText(/표시할 데이터가 없습니다/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    test('should paginate records correctly', () => {
      // Create many records for pagination
      const manyRecords = Array.from({ length: 25 }, (_, i) => ({
        ...mockRecords[0],
        rowIndex: i + 1,
        employeeName: `직원${i + 1}`,
        employeeId: `EMP${String(i + 1).padStart(3, '0')}`
      }));
      
      render(<PreviewDataTable records={manyRecords} />);
      
      // Check default rows per page (10)
      const visibleRows = screen.getAllByRole('row');
      // 11 rows = 1 header + 10 data rows
      expect(visibleRows).toHaveLength(11);
      
      // Check first page content
      expect(screen.getByText('직원1')).toBeInTheDocument();
      expect(screen.getByText('직원10')).toBeInTheDocument();
      expect(screen.queryByText('직원11')).not.toBeInTheDocument();
    });

    test('should navigate between pages', () => {
      const manyRecords = Array.from({ length: 25 }, (_, i) => ({
        ...mockRecords[0],
        rowIndex: i + 1,
        employeeName: `직원${i + 1}`,
        employeeId: `EMP${String(i + 1).padStart(3, '0')}`
      }));
      
      render(<PreviewDataTable records={manyRecords} />);
      
      // Click next page button
      const nextButton = screen.getByRole('button', { name: /next page/i });
      fireEvent.click(nextButton);
      
      // Check second page content
      expect(screen.getByText('직원11')).toBeInTheDocument();
      expect(screen.getByText('직원20')).toBeInTheDocument();
      expect(screen.queryByText('직원1')).not.toBeInTheDocument();
    });

    test('should change rows per page', () => {
      const manyRecords = Array.from({ length: 30 }, (_, i) => ({
        ...mockRecords[0],
        rowIndex: i + 1,
        employeeName: `직원${i + 1}`,
        employeeId: `EMP${String(i + 1).padStart(3, '0')}`
      }));
      
      render(<PreviewDataTable records={manyRecords} />);
      
      // Change rows per page to 25
      const rowsPerPageSelect = screen.getByRole('combobox', { name: /rows per page/i });
      fireEvent.mouseDown(rowsPerPageSelect);
      
      const option25 = screen.getByRole('option', { name: '25' });
      fireEvent.click(option25);
      
      // Check that 25 rows are displayed
      const visibleRows = screen.getAllByRole('row');
      expect(visibleRows).toHaveLength(26); // 1 header + 25 data rows
    });

    test('should display correct pagination info', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Check pagination display text
      expect(screen.getByText(/3개 중 1-3/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('should handle empty records array', () => {
      render(<PreviewDataTable records={[]} />);
      
      expect(screen.getByText(/표시할 데이터가 없습니다/i)).toBeInTheDocument();
      expect(screen.getByText(/데이터 미리보기 \(0건\)/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      // Check for proper table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
      
      // Check for column headers
      expect(screen.getByText('직원명')).toBeInTheDocument();
      expect(screen.getByText('사번')).toBeInTheDocument();
      expect(screen.getByText('기본급')).toBeInTheDocument();
      expect(screen.getByText('실수령액')).toBeInTheDocument();
    });

    test('should have keyboard-navigable controls', () => {
      render(<PreviewDataTable records={mockRecords} />);
      
      const searchInput = screen.getByPlaceholderText(/직원명 또는 사번으로 검색/i);
      
      // Check if search input can receive focus
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
      
      // Check if filters are keyboard accessible
      const statusFilter = screen.getByLabelText(/검증 상태/i);
      statusFilter.focus();
      expect(document.activeElement).toBe(statusFilter);
    });
  });
});