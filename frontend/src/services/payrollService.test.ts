/*
 * AI-HEADER
 * Intent: Test suite for payroll service layer
 * Domain Meaning: Centralized payroll data management and API interactions
 * Misleading Names: None
 * Data Contracts: Manages payroll data state and API communications
 * PII: Contains salary information - ensure secure handling
 * Invariants: Must maintain data consistency across operations
 * RAG Keywords: payroll, service, state, management, api, test
 * DuplicatePolicy: canonical
 * FunctionIdentity: test-payroll-service-layer-state-management
 */

import { PayrollService } from './payrollService';
import { apiService } from './api';

// Mock API service
jest.mock('./api', () => ({
  apiService: {
    getPayrollRecords: jest.fn(),
    getPayrollRecord: jest.fn(),
    createPayrollRecord: jest.fn(),
    updatePayrollRecord: jest.fn(),
    deletePayrollRecord: jest.fn(),
    previewPayrollExcel: jest.fn(),
    confirmPayrollExcel: jest.fn(),
    exportPayrollExcel: jest.fn(),
    uploadPayslip: jest.fn(),
    downloadPayslipPdf: jest.fn(),
    deletePayslip: jest.fn()
  }
}));

describe('PayrollService', () => {
  let payrollService: PayrollService;

  beforeEach(() => {
    payrollService = new PayrollService();
    jest.clearAllMocks();
  });

  describe('fetchPayrollRecords', () => {
    test('should fetch and cache payroll records', async () => {
      const mockData = [
        { _id: '1', year: 2024, month: 8, netSalary: 3000000 }
      ];
      
      (apiService.getPayrollRecords as jest.Mock).mockResolvedValue({
        success: true,
        data: mockData
      });

      const result = await payrollService.fetchPayrollRecords();
      
      expect(result).toEqual(mockData);
      expect(apiService.getPayrollRecords).toHaveBeenCalled();
      
      // Should return cached data on second call
      const cachedResult = payrollService.getCachedRecords();
      expect(cachedResult).toEqual(mockData);
    });

    test('should handle API errors gracefully', async () => {
      const errorMessage = 'API Error';
      (apiService.getPayrollRecords as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await expect(payrollService.fetchPayrollRecords()).rejects.toThrow(errorMessage);
    });
  });

  describe('createPayrollRecord', () => {
    test('should create record and update cache', async () => {
      const newRecord = {
        year: 2024,
        month: 9,
        baseSalary: 3000000,
        userId: 'user123'
      };
      
      const createdRecord = { _id: '2', ...newRecord };
      
      (apiService.createPayrollRecord as jest.Mock).mockResolvedValue({
        success: true,
        data: createdRecord
      });

      const result = await payrollService.createPayrollRecord(newRecord);
      
      expect(result).toEqual(createdRecord);
      expect(apiService.createPayrollRecord).toHaveBeenCalledWith(newRecord);
    });

    test('should validate required fields', async () => {
      const invalidRecord = { year: 2024 }; // Missing required fields
      
      await expect(
        payrollService.createPayrollRecord(invalidRecord)
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('updatePayrollRecord', () => {
    test('should update record and refresh cache', async () => {
      const updatedData = { baseSalary: 3500000 };
      const updatedRecord = { _id: '1', ...updatedData };
      
      (apiService.updatePayrollRecord as jest.Mock).mockResolvedValue({
        success: true,
        data: updatedRecord
      });

      const result = await payrollService.updatePayrollRecord('1', updatedData);
      
      expect(result).toEqual(updatedRecord);
      expect(apiService.updatePayrollRecord).toHaveBeenCalledWith('1', updatedData);
    });
  });

  describe('calculateTotals', () => {
    test('should calculate totals correctly', () => {
      const payrollData = {
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
        }
      };

      const totals = payrollService.calculateTotals(payrollData);
      
      expect(totals.totalAllowances).toBe(500000);
      expect(totals.totalDeductions).toBe(480000);
      expect(totals.netSalary).toBe(3020000);
    });
  });

  describe('validatePayrollData', () => {
    test('should validate salary amounts', () => {
      const invalidData = {
        baseSalary: -1000,
        year: 2024,
        month: 13,
        userId: 'user123'
      };

      const errors = payrollService.validatePayrollData(invalidData);
      
      expect(errors).toContain('Base salary must be positive');
      expect(errors).toContain('Month must be between 1 and 12');
    });

    test('should pass validation for valid data', () => {
      const validData = {
        baseSalary: 3000000,
        year: 2024,
        month: 8,
        userId: 'user123'
      };

      const errors = payrollService.validatePayrollData(validData);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('Excel operations', () => {
    test('should handle Excel preview', async () => {
      const file = new File(['content'], 'payroll.xlsx');
      const previewResult = {
        success: true,
        data: {
          previewToken: 'token-123',
          summary: {
            totalRecords: 10,
            validRecords: 8,
            warningRecords: 1,
            invalidRecords: 1,
            totalAmount: 30000000
          },
          records: [
            {
              rowIndex: 1,
              employeeName: 'John Doe',
              baseSalary: 3000000,
              status: 'valid',
              matchedUser: { found: true, id: 'user1', name: 'John Doe' }
            }
          ],
          errors: [],
          warnings: []
        }
      };
      
      (apiService.previewPayrollExcel as jest.Mock).mockResolvedValue(previewResult);

      const result = await payrollService.previewExcel(file, 2024, 8);
      
      expect(result).toEqual(previewResult.data);
      expect(apiService.previewPayrollExcel).toHaveBeenCalledWith(file, 2024, 8);
    });

    test('should handle Excel preview confirmation', async () => {
      const previewToken = 'token-123';
      const idempotencyKey = 'idem-key-456';
      const confirmResult = {
        success: true,
        data: {
          savedRecords: 10,
          failedRecords: 0,
          message: 'Successfully saved 10 payroll records'
        }
      };
      
      (apiService.confirmPayrollExcel as jest.Mock).mockResolvedValue(confirmResult);

      const result = await payrollService.confirmExcelPreview(previewToken, idempotencyKey);
      
      expect(result).toEqual(confirmResult.data);
      expect(apiService.confirmPayrollExcel).toHaveBeenCalledWith(previewToken, idempotencyKey);
    });

    test('should handle Excel export', async () => {
      const blob = new Blob(['excel data']);
      (apiService.exportPayrollExcel as jest.Mock).mockResolvedValue(blob);

      const result = await payrollService.exportExcel({ year: 2024, month: 8 });
      
      expect(result).toEqual(blob);
      expect(apiService.exportPayrollExcel).toHaveBeenCalledWith({ year: 2024, month: 8 });
    });
  });

  describe('SSE Progress Tracking', () => {
    test('should create SSE connection for upload progress', async () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        readyState: EventSource.OPEN
      };
      
      global.EventSource = jest.fn().mockImplementation(() => mockEventSource) as any;
      
      const onProgress = jest.fn();
      const connection = payrollService.createProgressConnection('upload-123', onProgress);
      
      expect(global.EventSource).toHaveBeenCalledWith(
        expect.stringContaining('/payroll/progress/upload-123')
      );
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith('progress', expect.any(Function));
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith('complete', expect.any(Function));
      expect(mockEventSource.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      
      // Clean up
      connection.close();
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    test('should handle progress events', async () => {
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        readyState: EventSource.OPEN
      };
      
      global.EventSource = jest.fn().mockImplementation(() => mockEventSource) as any;
      
      const onProgress = jest.fn();
      payrollService.createProgressConnection('upload-123', onProgress);
      
      // Simulate progress event
      const progressHandler = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'progress')[1];
      
      const progressEvent = {
        data: JSON.stringify({ percentage: 50, message: 'Processing...' })
      };
      
      progressHandler(progressEvent);
      
      expect(onProgress).toHaveBeenCalledWith({
        percentage: 50,
        message: 'Processing...'
      });
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('should retry failed requests with exponential backoff', async () => {
      const mockData = [{ _id: '1', year: 2024, month: 8 }];
      
      // Fail first 2 attempts, succeed on third
      (apiService.getPayrollRecords as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, data: mockData });
      
      const result = await payrollService.fetchPayrollRecordsWithRetry({ maxRetries: 3 });
      
      expect(result).toEqual(mockData);
      expect(apiService.getPayrollRecords).toHaveBeenCalledTimes(3);
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      
      (apiService.previewPayrollExcel as jest.Mock).mockRejectedValue(timeoutError);
      
      const file = new File(['content'], 'payroll.xlsx');
      
      await expect(
        payrollService.previewExcelWithTimeout(file, 2024, 8, { timeout: 5000 })
      ).rejects.toThrow('Request timeout after 5000ms');
    });

    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      (networkError as any).response = undefined;
      
      (apiService.confirmPayrollExcel as jest.Mock).mockRejectedValue(networkError);
      
      await expect(
        payrollService.confirmExcelPreviewWithRetry('token-123', 'idem-key', { maxRetries: 1 })
      ).rejects.toThrow('Network connection failed. Please check your connection and try again.');
    });

    test('should handle validation errors without retry', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { error: 'Invalid data format' }
        }
      };
      
      (apiService.previewPayrollExcel as jest.Mock).mockRejectedValue(validationError);
      
      const file = new File(['content'], 'payroll.xlsx');
      
      await expect(
        payrollService.previewExcelWithRetry(file, 2024, 8, { maxRetries: 3 })
      ).rejects.toThrow('Invalid data format');
      
      // Should not retry on 400 errors
      expect(apiService.previewPayrollExcel).toHaveBeenCalledTimes(1);
    });
  });


  describe('Payslip operations', () => {
    test('should upload payslip', async () => {
      const file = new File(['pdf content'], 'payslip.pdf');
      
      (apiService.uploadPayslip as jest.Mock).mockResolvedValue({
        success: true
      });

      await payrollService.uploadPayslip('1', file);
      
      expect(apiService.uploadPayslip).toHaveBeenCalledWith('1', file);
    });

    test('should download payslip', async () => {
      const blob = new Blob(['pdf data']);
      (apiService.downloadPayslipPdf as jest.Mock).mockResolvedValue(blob);

      const result = await payrollService.downloadPayslip('1');
      
      expect(result).toEqual(blob);
      expect(apiService.downloadPayslipPdf).toHaveBeenCalledWith('1');
    });

    test('should delete payslip', async () => {
      (apiService.deletePayslip as jest.Mock).mockResolvedValue({
        success: true
      });

      await payrollService.deletePayslip('1');
      
      expect(apiService.deletePayslip).toHaveBeenCalledWith('1');
    });
  });
});