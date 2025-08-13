import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
/*
 * AI-HEADER
 * Intent: Test suite for PayrollDetail component
 * Domain Meaning: Payroll record detail view with edit capabilities
 * Misleading Names: None
 * Data Contracts: Expects single payroll record with user information
 * PII: Contains salary information - test with mock data only
 * Invariants: Should display all payroll fields; Edit mode only for Admin
 * RAG Keywords: payroll, detail, edit, form, test, salary
 * DuplicatePolicy: canonical
 * FunctionIdentity: test-payroll-detail-component-view-edit-functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayrollDetail } from './PayrollDetail';

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getPayrollRecord: vi.fn(() => Promise.resolve({
      success: true,
      data: {
        _id: '1',
        year: 2024,
        month: 8,
        user: { name: '김철수', department: '개발팀' },
        baseSalary: 3000000,
        allowances: {
          overtime: 200000,
          position: 150000,
          meal: 100000,
          transportation: 50000,
          other: 0
        },
        deductions: {
          nationalPension: 135000,
          healthInsurance: 120000,
          employmentInsurance: 27000,
          incomeTax: 180000,
          localIncomeTax: 18000,
          other: 0
        },
        totalAllowances: 500000,
        totalDeductions: 480000,
        netSalary: 3020000,
        paymentStatus: 'paid'
      }
    })),
    updatePayrollRecord: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

// Mock auth context
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'Admin', permissions: ['payroll:manage'] }
  })
}));

describe('PayrollDetail', () => {
  test('should render payroll record in view mode', async () => {
    render(<PayrollDetail payrollId="1" />);
    
    // Should display loading initially
    expect(screen.getByText('급여 정보를 불러오는 중...')).toBeInTheDocument();
    
    // Should display payroll data after loading
    await waitFor(() => {
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('개발팀')).toBeInTheDocument();
      expect(screen.getByText('3,000,000')).toBeInTheDocument(); // Base salary
      expect(screen.getByText('3,020,000')).toBeInTheDocument(); // Net salary
      expect(screen.getByText('지급완료')).toBeInTheDocument(); // Status
    });
  });

  test('should show edit button for Admin users', async () => {
    render(<PayrollDetail payrollId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('수정')).toBeInTheDocument();
    });
  });

  test('should switch to edit mode when edit button clicked', async () => {
    render(<PayrollDetail payrollId="1" />);
    
    await waitFor(() => {
      const editButton = screen.getByText('수정');
      fireEvent.click(editButton);
    });
    
    // Should show form inputs
    expect(screen.getByLabelText('기본급')).toBeInTheDocument();
    expect(screen.getByLabelText('시간외수당')).toBeInTheDocument();
    expect(screen.getByText('저장')).toBeInTheDocument();
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  test('should display allowances breakdown', async () => {
    render(<PayrollDetail payrollId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('시간외수당')).toBeInTheDocument();
      expect(screen.getByText('200,000')).toBeInTheDocument();
      expect(screen.getByText('직책수당')).toBeInTheDocument();
      expect(screen.getByText('150,000')).toBeInTheDocument();
    });
  });

  test('should display deductions breakdown', async () => {
    render(<PayrollDetail payrollId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('국민연금')).toBeInTheDocument();
      expect(screen.getByText('135,000')).toBeInTheDocument();
      expect(screen.getByText('건강보험')).toBeInTheDocument();
      expect(screen.getByText('120,000')).toBeInTheDocument();
    });
  });

  test('should calculate totals correctly', async () => {
    render(<PayrollDetail payrollId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('총 수당: 500,000원')).toBeInTheDocument();
      expect(screen.getByText('총 공제: 480,000원')).toBeInTheDocument();
      expect(screen.getByText('실수령액: 3,020,000원')).toBeInTheDocument();
    });
  });
});