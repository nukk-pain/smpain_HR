// =============================================================================
// 🔒 TYPE-SAFE CONFIGURATION TYPES
// =============================================================================
// 이 파일의 타입들을 사용하여 설정 사용을 강제합니다.

import { 
  LEAVE_CONFIG, 
  USER_ROLES, 
  DATE_CONFIG
} from '@/config/constants';

// =============================================================================
// 🎯 설정 기반 타입 생성 (자동으로 설정과 동기화)
// =============================================================================

// 휴가 관련 타입 (상수에서 자동 생성)
export type LeaveType = typeof LEAVE_CONFIG.TYPES[keyof typeof LEAVE_CONFIG.TYPES];
export type LeaveStatus = typeof LEAVE_CONFIG.STATUS[keyof typeof LEAVE_CONFIG.STATUS];

// 사용자 역할 타입
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// 알림 타입
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 날짜 형식 타입
export type DateFormat = typeof DATE_CONFIG.FORMATS[keyof typeof DATE_CONFIG.FORMATS];

// =============================================================================
// 🛡️ 설정 강제 유틸리티 타입들
// =============================================================================

// 1. 오직 설정 파일의 값만 허용하는 타입
export type StrictLeaveType = LeaveType; // 'annual' | 'sick' | 'personal' | 'family'
export type StrictLeaveStatus = LeaveStatus; // 'pending' | 'approved' | 'rejected'
export type StrictUserRole = UserRole; // 'admin' | 'manager' | 'user'

// 2. API 엔드포인트 타입 (자동 생성)
export type ApiEndpoint = string;

// 3. 설정 검증 함수 타입
export type ConfigValidator<T> = (value: unknown) => value is T;

// =============================================================================
// 🔍 설정 검증 함수들
// =============================================================================

// 휴가 타입 검증
export const isValidLeaveType: ConfigValidator<LeaveType> = (value): value is LeaveType => {
  return Object.values(LEAVE_CONFIG.TYPES).includes(value as LeaveType);
};

// 휴가 상태 검증
export const isValidLeaveStatus: ConfigValidator<LeaveStatus> = (value): value is LeaveStatus => {
  return Object.values(LEAVE_CONFIG.STATUS).includes(value as LeaveStatus);
};

// 사용자 역할 검증
export const isValidUserRole: ConfigValidator<UserRole> = (value): value is UserRole => {
  return Object.values(USER_ROLES).includes(value as UserRole);
};

// =============================================================================
// 🎨 UI 컴포넌트 Props 타입 (설정 강제)
// =============================================================================

// 휴가 관련 Props
export interface LeaveFormProps {
  leaveType: StrictLeaveType;
  status: StrictLeaveStatus;
  onSubmit: (data: LeaveFormData) => void;
}

export interface LeaveFormData {
  leaveType: StrictLeaveType;
  startDate: string; // DATE_CONFIG.FORMATS.API 형식
  endDate: string;   // DATE_CONFIG.FORMATS.API 형식
  reason: string;
  substituteEmployee?: string;
}

// 사용자 관련 Props
export interface UserProps {
  role: StrictUserRole;
  permissions: UserPermissions;
}

export interface UserPermissions {
  canApprove: boolean;
  canManage: boolean;
  canView: boolean;
}

// 알림 관련 Props
export interface NotificationProps {
  type: NotificationType;
  message: string;
  duration?: number; // UI_CONFIG.NOTIFICATION 값 사용
}

// =============================================================================
// 🔧 설정 사용 강제 데코레이터 (고급)
// =============================================================================

// 설정 사용을 강제하는 데코레이터
export function RequireConfig<T extends keyof typeof LEAVE_CONFIG>(
  configKey: T
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // 설정 사용 검증 로직
      const config = LEAVE_CONFIG[configKey];
      if (!config) {
        throw new Error(`Configuration ${configKey} not found. Please use @/config/constants.`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// =============================================================================
// 🎯 설정 기반 Enum 생성 (런타임 검증)
// =============================================================================

// 휴가 타입 Enum (TypeScript enum 대신 사용)
export const LeaveTypeEnum = {
  ...LEAVE_CONFIG.TYPES,
  // 추가 유틸리티 메서드
  isValid: (value: string): value is LeaveType => {
    return Object.values(LEAVE_CONFIG.TYPES).includes(value as LeaveType);
  },
  getLabel: (value: LeaveType): string => {
    const labels = {
      [LEAVE_CONFIG.TYPES.ANNUAL]: '연차',
      [LEAVE_CONFIG.TYPES.SICK]: '병가',
      [LEAVE_CONFIG.TYPES.PERSONAL]: '개인휴가',
      [LEAVE_CONFIG.TYPES.FAMILY]: '경조사',
    };
    return labels[value] || value;
  },
} as const;

// 휴가 상태 Enum
export const LeaveStatusEnum = {
  ...LEAVE_CONFIG.STATUS,
  isValid: (value: string): value is LeaveStatus => {
    return Object.values(LEAVE_CONFIG.STATUS).includes(value as LeaveStatus);
  },
  getLabel: (value: LeaveStatus): string => {
    const labels = {
      [LEAVE_CONFIG.STATUS.PENDING]: '대기중',
      [LEAVE_CONFIG.STATUS.APPROVED]: '승인됨',
      [LEAVE_CONFIG.STATUS.REJECTED]: '거부됨',
    };
    return labels[value] || value;
  },
} as const;

// =============================================================================
// 🔒 설정 사용 강제 Hook 타입
// =============================================================================

// 설정 기반 커스텀 Hook 타입
export interface UseLeaveConfigReturn {
  types: typeof LEAVE_CONFIG.TYPES;
  status: typeof LEAVE_CONFIG.STATUS;
  businessRules: typeof LEAVE_CONFIG.BUSINESS_RULES;
  getTypeLabel: (type: LeaveType) => string;
  getStatusLabel: (status: LeaveStatus) => string;
  validateType: (type: string) => type is LeaveType;
  validateStatus: (status: string) => status is LeaveStatus;
}

// =============================================================================
// 🎨 컴포넌트 Factory 타입 (설정 강제)
// =============================================================================

// 설정 기반 컴포넌트 생성 타입
export type ConfigBasedComponent<T extends keyof typeof LEAVE_CONFIG> = (
  props: {
    config: typeof LEAVE_CONFIG[T];
    children?: React.ReactNode;
  }
) => React.ReactElement;

// =============================================================================
// 🔍 런타임 설정 검증 타입
// =============================================================================

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type ConfigValidationFunction = () => ConfigValidationResult;

// =============================================================================
// 📝 설정 문서 생성 타입
// =============================================================================

export interface ConfigDocumentation {
  name: string;
  description: string;
  values: Record<string, string>;
  examples: string[];
  relatedTypes: string[];
}

export type ConfigDocumentationGenerator = () => ConfigDocumentation[];