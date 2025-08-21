import { BaseApiService } from './base';
import { ApiResponse } from '../../types';

export class PayrollApiService extends BaseApiService {
  // Basic Payroll Management
  async getMonthlyPayments(yearMonth: string) {
    return this.get(`/payroll/monthly/${yearMonth}`);
  }

  async exportPayrollExcel(yearMonth: string) {
    const response = await this.api.request({
      method: 'GET',
      url: `/payroll/monthly/${yearMonth}/export`,
      responseType: 'blob'
    });
    return response;
  }

  async updatePayroll(data: any) {
    return this.post('/payroll/monthly', data);
  }

  async getSalesData(yearMonth: string) {
    return this.get(`/sales/${yearMonth}`);
  }

  async getBonuses(userId: number, yearMonth?: string) {
    const url = yearMonth ? `/bonus/user/${userId}?yearMonth=${yearMonth}` : `/bonus/user/${userId}`;
    return this.get(url);
  }

  async addBonus(data: any) {
    return this.post('/bonus', data);
  }

  // Enhanced Payroll Management
  async getPayrollRecords(params?: {
    year?: number;
    month?: number;
    userId?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    return this.get('/payroll', params);
  }

  async getPayrollRecord(id: string) {
    return this.get(`/payroll/${id}`);
  }

  async createPayrollRecord(data: any) {
    return this.post('/payroll', data);
  }

  async updatePayrollRecord(id: string, data: any) {
    return this.put(`/payroll/${id}`, data);
  }

  async deletePayrollRecord(id: string) {
    return this.delete(`/payroll/${id}`);
  }

  // Payroll Statistics
  async getPayrollStats(yearMonth: string) {
    return this.get(`/payroll/stats/${yearMonth}`);
  }

  // Payroll Reports
  async getPayrollReport(yearMonth: string) {
    return this.get(`/reports/payroll/${yearMonth}`);
  }

  async downloadPayrollReport(yearMonth: string) {
    const response = await this.api.get(`/reports/payroll/${yearMonth}/excel`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async downloadComparisonReport(uploadId: string, yearMonth: string) {
    const response = await this.api.get(`/reports/comparison/${uploadId}/${yearMonth}/excel`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async downloadPayslip(userId: string, yearMonth: string) {
    const response = await this.api.get(`/reports/payslip/${userId}/${yearMonth}/excel`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Payroll File Upload and Processing
  async uploadPayrollFile(file: File, yearMonth: string) {
    const formData = new FormData();
    formData.append('payrollFile', file);
    formData.append('yearMonth', yearMonth);
    return this.upload('/upload', formData);
  }

  async getUploadPreview(uploadId: string, page: number = 1, limit: number = 20) {
    return this.get(`/upload/${uploadId}/preview`, { page, limit });
  }

  async compareUploadData(uploadId: string, yearMonth: string) {
    return this.get(`/upload/${uploadId}/compare/${yearMonth}`);
  }

  async processUpload(uploadId: string, yearMonth: string) {
    return this.put(`/upload/${uploadId}/process`, { yearMonth });
  }

  // Excel Upload/Export
  async previewPayrollExcel(file: File, year?: number, month?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (year) formData.append('year', year.toString());
    if (month) formData.append('month', month.toString());
    return this.upload('/upload/excel/preview', formData);
  }

  async confirmPayrollExcel(
    previewToken: string, 
    idempotencyKey?: string, 
    duplicateMode?: 'skip' | 'update' | 'replace',
    recordActions?: Array<{rowNumber: number; action: string; userId?: string}>
  ) {
    const payload: any = { previewToken };
    if (idempotencyKey) {
      payload.idempotencyKey = idempotencyKey;
    }
    if (duplicateMode) {
      payload.duplicateMode = duplicateMode;
    }
    if (recordActions && recordActions.length > 0) {
      payload.recordActions = recordActions;
    }
    return this.post('/upload/excel/confirm', payload);
  }

  async exportPayrollData(params?: {
    year?: number;
    month?: number;
    userId?: string;
  }) {
    const response = await this.api.get('/upload/excel/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  // Payslip Management
  async uploadPayslip(payrollId: string, file: File) {
    const formData = new FormData();
    formData.append('payslip', file);
    return this.upload(`/payroll/${payrollId}/payslip`, formData);
  }

  async downloadPayslipPdf(payrollId: string) {
    const response = await this.api.get(`/payroll/${payrollId}/payslip`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async deletePayslip(payrollId: string) {
    return this.delete(`/payroll/${payrollId}/payslip`);
  }

  // Incentive Management
  async getIncentiveTypes(): Promise<ApiResponse<any[]>> {
    return this.get('/incentive/types');
  }

  async getIncentiveConfig(userId: string): Promise<ApiResponse<any>> {
    return this.get(`/incentive/config/${userId}`);
  }

  async updateIncentiveConfig(userId: string, config: {
    type: string;
    parameters: Record<string, number>;
    customFormula?: string;
    isActive: boolean;
    effectiveDate?: string;
  }): Promise<ApiResponse<any>> {
    return this.put(`/incentive/config/${userId}`, config);
  }

  async calculateIncentive(userId: string, yearMonth: string): Promise<ApiResponse<any>> {
    return this.post('/incentive/calculate', { userId, yearMonth });
  }

  async simulateIncentive(config: any, salesData: any): Promise<ApiResponse<any>> {
    return this.post('/incentive/simulate', { config, salesData });
  }

  async batchCalculateIncentives(yearMonth: string): Promise<ApiResponse<any>> {
    return this.post('/incentive/batch-calculate', { yearMonth });
  }

  async getIncentiveHistory(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return this.get(`/incentive/history/${userId}${queryString ? '?' + queryString : ''}`);
  }

  async validateIncentiveFormula(formula: string, testData?: any): Promise<ApiResponse<any>> {
    return this.post('/incentive/validate', { formula, testData });
  }
}

export const payrollApiService = new PayrollApiService();