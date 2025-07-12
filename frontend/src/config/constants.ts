// =============================================================================
// APPLICATION CONSTANTS
// =============================================================================
// 이 파일에서 애플리케이션의 모든 상수를 중앙 관리합니다.

// API 관련 상수
export const API_CONFIG = {
  BASE_URL: '/api',
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
} as const;

// 서버 설정
export const SERVER_CONFIG = {
  BACKEND_PORT: 5444,
  FRONTEND_PORT: 3000,
  BACKEND_URL: 'http://localhost:5444',
  FRONTEND_URL: 'http://localhost:3000',
} as const;

// 데이터베이스 설정
export const DATABASE_CONFIG = {
  NAME: 'SM_nomu',
  DEV_URL: 'mongodb://localhost:27017',
  PROD_URL: 'mongodb://192.168.0.30:27017',
} as const;

// 사용자 역할
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
} as const;

// 휴가 관련 상수
export const LEAVE_CONFIG = {
  TYPES: {
    ANNUAL: 'annual',
    SICK: 'sick',
    FAMILY: 'family',
    PERSONAL: 'personal',
  },
  STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
  ANNUAL_LEAVE: {
    FIRST_YEAR: 11,
    SECOND_YEAR_BASE: 15,
    MAX_DAYS: 25,
  },
  PERSONAL_LEAVE: {
    DEFAULT_DAYS: 3,
    TYPE: 'unpaid', // 무급
  },
  FAMILY_LEAVE: {
    APPROVAL_REQUIRED: true, // 부서장 승인 필요
  },
  BUSINESS_RULES: {
    MIN_ADVANCE_DAYS: 3,
    MAX_CONCURRENT_REQUESTS: 1,
  },
  DAY_CALCULATION: {
    SATURDAY: 0.5, // 토요일 0.5일
    SUNDAY: 0,     // 일요일 0일
    WEEKDAY: 1,    // 평일 1일
  },
} as const;

// 급여 관련 상수
export const PAYROLL_CONFIG = {
  BONUS_TYPES: {
    BONUS: 'bonus',
    AWARD: 'award',
  },
  CONTRACT_TYPES: {
    REGULAR: 'regular',
    CONTRACT: 'contract',
  },
} as const;

// UI 관련 상수
export const UI_CONFIG = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
  },
  NOTIFICATION: {
    DEFAULT_DURATION: 5000,
    SUCCESS_DURATION: 3000,
    ERROR_DURATION: 7000,
  },
  THEME: {
    PRIMARY_COLOR: '#1976d2',
    SECONDARY_COLOR: '#dc004e',
  },
} as const;

// 날짜 형식
export const DATE_CONFIG = {
  FORMATS: {
    DISPLAY: 'yyyy-MM-dd',
    API: 'yyyy-MM-dd',
    FULL: 'yyyy-MM-dd HH:mm:ss',
    KOREAN: 'yyyy년 MM월 dd일',
  },
  LOCALE: 'ko',
} as const;

// 파일 업로드 관련 상수
export const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls', '.csv'],
  UPLOAD_PATH: '/uploads',
} as const;

// 에러 메시지
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
  FORBIDDEN: '권한이 없습니다.',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  SERVER_ERROR: '서버 오류가 발생했습니다.',
  VALIDATION_ERROR: '입력값을 확인해주세요.',
} as const;

// 성공 메시지
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: '저장되었습니다.',
  UPDATE_SUCCESS: '수정되었습니다.',
  DELETE_SUCCESS: '삭제되었습니다.',
  UPLOAD_SUCCESS: '업로드되었습니다.',
  LOGIN_SUCCESS: '로그인되었습니다.',
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
} as const;

// 경로 상수
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PAYROLL: '/payroll',
  LEAVE: '/leave',
  USERS: '/users',
  DEPARTMENTS: '/departments',
  REPORTS: '/reports',
  FILES: '/files',
  POSITIONS: '/positions',
} as const;

// API 엔드포인트
export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  
  // 사용자
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    BULK_IMPORT: '/users/bulk-import',
    ORGANIZATION: '/users/organization',
    DEPARTMENTS: '/users/departments',
    POSITIONS: '/users/positions',
    STATS: '/users/stats',
  },
  
  // 휴가
  LEAVE: {
    BASE: '/leave',
    BY_ID: (id: string) => `/leave/${id}`,
    APPROVE: (id: string) => `/leave/${id}/approve`,
    BALANCE: '/leave/balance',
    BALANCE_BY_USER: (userId: string) => `/leave/balance/${userId}`,
    PENDING: '/leave/pending',
    CALENDAR: (month: string) => `/leave/calendar/${month}`,
    TEAM_STATUS: '/leave/team-status',
    STATS: '/leave/stats/overview',
  },
  
  // 급여
  PAYROLL: {
    MONTHLY: (yearMonth: string) => `/payroll/monthly/${yearMonth}`,
    EMPLOYEES: '/payroll/employees',
    UPLOAD: '/payroll/upload',
    PROCESS: '/payroll/process',
    STATS: '/payroll/stats',
    EXPORT: '/payroll/export',
  },
  
  // 보너스
  BONUS: {
    BASE: '/bonus',
    BY_ID: (id: string) => `/bonus/${id}`,
    BY_EMPLOYEE: (employeeId: string) => `/bonus/employee/${employeeId}`,
    SUMMARY: '/bonus/summary',
  },
  
  // 매출
  SALES: {
    BASE: '/sales',
    BY_ID: (id: string) => `/sales/${id}`,
    BY_EMPLOYEE: (employeeId: string) => `/sales/employee/${employeeId}`,
    SUMMARY: '/sales/summary',
  },
  
  // 파일
  FILES: {
    UPLOAD: '/files/upload',
    DOWNLOAD: (id: string) => `/files/download/${id}`,
    LIST: '/files/list',
    DELETE: (id: string) => `/files/delete/${id}`,
  },
  
  // 보고서
  REPORTS: {
    PAYROLL: '/reports/payroll',
    LEAVE: '/reports/leave',
    EMPLOYEE: '/reports/employee',
    EXPORT: '/reports/export',
  },
} as const;

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// 환경 변수 타입
export type Environment = 'development' | 'production' | 'test';

// 환경별 설정
export const ENV_CONFIG = {
  development: {
    API_URL: SERVER_CONFIG.BACKEND_URL,
    DEBUG: true,
    LOG_LEVEL: 'debug',
  },
  production: {
    API_URL: '/api',
    DEBUG: false,
    LOG_LEVEL: 'error',
  },
  test: {
    API_URL: 'http://localhost:5444',
    DEBUG: true,
    LOG_LEVEL: 'info',
  },
} as const;

// 현재 환경 감지
export const getCurrentEnvironment = (): Environment => {
  return (process.env.NODE_ENV as Environment) || 'development';
};

// 현재 환경 설정 가져오기
export const getEnvConfig = () => {
  const env = getCurrentEnvironment();
  return ENV_CONFIG[env];
};