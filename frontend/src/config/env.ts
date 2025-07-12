// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================
// 이 파일에서 환경별 설정을 중앙 관리합니다.

import { getCurrentEnvironment, ENV_CONFIG } from './constants';

// 환경 변수 인터페이스
export interface EnvironmentConfig {
  API_URL: string;
  DEBUG: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  DATABASE_URL?: string;
  STORAGE_TYPE?: 'local' | 'session' | 'memory';
}

// 현재 환경 설정
export const envConfig: EnvironmentConfig = getEnvConfig();

// 환경별 설정 가져오기
function getEnvConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();
  const baseConfig = ENV_CONFIG[env];
  
  return {
    ...baseConfig,
    // 추가 환경별 설정
    DATABASE_URL: env === 'production' 
      ? 'mongodb://192.168.0.30:27017/SM_nomu'
      : 'mongodb://localhost:27017/SM_nomu',
    STORAGE_TYPE: env === 'production' ? 'local' : 'session',
  };
}

// 환경 변수 검증
export const validateEnvironment = (): boolean => {
  const requiredVars = ['API_URL', 'DEBUG', 'LOG_LEVEL'];
  
  for (const varName of requiredVars) {
    if (!(varName in envConfig)) {
      console.error(`Missing required environment variable: ${varName}`);
      return false;
    }
  }
  
  return true;
};

// 개발 환경 여부 확인
export const isDevelopment = (): boolean => {
  return getCurrentEnvironment() === 'development';
};

// 프로덕션 환경 여부 확인
export const isProduction = (): boolean => {
  return getCurrentEnvironment() === 'production';
};

// 테스트 환경 여부 확인
export const isTest = (): boolean => {
  return getCurrentEnvironment() === 'test';
};

// 디버그 모드 여부 확인
export const isDebugMode = (): boolean => {
  return envConfig.DEBUG;
};

// 로그 레벨 확인
export const getLogLevel = (): string => {
  return envConfig.LOG_LEVEL;
};

// API URL 가져오기
export const getApiUrl = (): string => {
  return envConfig.API_URL;
};

// 데이터베이스 URL 가져오기
export const getDatabaseUrl = (): string => {
  return envConfig.DATABASE_URL || 'mongodb://localhost:27017/SM_nomu';
};

// 스토리지 타입 가져오기
export const getStorageType = (): 'local' | 'session' | 'memory' => {
  return envConfig.STORAGE_TYPE || 'local';
};

// 환경 정보 출력 (디버그용)
export const printEnvironmentInfo = (): void => {
  if (isDevelopment()) {
    console.log('🚀 Environment Configuration:');
    console.log('Environment:', getCurrentEnvironment());
    console.log('API URL:', getApiUrl());
    console.log('Debug Mode:', isDebugMode());
    console.log('Log Level:', getLogLevel());
    console.log('Database URL:', getDatabaseUrl());
    console.log('Storage Type:', getStorageType());
  }
};

// 환경 설정 내보내기
export { envConfig as default };