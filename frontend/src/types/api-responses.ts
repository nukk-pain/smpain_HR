// API Response Type Definitions

import { MonthlyPayment, User, LeaveRequest } from './index';

// Payroll Related Responses
export interface PayrollReportResponse {
  success: boolean;
  data: {
    summary: {
      totalEmployees: number;
      totalPaid: number;
      totalInput: number;
      averageSalary: number;
    };
    reportData: MonthlyPayment[];
  };
}

export interface PayrollPreviewResponse {
  success: boolean;
  data: any[]; // Define more specific type as needed
}

// Leave Related Responses
export interface TeamLeaveStatusResponse {
  members: TeamMember[];
  departments: string[];
}

export interface TeamMember {
  _id: string;
  userId: string;
  userName: string;
  department: string;
  position?: string;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  pendingAnnualLeave: number;
  remainingAnnualLeave: number;
  leaveRequests: LeaveRequest[];
}

// Dashboard Related Responses
export interface DashboardStatsResponse {
  totalUsers: number;
  activeUsers: number;
  byDepartment: {
    department: string;
    count: number;
  }[];
  byRole: {
    role: string;
    count: number;
  }[];
}

// File Upload Related Responses
export interface UploadHistoryResponse {
  history: UploadRecord[];
}

export interface UploadRecord {
  _id: string;
  uploadedAt: string;
  uploadedBy: string;
  fileCount: number;
  successCount: number;
  failureCount: number;
}

// Employee Match Response
export interface EmployeeMatchResponse {
  matches: {
    fileName: string;
    userId?: string;
    userName?: string;
    matched: boolean;
    error?: string;
  }[];
  availableUsers?: User[];
}

// Payslip Verification Response
export interface PayslipVerifyResponse {
  success: boolean;
  stats: {
    totalDbRecords: number;
    totalFiles: number;
    validUploads: number;
    missingFiles: number;
  };
  recentUploads: UploadRecord[];
}