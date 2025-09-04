/**
 * Layout Component Integration Tests
 * 실제 백엔드 서버와 AuthProvider를 사용하는 통합 테스트
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import { AuthProvider } from './AuthProvider';
import { NotificationProvider } from './NotificationProvider';
import { 
  setupIntegrationTests, 
  testApi, 
  getAdminToken 
} from '../test/setup.integration';
import apiService from '../services/api';

// 통합 테스트 설정
setupIntegrationTests();

// 테스트 환경에서 apiService가 올바른 URL을 사용하도록 설정
beforeAll(() => {
  // @ts-ignore - private 속성 접근
  if (apiService.api) {
    apiService.api.defaults.baseURL = 'http://localhost:5455/api';
  }
});

beforeEach(() => {
  // @ts-ignore - private 속성 접근
  if (apiService.api) {
    apiService.api.defaults.baseURL = 'http://localhost:5455/api';
  }
  localStorage.clear();
});

// 테스트용 페이지 컴포넌트
const TestDashboard = () => <div>Dashboard Content</div>;
const TestLeave = () => <div>Leave Management Content</div>;
const TestUsers = () => <div>User Management Content</div>;

const renderLayoutWithAuth = (initialToken?: string) => {
  if (initialToken) {
    localStorage.setItem('hr_auth_token', initialToken);
  }
  
  // Navigate to root path to ensure Layout renders
  window.history.pushState({}, '', '/');
  
  return render(
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<TestDashboard />} />
              <Route path="dashboard" element={<TestDashboard />} />
              <Route path="leave" element={<TestLeave />} />
              <Route path="supervisor/users" element={<TestUsers />} />
            </Route>
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

describe('Layout Component Integration Tests', () => {
  let adminToken: string;
  
  beforeAll(async () => {
    // 관리자 토큰 미리 가져오기
    adminToken = await getAdminToken();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  it('renders layout structure', () => {
    renderLayoutWithAuth();
    
    // AppBar 확인
    expect(screen.getByRole('banner')).toBeInTheDocument();
    
    // Navigation drawer 버튼 확인
    expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
  });
  
  it('shows correct navigation items for authenticated admin', async () => {
    renderLayoutWithAuth(adminToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Admin 메뉴 항목 확인
    expect(screen.getByText('홈')).toBeInTheDocument();
    expect(screen.getByText('내 정보')).toBeInTheDocument();
    expect(screen.getByText('휴가 관리')).toBeInTheDocument();
    expect(screen.getByText('조직 관리')).toBeInTheDocument();
    expect(screen.getByText('급여 관리')).toBeInTheDocument();
  });
  
  it('handles navigation drawer toggle', async () => {
    const user = userEvent.setup();
    renderLayoutWithAuth(adminToken);
    
    // 메뉴 버튼 클릭
    const menuButton = screen.getByLabelText(/menu/i);
    await user.click(menuButton);
    
    // Drawer가 열렸는지 확인 (대시보드 메뉴 항목이 보이는지)
    await waitFor(() => {
      const dashboardItems = screen.getAllByText('대시보드');
      expect(dashboardItems.length).toBeGreaterThan(0);
    });
  });
  
  it('expands and collapses navigation groups', async () => {
    const user = userEvent.setup();
    renderLayoutWithAuth(adminToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // '내 정보' 그룹 찾기
    const personalGroup = screen.getByText('내 정보');
    expect(personalGroup).toBeInTheDocument();
    
    // 그룹 클릭하여 확장/축소
    await user.click(personalGroup);
    
    // 하위 메뉴 항목 확인
    await waitFor(() => {
      expect(screen.getByText('내 휴가 관리')).toBeInTheDocument();
    });
  });
  
  it('shows user menu on avatar click', async () => {
    const user = userEvent.setup();
    renderLayoutWithAuth(adminToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Avatar 버튼 찾기 및 클릭
    const avatarButton = screen.getByRole('button', { name: /account/i });
    await user.click(avatarButton);
    
    // 사용자 메뉴 항목 확인
    await waitFor(() => {
      expect(screen.getByText('프로필')).toBeInTheDocument();
      expect(screen.getByText('비밀번호 변경')).toBeInTheDocument();
      expect(screen.getByText('로그아웃')).toBeInTheDocument();
    });
  });
  
  it('handles logout', async () => {
    const user = userEvent.setup();
    renderLayoutWithAuth(adminToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Avatar 클릭
    const avatarButton = screen.getByRole('button', { name: /account/i });
    await user.click(avatarButton);
    
    // 로그아웃 클릭
    const logoutButton = screen.getByText('로그아웃');
    await user.click(logoutButton);
    
    // 토큰이 삭제되었는지 확인
    await waitFor(() => {
      const token = localStorage.getItem('hr_auth_token');
      expect(token).toBeFalsy();
    });
  });
  
  it('filters navigation items based on user role', async () => {
    // 일반 사용자 토큰으로 로그인 (테스트용 사용자 생성 필요)
    const userLoginResponse = await testApi.post('/auth/login', {
      username: 'user',
      password: 'user'
    });
    
    const userToken = userLoginResponse.data.token;
    renderLayoutWithAuth(userToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // 일반 사용자는 시스템 설정이 보이지 않아야 함
    expect(screen.queryByText('시스템 설정')).not.toBeInTheDocument();
    
    // 기본 메뉴는 보여야 함
    expect(screen.getByText('홈')).toBeInTheDocument();
    expect(screen.getByText('내 정보')).toBeInTheDocument();
  });
  
  it('saves and restores navigation group expansion state', async () => {
    const user = userEvent.setup();
    renderLayoutWithAuth(adminToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // '내 정보' 그룹 확장
    const personalGroup = screen.getByText('내 정보');
    await user.click(personalGroup);
    
    // localStorage에 저장되었는지 확인
    await waitFor(() => {
      const saved = localStorage.getItem('navigationGroupsExpanded');
      expect(saved).toBeTruthy();
      const expanded = JSON.parse(saved!);
      expect(expanded).toContain('personal');
    });
  });
  
  it('opens password change dialog', async () => {
    const user = userEvent.setup();
    renderLayoutWithAuth(adminToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Avatar 클릭
    const avatarButton = screen.getByRole('button', { name: /account/i });
    await user.click(avatarButton);
    
    // 비밀번호 변경 클릭
    const changePasswordButton = screen.getByText('비밀번호 변경');
    await user.click(changePasswordButton);
    
    // 비밀번호 변경 다이얼로그 확인
    await waitFor(() => {
      expect(screen.getByText('비밀번호 변경')).toBeInTheDocument();
      expect(screen.getByLabelText(/현재 비밀번호/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/새 비밀번호/i)).toBeInTheDocument();
    });
  });
  
  it('navigates to different pages', async () => {
    const user = userEvent.setup();
    renderLayoutWithAuth(adminToken);
    
    // 인증 확인 대기
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // 대시보드가 기본으로 표시되는지 확인
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    
    // 내 정보 그룹 확장
    const personalGroup = screen.getByText('내 정보');
    await user.click(personalGroup);
    
    // 휴가 관리 메뉴 클릭
    const leaveMenuItem = screen.getByText('내 휴가 관리');
    await user.click(leaveMenuItem);
    
    // 페이지가 변경되었는지 확인
    await waitFor(() => {
      expect(screen.getByText('Leave Management Content')).toBeInTheDocument();
    });
  });
});