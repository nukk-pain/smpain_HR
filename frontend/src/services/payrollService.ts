/*
 * AI-HEADER
 * Intent: Centralized payroll service layer for state management and API interactions
 * Domain Meaning: Manages all payroll-related operations and data caching
 * Misleading Names: None
 * Data Contracts: Interfaces with API service and maintains payroll data consistency
 * PII: Contains salary information - implements secure data handling
 * Invariants: Maintains cache consistency; Validates data before API calls
 * RAG Keywords: payroll, service, state, cache, validation, api
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-service-layer-centralized-state-management
 */

import { apiService } from './api';

interface PayrollRecord {
  _id?: string;
  year: number;
  month: number;
  userId: string;
  baseSalary: number;
  allowances?: {
    overtime: number;
    position: number;
    meal: number;
    transportation: number;
    other: number;
  };
  deductions?: {
    nationalPension: number;
    healthInsurance: number;
    employmentInsurance: number;
    incomeTax: number;
    localIncomeTax: number;
    other: number;
  };
  totalAllowances?: number;
  totalDeductions?: number;
  netSalary?: number;
  paymentStatus?: string;
  hasPayslip?: boolean;
}


interface PayrollTotals {
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
}

export class PayrollService {
  private cache: Map<string, any> = new Map();
  private readonly CACHE_KEY = 'payroll_records';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamp: number = 0;

  /**
   * Fetch payroll records with caching
   * DomainMeaning: Retrieves all payroll records with optional caching
   * SideEffects: Updates internal cache
   * Invariants: Returns array of payroll records
   * RAG_Keywords: fetch, payroll, records, cache
   */
  async fetchPayrollRecords(params?: {
    year?: number;
    month?: number;
    userId?: string;
    paymentStatus?: string;
    forceRefresh?: boolean;
  }): Promise<PayrollRecord[]> {
    // Check cache validity
    if (!params?.forceRefresh && this.isCacheValid()) {
      const cached = this.getCachedRecords();
      if (cached) return cached;
    }

    try {
      const response = await apiService.getPayrollRecords(params);
      
      if (response.success) {
        const records = response.data || [];
        this.setCachedRecords(records);
        return records;
      } else {
        throw new Error(response.error || 'Failed to fetch payroll records');
      }
    } catch (error: any) {
      console.error('Error fetching payroll records:', error);
      throw error;
    }
  }

  /**
   * Get single payroll record
   * DomainMeaning: Retrieves specific payroll record by ID
   * RAG_Keywords: get, payroll, record, single
   */
  async getPayrollRecord(id: string): Promise<PayrollRecord> {
    try {
      const response = await apiService.getPayrollRecord(id);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch payroll record');
      }
    } catch (error: any) {
      console.error('Error fetching payroll record:', error);
      throw error;
    }
  }

  /**
   * Create new payroll record
   * DomainMeaning: Creates new payroll entry with validation
   * SideEffects: Invalidates cache
   * Invariants: Validates required fields before creation
   * RAG_Keywords: create, payroll, validation
   */
  async createPayrollRecord(data: Partial<PayrollRecord>): Promise<PayrollRecord> {
    // Validate required fields
    if (!data.year || !data.month || !data.userId || data.baseSalary === undefined) {
      throw new Error('Missing required fields');
    }

    // Validate data
    const errors = this.validatePayrollData(data);
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    // Calculate totals if allowances/deductions provided
    if (data.allowances || data.deductions) {
      const totals = this.calculateTotals(data as any);
      data = { ...data, ...totals };
    }

    try {
      const response = await apiService.createPayrollRecord(data);
      
      if (response.success) {
        this.invalidateCache();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create payroll record');
      }
    } catch (error: any) {
      console.error('Error creating payroll record:', error);
      throw error;
    }
  }

  /**
   * Update existing payroll record
   * DomainMeaning: Updates payroll entry with recalculation
   * SideEffects: Invalidates cache
   * RAG_Keywords: update, payroll, recalculate
   */
  async updatePayrollRecord(id: string, data: Partial<PayrollRecord>): Promise<PayrollRecord> {
    // Validate data if provided
    if (data.baseSalary !== undefined || data.year || data.month) {
      const errors = this.validatePayrollData(data);
      if (errors.length > 0) {
        throw new Error(`Validation errors: ${errors.join(', ')}`);
      }
    }

    // Recalculate totals if needed
    if (data.allowances || data.deductions || data.baseSalary !== undefined) {
      const totals = this.calculateTotals(data as any);
      data = { ...data, ...totals };
    }

    try {
      const response = await apiService.updatePayrollRecord(id, data);
      
      if (response.success) {
        this.invalidateCache();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update payroll record');
      }
    } catch (error: any) {
      console.error('Error updating payroll record:', error);
      throw error;
    }
  }

  /**
   * Delete payroll record
   * DomainMeaning: Soft deletes payroll entry
   * SideEffects: Invalidates cache
   * RAG_Keywords: delete, payroll, soft-delete
   */
  async deletePayrollRecord(id: string): Promise<void> {
    try {
      const response = await apiService.deletePayrollRecord(id);
      
      if (response.success) {
        this.invalidateCache();
      } else {
        throw new Error(response.error || 'Failed to delete payroll record');
      }
    } catch (error: any) {
      console.error('Error deleting payroll record:', error);
      throw error;
    }
  }

  /**
   * Calculate payroll totals
   * DomainMeaning: Calculates total allowances, deductions, and net salary
   * Invariants: Net salary = base + allowances - deductions
   * RAG_Keywords: calculate, totals, salary, allowances, deductions
   */
  calculateTotals(data: {
    baseSalary: number;
    allowances?: Partial<PayrollRecord['allowances']>;
    deductions?: Partial<PayrollRecord['deductions']>;
  }): PayrollTotals {
    const totalAllowances = data.allowances
      ? Object.values(data.allowances).reduce((sum, val) => sum + (val || 0), 0)
      : 0;
    
    const totalDeductions = data.deductions
      ? Object.values(data.deductions).reduce((sum, val) => sum + (val || 0), 0)
      : 0;
    
    const netSalary = data.baseSalary + totalAllowances - totalDeductions;
    
    return {
      totalAllowances,
      totalDeductions,
      netSalary
    };
  }

  /**
   * Validate payroll data
   * DomainMeaning: Validates payroll data integrity
   * Invariants: Returns array of error messages
   * RAG_Keywords: validate, payroll, data, errors
   */
  validatePayrollData(data: Partial<PayrollRecord>): string[] {
    const errors: string[] = [];
    
    if (data.baseSalary !== undefined && data.baseSalary < 0) {
      errors.push('Base salary must be positive');
    }
    
    if (data.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (data.year < 2020 || data.year > currentYear + 1) {
        errors.push('Year must be between 2020 and next year');
      }
    }
    
    if (data.month !== undefined) {
      if (data.month < 1 || data.month > 12) {
        errors.push('Month must be between 1 and 12');
      }
    }
    
    // Validate allowances
    if (data.allowances) {
      Object.entries(data.allowances).forEach(([key, value]) => {
        if (value < 0) {
          errors.push(`${key} allowance must be positive`);
        }
      });
    }
    
    // Validate deductions
    if (data.deductions) {
      Object.entries(data.deductions).forEach(([key, value]) => {
        if (value < 0) {
          errors.push(`${key} deduction must be positive`);
        }
      });
    }
    
    return errors;
  }


  /**
   * Preview Excel file before saving
   * DomainMeaning: Generates preview of Excel payroll data without persisting
   * SideEffects: None - read-only operation
   * RAG_Keywords: preview, excel, validation, matching
   */
  async previewExcel(file: File, year?: number, month?: number): Promise<any> {
    try {
      const response = await apiService.previewPayrollExcel(file, year, month);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to preview Excel file');
      }
    } catch (error: any) {
      console.error('Error previewing Excel file:', error);
      throw error;
    }
  }

  /**
   * Confirm Excel preview and save to database
   * DomainMeaning: Persists previously previewed payroll data to database
   * SideEffects: Invalidates cache, saves to database
   * RAG_Keywords: confirm, save, preview, payroll
   */
  async confirmExcelPreview(previewToken: string, idempotencyKey?: string): Promise<any> {
    try {
      const response = await apiService.confirmPayrollExcel(previewToken, idempotencyKey);
      
      if (response.success) {
        this.invalidateCache();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to confirm Excel preview');
      }
    } catch (error: any) {
      console.error('Error confirming Excel preview:', error);
      throw error;
    }
  }

  /**
   * Export to Excel
   * DomainMeaning: Exports payroll data to Excel format
   * RAG_Keywords: export, excel, download
   */
  async exportExcel(params?: {
    year?: number;
    month?: number;
    userId?: string;
  }): Promise<Blob> {
    try {
      return await apiService.exportPayrollExcel(params);
    } catch (error: any) {
      console.error('Error exporting Excel file:', error);
      throw error;
    }
  }

  /**
   * Create SSE connection for progress tracking
   * DomainMeaning: Establishes Server-Sent Events connection for real-time progress updates
   * SideEffects: Creates EventSource connection
   * RAG_Keywords: sse, progress, realtime, streaming
   */
  createProgressConnection(uploadId: string, onProgress: (data: any) => void): { close: () => void } {
    const baseUrl = this.getApiBaseUrl();
    const eventSource = new EventSource(`${baseUrl}/upload/progress/${uploadId}`);
    
    eventSource.addEventListener('progress', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);
      } catch (error) {
        console.error('Error parsing progress event:', error);
      }
    });
    
    eventSource.addEventListener('complete', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onProgress({ ...data, complete: true });
        eventSource.close();
      } catch (error) {
        console.error('Error parsing complete event:', error);
      }
    });
    
    eventSource.addEventListener('error', (event: Event) => {
      console.error('SSE connection error:', event);
      onProgress({ error: true, message: 'Connection lost' });
      eventSource.close();
    });
    
    return {
      close: () => eventSource.close()
    };
  }
  
  /**
   * Get API base URL for SSE connections
   * DomainMeaning: Retrieves base URL for API connections
   * RAG_Keywords: api, url, base
   */
  private getApiBaseUrl(): string {
    // Get base URL from apiService or environment
    const directApiUrl = (window as any).__VITE_API_URL || import.meta.env.VITE_API_URL;
    if (directApiUrl) {
      return directApiUrl;
    }
    return '/api';
  }

  /**
   * Fetch payroll records with retry logic
   * DomainMeaning: Fetches records with automatic retry on failure
   * SideEffects: Updates cache on success
   * RAG_Keywords: fetch, retry, exponential backoff
   */
  async fetchPayrollRecordsWithRetry(options?: { maxRetries?: number; [key: string]: any }): Promise<PayrollRecord[]> {
    const { maxRetries = 3, ...params } = options || {};
    
    return this.retryWithExponentialBackoff(
      () => this.fetchPayrollRecords(params),
      maxRetries
    );
  }

  /**
   * Preview Excel with timeout
   * DomainMeaning: Previews Excel file with configurable timeout
   * RAG_Keywords: preview, timeout, excel
   */
  async previewExcelWithTimeout(
    file: File,
    year?: number,
    month?: number,
    options?: { timeout?: number }
  ): Promise<any> {
    const timeout = options?.timeout || 30000; // Default 30 seconds
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
    });
    
    try {
      return await Promise.race([
        this.previewExcel(file, year, month),
        timeoutPromise
      ]);
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        throw error;
      }
      throw this.enhanceError(error);
    }
  }

  /**
   * Preview Excel with retry logic
   * DomainMeaning: Previews Excel with automatic retry on failure
   * RAG_Keywords: preview, retry, excel
   */
  async previewExcelWithRetry(
    file: File,
    year?: number,
    month?: number,
    options?: { maxRetries?: number }
  ): Promise<any> {
    const maxRetries = options?.maxRetries || 3;
    
    return this.retryWithExponentialBackoff(
      () => this.previewExcel(file, year, month),
      maxRetries,
      (error) => !this.isValidationError(error) // Don't retry validation errors
    );
  }

  /**
   * Confirm Excel preview with retry logic
   * DomainMeaning: Confirms preview with automatic retry on failure
   * SideEffects: Invalidates cache on success
   * RAG_Keywords: confirm, retry, preview
   */
  async confirmExcelPreviewWithRetry(
    previewToken: string,
    idempotencyKey?: string,
    options?: { maxRetries?: number }
  ): Promise<any> {
    const maxRetries = options?.maxRetries || 3;
    
    return this.retryWithExponentialBackoff(
      () => this.confirmExcelPreview(previewToken, idempotencyKey),
      maxRetries,
      (error) => !this.isValidationError(error)
    );
  }

  /**
   * Generic retry with exponential backoff
   * DomainMeaning: Implements exponential backoff retry strategy
   * RAG_Keywords: retry, exponential, backoff
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw this.enhanceError(error);
        }
        
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw this.enhanceError(lastError);
  }

  /**
   * Check if error is a validation error (4xx)
   * DomainMeaning: Determines if error is client-side validation error
   * RAG_Keywords: validation, error, check
   */
  private isValidationError(error: any): boolean {
    return error?.response?.status >= 400 && error?.response?.status < 500;
  }

  /**
   * Enhance error messages for better user experience
   * DomainMeaning: Transforms technical errors into user-friendly messages
   * RAG_Keywords: error, enhance, message
   */
  private enhanceError(error: any): Error {
    // Network errors
    if (!error.response && error.message) {
      if (error.message.includes('Network')) {
        return new Error('Network connection failed. Please check your connection and try again.');
      }
      if (error.code === 'ECONNABORTED') {
        return new Error('Request timeout. Please try again.');
      }
    }
    
    // API errors
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    
    // Default
    return error;
  }

  /**
   * Upload payslip PDF
   * DomainMeaning: Uploads PDF payslip for a payroll record
   * RAG_Keywords: upload, payslip, pdf
   */
  async uploadPayslip(payrollId: string, file: File): Promise<void> {
    try {
      const response = await apiService.uploadPayslip(payrollId, file);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to upload payslip');
      }
    } catch (error: any) {
      console.error('Error uploading payslip:', error);
      throw error;
    }
  }

  /**
   * Download payslip PDF
   * DomainMeaning: Downloads PDF payslip for a payroll record
   * RAG_Keywords: download, payslip, pdf
   */
  async downloadPayslip(payrollId: string): Promise<Blob> {
    try {
      return await apiService.downloadPayslipPdf(payrollId);
    } catch (error: any) {
      console.error('Error downloading payslip:', error);
      throw error;
    }
  }

  /**
   * Delete payslip
   * DomainMeaning: Deletes PDF payslip from a payroll record
   * RAG_Keywords: delete, payslip, pdf
   */
  async deletePayslip(payrollId: string): Promise<void> {
    try {
      const response = await apiService.deletePayslip(payrollId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete payslip');
      }
    } catch (error: any) {
      console.error('Error deleting payslip:', error);
      throw error;
    }
  }

  // Cache management methods
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  getCachedRecords(): PayrollRecord[] | null {
    return this.cache.get(this.CACHE_KEY) || null;
  }

  private setCachedRecords(records: PayrollRecord[]): void {
    this.cache.set(this.CACHE_KEY, records);
    this.cacheTimestamp = Date.now();
  }

  private invalidateCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Clear all cached data
   * DomainMeaning: Manually clears all cached payroll data
   * SideEffects: Removes all cached entries
   * RAG_Keywords: clear, cache, reset
   */
  clearCache(): void {
    this.invalidateCache();
  }
}

// Export singleton instance
export const payrollService = new PayrollService();
export default payrollService;