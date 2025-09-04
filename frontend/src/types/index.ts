// User and Authentication Types
export type UserRole = 'admin' | 'manager' | 'supervisor' | 'user';

export interface User {
  _id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  hireDate?: string;
  department?: string;
  position?: string;
  employeeId?: string;
  accountNumber?: string;
  supervisorId?: string;
  contractType?: 'regular' | 'contract';
  terminationDate?: string;
  baseSalary?: number;
  incentiveFormula?: string;
  birthDate?: string;
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  permissions?: string[];
  visibleTeams?: {
    departmentId: string;
    departmentName: string;
  }[];
  
  // Calculated fields
  yearsOfService?: number;
  annualLeave?: number;
  hireDateFormatted?: string;
  terminationDateFormatted?: string;
  manager?: {
    _id: string;
    name: string;
    position: string;
    department: string;
  };
  subordinates?: {
    _id: string;
    name: string;
    position: string;
    department: string;
  }[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token?: string;
}

// Leave Management Types
export interface LeaveLog {
  id: number;
  user_id: number;
  username: string;
  start_date?: string;
  days_used: number;
  timestamp: string;
  modified: boolean;
  original_log_id?: number;
  cancelled: boolean;
  registered_by: string;
  reason: string;
}

export interface LeaveRequest {
  _id: string;
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  leaveType: 'annual' | 'sick' | 'personal' | 'family';
  startDate: string;
  endDate: string;
  daysCount: number;
  personalOffDays?: string[]; // Array of YYYY-MM-DD format dates
  actualLeaveDays?: number; // Actual leave days excluding personal off days
  reason: string;
  substituteEmployee?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalComment?: string;
  createdAt: string;
  updatedAt: string;
  
  // Cancellation fields
  cancellationRequested?: boolean;
  cancellationRequestedAt?: string;
  cancellationReason?: string;
  cancellationStatus?: 'pending' | 'approved' | 'rejected';
  cancellationApprovedBy?: string;
  cancellationApprovedByName?: string;
  cancellationApprovedAt?: string;
  cancellationComment?: string;
}

export interface LeaveBalance {
  userId: string;
  year: number;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  pendingAnnualLeave: number;
  remainingAnnualLeave: number;
  carryOverFromPreviousYear: number;
  breakdown: {
    annual: { total: number; used: number; remaining: number };
    sick: { total: number; used: number; remaining: number };
    personal: { total: number; used: number; remaining: number };
    family: { total: number; used: number; remaining: number };
  };
}

// Payroll Management Types
export interface MonthlyPayment {
  id: number;
  employee_id: number;
  year_month: string;
  base_salary: number;
  incentive: number;
  bonus_total: number;
  award_total: number;
  input_total: number;
  actual_payment?: number;
  difference?: number;
  created_at: string;
  updated_at: string;
  employee?: User;
}

export interface Bonus {
  id: number;
  employee_id: number;
  date: string;
  amount: number;
  bonus_type: 'bonus' | 'award';
  memo?: string;
  year_month: string;
  created_at: string;
  created_by: string;
  employee?: User;
}

export interface SalesData {
  id: number;
  employee_id: number;
  year_month: string;
  sales_amount: number;
  created_at: string;
  updated_at: string;
  employee?: User;
}

export interface PayrollUpload {
  id: number;
  filename: string;
  year_month: string;
  upload_date: string;
  uploaded_by: string;
  file_path: string;
  status: 'pending' | 'processed' | 'error';
  error_message?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  error?: string;
  permissions?: string[];
}

// Authentication specific response type
export interface AuthResponse {
  authenticated: boolean;
  user?: User;
  success?: boolean;
  message?: string;
  token?: string; // JWT token for legacy login response
  accessToken?: string; // Phase 4 access token
  refreshToken?: string; // Phase 4 refresh token
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Form Types
export interface LoginForm {
  username: string;
  password: string;
}

export interface PayrollForm {
  employee_id: number;
  year_month: string;
  base_salary: number;
}

export interface SalesForm {
  employee_id: number;
  year_month: string;
  sales_amount: number;
}

export interface BonusForm {
  employee_id: number;
  date: string;
  amount: number;
  bonus_type: 'bonus' | 'award';
  memo?: string;
}

export interface UserForm {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  hireDate?: string;
  department?: string;
  position?: string;
  employeeId?: string;
  accountNumber?: string;
  supervisorId?: string;
  contractType?: 'regular' | 'contract';
  baseSalary?: number;
  incentiveFormula?: string;
  birthDate?: string;
  phoneNumber?: string;
  visibleTeams?: {
    departmentId: string;
    departmentName: string;
  }[];
}

export interface LeaveForm {
  leaveType: 'annual' | 'sick' | 'personal' | 'family';
  startDate: string;
  endDate: string;
  reason: string;
  substituteEmployee?: string;
  personalOffDays?: string[]; // Array of YYYY-MM-DD format dates
}

export interface LeaveApprovalForm {
  action: 'approve' | 'reject';
  comment?: string;
}

// Dashboard Types
export interface DashboardStats {
  total_employees: number;
  total_payroll: number;
  pending_uploads: number;
  current_month: string;
}

export interface PayrollStats {
  base_salary_total: number;
  incentive_total: number;
  bonus_total: number;
  award_total: number;
  grand_total: number;
  employee_count: number;
}

// Grid Types (for AG Grid)
export interface GridOptions {
  columnDefs: any[];
  rowData: any[];
  defaultColDef?: any;
  pagination?: boolean;
  paginationPageSize?: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// Department Types
export interface Department {
  _id: string;
  name: string;
  description?: string;
  supervisorId?: string;
  employeeCount: number;
  positions: string[];
  managers: {
    name: string;
    id: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentEmployees {
  department: string;
  employees: User[];
  summary: {
    totalEmployees: number;
    managers: number;
    regular: number;
    contract: number;
  };
}

export interface OrganizationChart {
  organizationTree: User[];
  departments: { [key: string]: User[] };
  summary: {
    totalEmployees: number;
    totalDepartments: number;
    managersCount: number;
    adminCount: number;
  };
}

export interface EmploymentInfo {
  employee: {
    id: string;
    name: string;
    employeeId: string;
    department: string;
    position: string;
    contractType: string;
  };
  employment: {
    hireDate: string;
    yearsOfService: number;
    monthsOfService: number;
    terminationDate?: string;
    isActive: boolean;
  };
  leave: {
    annualLeaveEntitlement: number;
    usedLeave: number;
    remainingLeave: number;
    currentYear: number;
  };
  payroll: {
    avgBaseSalary: number;
    avgIncentive: number;
    avgBonus: number;
    avgAward: number;
    avgTotal: number;
    totalMonths: number;
  } | null;
}

// Position Types
export interface Position {
  _id: string;
  title: string;
  name: string; // Alias for title for backward compatibility
  description?: string;
  department?: string;
  responsibilities?: string[];
  requirements?: string[];
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
