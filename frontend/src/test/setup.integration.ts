/**
 * Integration Test Setup
 * 실제 백엔드 서버와 MongoDB를 사용하는 통합 테스트 설정
 */
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// 테스트 환경 설정
const TEST_API_URL = 'http://localhost:5455/api';
const TEST_ADMIN_USERNAME = 'admin';
const TEST_ADMIN_PASSWORD = 'admin';

// 테스트용 axios 인스턴스
export const testApi = axios.create({
  baseURL: TEST_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 테스트용 관리자 토큰
let adminToken: string | null = null;

export const getAdminToken = async (): Promise<string> => {
  if (adminToken) return adminToken;
  
  try {
    const response = await testApi.post('/auth/login', {
      username: TEST_ADMIN_USERNAME,
      password: TEST_ADMIN_PASSWORD
    });
    
    adminToken = response.data.token;
    return adminToken;
  } catch (error) {
    console.error('Failed to get admin token:', error);
    throw new Error('Could not authenticate admin user for tests');
  }
};

// 테스트용 사용자 생성
export const createTestUser = async (userData: any) => {
  const token = await getAdminToken();
  const response = await testApi.post('/users', userData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// 테스트 데이터 정리
export const cleanupTestData = async () => {
  const token = await getAdminToken();
  
  // 테스트용 사용자 삭제 (admin 제외)
  try {
    const usersResponse = await testApi.get('/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // API 응답이 { users: [...] } 형태일 수 있음
    const users = Array.isArray(usersResponse.data) 
      ? usersResponse.data 
      : usersResponse.data.users || [];
    
    const testUsers = users.filter((user: any) => 
      user.username?.startsWith('test_') || 
      user.email?.includes('@test.com')
    );
    
    for (const user of testUsers) {
      await testApi.delete(`/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (error) {
    console.error('Error cleaning up test users:', error);
  }
};

// 백엔드 서버 상태 확인
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    // auth/check는 토큰 없이도 응답을 반환함
    const response = await axios.get(`${TEST_API_URL}/auth/check`);
    // 401이나 200이나 403이나 서버가 응답하면 OK
    return true;
  } catch (error: any) {
    // 401, 403 등의 인증 에러도 서버가 살아있다는 의미
    if (error.response && error.response.status) {
      return true;
    }
    console.error('Backend health check failed:', error.message);
    return false;
  }
};

// 전역 테스트 설정
export const setupIntegrationTests = () => {
  beforeAll(async () => {
    // 백엔드 서버 확인
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      throw new Error(
        'Backend server is not running. Please start the backend server on port 5455'
      );
    }
    
    // 관리자 토큰 미리 가져오기
    await getAdminToken();
  });
  
  afterAll(async () => {
    // 테스트 데이터 정리
    await cleanupTestData();
  });
  
  beforeEach(() => {
    // localStorage 초기화
    localStorage.clear();
  });
  
  afterEach(() => {
    // 각 테스트 후 정리 작업
    localStorage.clear();
  });
};