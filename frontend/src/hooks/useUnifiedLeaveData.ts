import { useState, useMemo, useCallback } from 'react';
import { 
  useLeaveOverview, 
  useTeamStatus, 
  useDepartmentStats,
  useLeaveAdjustment,
  usePrefetchLeaveData 
} from '@/hooks/useLeaveQueries';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/hooks/useAuth';
import { 
  EmployeeLeaveOverview, 
  TeamMember, 
  DepartmentStats,
  ViewMode,
  FilterOptions
} from '@/types/UnifiedLeaveOverviewTypes';
import { filterEmployees, sortEmployees } from '@/utils/leaveOverviewUtils';

interface UseUnifiedLeaveDataProps {
  userRole: 'admin' | 'supervisor';
  initialViewMode?: ViewMode;
}

export const useUnifiedLeaveData = ({ 
  userRole, 
  initialViewMode = 'overview' 
}: UseUnifiedLeaveDataProps) => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>(
    userRole === 'supervisor' && initialViewMode === 'overview' ? 'team' : initialViewMode
  );
  
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    selectedDepartment: 'all',
    selectedYear: currentYear,
    sortBy: 'name'
  });

  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);

  // Data fetching hooks
  const { 
    data: overviewResponse, 
    isLoading: overviewLoading, 
    refetch: refetchOverview 
  } = useLeaveOverview(
    filters.selectedYear,
    userRole === 'admin' && viewMode === 'overview'
  );

  const { 
    data: teamResponse, 
    isLoading: teamLoading, 
    refetch: refetchTeam 
  } = useTeamStatus(
    user?.department || '',
    filters.selectedYear,
    viewMode === 'team'
  );

  const { 
    data: departmentStatsResponse, 
    isLoading: departmentStatsLoading, 
    refetch: refetchDepartmentStats 
  } = useDepartmentStats(
    filters.selectedYear,
    viewMode === 'department'
  );

  const { data: departmentsData } = useDepartments();
  const adjustmentMutation = useLeaveAdjustment();
  const { prefetchOverview, prefetchTeamStatus } = usePrefetchLeaveData();

  // Data processing
  const processedData = useMemo(() => {
    let employees: EmployeeLeaveOverview[] = [];
    let teamMembers: TeamMember[] = [];
    let departmentStats: DepartmentStats[] = [];

    if (viewMode === 'overview' && overviewResponse?.data) {
      employees = overviewResponse.data.employees || [];
    } else if (viewMode === 'team' && teamResponse?.data) {
      teamMembers = teamResponse.data.members || [];
      // Convert team members to employee overview format for unified handling
      employees = teamMembers.map(member => ({
        id: member.id,
        name: member.name,
        department: member.department,
        position: member.position,
        annual: member.leaveBalance.annual,
        used: member.leaveBalance.used,
        remaining: member.leaveBalance.remaining,
        pending: member.leaveBalance.pending,
        carryOver: member.leaveBalance.carryOver || 0,
        usageRate: Math.round((member.leaveBalance.used / member.leaveBalance.annual) * 100),
        riskLevel: member.leaveBalance.remaining <= 5 ? 'high' : 
                   member.leaveBalance.remaining <= 10 ? 'medium' : 'low'
      }));
    } else if (viewMode === 'department' && departmentStatsResponse?.data) {
      departmentStats = departmentStatsResponse.data.departments || [];
    }

    // Apply filters and sorting
    let filtered = filterEmployees(employees, filters.searchTerm, filters.selectedDepartment);
    filtered = sortEmployees(filtered, filters.sortBy);

    return {
      employees: filtered,
      teamMembers,
      departmentStats,
      totalCount: employees.length,
      filteredCount: filtered.length
    };
  }, [
    viewMode, 
    overviewResponse, 
    teamResponse, 
    departmentStatsResponse,
    filters
  ]);

  // Statistics calculation
  const statistics = useMemo(() => {
    const { employees } = processedData;
    
    if (employees.length === 0) {
      return {
        totalEmployees: 0,
        averageUsageRate: 0,
        highRiskEmployees: 0,
        pendingRequests: 0
      };
    }

    const totalUsageRate = employees.reduce((sum, emp) => sum + emp.usageRate, 0);
    const highRiskCount = employees.filter(emp => emp.riskLevel === 'high').length;
    const pendingCount = employees.reduce((sum, emp) => sum + emp.pending, 0);

    return {
      totalEmployees: employees.length,
      averageUsageRate: Math.round(totalUsageRate / employees.length),
      highRiskEmployees: highRiskCount,
      pendingRequests: pendingCount
    };
  }, [processedData]);

  // Handlers
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
    // Prefetch data for the new mode
    if (newMode === 'overview') {
      prefetchOverview(filters.selectedYear);
    } else if (newMode === 'team' && user?.department) {
      prefetchTeamStatus(user.department, filters.selectedYear);
    }
  }, [filters.selectedYear, user?.department, prefetchOverview, prefetchTeamStatus]);

  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleViewDetail = useCallback((employee: any) => {
    setSelectedEmployee(employee);
    setDetailDialogOpen(true);
  }, []);

  const handleAdjustLeave = useCallback((employeeId: string, employeeName: string) => {
    setSelectedEmployee({ id: employeeId, name: employeeName });
    setAdjustmentDialogOpen(true);
  }, []);

  const refetchData = useCallback(() => {
    if (viewMode === 'overview') {
      refetchOverview();
    } else if (viewMode === 'team') {
      refetchTeam();
    } else if (viewMode === 'department') {
      refetchDepartmentStats();
    }
  }, [viewMode, refetchOverview, refetchTeam, refetchDepartmentStats]);

  return {
    // Data
    processedData,
    statistics,
    departments: departmentsData?.departments || [],
    
    // State
    viewMode,
    filters,
    selectedEmployee,
    detailDialogOpen,
    adjustmentDialogOpen,
    
    // Loading states
    isLoading: overviewLoading || teamLoading || departmentStatsLoading,
    
    // Handlers
    handleViewModeChange,
    handleFilterChange,
    handleViewDetail,
    handleAdjustLeave,
    setDetailDialogOpen,
    setAdjustmentDialogOpen,
    refetchData,
    
    // Mutations
    adjustmentMutation
  };
};