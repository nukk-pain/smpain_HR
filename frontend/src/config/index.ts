// =============================================================================
// CONFIGURATION INDEX
// =============================================================================
// 모든 설정을 한 곳에서 내보내는 인덱스 파일입니다.

// 상수
export * from './constants';

// 경로
export * from './paths';

// 환경 설정
export * from './env';
import { validateEnvironment, printEnvironmentInfo } from './env';

// 기본 설정 객체
export const appConfig = {
  // 앱 정보
  name: 'Leave Management System',
  version: '1.0.0',
  description: 'Modern leave and payroll management system',
  
  // 개발자 정보
  developer: {
    name: 'Development Team',
    email: 'dev@company.com',
  },
  
  // 기본 설정
  defaults: {
    language: 'ko',
    theme: 'light',
    itemsPerPage: 10,
    dateFormat: 'yyyy-MM-dd',
  },
  
  // 기능 플래그
  features: {
    enableNotifications: true,
    enableDarkMode: true,
    enableAnalytics: false,
    enableDebugMode: process.env.NODE_ENV === 'development',
  },
} as const;

// 설정 유효성 검사
export const validateConfig = (): boolean => {
  try {
    // 필수 설정 검증
    if (!appConfig.name || !appConfig.version) {
      console.error('App name and version are required');
      return false;
    }
    
    // 환경 설정 검증
    if (!validateEnvironment()) {
      console.error('Environment validation failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Config validation error:', error);
    return false;
  }
};

// 설정 초기화
export const initializeConfig = (): void => {
  // 설정 유효성 검사
  if (!validateConfig()) {
    console.error('Configuration validation failed');
    return;
  }
  
  // 개발 환경에서 환경 정보 출력
  if (process.env.NODE_ENV === 'development') {
    printEnvironmentInfo();
  }
  
  console.log(`✅ ${appConfig.name} v${appConfig.version} initialized`);
};