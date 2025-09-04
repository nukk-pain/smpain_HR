// Utility functions for UnifiedLeaveOverview

import { LeaveStatus, LeaveType } from '@/types/UnifiedLeaveOverviewTypes';

export const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'error';
    default: return 'default';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'approved': return '승인';
    case 'pending': return '대기';
    case 'rejected': return '반려';
    case 'cancelled': return '취소';
    default: return status;
  }
};

export const getLeaveTypeLabel = (type: string): string => {
  switch (type) {
    case 'annual': return '연차';
    case 'sick': return '병가';
    case 'personal': return '경조사';
    case 'maternity': return '출산휴가';
    case 'paternity': return '배우자출산휴가';
    case 'other': return '기타';
    default: return type;
  }
};

export const getLeaveUsageColor = (percentage: number): string => {
  if (percentage >= 80) return '#f44336'; // Red
  if (percentage >= 60) return '#ff9800'; // Orange
  return '#4caf50'; // Green
};

export const calculateRiskLevel = (usageRate: number): 'low' | 'medium' | 'high' => {
  if (usageRate >= 80) return 'high';
  if (usageRate >= 60) return 'medium';
  return 'low';
};

export const formatLeaveBalance = (used: number, total: number): string => {
  return `${used} / ${total}일`;
};

export const calculateUsagePercentage = (used: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
};

export const getRiskLevelColor = (level: 'low' | 'medium' | 'high'): string => {
  switch (level) {
    case 'high': return '#f44336';
    case 'medium': return '#ff9800';
    case 'low': return '#4caf50';
    default: return '#9e9e9e';
  }
};

export const getRiskLevelLabel = (level: 'low' | 'medium' | 'high'): string => {
  switch (level) {
    case 'high': return '높음';
    case 'medium': return '중간';
    case 'low': return '낮음';
    default: return '알 수 없음';
  }
};

export const sortEmployees = (employees: any[], sortBy: string): any[] => {
  const sorted = [...employees];
  
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'department':
      return sorted.sort((a, b) => a.department.localeCompare(b.department));
    case 'usage':
      return sorted.sort((a, b) => b.usageRate - a.usageRate);
    case 'remaining':
      return sorted.sort((a, b) => a.remaining - b.remaining);
    default:
      return sorted;
  }
};

export const filterEmployees = (
  employees: any[],
  searchTerm: string,
  selectedDepartment: string
): any[] => {
  return employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      employee.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });
};