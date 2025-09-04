import { BaseApiService } from './base';
import { ApiResponse } from '../../types';

export class LeaveApiService extends BaseApiService {
  // Basic Leave Management
  async getLeaveRequests(userId?: string) {
    const url = userId ? `/leave?user_id=${userId}` : '/leave';
    return this.get(url);
  }

  async createLeaveRequest(data: any) {
    return this.post('/leave/', data);
  }

  async updateLeaveRequest(id: string, data: any) {
    return this.put(`/leave/${id}`, data);
  }

  async deleteLeaveRequest(id: string) {
    return this.delete(`/leave/${id}`);
  }

  async approveLeaveRequest(id: string, action: 'approve' | 'reject', comment?: string) {
    return this.post(`/leave/${id}/approve`, { action, comment });
  }

  // Leave Cancellation
  async cancelLeaveRequest(id: string, reason: string) {
    return this.post(`/leave/${id}/cancel`, { reason });
  }

  async approveLeaveCancellation(id: string, action: 'approve' | 'reject', comment?: string) {
    return this.post(`/leave/${id}/approve`, { action, comment, type: 'cancellation' });
  }

  async getPendingCancellations() {
    return this.get('/leave/cancellations/pending');
  }

  async getCancellationHistory() {
    return this.get('/leave/cancellations/history');
  }

  async getEmployeeLeaveLog(employeeId: string, year?: number) {
    const params = year ? { year } : {};
    return this.get(`/leave/employee/${employeeId}/log`, params);
  }

  // Admin Leave Management
  async getAdminLeaveOverview() {
    return this.get('/admin/leave/overview');
  }

  async getEmployeeLeaveDetails(employeeId: string) {
    return this.get(`/admin/leave/employee/${employeeId}`);
  }

  async adjustEmployeeLeave(employeeId: string, adjustment: {
    type: 'add' | 'subtract' | 'carry_over' | 'cancel_usage';
    amount: number;
    reason: string;
  }) {
    return this.post('/admin/leave/adjust', { employeeId, ...adjustment });
  }

  async getLeaveBalance(userId?: string) {
    const url = userId ? `/leave/balance/${userId}` : '/leave/balance';
    return this.get(url);
  }

  async getPendingLeaveRequests() {
    return this.get('/leave/pending');
  }

  // Legacy methods for backward compatibility
  async getLeaveHistory(userId?: number) {
    const url = userId ? `/leave?user_id=${userId}` : '/leave';
    return this.get(url);
  }

  async approveLeave(logId: number) {
    return this.post(`/leave/${logId}/approve`, { action: 'approve' });
  }

  async rejectLeave(logId: number) {
    return this.post(`/leave/${logId}/approve`, { action: 'reject' });
  }

  // Leave Statistics
  async getLeaveStats() {
    // TODO: This endpoint doesn't exist in backend - needs implementation
    console.warn('getLeaveStats endpoint not implemented in backend');
    return Promise.resolve({ 
      success: true, 
      data: { totalEmployees: 0, onLeave: 0, upcoming: 0 },
      message: 'Endpoint not implemented' 
    });
  }

  // Leave Policy Management
  async getLeavePolicy() {
    return this.get('/admin/policy');
  }

  async updateLeavePolicy(policy: any) {
    return this.put('/admin/policy', policy);
  }

  async getPolicyHistory(page: number = 1, limit: number = 10) {
    return this.get('/admin/policy/history', { page, limit });
  }

  // Bulk Leave Management
  async getBulkPendingRequests(filters?: {
    department?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/admin/leave/bulk-pending', filters);
  }

  async bulkApproveLeaveRequests(requestIds: string[], action: 'approve' | 'reject', comment?: string) {
    return this.post('/admin/leave/bulk-approve', { requestIds, action, comment });
  }

  // Leave Excel Export
  async exportLeaveToExcel(params: {
    view: 'overview' | 'team' | 'department';
    year: number;
    department?: string;
    riskLevel?: string;
  }): Promise<void> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('view', params.view);
      queryParams.append('year', params.year.toString());
      if (params.department && params.department !== 'all') {
        queryParams.append('department', params.department);
      }
      if (params.riskLevel) {
        queryParams.append('riskLevel', params.riskLevel);
      }

      const response = await this.api.get(`/admin/leave/export/excel?${queryParams.toString()}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `leave-${params.view}-${params.year}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)|filename="?(.+?)"?(?:;|$)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1] || filenameMatch[2]);
        }
      }

      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Excel 내보내기에 실패했습니다.');
    }
  }
}

export const leaveApiService = new LeaveApiService();