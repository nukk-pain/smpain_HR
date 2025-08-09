/*
 * AI-HEADER
 * Intent: Test suite for PayrollExcelUpload component
 * Domain Meaning: Excel file upload interface for bulk payroll data
 * Misleading Names: None
 * Data Contracts: Expects Excel files with payroll data structure
 * PII: Contains salary information - test with mock data only
 * Invariants: Should validate file types and show upload progress
 * RAG Keywords: excel, upload, payroll, bulk, file, drag-drop
 * DuplicatePolicy: canonical
 * FunctionIdentity: test-payroll-excel-upload-component-functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayrollExcelUpload } from './PayrollExcelUpload';

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    uploadPayrollExcel: jest.fn(() => Promise.resolve({
      success: true,
      data: {
        summary: {
          totalRecords: 10,
          successCount: 9,
          errorCount: 1
        },
        errors: [
          { row: 5, message: 'Invalid employee ID: EMP999' }
        ]
      }
    })),
    downloadPayrollTemplate: jest.fn(() => Promise.resolve(new Blob()))
  }
}));

describe('PayrollExcelUpload', () => {
  test('should render upload area and template download button', () => {
    render(<PayrollExcelUpload />);
    
    // Should show drag & drop area
    expect(screen.getByText('Excel 파일을 드래그하여 놓거나 클릭하여 업로드하세요')).toBeInTheDocument();
    
    // Should show template download button
    expect(screen.getByText('템플릿 다운로드')).toBeInTheDocument();
    
    // Should show supported file types
    expect(screen.getByText('지원 파일 형식: .xlsx, .xls (최대 10MB)')).toBeInTheDocument();
  });

  test('should handle file drop', async () => {
    render(<PayrollExcelUpload />);
    
    const file = new File(['test content'], 'payroll.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const dropArea = screen.getByTestId('upload-dropzone');
    
    // Simulate file drop
    fireEvent.drop(dropArea, {
      dataTransfer: { files: [file] }
    });
    
    // Should show selected file
    await waitFor(() => {
      expect(screen.getByText('payroll.xlsx')).toBeInTheDocument();
    });
  });

  test('should validate file type', async () => {
    render(<PayrollExcelUpload />);
    
    const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
    const dropArea = screen.getByTestId('upload-dropzone');
    
    fireEvent.drop(dropArea, {
      dataTransfer: { files: [invalidFile] }
    });
    
    await waitFor(() => {
      expect(screen.getByText('지원하지 않는 파일 형식입니다. Excel 파일만 업로드 가능합니다.')).toBeInTheDocument();
    });
  });

  test('should validate file size', async () => {
    render(<PayrollExcelUpload />);
    
    // Create a large file (>10MB)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const dropArea = screen.getByTestId('upload-dropzone');
    
    fireEvent.drop(dropArea, {
      dataTransfer: { files: [largeFile] }
    });
    
    await waitFor(() => {
      expect(screen.getByText('파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.')).toBeInTheDocument();
    });
  });

  test('should show upload progress', async () => {
    render(<PayrollExcelUpload />);
    
    const file = new File(['test content'], 'payroll.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const dropArea = screen.getByTestId('upload-dropzone');
    fireEvent.drop(dropArea, { dataTransfer: { files: [file] } });
    
    await waitFor(() => {
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
    });
    
    // Should show progress
    expect(screen.getByText('업로드 중...')).toBeInTheDocument();
  });

  test('should display upload results', async () => {
    render(<PayrollExcelUpload />);
    
    const file = new File(['test content'], 'payroll.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const dropArea = screen.getByTestId('upload-dropzone');
    fireEvent.drop(dropArea, { dataTransfer: { files: [file] } });
    
    await waitFor(() => {
      const uploadButton = screen.getByText('업로드');
      fireEvent.click(uploadButton);
    });
    
    // Should show results after upload
    await waitFor(() => {
      expect(screen.getByText('업로드 완료')).toBeInTheDocument();
      expect(screen.getByText('총 10건 중 9건 성공, 1건 오류')).toBeInTheDocument();
      expect(screen.getByText('Invalid employee ID: EMP999')).toBeInTheDocument();
    });
  });

  test('should download template when button clicked', async () => {
    render(<PayrollExcelUpload />);
    
    const templateButton = screen.getByText('템플릿 다운로드');
    fireEvent.click(templateButton);
    
    // Should call API to download template
    await waitFor(() => {
      expect(require('../services/api').apiService.downloadPayrollTemplate).toHaveBeenCalled();
    });
  });
});