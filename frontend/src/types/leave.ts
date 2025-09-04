// Leave Overview Types
export interface UnifiedLeaveOverviewProps {
  userRole: 'admin' | 'supervisor';
  initialViewMode?: 'overview' | 'team' | 'department';
}

export interface EmployeeLeaveOverview {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  pendingAnnualLeave: number;
  remainingAnnualLeave: number;
  usageRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface LeaveOverviewData {
  summary: {
    totalEmployees: number;
    averageUsageRate: number;
    highRiskCount: number;
    pendingRequests: number;
  };
  employees: EmployeeLeaveOverview[];
  departments: string[];
  lastUpdated: string;
}

export interface TeamMember {
  _id: string;
  name: string;
  position: string;
  department: string;
  leaveBalance: {
    annual: number;
    used: number;
    remaining: number;
    pending: number;
  };
  currentStatus: string;
  recentLeaves: Array<{
    type: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
}

export interface DepartmentStats {
  department: string;
  totalMembers: number;
  onLeave: number;
  avgLeaveUsage: number;
  pendingRequests: number;
}

// Filter and Sort Options
export interface FilterOptions {
  department?: string;
  riskLevel?: 'all' | 'low' | 'medium' | 'high';
  searchTerm?: string;
  usageRange?: [number, number];
}

export interface SortOptions {
  field: 'name' | 'department' | 'usageRate' | 'remainingLeave';
  direction: 'asc' | 'desc';
}

// View Mode Types
export type ViewMode = 'overview' | 'team' | 'department';

// Employee Detail Types
export interface EmployeeDetail {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  joinDate: string;
  leaveHistory: LeaveHistoryItem[];
}

export interface LeaveHistoryItem {
  id: string;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate: string;
  endDate: string;
  days: number;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled';
  reason?: string;
  approvedBy?: string;
  approvedDate?: string;
  comments?: string;
}

// Analytics Types
export interface LeaveAnalytics {
  monthlyUsage: Array<{
    month: string;
    usage: number;
    headcount: number;
  }>;
  departmentComparison: Array<{
    department: string;
    avgUsage: number;
    totalEmployees: number;
  }>;
  leaveTypeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  usageTrends: Array<{
    date: string;
    value: number;
  }>;
}

// Adjustment Types
export interface LeaveAdjustment {
  employeeId: string;
  adjustmentType: 'add' | 'deduct';
  amount: number;
  reason: string;
  effectiveDate: string;
}

// API Response Types
export interface LeaveOverviewResponse {
  success: boolean;
  data: LeaveOverviewData;
  message?: string;
}

export interface TeamStatusResponse {
  success: boolean;
  data: TeamMember[];
  message?: string;
}

export interface DepartmentStatsResponse {
  success: boolean;
  data: DepartmentStats[];
  message?: string;
}