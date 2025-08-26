import { EmployeeLeaveOverview, FilterOptions, SortOptions, TeamMember } from '../types/leave';

// Filter employees by department
export const filterEmployeesByDepartment = (
  employees: EmployeeLeaveOverview[],
  department: string
): EmployeeLeaveOverview[] => {
  if (!department || department === 'all') return employees;
  return employees.filter(emp => emp.department === department);
};

// Filter employees by search term
export const filterEmployeesBySearchTerm = (
  employees: EmployeeLeaveOverview[],
  searchTerm: string
): EmployeeLeaveOverview[] => {
  if (!searchTerm) return employees;
  
  const term = searchTerm.toLowerCase();
  return employees.filter(emp => 
    emp.name.toLowerCase().includes(term) ||
    emp.department.toLowerCase().includes(term) ||
    emp.position?.toLowerCase().includes(term)
  );
};

// Filter employees by risk level
export const filterEmployeesByRiskLevel = (
  employees: EmployeeLeaveOverview[],
  riskLevel: 'all' | 'low' | 'medium' | 'high'
): EmployeeLeaveOverview[] => {
  if (riskLevel === 'all') return employees;
  return employees.filter(emp => emp.riskLevel === riskLevel);
};

// Filter employees by usage range
export const filterEmployeesByUsageRange = (
  employees: EmployeeLeaveOverview[],
  minUsage: number,
  maxUsage: number
): EmployeeLeaveOverview[] => {
  return employees.filter(emp => 
    emp.usageRate >= minUsage && emp.usageRate <= maxUsage
  );
};

// Combined filter function
export const filterEmployees = (
  employees: EmployeeLeaveOverview[],
  filters: FilterOptions
): EmployeeLeaveOverview[] => {
  let filtered = [...employees];
  
  if (filters.department) {
    filtered = filterEmployeesByDepartment(filtered, filters.department);
  }
  
  if (filters.searchTerm) {
    filtered = filterEmployeesBySearchTerm(filtered, filters.searchTerm);
  }
  
  if (filters.riskLevel && filters.riskLevel !== 'all') {
    filtered = filterEmployeesByRiskLevel(filtered, filters.riskLevel);
  }
  
  if (filters.usageRange) {
    filtered = filterEmployeesByUsageRange(
      filtered, 
      filters.usageRange[0], 
      filters.usageRange[1]
    );
  }
  
  return filtered;
};

// Sort employees
export const sortEmployees = (
  employees: EmployeeLeaveOverview[],
  sortOptions: SortOptions
): EmployeeLeaveOverview[] => {
  const sorted = [...employees];
  const { field, direction } = sortOptions;
  const multiplier = direction === 'asc' ? 1 : -1;
  
  sorted.sort((a, b) => {
    switch (field) {
      case 'name':
        return a.name.localeCompare(b.name) * multiplier;
      case 'department':
        return a.department.localeCompare(b.department) * multiplier;
      case 'usageRate':
        return (a.usageRate - b.usageRate) * multiplier;
      case 'remainingLeave':
        return (a.remainingAnnualLeave - b.remainingAnnualLeave) * multiplier;
      default:
        return 0;
    }
  });
  
  return sorted;
};

// Filter and sort combined
export const filterAndSortEmployees = (
  employees: EmployeeLeaveOverview[],
  filters: FilterOptions,
  sortOptions: SortOptions
): EmployeeLeaveOverview[] => {
  const filtered = filterEmployees(employees, filters);
  return sortEmployees(filtered, sortOptions);
};

// Get unique departments
export const getUniqueDepartments = (employees: EmployeeLeaveOverview[]): string[] => {
  const departments = new Set<string>();
  employees.forEach(emp => departments.add(emp.department));
  return Array.from(departments).sort();
};

// Filter team members by status
export const filterTeamMembersByStatus = (
  members: TeamMember[],
  status: string
): TeamMember[] => {
  if (!status || status === 'all') return members;
  return members.filter(member => member.currentStatus === status);
};

// Search team members
export const searchTeamMembers = (
  members: TeamMember[],
  searchTerm: string
): TeamMember[] => {
  if (!searchTerm) return members;
  
  const term = searchTerm.toLowerCase();
  return members.filter(member =>
    member.name.toLowerCase().includes(term) ||
    member.position?.toLowerCase().includes(term) ||
    member.department?.toLowerCase().includes(term)
  );
};

// Get employees with pending requests
export const getEmployeesWithPendingRequests = (
  employees: EmployeeLeaveOverview[]
): EmployeeLeaveOverview[] => {
  return employees.filter(emp => emp.pendingAnnualLeave > 0);
};

// Get high risk employees
export const getHighRiskEmployees = (
  employees: EmployeeLeaveOverview[]
): EmployeeLeaveOverview[] => {
  return employees.filter(emp => emp.riskLevel === 'high');
};

// Get leave label translations
export const getLeaveTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'annual': '연차',
    'half': '반차',
    'sick': '병가',
    'special': '특별휴가',
    'unpaid': '무급휴가',
    'maternity': '출산휴가',
    'paternity': '육아휴직',
    'personal': '개인사유',
    'other': '기타'
  };
  return labels[type] || type;
};

// Get status label translations
export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending': '대기중',
    'approved': '승인됨',
    'rejected': '거부됨',
    'cancelled': '취소됨',
    'on_leave': '휴가중',
    'available': '근무중'
  };
  return labels[status] || status;
};