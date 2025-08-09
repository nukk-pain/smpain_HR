/*
 * AI-HEADER
 * Intent: Test suite for PayslipManagement component
 * Domain Meaning: PDF payslip document management interface
 * Misleading Names: None
 * Data Contracts: Expects payroll records with PDF document capabilities
 * PII: Contains salary information - test with mock data only
 * Invariants: Should handle PDF upload, view, and delete operations
 * RAG Keywords: payslip, pdf, management, upload, view, delete
 * DuplicatePolicy: canonical
 * FunctionIdentity: test-payslip-management-component-pdf-operations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayslipManagement } from './PayslipManagement';

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    getPayrollRecords: jest.fn(() => Promise.resolve({
      success: true,
      data: [
        {
          _id: '1',
          year: 2024,
          month: 8,
          user: { name: '김철수', department: '개발팀' },
          netSalary: 3020000,
          paymentStatus: 'paid'
        }
      ]
    })),
    uploadPayslip: jest.fn(() => Promise.resolve({ success: true })),
    downloadPayslipPdf: jest.fn(() => Promise.resolve(new Blob())),
    deletePayslip: jest.fn(() => Promise.resolve({ success: true }))
  }
}));

// Mock auth context
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'Admin', permissions: ['payroll:manage'] }
  })
}));

describe('PayslipManagement', () => {
  test('should render payroll records list', async () => {
    render(<PayslipManagement />);
    
    // Should display loading initially
    expect(screen.getByText('급여명세서를 불러오는 중...')).toBeInTheDocument();
    
    // Should display payroll data after loading
    await waitFor(() => {
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('개발팀')).toBeInTheDocument();
      expect(screen.getByText('2024년 8월')).toBeInTheDocument();
      expect(screen.getByText('3,020,000원')).toBeInTheDocument();
    });
  });

  test('should show upload button for Admin users', async () => {
    render(<PayslipManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('PDF 업로드')).toBeInTheDocument();
    });
  });

  test('should handle PDF file upload', async () => {
    render(<PayslipManagement />);
    
    await waitFor(() => {
      const uploadButton = screen.getByText('PDF 업로드');
      fireEvent.click(uploadButton);
    });
    
    // Should show file input
    const fileInput = screen.getByLabelText('급여명세서 PDF 업로드');
    expect(fileInput).toBeInTheDocument();
    
    // Simulate file selection
    const file = new File(['pdf content'], 'payslip.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('payslip.pdf')).toBeInTheDocument();
    });
  });

  test('should validate PDF file type', async () => {
    render(<PayslipManagement />);
    
    await waitFor(() => {
      const uploadButton = screen.getByText('PDF 업로드');
      fireEvent.click(uploadButton);
    });
    
    const fileInput = screen.getByLabelText('급여명세서 PDF 업로드');
    const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    await waitFor(() => {
      expect(screen.getByText('PDF 파일만 업로드 가능합니다.')).toBeInTheDocument();
    });
  });

  test('should show download button when payslip exists', async () => {
    // Mock payslip exists
    jest.spyOn(require('../services/api').apiService, 'getPayrollRecords')
      .mockResolvedValue({
        success: true,
        data: [{
          _id: '1',
          year: 2024,
          month: 8,
          user: { name: '김철수', department: '개발팀' },
          netSalary: 3020000,
          paymentStatus: 'paid',
          hasPayslip: true
        }]
      });
    
    render(<PayslipManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('다운로드')).toBeInTheDocument();
    });
  });

  test('should show delete button for Admin users when payslip exists', async () => {
    // Mock payslip exists
    jest.spyOn(require('../services/api').apiService, 'getPayrollRecords')
      .mockResolvedValue({
        success: true,
        data: [{
          _id: '1',
          year: 2024,
          month: 8,
          user: { name: '김철수', department: '개발팀' },
          netSalary: 3020000,
          paymentStatus: 'paid',
          hasPayslip: true
        }]
      });
    
    render(<PayslipManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });
  });

  test('should handle payslip download', async () => {
    // Mock payslip exists
    jest.spyOn(require('../services/api').apiService, 'getPayrollRecords')
      .mockResolvedValue({
        success: true,
        data: [{
          _id: '1',
          year: 2024,
          month: 8,
          user: { name: '김철수', department: '개발팀' },
          netSalary: 3020000,
          paymentStatus: 'paid',
          hasPayslip: true
        }]
      });
    
    render(<PayslipManagement />);
    
    await waitFor(() => {
      const downloadButton = screen.getByText('다운로드');
      fireEvent.click(downloadButton);
    });
    
    await waitFor(() => {
      expect(require('../services/api').apiService.downloadPayslipPdf).toHaveBeenCalledWith('1');
    });
  });
});