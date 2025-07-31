// =============================================================================
// PATH CONFIGURATION
// =============================================================================
// 이 파일에서 모든 경로를 중앙 관리합니다.

// 컴포넌트 경로
export const COMPONENT_PATHS = {
  AUTH_PROVIDER: '@/components/AuthProvider',
  NOTIFICATION_PROVIDER: '@/components/NotificationProvider',
  LAYOUT: '@/components/Layout',
  PAYROLL_GRID: '@/components/PayrollGrid',
  USER_MANAGEMENT: '@/components/UserManagement',
  FILE_UPLOAD: '@/components/FileUpload',
  DEPARTMENT_MANAGEMENT: '@/components/DepartmentManagement',
  POSITION_MANAGEMENT: '@/components/PositionManagement',
  BONUS_MANAGEMENT: '@/components/BonusManagement',
  SALES_MANAGEMENT: '@/components/SalesManagement',
  UNIFIED_DASHBOARD: '@/components/UnifiedDashboard',
  PAYROLL_DASHBOARD: '@/components/PayrollDashboard',
  INCENTIVE_CALCULATOR: '@/components/IncentiveCalculator',
} as const;

// 페이지 경로
export const PAGE_PATHS = {
  LOGIN: '@/pages/Login',
  DASHBOARD: '@/pages/Dashboard',
  PAYROLL_MANAGEMENT: '@/pages/PayrollManagement',
  LEAVE_MANAGEMENT: '@/pages/LeaveManagement',
  USER_MANAGEMENT: '@/pages/UserManagement',
  USER_MANAGEMENT_PAGE: '@/pages/UserManagementPage',
  DEPARTMENT_MANAGEMENT_PAGE: '@/pages/DepartmentManagementPage',
  POSITION_MANAGEMENT_PAGE: '@/pages/PositionManagementPage',
  REPORTS: '@/pages/Reports',
  FILE_MANAGEMENT: '@/pages/FileManagement',
} as const;

// 서비스 경로
export const SERVICE_PATHS = {
  API: '@/services/api',
  AUTH: '@/services/auth',
  STORAGE: '@/services/storage',
  VALIDATION: '@/services/validation',
} as const;

// 유틸리티 경로
export const UTIL_PATHS = {
  HELPERS: '@/utils/helpers',
  FORMATTERS: '@/utils/formatters',
  VALIDATORS: '@/utils/validators',
  CONSTANTS: '@/utils/constants',
} as const;

// 타입 경로
export const TYPE_PATHS = {
  INDEX: '@/types/index',
  API: '@/types/api',
  USER: '@/types/user',
  LEAVE: '@/types/leave',
  PAYROLL: '@/types/payroll',
} as const;

// 스타일 경로
export const STYLE_PATHS = {
  GLOBALS: '@/styles/globals.css',
  COMPONENTS: '@/styles/components',
  THEMES: '@/styles/themes',
} as const;

// 에셋 경로
export const ASSET_PATHS = {
  IMAGES: '@/assets/images',
  ICONS: '@/assets/icons',
  FONTS: '@/assets/fonts',
} as const;

// 설정 경로
export const CONFIG_PATHS = {
  CONSTANTS: '@/config/constants',
  PATHS: '@/config/paths',
  ENV: '@/config/env',
  THEME: '@/config/theme',
} as const;

// 라우트 경로 (실제 URL 경로)
export const ROUTE_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PAYROLL: '/payroll',
  LEAVE: '/leave',
  USERS: '/users',
  DEPARTMENTS: '/departments',
  POSITIONS: '/positions',
  REPORTS: '/reports',
  FILES: '/files',
  SETTINGS: '/settings',
} as const;

// Note: API_ENDPOINTS is now defined in constants.ts to avoid duplication

// 미디어 쿼리
export const MEDIA_QUERIES = {
  MOBILE: '@media (max-width: 768px)',
  TABLET: '@media (max-width: 1024px)',
  DESKTOP: '@media (min-width: 1025px)',
} as const;

// 절대 경로를 상대 경로로 변환하는 헬퍼 함수들
export const pathHelpers = {
  // 컴포넌트 경로를 상대 경로로 변환
  component: (relativePath: string) => {
    const basePath = '../components/';
    return basePath + relativePath;
  },
  
  // 페이지 경로를 상대 경로로 변환  
  page: (relativePath: string) => {
    const basePath = '../pages/';
    return basePath + relativePath;
  },
  
  // 서비스 경로를 상대 경로로 변환
  service: (relativePath: string) => {
    const basePath = '../services/';
    return basePath + relativePath;
  },
  
  // 타입 경로를 상대 경로로 변환
  type: (relativePath: string) => {
    const basePath = '../types/';
    return relativePath === 'index' ? basePath : basePath + relativePath;
  },
  
  // 설정 경로를 상대 경로로 변환
  config: (relativePath: string) => {
    const basePath = '../config/';
    return basePath + relativePath;
  },
};