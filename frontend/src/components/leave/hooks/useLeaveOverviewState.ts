import { useState, useMemo, useCallback } from 'react';
import { 
  FilterOptions, 
  SortOptions, 
  ViewMode,
  EmployeeLeaveOverview,
  TeamMember,
  DepartmentStats
} from '../../../types/leave';
import { 
  filterAndSortEmployees,
  getUniqueDepartments,
  filterTeamMembersByStatus,
  searchTeamMembers
} from '../../../utils/leaveFilters';
import {
  calculateStatistics,
  calculateRiskDistribution,
  calculateDepartmentStats
} from '../../../utils/leaveCalculations';

interface UseLeaveOverviewStateProps {
  initialViewMode?: ViewMode;
  userRole: 'admin' | 'supervisor';
}

export const useLeaveOverviewState = ({
  initialViewMode = 'overview',
  userRole
}: UseLeaveOverviewStateProps) => {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>(
    userRole === 'supervisor' && initialViewMode === 'overview' ? 'team' : initialViewMode
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [usageRangeFilter, setUsageRangeFilter] = useState<[number, number]>([0, 100]);
  
  // Sorting
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'name',
    direction: 'asc'
  });

  // Dialogs
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLeaveOverview | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);

  // Other state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  // Filter options object
  const filterOptions: FilterOptions = useMemo(() => ({
    department: selectedDepartment,
    riskLevel: selectedRiskLevel,
    searchTerm,
    usageRange: usageRangeFilter
  }), [selectedDepartment, selectedRiskLevel, searchTerm, usageRangeFilter]);

  // Process employees with filters and sorting
  const getProcessedEmployees = useCallback((employees: EmployeeLeaveOverview[]) => {
    return filterAndSortEmployees(employees, filterOptions, sortOptions);
  }, [filterOptions, sortOptions]);

  // Process team members with search
  const getProcessedTeamMembers = useCallback((members: TeamMember[]) => {
    let processed = [...members];
    if (searchTerm) {
      processed = searchTeamMembers(processed, searchTerm);
    }
    return processed;
  }, [searchTerm]);

  // Calculate statistics from filtered data
  const getStatistics = useCallback((employees: EmployeeLeaveOverview[]) => {
    const filtered = getProcessedEmployees(employees);
    return calculateStatistics(filtered);
  }, [getProcessedEmployees]);

  // Get risk distribution
  const getRiskDistribution = useCallback((employees: EmployeeLeaveOverview[]) => {
    const filtered = getProcessedEmployees(employees);
    return calculateRiskDistribution(filtered);
  }, [getProcessedEmployees]);

  // Get department statistics
  const getDepartmentStatistics = useCallback((employees: EmployeeLeaveOverview[]) => {
    return calculateDepartmentStats(employees);
  }, []);

  // Get unique departments from data
  const getDepartments = useCallback((employees: EmployeeLeaveOverview[]) => {
    return getUniqueDepartments(employees);
  }, []);

  // Toggle department expansion
  const toggleDepartmentExpansion = useCallback((department: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(department)) {
        newSet.delete(department);
      } else {
        newSet.add(department);
      }
      return newSet;
    });
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedRiskLevel('all');
    setUsageRangeFilter([0, 100]);
    setSortOptions({ field: 'name', direction: 'asc' });
  }, []);

  // Open employee detail dialog
  const openEmployeeDetail = useCallback((employee: EmployeeLeaveOverview) => {
    setSelectedEmployee(employee);
    setEmployeeDetailOpen(true);
  }, []);

  // Close employee detail dialog
  const closeEmployeeDetail = useCallback(() => {
    setSelectedEmployee(null);
    setEmployeeDetailOpen(false);
  }, []);

  // Open adjustment dialog
  const openAdjustmentDialog = useCallback((employee: EmployeeLeaveOverview) => {
    setSelectedEmployee(employee);
    setAdjustmentDialogOpen(true);
  }, []);

  // Close adjustment dialog
  const closeAdjustmentDialog = useCallback(() => {
    setSelectedEmployee(null);
    setAdjustmentDialogOpen(false);
  }, []);

  // Toggle analytics dialog
  const toggleAnalyticsDialog = useCallback(() => {
    setAnalyticsDialogOpen(prev => !prev);
  }, []);

  // Change view mode
  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    resetFilters();
  }, [resetFilters]);

  // Update sort options
  const updateSort = useCallback((field: SortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  return {
    // State
    viewMode,
    searchTerm,
    selectedDepartment,
    selectedRiskLevel,
    usageRangeFilter,
    sortOptions,
    selectedEmployee,
    detailDialogOpen,
    adjustmentDialogOpen,
    analyticsDialogOpen,
    employeeDetailOpen,
    selectedYear,
    expandedDepartments,
    filterOptions,

    // Setters
    setViewMode: changeViewMode,
    setSearchTerm,
    setSelectedDepartment,
    setSelectedRiskLevel,
    setUsageRangeFilter,
    setSortOptions,
    setSelectedEmployee,
    setDetailDialogOpen,
    setAdjustmentDialogOpen,
    setAnalyticsDialogOpen,
    setEmployeeDetailOpen,
    setSelectedYear,

    // Actions
    getProcessedEmployees,
    getProcessedTeamMembers,
    getStatistics,
    getRiskDistribution,
    getDepartmentStatistics,
    getDepartments,
    toggleDepartmentExpansion,
    resetFilters,
    openEmployeeDetail,
    closeEmployeeDetail,
    openAdjustmentDialog,
    closeAdjustmentDialog,
    toggleAnalyticsDialog,
    updateSort
  };
};