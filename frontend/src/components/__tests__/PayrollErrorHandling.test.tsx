import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
/*
 * AI-HEADER
 * Intent: Unit tests for error handling in payroll upload components
 * Domain Meaning: Tests error scenarios, recovery, and user feedback
 * Misleading Names: None
 * Data Contracts: Tests error response handling
 * PII: No PII in error messages
 * Invariants: Tests must verify proper error display and recovery
 * RAG Keywords: payroll, error, handling, recovery, retry, validation
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-error-handling-tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PayrollExcelUploadWithPreview } from '../PayrollExcelUploadWithPreview';
import { apiService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies
vi.mock('../../services/api');
vi.mock('../../hooks/useAuth');

const mockApiService = apiService as vi.Mocked<typeof apiService>;
const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

describe('Payroll Error Handling', () => {
  const mockFile = new File(
    ['test content'],
    'test-payroll.xlsx',
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'Admin' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn()
    } as any);

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });
  });

  describe('Preview Errors', () => {
    test('should handle network errors during preview', async () => {
      mockApiService.previewPayrollExcel.mockRejectedValue(
        new Error('Network Error')
      );
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      // Try preview
      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check error message
      await waitFor(() => {
        expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
      });
    });

    test('should handle validation errors from server', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue({
        success: false,
        error: '파일 형식이 올바르지 않습니다. 필수 컬럼이 누락되었습니다.',
        details: ['급여 컬럼 없음', '직원명 컬럼 없음']
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file and preview
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check error display
      await waitFor(() => {
        expect(screen.getByText(/파일 형식이 올바르지 않습니다/i)).toBeInTheDocument();
      });
    });

    test('should handle rate limiting errors', async () => {
      mockApiService.previewPayrollExcel.mockRejectedValue({
        response: {
          status: 429,
          data: {
            error: 'Rate limit exceeded. Maximum 5 requests per 5 minutes.'
          }
        }
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file and try preview
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check rate limit error
      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
      });
    });

    test('should handle authentication errors', async () => {
      mockApiService.previewPayrollExcel.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: '인증이 필요합니다. 다시 로그인해주세요.'
          }
        }
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file and try preview
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check auth error
      await waitFor(() => {
        expect(screen.getByText(/인증이 필요합니다/i)).toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Errors', () => {
    const mockPreviewResponse = {
      success: true,
      previewToken: 'test-token',
      expiresIn: 1800,
      data: {
        summary: {
          totalRecords: 10,
          validRecords: 10,
          warningRecords: 0,
          invalidRecords: 0,
          totalAmount: 50000000,
          uploadedBy: 'testuser'
        },
        records: [],
        warnings: [],
        errors: [],
        metadata: {
          fileName: 'test.xlsx',
          fileSize: 1024,
          uploadTime: new Date().toISOString(),
          year: 2024,
          month: 12
        }
      }
    };

    test('should handle token expiry during confirmation', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue(mockPreviewResponse);
      mockApiService.confirmPayrollExcel.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: '프리뷰 토큰이 만료되었습니다.'
          }
        }
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Complete preview
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

      // Try confirm
      const confirmButton = screen.getByRole('button', { name: /데이터베이스에 저장/i });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // Confirm in dialog
      const dialogConfirmButton = screen.getByRole('button', { name: /확인하고 저장/i });
      await act(async () => {
        fireEvent.click(dialogConfirmButton);
      });

      // Check expiry error
      await waitFor(() => {
        expect(screen.getByText(/토큰이 만료되었습니다/i)).toBeInTheDocument();
      });
    });

    test('should handle database errors during confirmation', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue(mockPreviewResponse);
      mockApiService.confirmPayrollExcel.mockRejectedValue({
        response: {
          status: 500,
          data: {
            error: '데이터베이스 연결 오류가 발생했습니다.'
          }
        }
      });
      
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

      // Try confirm
      const confirmButton = screen.getByRole('button', { name: /데이터베이스에 저장/i });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      const dialogConfirmButton = screen.getByRole('button', { name: /확인하고 저장/i });
      await act(async () => {
        fireEvent.click(dialogConfirmButton);
      });

      // Check database error
      await waitFor(() => {
        expect(screen.getByText(/데이터베이스 연결 오류/i)).toBeInTheDocument();
      });
    });

    test('should handle partial failure during batch save', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue(mockPreviewResponse);
      mockApiService.confirmPayrollExcel.mockResolvedValue({
        success: false,
        message: '일부 데이터 저장에 실패했습니다.',
        summary: {
          processed: 10,
          saved: 7,
          failed: 3
        },
        errors: [
          { record: '홍길동 (EMP001)', error: '중복된 급여 데이터' },
          { record: '김철수 (EMP002)', error: '유효하지 않은 급여액' },
          { record: '이영희 (EMP003)', error: '직원 정보 불일치' }
        ]
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Complete full flow
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

      const confirmButton = screen.getByRole('button', { name: /데이터베이스에 저장/i });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      const dialogConfirmButton = screen.getByRole('button', { name: /확인하고 저장/i });
      await act(async () => {
        fireEvent.click(dialogConfirmButton);
      });

      // Check partial failure display
      await waitFor(() => {
        expect(screen.getByText(/일부 데이터 저장에 실패/i)).toBeInTheDocument();
        expect(screen.getByText(/홍길동 \(EMP001\)/i)).toBeInTheDocument();
        expect(screen.getByText(/중복된 급여 데이터/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    test('should allow retry after error', async () => {
      // First attempt fails
      mockApiService.previewPayrollExcel.mockRejectedValueOnce(
        new Error('Network Error')
      );
      
      // Second attempt succeeds
      mockApiService.previewPayrollExcel.mockResolvedValueOnce({
        success: true,
        previewToken: 'test-token',
        expiresIn: 1800,
        data: {
          summary: {
            totalRecords: 5,
            validRecords: 5,
            warningRecords: 0,
            invalidRecords: 0,
            totalAmount: 25000000,
            uploadedBy: 'testuser'
          },
          records: [],
          warnings: [],
          errors: [],
          metadata: {
            fileName: 'test.xlsx',
            fileSize: 1024,
            uploadTime: new Date().toISOString(),
            year: 2024,
            month: 12
          }
        }
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select file
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      // First preview attempt (fails)
      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check error
      await waitFor(() => {
        expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
      });

      // Clear error
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Retry preview (succeeds)
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check success
      await waitFor(() => {
        expect(screen.getByText(/총 5건/i)).toBeInTheDocument();
      });
    });

    test('should clear errors when selecting new file', async () => {
      mockApiService.previewPayrollExcel.mockRejectedValue(
        new Error('파일 처리 오류')
      );
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Select first file and fail
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/파일 처리 오류/i)).toBeInTheDocument();
      });

      // Select new file
      const newFile = new File(['new content'], 'new-payroll.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      await act(async () => {
        fireEvent.change(input, { target: { files: [newFile] } });
      });

      // Error should be cleared
      expect(screen.queryByText(/파일 처리 오류/i)).not.toBeInTheDocument();
      expect(screen.getByText('new-payroll.xlsx')).toBeInTheDocument();
    });

    test('should reset state on critical errors', async () => {
      // Setup preview state
      const previewResponse = {
        success: true,
        previewToken: 'test-token',
        expiresIn: 1800,
        data: {
          summary: {
            totalRecords: 5,
            validRecords: 5,
            warningRecords: 0,
            invalidRecords: 0,
            totalAmount: 25000000,
            uploadedBy: 'testuser'
          },
          records: [],
          warnings: [],
          errors: [],
          metadata: {
            fileName: 'test.xlsx',
            fileSize: 1024,
            uploadTime: new Date().toISOString(),
            year: 2024,
            month: 12
          }
        }
      };
      
      mockApiService.previewPayrollExcel.mockResolvedValue(previewResponse);
      
      render(<PayrollExcelUploadWithPreview />);
      
      // Complete preview
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/총 5건/i)).toBeInTheDocument();
      });

      // Simulate token expiry error that triggers reset
      mockApiService.confirmPayrollExcel.mockRejectedValue({
        response: {
          status: 401,
          data: { error: '세션이 만료되었습니다.' }
        }
      });

      // Try confirm
      const confirmButton = screen.getByRole('button', { name: /데이터베이스에 저장/i });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      const dialogConfirmButton = screen.getByRole('button', { name: /확인하고 저장/i });
      await act(async () => {
        fireEvent.click(dialogConfirmButton);
      });

      // Check if state is reset after critical error
      await waitFor(() => {
        expect(screen.getByText(/세션이 만료되었습니다/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Message Display', () => {
    test('should display user-friendly error messages', async () => {
      mockApiService.previewPayrollExcel.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: 'INVALID_FILE_FORMAT',
            message: '지원하지 않는 파일 형식입니다.'
          }
        }
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Should show user-friendly message, not error code
      await waitFor(() => {
        expect(screen.getByText(/지원하지 않는 파일 형식/i)).toBeInTheDocument();
        expect(screen.queryByText(/INVALID_FILE_FORMAT/i)).not.toBeInTheDocument();
      });
    });

    test('should show detailed error information when available', async () => {
      mockApiService.previewPayrollExcel.mockResolvedValue({
        success: false,
        error: '데이터 검증 실패',
        errors: [
          { row: 2, column: 'salary', message: '급여액이 음수입니다' },
          { row: 5, column: 'employee_id', message: '사번이 중복되었습니다' },
          { row: 8, column: 'name', message: '직원명이 비어있습니다' }
        ]
      });
      
      render(<PayrollExcelUploadWithPreview />);
      
      const input = screen.getByLabelText(/file-input/i, { selector: 'input[type="file"]' });
      await act(async () => {
        fireEvent.change(input, { target: { files: [mockFile] } });
      });

      const previewButton = await screen.findByRole('button', { name: /미리보기/i });
      await act(async () => {
        fireEvent.click(previewButton);
      });

      // Check detailed errors
      await waitFor(() => {
        expect(screen.getByText(/데이터 검증 실패/i)).toBeInTheDocument();
        expect(screen.getByText(/급여액이 음수입니다/i)).toBeInTheDocument();
        expect(screen.getByText(/사번이 중복되었습니다/i)).toBeInTheDocument();
      });
    });
  });
});