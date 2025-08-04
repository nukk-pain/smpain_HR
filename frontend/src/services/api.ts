import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, AuthResponse, User, Department, Position, OrganizationChart, DepartmentEmployees } from '../types';
import { getApiUrl } from '../config/env';
import { getValidToken, clearAuth } from '../utils/tokenManager';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    // 프로덕션에서 환경변수가 안 되면 하드코딩 사용
    let apiUrl = '/api'; // 기본값
    
    // 환경변수 확인
    const directApiUrl = import.meta.env.VITE_API_URL;
    const configApiUrl = getApiUrl();
    
    // 환경변수 우선, 그 다음 config 시스템
    if (directApiUrl) {
      apiUrl = directApiUrl;
    } else if (configApiUrl && configApiUrl !== '/api') {
      apiUrl = configApiUrl;
    }
    
    // API URL 디버깅 (console only)
    console.log('🌐 API Service initialized with URL:', apiUrl);
    
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Flask session-based auth
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add JWT token to Authorization header
        const token = getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Token added to request', {
            url: config.url,
            method: config.method,
            hasToken: true,
            tokenLength: token.length,
            timestamp: new Date().toISOString()
          });
        } else {
          console.warn('⚠️ No token available for request', {
            url: config.url,
            method: config.method,
            timestamp: new Date().toISOString()
          });
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Only clear token if this is not a login request and not already on login page
          const isLoginRequest = error.config?.url?.includes('/auth/login');
          const isOnLoginPage = window.location.pathname === '/login';
          
          console.warn('🚫 401 Unauthorized received', {
            url: error.config?.url,
            isLoginRequest,
            isOnLoginPage,
            currentPath: window.location.pathname,
            willClearToken: !isLoginRequest && !isOnLoginPage,
            timestamp: new Date().toISOString()
          });
          
          if (!isLoginRequest && !isOnLoginPage) {
            console.warn('🗑️ Clearing token due to 401 error');
            clearAuth();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(url, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.put(url, data);
    return response.data;
  }

  async delete<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.delete(url, { data });
    return response.data;
  }

  async upload(url: string, formData: FormData): Promise<any> {
    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Authentication
  async login(username: string, password: string): Promise<AuthResponse> {
    console.log('🔐 Login attempt:', {
      baseURL: this.api.defaults.baseURL,
      url: '/auth/login',
      fullURL: `${this.api.defaults.baseURL}/auth/login`,
      method: 'POST'
    });
    
    
    const response = await this.api.post('/auth/login', { username, password });
    return response.data;
  }

  async logout(): Promise<ApiResponse<any>> {
    return this.post('/auth/logout');
  }

  async getCurrentUser(): Promise<AuthResponse> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Users
  async getUsers(params?: {
    department?: string;
    position?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<ApiResponse<User[]>> {
    return this.get<User[]>('/users/', params);
  }

  async getUser(id: string) {
    return this.get(`/users/${id}`);
  }

  async createUser(data: any) {
    return this.post('/users/', data);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/users/${id}`, data);
  }

  async updateUserProfile(id: string, data: { name: string; birthDate?: string; phoneNumber?: string }) {
    return this.put(`/users/profile/${id}`, data);
  }

  async deleteUser(id: string, permanent: boolean = false) {
    return this.delete(`/users/${id}`, { permanent });
  }

  async activateUser(id: string) {
    return this.post(`/users/${id}/activate`);
  }

  async resetUserPassword(id: string, password: string) {
    return this.post(`/users/${id}/reset-password`, { password });
  }

  async getEmploymentInfo(id: string) {
    return this.get(`/users/${id}/employment-info`);
  }

  async bulkImportUsers(users: any[]) {
    return this.post('/users/bulk-import', { users });
  }

  // Leave Management
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

  // Leave cancellation methods
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

  // Admin leave management
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

  // Payroll Management
  async getMonthlyPayments(yearMonth: string) {
    return this.get(`/payroll/monthly/${yearMonth}`);
  }

  async updatePayroll(data: any) {
    return this.post('/payroll/monthly', data);
  }

  async getSalesData(yearMonth: string) {
    return this.get(`/sales/${yearMonth}`);
  }

  async calculateIncentive(userId: number, yearMonth: string, salesAmount: number) {
    return this.post('/payroll/calculate-incentive', { 
      user_id: userId, 
      year_month: yearMonth, 
      sales_amount: salesAmount 
    });
  }

  async getBonuses(userId: number, yearMonth?: string) {
    const url = yearMonth ? `/payroll/bonus/${userId}/${yearMonth}` : `/payroll/bonus/${userId}`;
    return this.get(url);
  }

  async addBonus(data: any) {
    return this.post('/payroll/bonus', data);
  }

  // Reports
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

  async downloadPayrollTemplate() {
    const response = await this.api.get('/reports/template/payroll', {
      responseType: 'blob',
    });
    return response.data;
  }

  // File Upload and Processing
  async uploadPayrollFile(file: File, yearMonth: string) {
    const formData = new FormData();
    formData.append('payrollFile', file);
    formData.append('yearMonth', yearMonth);
    return this.upload('/payroll-upload', formData);
  }

  async getUploadPreview(uploadId: string, page: number = 1, limit: number = 20) {
    return this.get(`/payroll-upload/${uploadId}/preview`, { page, limit });
  }

  async compareUploadData(uploadId: string, yearMonth: string) {
    return this.get(`/payroll-upload/${uploadId}/compare/${yearMonth}`);
  }

  async processUpload(uploadId: string, yearMonth: string) {
    return this.put(`/payroll-upload/${uploadId}/process`, { yearMonth });
  }

  // Statistics
  async getDashboardStats() {
    return this.get('/admin/stats/system');
  }

  async getLeaveStats() {
    return this.get('/leave/stats/overview');
  }

  async getUserStats() {
    return this.get('/users/stats/overview');
  }

  async getPayrollStats(yearMonth: string) {
    return this.get(`/payroll/stats/${yearMonth}`);
  }

  // Departments
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    return this.get<Department[]>('/departments/');
  }

  async createDepartment(data: any) {
    return this.post('/departments/', data);
  }

  async updateDepartment(id: string, data: any) {
    return this.put(`/departments/${id}`, data);
  }

  async deleteDepartment(id: string) {
    return this.delete(`/departments/${id}`);
  }

  async getDepartmentEmployees(departmentName: string): Promise<ApiResponse<DepartmentEmployees>> {
    return this.get<DepartmentEmployees>(`/departments/${departmentName}/employees`);
  }

  async getOrganizationChart(): Promise<ApiResponse<OrganizationChart>> {
    return this.get<OrganizationChart>('/organization-chart');
  }

  // Positions
  async getPositions(): Promise<ApiResponse<Position[]>> {
    return this.get<Position[]>('/positions/');
  }

  async getPosition(id: string) {
    return this.get(`/positions/${id}`);
  }

  async createPosition(data: any) {
    return this.post('/positions/', data);
  }

  async updatePosition(id: string, data: any) {
    return this.put(`/positions/${id}`, data);
  }

  async deletePosition(id: string) {
    return this.delete(`/positions/${id}`);
  }

  async getPositionsByDepartment(department: string) {
    return this.get(`/positions/department/${department}`);
  }

  // Permissions Management
  async getUserPermissions(userId: string) {
    return this.get(`/users/${userId}/permissions`);
  }

  async updateUserPermissions(userId: string, permissions: string[]) {
    return this.put(`/users/${userId}/permissions`, { permissions });
  }

  async getAvailablePermissions() {
    return this.get('/permissions');
  }

  // Admin
  async changePassword(currentPassword: string, newPassword: string) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
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
}

// Export class and singleton instance
export { ApiService };
export const apiService = new ApiService();
export default apiService;