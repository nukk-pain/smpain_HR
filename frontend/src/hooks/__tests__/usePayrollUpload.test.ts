/*
 * AI-HEADER
 * Intent: Unit tests for usePayrollUpload hook
 * Domain Meaning: Tests state management for two-phase upload process
 * Misleading Names: None
 * Data Contracts: Tests against UploadState types
 * PII: Test data uses anonymized information
 * Invariants: Tests must verify state transitions and session persistence
 * RAG Keywords: payroll, upload, hook, state, session, persistence
 * DuplicatePolicy: canonical
 * FunctionIdentity: use-payroll-upload-hook-tests
 */

import { renderHook, act } from '@testing-library/react';
import { usePayrollUpload } from '../usePayrollUpload';
import { PreviewData } from '../../types/payrollUpload';

describe('usePayrollUpload Hook', () => {
  const mockPreviewData: PreviewData = {
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
      fileName: 'test.xlsx',
      fileSize: 1024,
      uploadTime: new Date().toISOString(),
      year: 2024,
      month: 12
    }
  };

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      expect(result.current.state.step).toBe('select');
      expect(result.current.state.selectedFile).toBeNull();
      expect(result.current.state.previewData).toBeNull();
      expect(result.current.state.previewToken).toBeNull();
      expect(result.current.state.uploading).toBe(false);
      expect(result.current.state.confirming).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    test('should restore state from sessionStorage', () => {
      const storedState = {
        step: 'preview',
        previewData: mockPreviewData,
        previewToken: 'test-token',
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('payroll_upload_state', JSON.stringify(storedState));
      
      const { result } = renderHook(() => usePayrollUpload());
      
      expect(result.current.state.step).toBe('preview');
      expect(result.current.state.previewData).toEqual(mockPreviewData);
      expect(result.current.state.previewToken).toBe('test-token');
    });

    test('should clear expired session state', () => {
      const expiredState = {
        step: 'preview',
        previewData: mockPreviewData,
        previewToken: 'test-token',
        timestamp: Date.now() - (31 * 60 * 1000) // 31 minutes ago
      };
      
      sessionStorage.setItem('payroll_upload_state', JSON.stringify(expiredState));
      
      const { result } = renderHook(() => usePayrollUpload());
      
      expect(result.current.state.step).toBe('select');
      expect(result.current.state.previewData).toBeNull();
      expect(result.current.state.previewToken).toBeNull();
    });
  });

  describe('State Actions', () => {
    test('should set selected file', () => {
      const { result } = renderHook(() => usePayrollUpload());
      const mockFile = new File(['test'], 'test.xlsx');
      
      act(() => {
        result.current.actions.setSelectedFile(mockFile);
      });
      
      expect(result.current.state.selectedFile).toBe(mockFile);
    });

    test('should set preview data and update step', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'test-token', 1800);
      });
      
      expect(result.current.state.step).toBe('preview');
      expect(result.current.state.previewData).toEqual(mockPreviewData);
      expect(result.current.state.previewToken).toBe('test-token');
      expect(result.current.state.expiresIn).toBe(1800);
    });

    test('should set uploading state', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      act(() => {
        result.current.actions.setUploading(true);
      });
      
      expect(result.current.state.uploading).toBe(true);
      
      act(() => {
        result.current.actions.setUploading(false);
      });
      
      expect(result.current.state.uploading).toBe(false);
    });

    test('should set confirming state', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      act(() => {
        result.current.actions.setConfirming(true);
      });
      
      expect(result.current.state.confirming).toBe(true);
      
      act(() => {
        result.current.actions.setConfirming(false);
      });
      
      expect(result.current.state.confirming).toBe(false);
    });

    test('should set error message', () => {
      const { result } = renderHook(() => usePayrollUpload());
      const errorMessage = '업로드 실패';
      
      act(() => {
        result.current.actions.setError(errorMessage);
      });
      
      expect(result.current.state.error).toBe(errorMessage);
    });

    test('should clear error message', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      act(() => {
        result.current.actions.setError('test error');
      });
      
      expect(result.current.state.error).toBe('test error');
      
      act(() => {
        result.current.actions.clearError();
      });
      
      expect(result.current.state.error).toBeNull();
    });

    test('should set result and update step', () => {
      const { result } = renderHook(() => usePayrollUpload());
      const mockResult = {
        success: true,
        message: '저장 완료',
        summary: {
          processed: 10,
          saved: 10,
          failed: 0
        },
        errors: []
      };
      
      act(() => {
        result.current.actions.setResult(mockResult);
      });
      
      expect(result.current.state.step).toBe('completed');
      expect(result.current.state.result).toEqual(mockResult);
    });

    test('should reset state', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      // Set some state
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
        result.current.actions.setError('test error');
      });
      
      expect(result.current.state.step).toBe('preview');
      expect(result.current.state.previewData).not.toBeNull();
      expect(result.current.state.error).not.toBeNull();
      
      // Reset
      act(() => {
        result.current.actions.reset();
      });
      
      expect(result.current.state.step).toBe('select');
      expect(result.current.state.previewData).toBeNull();
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.selectedFile).toBeNull();
    });
  });

  describe('Helper Functions', () => {
    test('should check if preview is expired', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      // Set preview with expiry
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      
      // Initially not expired
      expect(result.current.helpers.isPreviewExpired()).toBe(false);
      
      // Mock expiry time
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + (31 * 60 * 1000)); // 31 minutes later
      
      expect(result.current.helpers.isPreviewExpired()).toBe(true);
      
      // Restore Date.now
      Date.now = originalNow;
    });

    test('should get remaining time', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      
      const remainingTime = result.current.helpers.getRemainingTime();
      
      // Should be close to 30 minutes (1800 seconds)
      expect(remainingTime).toBeGreaterThan(1790);
      expect(remainingTime).toBeLessThanOrEqual(1800);
    });

    test('should format remaining time', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      
      const formattedTime = result.current.helpers.formatRemainingTime();
      
      // Should show "30분" or "29분" depending on exact timing
      expect(formattedTime).toMatch(/\d+분/);
    });
  });

  describe('Session Storage Persistence', () => {
    test('should save state to sessionStorage on preview', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      
      const stored = sessionStorage.getItem('payroll_upload_state');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.step).toBe('preview');
      expect(parsed.previewData).toEqual(mockPreviewData);
      expect(parsed.previewToken).toBe('token');
      expect(parsed.timestamp).toBeDefined();
    });

    test('should clear sessionStorage on reset', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      // Set some state
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      
      expect(sessionStorage.getItem('payroll_upload_state')).not.toBeNull();
      
      // Reset
      act(() => {
        result.current.actions.reset();
      });
      
      expect(sessionStorage.getItem('payroll_upload_state')).toBeNull();
    });

    test('should clear sessionStorage on completion', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      // Set preview state
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      
      expect(sessionStorage.getItem('payroll_upload_state')).not.toBeNull();
      
      // Complete upload
      act(() => {
        result.current.actions.setResult({
          success: true,
          message: '완료',
          summary: { processed: 10, saved: 10, failed: 0 },
          errors: []
        });
      });
      
      // Session should be cleared on completion
      expect(sessionStorage.getItem('payroll_upload_state')).toBeNull();
    });
  });

  describe('State Transitions', () => {
    test('should follow correct state flow: select -> preview -> confirmed -> completed', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      // Initial state
      expect(result.current.state.step).toBe('select');
      
      // Select file (stays in select)
      act(() => {
        result.current.actions.setSelectedFile(new File(['test'], 'test.xlsx'));
      });
      expect(result.current.state.step).toBe('select');
      
      // Preview
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      expect(result.current.state.step).toBe('preview');
      
      // Confirm (intermediate state)
      act(() => {
        result.current.actions.setStep('confirmed');
      });
      expect(result.current.state.step).toBe('confirmed');
      
      // Complete
      act(() => {
        result.current.actions.setResult({
          success: true,
          message: '완료',
          summary: { processed: 10, saved: 10, failed: 0 },
          errors: []
        });
      });
      expect(result.current.state.step).toBe('completed');
    });

    test('should handle error state transitions', () => {
      const { result } = renderHook(() => usePayrollUpload());
      
      // Set preview state
      act(() => {
        result.current.actions.setPreviewData(mockPreviewData, 'token', 1800);
      });
      
      // Error during confirmation
      act(() => {
        result.current.actions.setError('저장 실패');
      });
      
      // Should stay in preview step with error
      expect(result.current.state.step).toBe('preview');
      expect(result.current.state.error).toBe('저장 실패');
      
      // Clear error and retry
      act(() => {
        result.current.actions.clearError();
      });
      
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.step).toBe('preview'); // Still in preview
    });
  });
});