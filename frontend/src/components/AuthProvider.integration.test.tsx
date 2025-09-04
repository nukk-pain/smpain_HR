/**
 * AuthProvider Integration Tests
 * 실제 백엔드 서버와 MongoDB를 사용하는 통합 테스트
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthProvider';
import { 
  setupIntegrationTests, 
  testApi, 
  createTestUser, 
  getAdminToken 
} from '../test/setup.integration';
import apiService from '../services/api';

// 통합 테스트 설정
setupIntegrationTests();

// 테스트 환경에서 apiService가 올바른 URL을 사용하도록 설정
beforeAll(() => {
  // apiService의 baseURL을 테스트 서버로 변경
  // @ts-ignore - private 속성 접근
  if (apiService.api) {
    apiService.api.defaults.baseURL = 'http://localhost:5455/api';
  }
});

// 테스트 컴포넌트
const TestComponent: React.FC = () => {
  const { user, login, logout, loading, refreshUser } = useAuth();
  
  return (
    <div>
      {loading && <div data-testid="loading">Loading...</div>}
      {user ? (
        <div>
          <div data-testid="user-info">
            User: {user.username} ({user.role})
          </div>
          <div data-testid="user-id">{user.id}</div>
          <button onClick={logout}>Logout</button>
          <button onClick={refreshUser}>Refresh User</button>
        </div>
      ) : (
        <div>
          <div data-testid="no-user">Not logged in</div>
          <button onClick={() => login('admin', 'admin')}>Login Admin</button>
          <button onClick={() => login('wrong', 'wrong')}>Login Wrong</button>
        </div>
      )}
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AuthProvider Integration Tests', () => {
  let testUser: any = null;
  
  beforeAll(async () => {
    // 테스트용 사용자 생성
    try {
      testUser = await createTestUser({
        username: 'test_auth_user',
        password: 'testpass123',
        name: 'Test Auth User',
        email: 'authtest@test.com',
        role: 'User',
        department: 'Test Department',
        position: 'Tester',
        joinDate: new Date().toISOString()
      });
    } catch (error: any) {
      console.log('Test user creation failed:', error.response?.data || error.message);
      // 사용자가 이미 존재할 수 있으므로 계속 진행
    }
  });
  
  afterAll(async () => {
    // 테스트 사용자 삭제
    if (testUser) {
      try {
        const token = await getAdminToken();
        await testApi.delete(`/users/${testUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.log('Failed to delete test user:', error);
      }
    }
  });
  
  beforeEach(() => {
    localStorage.clear();
    // 각 테스트 전에 apiService URL 확인
    // @ts-ignore - private 속성 접근
    if (apiService.api) {
      apiService.api.defaults.baseURL = 'http://localhost:5455/api';
    }
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  it('provides auth context to children', () => {
    renderWithProvider();
    
    expect(screen.getByTestId('no-user')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login Admin' })).toBeInTheDocument();
  });
  
  it('handles successful admin login', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    // 초기 상태 확인
    expect(screen.getByTestId('no-user')).toBeInTheDocument();
    
    // 로그인 버튼 클릭
    const loginButton = screen.getByRole('button', { name: 'Login Admin' });
    await user.click(loginButton);
    
    // 로그인 성공 대기
    await waitFor(() => {
      expect(screen.queryByTestId('no-user')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // 사용자 정보 확인
    const userInfo = screen.getByTestId('user-info');
    expect(userInfo.textContent).toContain('admin');
    expect(userInfo.textContent?.toLowerCase()).toContain('admin');
    
    // 토큰 저장 확인
    const token = localStorage.getItem('hr_auth_token');
    expect(token).toBeTruthy();
  });
  
  it('handles failed login with wrong credentials', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    // 잘못된 로그인 시도
    const loginButton = screen.getByRole('button', { name: 'Login Wrong' });
    await user.click(loginButton);
    
    // 로그인 실패 후에도 로그인되지 않은 상태 유지
    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 토큰이 저장되지 않았는지 확인
    const token = localStorage.getItem('hr_auth_token');
    expect(token).toBeFalsy();
  });
  
  it('handles logout', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    // 먼저 로그인
    const loginButton = screen.getByRole('button', { name: 'Login Admin' });
    await user.click(loginButton);
    
    // 로그인 성공 대기
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // 로그아웃 버튼 클릭
    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    await user.click(logoutButton);
    
    // 로그아웃 성공 대기
    await waitFor(() => {
      expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-user')).toBeInTheDocument();
    });
    
    // 토큰이 삭제되었는지 확인
    const token = localStorage.getItem('hr_auth_token');
    expect(token).toBeFalsy();
  });
  
  it('persists authentication on page refresh', async () => {
    // 먼저 로그인하여 토큰 받기
    const loginResponse = await testApi.post('/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginResponse.data.token;
    localStorage.setItem('hr_auth_token', token);
    
    // AuthProvider 렌더링
    renderWithProvider();
    
    // 로딩 상태 확인
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    
    // 자동으로 인증 상태 복원
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // 사용자 정보 확인
    const userInfo = screen.getByTestId('user-info');
    expect(userInfo.textContent).toContain('admin');
  });
  
  it('clears invalid token on failed auth check', async () => {
    // 잘못된 토큰 설정
    localStorage.setItem('hr_auth_token', 'invalid-token-12345');
    
    // AuthProvider 렌더링
    renderWithProvider();
    
    // 잘못된 토큰이 즉시 감지되어 로그인 화면으로 이동
    // 로딩 상태를 거치지 않을 수 있음
    await waitFor(() => {
      expect(screen.getByTestId('no-user')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // 잘못된 토큰이 삭제되었는지 확인
    const token = localStorage.getItem('hr_auth_token');
    expect(token).toBeFalsy();
  });
  
  it('refreshes user data', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    
    // 로그인
    const loginButton = screen.getByRole('button', { name: 'Login Admin' });
    await user.click(loginButton);
    
    // 로그인 성공 대기
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Refresh 버튼 클릭
    const refreshButton = screen.getByRole('button', { name: 'Refresh User' });
    await user.click(refreshButton);
    
    // 여전히 로그인 상태 유지
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });
    
    // 사용자 정보가 유지되는지 확인
    const userInfo = screen.getByTestId('user-info');
    expect(userInfo.textContent).toContain('admin');
  });
  
  it('handles permission checking', async () => {
    const user = userEvent.setup();
    
    // 권한 체크 테스트 컴포넌트
    const PermissionTestComponent: React.FC = () => {
      const { user, login, hasPermission, hasRole } = useAuth();
      
      return (
        <div>
          {user ? (
            <div>
              <div data-testid="role">{user.role}</div>
              <div data-testid="can-view-users">
                {hasPermission('view_users') ? 'Yes' : 'No'}
              </div>
              <div data-testid="is-admin">
                {hasRole('admin') || hasRole('Admin') ? 'Yes' : 'No'}
              </div>
            </div>
          ) : (
            <button onClick={() => login('admin', 'admin')}>Login</button>
          )}
        </div>
      );
    };
    
    render(
      <BrowserRouter>
        <AuthProvider>
          <PermissionTestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    
    // 로그인
    const loginButton = screen.getByRole('button', { name: 'Login' });
    await user.click(loginButton);
    
    // 권한 확인
    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
      expect(screen.getByTestId('can-view-users')).toHaveTextContent('Yes');
      expect(screen.getByTestId('is-admin')).toHaveTextContent('Yes');
    }, { timeout: 5000 });
  });
});