// Types for UnifiedLeaveOverview component and related functionality

export interface UnifiedLeaveOverviewProps {
  userRole: 'admin' | 'supervisor';
  initialViewMode?: 'overview' | 'team' | 'department';
}

export interface EmployeeLeaveOverview {
  id: string;
  name: string;
  department: string;
  position: string;
  annual: number;
  used: number;
  remaining: number;
  pending: number;
  carryOver: number;
  usageRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface LeaveOverviewData {
  employees: EmployeeLeaveOverview[];
  statistics: {
    totalEmployees: number;
    averageUsage: number;
    highRiskCount: number;
    pendingRequests: number;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string;
  leaveBalance: {
    annual: number;
    used: number;
    remaining: number;
    pending: number;
    carryOver?: number;
  };
  recentLeaves?: Array<{
    type: string;
    startDate: string;
    endDate: string;
    status: string;
    days: number;
  }>;
}

export interface DepartmentStats {
  departmentName: string;
  totalEmployees: number;
  averageUsage: number;
  totalUsed: number;
  totalRemaining: number;
}

export type ViewMode = 'overview' | 'team' | 'department';

export type LeaveType = 
  | 'annual'
  | 'sick'
  | 'personal'
  | 'maternity'
  | 'paternity'
  | 'other';

export type LeaveStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface LeaveRecord {
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  reason?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface FilterOptions {
  searchTerm: string;
  selectedDepartment: string;
  selectedYear: number;
  sortBy: string;
}

export interface Statistics {
  totalEmployees: number;
  averageUsageRate: number;
  highRiskEmployees: number;
  pendingRequests: number;
}