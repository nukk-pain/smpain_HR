// =============================================================================
// 🔒 CONFIGURATION ENFORCEMENT HOOKS
// =============================================================================
// 이 Hook들을 사용하여 설정 사용을 강제합니다.

import { useMemo, useCallback } from 'react';
import { 
  LEAVE_CONFIG, 
  USER_ROLES, 
  UI_CONFIG, 
  DATE_CONFIG, 
  API_ENDPOINTS, 
  SUCCESS_MESSAGES, 
  ERROR_MESSAGES 
} from '@/config/constants';
import { 
  LeaveType, 
  LeaveStatus, 
  UserRole, 
  NotificationType,
  UseLeaveConfigReturn 
} from '@/types/config';

// =============================================================================
// 🎯 메인 설정 Hook
// =============================================================================

/**
 * 휴가 관련 설정을 반환하는 Hook
 * 하드코딩을 방지하고 중앙 설정을 강제합니다.
 */
export const useLeaveConfig = (): UseLeaveConfigReturn => {
  const getTypeLabel = useCallback((type: LeaveType): string => {
    const labels = {
      [LEAVE_CONFIG.TYPES.ANNUAL]: '연차',
      [LEAVE_CONFIG.TYPES.FAMILY]: '경조사',
      [LEAVE_CONFIG.TYPES.PERSONAL]: '개인휴가 (무급)',
    };
    return labels[type] || type;
  }, []);

  const getStatusLabel = useCallback((status: LeaveStatus): string => {
    const labels = {
      [LEAVE_CONFIG.STATUS.PENDING]: '대기중',
      [LEAVE_CONFIG.STATUS.APPROVED]: '승인됨',
      [LEAVE_CONFIG.STATUS.REJECTED]: '거부됨',
    };
    return labels[status] || status;
  }, []);

  const validateType = useCallback((type: string): type is LeaveType => {
    return Object.values(LEAVE_CONFIG.TYPES).includes(type as LeaveType);
  }, []);

  const validateStatus = useCallback((status: string): status is LeaveStatus => {
    return Object.values(LEAVE_CONFIG.STATUS).includes(status as LeaveStatus);
  }, []);

  return useMemo(() => ({
    types: LEAVE_CONFIG.TYPES,
    status: LEAVE_CONFIG.STATUS,
    businessRules: LEAVE_CONFIG.BUSINESS_RULES,
    getTypeLabel,
    getStatusLabel,
    validateType,
    validateStatus,
  }), [getTypeLabel, getStatusLabel, validateType, validateStatus]);
};

// =============================================================================
// 🎨 UI 설정 Hook
// =============================================================================

/**
 * UI 관련 설정을 반환하는 Hook
 */
export const useUIConfig = () => {
  const getNotificationDuration = useCallback((type: NotificationType): number => {
    switch (type) {
      case 'success':
        return UI_CONFIG.NOTIFICATION.SUCCESS_DURATION;
      case 'error':
        return UI_CONFIG.NOTIFICATION.ERROR_DURATION;
      default:
        return UI_CONFIG.NOTIFICATION.DEFAULT_DURATION;
    }
  }, []);

  const getPaginationConfig = useCallback(() => ({
    defaultPageSize: UI_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
    pageSizeOptions: UI_CONFIG.PAGINATION.PAGE_SIZE_OPTIONS,
  }), []);

  return useMemo(() => ({
    theme: UI_CONFIG.THEME,
    notification: UI_CONFIG.NOTIFICATION,
    pagination: UI_CONFIG.PAGINATION,
    getNotificationDuration,
    getPaginationConfig,
  }), [getNotificationDuration, getPaginationConfig]);
};

// =============================================================================
// 🌐 API 설정 Hook
// =============================================================================

/**
 * API 관련 설정을 반환하는 Hook
 */
export const useApiConfig = () => {
  const getEndpoint = useCallback((endpoint: keyof typeof API_ENDPOINTS) => {
    return API_ENDPOINTS[endpoint];
  }, []);

  const getLeaveEndpoint = useCallback((action: keyof typeof API_ENDPOINTS.LEAVE) => {
    return API_ENDPOINTS.LEAVE[action];
  }, []);

  const getUserEndpoint = useCallback((action: keyof typeof API_ENDPOINTS.USERS) => {
    return API_ENDPOINTS.USERS[action];
  }, []);

  return useMemo(() => ({
    endpoints: API_ENDPOINTS,
    getEndpoint,
    getLeaveEndpoint,
    getUserEndpoint,
  }), [getEndpoint, getLeaveEndpoint, getUserEndpoint]);
};

// =============================================================================
// 📅 날짜 설정 Hook
// =============================================================================

/**
 * 날짜 관련 설정을 반환하는 Hook
 */
export const useDateConfig = () => {
  const formatDate = useCallback((date: Date, format: keyof typeof DATE_CONFIG.FORMATS): string => {
    // 실제 구현에서는 date-fns format 함수 사용
    const formatString = DATE_CONFIG.FORMATS[format];
    return date.toISOString().split('T')[0]; // 간단한 예시
  }, []);

  const parseDate = useCallback((dateString: string): Date => {
    return new Date(dateString);
  }, []);

  return useMemo(() => ({
    formats: DATE_CONFIG.FORMATS,
    locale: DATE_CONFIG.LOCALE,
    formatDate,
    parseDate,
  }), [formatDate, parseDate]);
};

// =============================================================================
// 💬 메시지 설정 Hook
// =============================================================================

/**
 * 메시지 관련 설정을 반환하는 Hook
 */
export const useMessageConfig = () => {
  const getSuccessMessage = useCallback((action: keyof typeof SUCCESS_MESSAGES): string => {
    return SUCCESS_MESSAGES[action];
  }, []);

  const getErrorMessage = useCallback((error: keyof typeof ERROR_MESSAGES): string => {
    return ERROR_MESSAGES[error];
  }, []);

  return useMemo(() => ({
    success: SUCCESS_MESSAGES,
    error: ERROR_MESSAGES,
    getSuccessMessage,
    getErrorMessage,
  }), [getSuccessMessage, getErrorMessage]);
};

// =============================================================================
// 👤 사용자 설정 Hook
// =============================================================================

/**
 * 사용자 관련 설정을 반환하는 Hook
 */
export const useUserConfig = () => {
  const validateRole = useCallback((role: string): role is UserRole => {
    return Object.values(USER_ROLES).includes(role as UserRole);
  }, []);

  const getRoleLabel = useCallback((role: UserRole): string => {
    const labels = {
      [USER_ROLES.ADMIN]: '관리자',
      [USER_ROLES.MANAGER]: '매니저',
      [USER_ROLES.USER]: '사용자',
    };
    return labels[role] || role;
  }, []);

  const hasPermission = useCallback((userRole: UserRole, requiredRole: UserRole): boolean => {
    const roleHierarchy = {
      [USER_ROLES.ADMIN]: 3,
      [USER_ROLES.MANAGER]: 2,
      [USER_ROLES.USER]: 1,
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }, []);

  return useMemo(() => ({
    roles: USER_ROLES,
    validateRole,
    getRoleLabel,
    hasPermission,
  }), [validateRole, getRoleLabel, hasPermission]);
};

// =============================================================================
// 🔍 설정 검증 Hook
// =============================================================================

/**
 * 설정 검증을 수행하는 Hook
 */
export const useConfigValidation = () => {
  const validateLeaveRequest = useCallback((data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // 휴가 타입 검증
    if (!Object.values(LEAVE_CONFIG.TYPES).includes(data.leaveType)) {
      errors.push('유효하지 않은 휴가 타입입니다.');
    }
    
    // 날짜 검증
    if (!data.startDate || !data.endDate) {
      errors.push('시작일과 종료일을 입력해주세요.');
    }
    
    // 사유 검증
    if (!data.reason || data.reason.trim().length === 0) {
      errors.push('휴가 사유를 입력해주세요.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const validateUserRole = useCallback((role: string): { isValid: boolean; error?: string } => {
    const isValid = Object.values(USER_ROLES).includes(role as UserRole);
    return {
      isValid,
      error: isValid ? undefined : '유효하지 않은 사용자 역할입니다.',
    };
  }, []);

  return useMemo(() => ({
    validateLeaveRequest,
    validateUserRole,
  }), [validateLeaveRequest, validateUserRole]);
};

// =============================================================================
// 🎯 통합 설정 Hook (모든 설정 한 번에)
// =============================================================================

/**
 * 모든 설정을 한 번에 반환하는 Hook
 * 사용 시 필요한 설정만 구조분해할당으로 선택
 */
export const useConfig = () => {
  const leaveConfig = useLeaveConfig();
  const uiConfig = useUIConfig();
  const apiConfig = useApiConfig();
  const dateConfig = useDateConfig();
  const messageConfig = useMessageConfig();
  const userConfig = useUserConfig();
  const validationConfig = useConfigValidation();

  return useMemo(() => ({
    leave: leaveConfig,
    ui: uiConfig,
    api: apiConfig,
    date: dateConfig,
    message: messageConfig,
    user: userConfig,
    validation: validationConfig,
  }), [
    leaveConfig,
    uiConfig,
    apiConfig,
    dateConfig,
    messageConfig,
    userConfig,
    validationConfig,
  ]);
};

// =============================================================================
// 🎨 설정 기반 컴포넌트 생성 Hook
// =============================================================================

/**
 * 설정 기반 컴포넌트 Props를 생성하는 Hook
 */
export const useConfigProps = () => {
  const config = useConfig();

  const getLeaveSelectProps = useCallback(() => ({
    options: Object.entries(config.leave.types).map(([key, value]) => ({
      value,
      label: config.leave.getTypeLabel(value as LeaveType),
    })),
  }), [config.leave]);

  const getStatusChipProps = useCallback((status: LeaveStatus) => {
    const colorMap = {
      [LEAVE_CONFIG.STATUS.PENDING]: 'warning',
      [LEAVE_CONFIG.STATUS.APPROVED]: 'success',
      [LEAVE_CONFIG.STATUS.REJECTED]: 'error',
    } as const;

    return {
      color: colorMap[status],
      label: config.leave.getStatusLabel(status),
    };
  }, [config.leave]);

  const getNotificationProps = useCallback((type: NotificationType, message: string) => ({
    type,
    message,
    duration: config.ui.getNotificationDuration(type),
  }), [config.ui]);

  return useMemo(() => ({
    getLeaveSelectProps,
    getStatusChipProps,
    getNotificationProps,
  }), [getLeaveSelectProps, getStatusChipProps, getNotificationProps]);
};