import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
/*
 * AI-HEADER
 * Intent: Unit tests for PayrollExcelUploadWithPreview component
 * Domain Meaning: Tests two-phase upload flow, validation, and user interactions
 * Misleading Names: None
 * Data Contracts: Tests against payrollUpload types
 * PII: Test data uses anonymized employee information
 * Invariants: Tests must verify preview before confirm, token expiry handling
 * RAG Keywords: payroll, upload, test, preview, confirm, validation
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-excel-upload-component-tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PayrollExcelUploadWithPreview } from '../PayrollExcelUploadWithPreview';
import { apiService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies
vi.mock('../../services/api');
vi.mock('../../hooks/useAuth');

const mockApiService = apiService as vi.Mocked<typeof apiService>;
const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

describe('PayrollExcelUploadWithPreview', () => {
  const mockFile = new File(
    ['test content'],
    'test-payroll.xlsx',
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );

  const mockPreviewResponse = {
    success: true,
    previewToken: 'test-token-123',
    expiresIn: 1800,
    data: {
      summary: {
        totalRecords: 10,
        validRecords: 9,
        warningRecords: 1,
        invalidRecords: 0,
        totalAmount: 50000000,
        uploadedBy: 'testuser'
      },
      records: [
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
        }
      ],
      warnings: [],
      errors: [],
      metadata: {
        fileName: 'test-payroll.xlsx',
        fileSize: 1024,
        uploadTime: new Date().toISOString(),
        year: 2024,
        month: 12
      }
    }
  };

  const mockConfirmResponse = {
    success: true,
    message: '급여 데이터가 성공적으로 저장되었습니다.',
    summary: {
      processed: 10,
      saved: 10,
      failed: 0
    },
    errors: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default auth mock
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'Admin' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn()
    } as any);

    // Setup sessionStorage mock
    const sessionStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });
  });

  describe('File Upload Flow', () => {
    test('should handle file selection and validation', async () => {
      render(<PayrollExcelUploadWithPreview />);
      
      const uploadArea = screen.getByText(/파일을 선택하거나/i).closest('div');
      expect(uploadArea).toBeInTheDocument();

      // Simulate file drop
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      // Check if file is displayed
      await waitFor(() => {
        expect(screen.getByText('test-payroll.xlsx')).toBeInTheDocument();
      });
    });

    test('should reject invalid file types', async () => {
      render(<PayrollExcelUploadWithPreview />);
      
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      
      await act(async () => {
        fireEvent.change(input, { target: { files: [invalidFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/지원하지 않는 파일 형식/i)).toBeInTheDocument();
      });
    });

    test('should reject files exceeding size limit', async () => {
      render(<PayrollExcelUploadWithPreview />);
      
      // Create a large file (11MB)
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const largeFile = new File(
        [largeContent],
        'large.xlsx',
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      
      await act(async () => {
        fireEvent.change(input, { target: { files: [largeFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText(/파일 크기가 너무 큽니다/i)).toBeInTheDocument();
      });
    });

    test('should handle preview generation', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue(mockPreviewResponse);
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      // Click preview button
      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check if preview is called with correct parameters
      expect(mockApiService.previewPayrollExcel).toHaveBeenCalledWith(
        mockFile,
        expect.any(Number),
        expect.any(Number)
      );

      // Check if preview data is displayed
      await waitFor(() => {
        expect(screen.getByText(/총 10건/i)).toBeInTheDocument();
        expect(screen.getByText(/유효: 9건/i)).toBeInTheDocument();
      });
    });

    test('should show loading state during preview', async () => {
      // Mock a delayed response
      mockApiService.previewPayrollExcel.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPreviewResponse), 1000))
      );
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      // Click preview button
      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      
      act(() => {
        fireEvent.click(previewButton);
      });

      // Check loading state
      expect(screen.getByText(/파일을 분석하고 있습니다/i)).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/파일을 분석하고 있습니다/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should handle preview errors gracefully', async () => {
      const errorMessage = '파일 형식이 올바르지 않습니다.';
      mockApiService.previewPayrollExcel.mockRejectedValue(new Error(errorMessage));
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      // Click preview button
      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check if error is displayed
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    test('should handle confirm operation', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue(mockPreviewResponse);
      mockApiService.confirmPayrollExcel.mockResolvedValue(mockConfirmResponse);
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Complete preview flow
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Wait for preview to complete
      await waitFor(() => {
        expect(screen.getByText(/총 10건/i)).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /데이터베이스에 저장/i });
      
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // Check if confirmation dialog appears
      expect(screen.getByText(/급여 데이터 저장 확인/i)).toBeInTheDocument();
      
      // Confirm in dialog
      const dialogConfirmButton = screen.getByRole('button', { name: /확인하고 저장/i });
      
      await act(async () => {
        fireEvent.click(dialogConfirmButton);
      });

      // Check if confirm API is called with token
      expect(mockApiService.confirmPayrollExcel).toHaveBeenCalledWith(
        'test-token-123',
        expect.stringMatching(/^confirm_\d+_/)
      );

      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/급여 데이터가 성공적으로 저장되었습니다/i)).toBeInTheDocument();
      });
    });

    test('should prevent duplicate submissions', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue(mockPreviewResponse);
      mockApiService.confirmPayrollExcel.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockConfirmResponse), 2000))
      );
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Complete preview flow
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/총 10건/i)).toBeInTheDocument();
      });

      // Click confirm button multiple times
      const confirmButton = screen.getByRole('button', { name: /데이터베이스에 저장/i });
      
      act(() => {
        fireEvent.click(confirmButton);
      });

      // Dialog appears
      const dialogConfirmButton = screen.getByRole('button', { name: /확인하고 저장/i });
      
      act(() => {
        fireEvent.click(dialogConfirmButton);
      });

      // Try to click again while processing
      act(() => {
        fireEvent.click(confirmButton);
      });

      // Should show duplicate prevention message
      await waitFor(() => {
        expect(screen.getByText(/이미 저장 요청이 진행 중/i)).toBeInTheDocument();
      });

      // Verify API is called only once
      expect(mockApiService.confirmPayrollExcel).toHaveBeenCalledTimes(1);
    });

    test('should handle session restoration', () => {
      // Mock sessionStorage with existing data
      const storedState = {
        step: 'preview',
        previewData: mockPreviewResponse.data,
        previewToken: 'test-token-123',
        timestamp: Date.now()
      };
      
      window.sessionStorage.getItem.mockReturnValue(JSON.stringify(storedState));
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Check if preview data is restored
      expect(screen.getByText(/총 10건/i)).toBeInTheDocument();
      expect(screen.getByText(/유효: 9건/i)).toBeInTheDocument();
    });

    test('should clear expired session', () => {
      // Mock sessionStorage with expired data
      const expiredState = {
        step: 'preview',
        previewData: mockPreviewResponse.data,
        previewToken: 'test-token-123',
        timestamp: Date.now() - (31 * 60 * 1000) // 31 minutes ago
      };
      
      window.sessionStorage.getItem.mockReturnValue(JSON.stringify(expiredState));
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Check if state is reset to initial
      expect(screen.getByText(/파일을 선택하거나/i)).toBeInTheDocument();
      expect(screen.queryByText(/총 10건/i)).not.toBeInTheDocument();
    });
  });
});