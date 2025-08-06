// API endpoint configuration and typed service methods
import { apiClient, PaginatedResponse } from './api-client';

// Types for request/response data
export interface User {
  _id: string;
  username: string;
  name: string;
  role: 'Admin' | 'Manager' | 'User';
  department?: string;
  position?: string;
  employeeId?: string;
  phone?: string;
  isActive: boolean;
  hireDate?: string;
  leaveBalance?: number;
  baseSalary?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  _id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  daysCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approverId?: string;
  approvalDate?: string;
  approvalNote?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRecord {
  _id: string;
  userId: string;
  yearMonth: string;
  year: number;
  month: number;
  baseSalary: number;
  incentive: number;
  totalAllowances?: number;
  totalDeductions?: number;
  netPay: number;
  status?: 'pending' | 'processed';
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  _id: string;
  name: string;
  description?: string;
  supervisorId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API endpoint constants
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    CHECK: '/auth/check',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: (id: string) => `/users/profile/${id}`,
    PERMISSIONS: (id: string) => `/users/${id}/permissions`,
    ACTIVATE: (id: string) => `/users/${id}/activate`,
    RESET_PASSWORD: (id: string) => `/users/${id}/reset-password`,
    BULK_IMPORT: '/users/bulk-import',
    STATS: '/users/stats/overview',
  },

  // Leave Management
  LEAVE: {
    BASE: '/leave',
    BY_ID: (id: string) => `/leave/${id}`,
    APPROVE: (id: string) => `/leave/${id}/approve`,
    CANCEL: (id: string) => `/leave/${id}/cancel`,
    PENDING: '/leave/pending',
    BALANCE: '/leave/balance',
    CALENDAR: (month: string) => `/leave/calendar/${month}`,
    TEAM_CALENDAR: (month: string) => `/leave/team-calendar/${month}`,
    TEAM_STATUS: '/leave/team-status',
    CARRY_OVER: (year: number) => `/leave/carry-over/${year}`,
  },

  // Payroll
  PAYROLL: {
    MONTHLY: '/payroll/monthly',
    BY_ID: (id: string) => `/payroll/monthly/${id}`,
    BY_YEAR_MONTH: (yearMonth: string) => `/payroll/monthly/${yearMonth}`,
    BY_USER: (userId: string) => `/payroll/employee/${userId}`,
    STATS: (yearMonth: string) => `/payroll/stats/${yearMonth}`,
  },

  // Departments
  DEPARTMENTS: {
    BASE: '/departments',
    BY_ID: (id: string) => `/departments/${id}`,
    EMPLOYEES: (name: string) => `/departments/${name}/employees`,
  },

  // Reports
  REPORTS: {
    PAYROLL: (yearMonth: string) => `/reports/payroll/${yearMonth}`,
    PAYROLL_EXCEL: (yearMonth: string) => `/reports/payroll/${yearMonth}/excel`,
    PAYSLIP: (userId: string, yearMonth: string) => `/reports/payslip/${userId}/${yearMonth}/excel`,
    LEAVE: (yearMonth: string) => `/reports/leave/${yearMonth}`,
    TEMPLATE_PAYROLL: '/reports/template/payroll',
  },

  // File Upload
  UPLOAD: {
    BASE: '/upload',
    BY_ID: (id: string) => `/upload/${id}`,
    PREVIEW: (id: string) => `/upload/${id}/preview`,
    COMPARE: (id: string, yearMonth: string) => `/upload/${id}/compare/${yearMonth}`,
    PROCESS: (id: string) => `/upload/${id}/process`,
  },

  // Sales
  SALES: {
    BASE: '/sales',
    BY_ID: (id: string) => `/sales/${id}`,
    BY_YEAR_MONTH: (yearMonth: string) => `/sales/${yearMonth}`,
    BY_USER: (userId: string) => `/sales/user/${userId}`,
    STATS: (yearMonth: string) => `/sales/stats/${yearMonth}`,
  },

  // Bonus
  BONUS: {
    BASE: '/bonus',
    BY_ID: (id: string) => `/bonus/${id}`,
    BY_YEAR_MONTH: (yearMonth: string) => `/bonus/${yearMonth}`,
    BY_USER: (userId: string) => `/bonus/user/${userId}`,
  },

  // Admin
  ADMIN: {
    LEAVE_OVERVIEW: '/admin/leave/overview',
    LEAVE_ADJUST: '/admin/leave/adjust',
    LEAVE_EMPLOYEE: (id: string) => `/admin/leave/employee/${id}`,
    STATS_SYSTEM: '/admin/stats/system',
    POLICY: '/admin/policy',
    POLICY_HISTORY: '/admin/policy/history',
    BULK_PENDING: '/admin/leave/bulk-pending',
    BULK_APPROVE: '/admin/leave/bulk-approve',
  },
} as const;

// Typed API service methods
export class ApiService {
  // Authentication
  static async login(username: string, password: string) {
    return apiClient.post<{ user: User; token?: string }>(
      API_ENDPOINTS.AUTH.LOGIN,
      { username, password }
    );
  }

  static async logout() {
    return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  }

  static async getCurrentUser() {
    return apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
  }

  static async checkAuth() {
    return apiClient.get<{ user: User }>(API_ENDPOINTS.AUTH.CHECK);
  }

  static async changePassword(currentPassword: string, newPassword: string) {
    return apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
  }

  // Users
  static async getUsers(params?: {
    department?: string;
    position?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    if (params?.page) {
      return apiClient.getPaginated<User>(
        API_ENDPOINTS.USERS.BASE,
        params.page,
        params.limit,
        params
      );
    }
    return apiClient.get<User[]>(API_ENDPOINTS.USERS.BASE, { params });
  }

  static async getUser(id: string) {
    return apiClient.get<User>(API_ENDPOINTS.USERS.BY_ID(id));
  }

  static async createUser(userData: Partial<User> & { username: string; password: string }) {
    return apiClient.post<User>(API_ENDPOINTS.USERS.BASE, userData);
  }

  static async updateUser(id: string, userData: Partial<User>) {
    return apiClient.put<User>(API_ENDPOINTS.USERS.BY_ID(id), userData);
  }

  static async updateUserProfile(id: string, profileData: {
    name: string;
    birthDate?: string;
    phoneNumber?: string;
  }) {
    return apiClient.put<User>(API_ENDPOINTS.USERS.PROFILE(id), profileData);
  }

  static async deleteUser(id: string, permanent: boolean = false) {
    return apiClient.delete(API_ENDPOINTS.USERS.BY_ID(id), {
      data: { permanent }
    });
  }

  static async bulkImportUsers(users: Partial<User>[]) {
    return apiClient.post<{ created: number; errors: any[] }>(
      API_ENDPOINTS.USERS.BULK_IMPORT,
      { users }
    );
  }

  // Leave Management
  static async getLeaveRequests(userId?: string, params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = { ...params, user_id: userId };
    
    if (params?.page) {
      return apiClient.getPaginated<LeaveRequest>(
        API_ENDPOINTS.LEAVE.BASE,
        params.page,
        params.limit,
        queryParams
      );
    }
    return apiClient.get<LeaveRequest[]>(API_ENDPOINTS.LEAVE.BASE, { params: queryParams });
  }

  static async createLeaveRequest(requestData: {
    startDate: string;
    endDate: string;
    reason: string;
    daysCount: number;
  }) {
    return apiClient.post<LeaveRequest>(API_ENDPOINTS.LEAVE.BASE, requestData);
  }

  static async updateLeaveRequest(id: string, requestData: Partial<LeaveRequest>) {
    return apiClient.put<LeaveRequest>(API_ENDPOINTS.LEAVE.BY_ID(id), requestData);
  }

  static async deleteLeaveRequest(id: string) {
    return apiClient.delete(API_ENDPOINTS.LEAVE.BY_ID(id));
  }

  static async approveLeaveRequest(id: string, approved: boolean, note?: string) {
    return apiClient.post<LeaveRequest>(API_ENDPOINTS.LEAVE.APPROVE(id), {
      approved,
      note,
    });
  }

  static async getLeaveBalance(userId?: string) {
    return apiClient.get<{
      currentBalance: number;
      totalEntitlement: number;
      usedDays: number;
      pendingDays: number;
    }>(API_ENDPOINTS.LEAVE.BALANCE, {
      params: userId ? { user_id: userId } : undefined
    });
  }

  // Payroll
  static async getPayrollRecords(yearMonth?: string, params?: {
    page?: number;
    limit?: number;
  }) {
    const endpoint = yearMonth 
      ? API_ENDPOINTS.PAYROLL.BY_YEAR_MONTH(yearMonth)
      : API_ENDPOINTS.PAYROLL.MONTHLY;

    if (params?.page) {
      return apiClient.getPaginated<PayrollRecord>(
        endpoint,
        params.page,
        params.limit
      );
    }
    return apiClient.get<PayrollRecord[]>(endpoint);
  }

  static async createPayrollRecord(recordData: Omit<PayrollRecord, '_id' | 'createdAt' | 'updatedAt'>) {
    return apiClient.post<PayrollRecord>(API_ENDPOINTS.PAYROLL.MONTHLY, recordData);
  }

  static async updatePayrollRecord(id: string, recordData: Partial<PayrollRecord>) {
    return apiClient.put<PayrollRecord>(API_ENDPOINTS.PAYROLL.BY_ID(id), recordData);
  }

  static async deletePayrollRecord(id: string) {
    return apiClient.delete(API_ENDPOINTS.PAYROLL.BY_ID(id));
  }

  // Departments
  static async getDepartments() {
    return apiClient.get<Department[]>(API_ENDPOINTS.DEPARTMENTS.BASE);
  }

  static async createDepartment(departmentData: Omit<Department, '_id' | 'createdAt' | 'updatedAt'>) {
    return apiClient.post<Department>(API_ENDPOINTS.DEPARTMENTS.BASE, departmentData);
  }

  static async updateDepartment(id: string, departmentData: Partial<Department>) {
    return apiClient.put<Department>(API_ENDPOINTS.DEPARTMENTS.BY_ID(id), departmentData);
  }

  static async deleteDepartment(id: string) {
    return apiClient.delete(API_ENDPOINTS.DEPARTMENTS.BY_ID(id));
  }

  // File Upload
  static async uploadFile(file: File, type?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (type) formData.append('type', type);

    return apiClient.upload<{
      id: string;
      filename: string;
      size: number;
      type: string;
    }>(API_ENDPOINTS.UPLOAD.BASE, formData);
  }

  // Reports
  static async downloadPayrollReport(yearMonth: string, format: 'json' | 'excel' = 'json') {
    const endpoint = format === 'excel' 
      ? API_ENDPOINTS.REPORTS.PAYROLL_EXCEL(yearMonth)
      : API_ENDPOINTS.REPORTS.PAYROLL(yearMonth);

    if (format === 'excel') {
      // Handle file download
      const response = await apiClient.getRawClient().get(endpoint, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-${yearMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    }

    return apiClient.get(endpoint);
  }

  // Health check
  static async healthCheck() {
    return apiClient.healthCheck();
  }
}

// Export both the service class and individual endpoint functions
export default ApiService;