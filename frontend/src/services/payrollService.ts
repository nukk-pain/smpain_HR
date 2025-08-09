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

interface UploadResult {
  summary: {
    totalRecords: number;
    successCount: number;
    errorCount: number;
  };
  errors: Array<{
    row: number;
    message: string;
  }>;
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
   * Upload Excel file
   * DomainMeaning: Uploads Excel file for bulk payroll import
   * SideEffects: Invalidates cache on success
   * RAG_Keywords: upload, excel, bulk, import
   */
  async uploadExcel(file: File): Promise<UploadResult> {
    try {
      const response = await apiService.uploadPayrollExcel(file);
      
      if (response.success) {
        this.invalidateCache();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to upload Excel file');
      }
    } catch (error: any) {
      console.error('Error uploading Excel file:', error);
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