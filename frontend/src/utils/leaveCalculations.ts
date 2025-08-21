/*
 * AI-HEADER
 * Intent: Utility functions for leave calculations and validations
 * Domain Meaning: Business logic for leave day calculations and rules
 * Misleading Names: None
 * Data Contracts: Works with date strings and leave request data
 * PII: None - calculation utilities only
 * Invariants: Saturday counts as 0.5 days, Sunday not counted
 * RAG Keywords: leave, calculation, days, validation, business, rules
 * DuplicatePolicy: canonical
 * FunctionIdentity: leave-calculation-utility-functions
 */

import { format, parseISO, differenceInDays, isWeekend, isSaturday, isSunday } from 'date-fns';

/**
 * Calculate the number of leave days between two dates
 * Business rules:
 * - Weekdays count as 1 day
 * - Saturday counts as 0.5 day
 * - Sunday is not counted
 * - Personal off days are excluded
 */
export const calculateLeaveDays = (
  startDate: string,
  endDate: string,
  personalOffDays: string[] = []
): number => {
  if (!startDate || !endDate) return 0;
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  let days = 0;
  let current = new Date(start);
  
  while (current <= end) {
    const dateStr = format(current, 'yyyy-MM-dd');
    
    // Skip if it's a personal off day
    if (personalOffDays.includes(dateStr)) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    
    // Calculate based on day of week
    if (isSunday(current)) {
      // Sunday doesn't count
      days += 0;
    } else if (isSaturday(current)) {
      // Saturday counts as 0.5
      days += 0.5;
    } else {
      // Weekday counts as 1
      days += 1;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return days;
};

/**
 * Generate date range array between two dates
 */
export const generateDateRange = (startDate: string, endDate: string): string[] => {
  if (!startDate || !endDate) return [];
  
  const dates: string[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  let current = new Date(start);
  
  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * Validate leave request dates
 */
export const validateLeaveDates = (
  startDate: string,
  endDate: string,
  existingRequests: any[] = []
): { valid: boolean; error?: string } => {
  if (!startDate || !endDate) {
    return { valid: false, error: '시작일과 종료일을 선택해주세요.' };
  }
  
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if start date is in the past
  if (start < today) {
    return { valid: false, error: '과거 날짜는 신청할 수 없습니다.' };
  }
  
  // Check if end date is before start date
  if (end < start) {
    return { valid: false, error: '종료일이 시작일보다 빠를 수 없습니다.' };
  }
  
  // Check for date overlap with existing requests
  for (const request of existingRequests) {
    if (request.status === 'cancelled' || request.status === 'rejected') {
      continue;
    }
    
    const reqStart = parseISO(request.startDate);
    const reqEnd = parseISO(request.endDate);
    
    // Check for overlap
    if (
      (start >= reqStart && start <= reqEnd) ||
      (end >= reqStart && end <= reqEnd) ||
      (start <= reqStart && end >= reqEnd)
    ) {
      return { 
        valid: false, 
        error: `${format(reqStart, 'MM/dd')} - ${format(reqEnd, 'MM/dd')} 기간과 중복됩니다.` 
      };
    }
  }
  
  return { valid: true };
};

/**
 * Calculate remaining leave balance after a request
 */
export const calculateRemainingBalance = (
  currentBalance: number,
  requestDays: number,
  allowNegative: boolean = true,
  maxNegative: number = 3
): { canRequest: boolean; remainingAfter: number; warning?: string } => {
  const remainingAfter = currentBalance - requestDays;
  
  if (remainingAfter < 0 && !allowNegative) {
    return {
      canRequest: false,
      remainingAfter,
      warning: '잔여 연차가 부족합니다.'
    };
  }
  
  if (remainingAfter < -maxNegative) {
    return {
      canRequest: false,
      remainingAfter,
      warning: `최대 ${maxNegative}일까지만 선차감 가능합니다.`
    };
  }
  
  if (remainingAfter < 0) {
    return {
      canRequest: true,
      remainingAfter,
      warning: `승인 시 ${Math.abs(remainingAfter)}일 선차감됩니다.`
    };
  }
  
  return {
    canRequest: true,
    remainingAfter
  };
};

/**
 * Get leave type color based on type
 */
export const getLeaveTypeColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'annual':
    case '연차':
      return 'primary';
    case 'sick':
    case '병가':
      return 'error';
    case 'personal':
    case '개인':
      return 'warning';
    case 'other':
    case '기타':
      return 'default';
    default:
      return 'default';
  }
};

/**
 * Format leave request summary
 */
export const formatLeaveRequestSummary = (request: any): string => {
  const days = calculateLeaveDays(request.startDate, request.endDate, request.personalOffDays);
  const start = format(parseISO(request.startDate), 'MM/dd');
  const end = format(parseISO(request.endDate), 'MM/dd');
  const dateRange = start === end ? start : `${start} - ${end}`;
  
  return `${request.leaveType} ${dateRange} (${days}일)`;
};

/**
 * Check if leave request needs higher approval
 */
export const needsHigherApproval = (days: number, threshold: number = 5): boolean => {
  return days > threshold;
};

/**
 * Calculate annual leave entitlement based on years of service
 */
export const calculateAnnualLeaveEntitlement = (
  hireDate: string,
  currentYear: number = new Date().getFullYear()
): number => {
  const hire = parseISO(hireDate);
  const yearEnd = new Date(currentYear, 11, 31);
  const yearsOfService = Math.floor(differenceInDays(yearEnd, hire) / 365);
  
  if (yearsOfService < 1) {
    // First year: monthly accrual (max 11 days)
    const monthsWorked = Math.min(12, Math.floor(differenceInDays(yearEnd, hire) / 30));
    return Math.min(11, monthsWorked);
  } else {
    // After first year: 15 + (years - 1), capped at 25
    return Math.min(25, 15 + (yearsOfService - 1));
  }
};