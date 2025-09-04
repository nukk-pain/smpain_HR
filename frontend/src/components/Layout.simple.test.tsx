/**
 * Layout Component Simple Tests
 * Mock 기반의 단순 테스트로 컴포넌트 렌더링 확인
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

// Mock the dependencies
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'admin',
      name: 'Test Admin',
      role: 'Admin',
      permissions: ['users:view', 'users:manage', 'leave:view', 'leave:manage']
    },
    isAuthenticated: true,
    logout: vi.fn(),
    hasPermission: (perm: string) => true,
    hasRole: (role: string) => role === 'Admin'
  })
}));

vi.mock('./NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn()
  })
}));

vi.mock('../services/api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

const TestDashboard = () => <div>Dashboard Content</div>;

const renderLayout = () => {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TestDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

describe('Layout Component Simple Tests', () => {
  it('renders without crashing', () => {
    renderLayout();
    // Layout should render something
    expect(document.body.innerHTML).not.toBe('');
  });
  
  it('renders app bar', () => {
    renderLayout();
    // Check for AppBar (role="banner")
    const appBar = screen.getByRole('banner');
    expect(appBar).toBeInTheDocument();
  });
  
  it('renders system title', () => {
    renderLayout();
    // There are two instances (mobile and desktop drawers)
    const titles = screen.getAllByText('통합 관리 시스템');
    expect(titles.length).toBeGreaterThan(0);
  });
  
  it('shows user name when authenticated', () => {
    renderLayout();
    const userName = screen.getByText('Test Admin');
    expect(userName).toBeInTheDocument();
  });
  
  it('renders navigation groups', () => {
    renderLayout();
    
    // Check for main navigation groups (using getAllByText for duplicates)
    expect(screen.getAllByText('홈').length).toBeGreaterThan(0);
    expect(screen.getAllByText('내 정보').length).toBeGreaterThan(0);
    
    // Try to find other navigation groups that may or may not be present
    // based on permissions - just check that navigation structure exists
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThan(0);
  });
  
  it('renders drawer toggle button', () => {
    renderLayout();
    
    // Menu icon button should be present
    const menuButton = screen.getByLabelText(/open drawer/i);
    expect(menuButton).toBeInTheDocument();
  });
  
  it('renders user button with name', () => {
    renderLayout();
    
    // User button should show the user's name
    const userButton = screen.getByRole('button', { name: /Test Admin/i });
    expect(userButton).toBeInTheDocument();
  });
  
  it('renders outlet content', () => {
    renderLayout();
    
    // Test dashboard content should be rendered
    const dashboardContent = screen.getByText('Dashboard Content');
    expect(dashboardContent).toBeInTheDocument();
  });
});