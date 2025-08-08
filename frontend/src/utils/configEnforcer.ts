// =============================================================================
// 🔒 CONFIGURATION ENFORCEMENT UTILITIES
// =============================================================================
// 개발 시 설정 사용을 강제하는 유틸리티들

import { 
  LEAVE_CONFIG, 
  USER_ROLES, 
  UI_CONFIG, 
  DATE_CONFIG, 
  SUCCESS_MESSAGES, 
  ERROR_MESSAGES 
} from '@/config/constants';
import { LeaveType, LeaveStatus, UserRole } from '@/types/config';

// =============================================================================
// 🚨 하드코딩 감지 및 경고 시스템
// =============================================================================

/**
 * 하드코딩된 값들을 감지하고 경고하는 클래스
 */
export class ConfigEnforcer {
  private static instance: ConfigEnforcer;
  private violations: string[] = [];

  private constructor() {}

  public static getInstance(): ConfigEnforcer {
    if (!ConfigEnforcer.instance) {
      ConfigEnforcer.instance = new ConfigEnforcer();
    }
    return ConfigEnforcer.instance;
  }

  /**
   * 하드코딩된 휴가 타입 사용 감지
   */
  public checkLeaveType(value: string, context: string): LeaveType {
    if (!Object.values(LEAVE_CONFIG.TYPES).includes(value as LeaveType)) {
      const violation = `❌ 하드코딩된 휴가 타입 감지: "${value}" in ${context}. LEAVE_CONFIG.TYPES를 사용하세요.`;
      this.addViolation(violation);
      console.error(violation);
    }
    return value as LeaveType;
  }

  /**
   * 하드코딩된 휴가 상태 사용 감지
   */
  public checkLeaveStatus(value: string, context: string): LeaveStatus {
    if (!Object.values(LEAVE_CONFIG.STATUS).includes(value as LeaveStatus)) {
      const violation = `❌ 하드코딩된 휴가 상태 감지: "${value}" in ${context}. LEAVE_CONFIG.STATUS를 사용하세요.`;
      this.addViolation(violation);
      console.error(violation);
    }
    return value as LeaveStatus;
  }

  /**
   * 하드코딩된 사용자 역할 감지
   */
  public checkUserRole(value: string, context: string): UserRole {
    if (!Object.values(USER_ROLES).includes(value as UserRole)) {
      const violation = `❌ 하드코딩된 사용자 역할 감지: "${value}" in ${context}. USER_ROLES를 사용하세요.`;
      this.addViolation(violation);
      console.error(violation);
    }
    return value as UserRole;
  }

  /**
   * 하드코딩된 메시지 사용 감지
   */
  public checkMessage(value: string, context: string): string {
    const isSuccessMessage = Object.values(SUCCESS_MESSAGES).includes(value as any);
    const isErrorMessage = Object.values(ERROR_MESSAGES).includes(value as any);
    
    if (!isSuccessMessage && !isErrorMessage) {
      const violation = `⚠️ 하드코딩된 메시지 감지: "${value}" in ${context}. SUCCESS_MESSAGES 또는 ERROR_MESSAGES를 사용하세요.`;
      this.addViolation(violation);
      console.warn(violation);
    }
    return value;
  }

  /**
   * 위반 사항 추가
   */
  private addViolation(violation: string): void {
    this.violations.push(violation);
  }

  /**
   * 모든 위반 사항 반환
   */
  public getViolations(): string[] {
    return [...this.violations];
  }

  /**
   * 위반 사항 초기화
   */
  public clearViolations(): void {
    this.violations = [];
  }

  /**
   * 위반 사항 리포트 생성
   */
  public generateReport(): string {
    if (this.violations.length === 0) {
      return '✅ 하드코딩 위반 사항이 없습니다!';
    }

    return `
🚨 하드코딩 위반 사항 리포트
=============================
총 ${this.violations.length}개의 위반 사항이 발견되었습니다.

${this.violations.map((violation, index) => `${index + 1}. ${violation}`).join('\n')}

📋 해결 방법:
- @/config/constants 파일의 상수를 사용하세요
- useConfig Hook을 활용하세요
- 타입 안전성을 위해 TypeScript 타입을 사용하세요
`;
  }
}

// 싱글톤 인스턴스 내보내기
export const configEnforcer = ConfigEnforcer.getInstance();

// =============================================================================
// 🎯 설정 강제 래퍼 함수들
// =============================================================================

/**
 * 안전한 휴가 타입 생성 (하드코딩 방지)
 */
export function createLeaveType(value: string, context: string = 'unknown'): LeaveType {
  return configEnforcer.checkLeaveType(value, context);
}

/**
 * 안전한 휴가 상태 생성 (하드코딩 방지)
 */
export function createLeaveStatus(value: string, context: string = 'unknown'): LeaveStatus {
  return configEnforcer.checkLeaveStatus(value, context);
}

/**
 * 안전한 사용자 역할 생성 (하드코딩 방지)
 */
export function createUserRole(value: string, context: string = 'unknown'): UserRole {
  return configEnforcer.checkUserRole(value, context);
}

/**
 * 안전한 메시지 생성 (하드코딩 방지)
 */
export function createMessage(value: string, context: string = 'unknown'): string {
  return configEnforcer.checkMessage(value, context);
}

// =============================================================================
// 🔍 자동 설정 검증 데코레이터
// =============================================================================

/**
 * 메서드 실행 전 설정 검증을 수행하는 데코레이터
 */
export function validateConfig(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    // 개발 환경에서만 검증 실행
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 설정 검증 실행: ${target.constructor.name}.${propertyName}`);
      
      // 인자에서 하드코딩 값 검사
      args.forEach((arg, index) => {
        if (typeof arg === 'string') {
          configEnforcer.checkMessage(arg, `${target.constructor.name}.${propertyName} arg[${index}]`);
        }
      });
    }
    
    return method.apply(this, args);
  };
}

// =============================================================================
// 🎨 설정 기반 팩토리 함수들
// =============================================================================

/**
 * 설정 기반 휴가 옵션 생성
 */
export function createLeaveOptions() {
  return Object.entries(LEAVE_CONFIG.TYPES).map(([key, value]) => ({
    value,
    label: getLeaveTypeLabel(value as LeaveType),
    key,
  }));
}

/**
 * 설정 기반 상태 옵션 생성
 */
export function createStatusOptions() {
  return Object.entries(LEAVE_CONFIG.STATUS).map(([key, value]) => ({
    value,
    label: getLeaveStatusLabel(value as LeaveStatus),
    key,
  }));
}

/**
 * 설정 기반 사용자 역할 옵션 생성
 */
export function createUserRoleOptions() {
  return Object.entries(USER_ROLES).map(([key, value]) => ({
    value,
    label: getUserRoleLabel(value as UserRole),
    key,
  }));
}

// =============================================================================
// 🏷️ 라벨 생성 함수들 (중앙화)
// =============================================================================

export function getLeaveTypeLabel(type: LeaveType): string {
  const labels = {
    [LEAVE_CONFIG.TYPES.ANNUAL]: '연차',
    [LEAVE_CONFIG.TYPES.SICK]: '병가',
    [LEAVE_CONFIG.TYPES.PERSONAL]: '개인휴가',
    [LEAVE_CONFIG.TYPES.FAMILY]: '경조사',
  };
  return labels[type] || type;
}

export function getLeaveStatusLabel(status: LeaveStatus): string {
  const labels = {
    [LEAVE_CONFIG.STATUS.PENDING]: '대기중',
    [LEAVE_CONFIG.STATUS.APPROVED]: '승인됨',
    [LEAVE_CONFIG.STATUS.REJECTED]: '거부됨',
  };
  return labels[status] || status;
}

export function getUserRoleLabel(role: UserRole): string {
  const labels = {
    [USER_ROLES.ADMIN]: '관리자',
    [USER_ROLES.SUPERVISOR]: '슈퍼바이저',
    [USER_ROLES.USER]: '사용자',
  };
  return labels[role] || role;
}

// =============================================================================
// 🔧 개발 도구 함수들
// =============================================================================

/**
 * 개발 환경에서 설정 사용 현황 분석
 */
export function analyzeConfigUsage() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.group('📊 설정 사용 현황 분석');
  console.log('🎯 휴가 타입:', Object.keys(LEAVE_CONFIG.TYPES));
  console.log('🎯 휴가 상태:', Object.keys(LEAVE_CONFIG.STATUS));
  console.log('🎯 사용자 역할:', Object.keys(USER_ROLES));
  console.log('🎯 UI 설정:', Object.keys(UI_CONFIG));
  console.log('🎯 날짜 형식:', Object.keys(DATE_CONFIG.FORMATS));
  console.groupEnd();
}

/**
 * 설정 마이그레이션 도구
 */
export function migrateHardcodedValues(code: string): string {
  let migratedCode = code;
  
  // 하드코딩된 값들을 설정 사용으로 변환
  const replacements = [
    { from: /"annual"/g, to: 'LEAVE_CONFIG.TYPES.ANNUAL' },
    { from: /"sick"/g, to: 'LEAVE_CONFIG.TYPES.SICK' },
    { from: /"personal"/g, to: 'LEAVE_CONFIG.TYPES.PERSONAL' },
    { from: /"family"/g, to: 'LEAVE_CONFIG.TYPES.FAMILY' },
    { from: /"pending"/g, to: 'LEAVE_CONFIG.STATUS.PENDING' },
    { from: /"approved"/g, to: 'LEAVE_CONFIG.STATUS.APPROVED' },
    { from: /"rejected"/g, to: 'LEAVE_CONFIG.STATUS.REJECTED' },
    { from: /"admin"/g, to: 'USER_ROLES.ADMIN' },
    { from: /"supervisor"/g, to: 'USER_ROLES.SUPERVISOR' },
    { from: /"user"/g, to: 'USER_ROLES.USER' },
  ];

  replacements.forEach(({ from, to }) => {
    migratedCode = migratedCode.replace(from, to);
  });

  return migratedCode;
}

// =============================================================================
// 🚀 자동 초기화 (개발 환경에서만)
// =============================================================================

if (process.env.NODE_ENV === 'development') {
  // 개발 환경에서 자동으로 설정 분석 실행
  setTimeout(() => {
    analyzeConfigUsage();
    
    // 10초마다 위반 사항 확인
    setInterval(() => {
      const violations = configEnforcer.getViolations();
      if (violations.length > 0) {
        console.warn('🚨 새로운 하드코딩 위반 사항이 발견되었습니다!');
        console.log(configEnforcer.generateReport());
        configEnforcer.clearViolations();
      }
    }, 10000);
  }, 1000);
}