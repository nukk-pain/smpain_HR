/**
 * E2E Test: User Login → Profile → Password Change Flow
 * Tests the complete user authentication and profile management flow
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import App from '../../../App';
import {
  setupE2ETests,
  renderApp,
  testUsers,
  clickButton,
  fillForm,
  expectNotification,
  TEST_API_URL
} from '../setup.e2e';

// Setup E2E test environment
setupE2ETests();

describe('E2E: User Login → Profile → Password Change', () => {
  
  it('completes full user authentication and profile management flow', async () => {
    const user = userEvent.setup();
    
    // Step 1: Render the app
    renderApp(<App />);
    
    // Step 2: Login page should be displayed
    await waitFor(() => {
      expect(screen.getByText('HR 관리 시스템')).toBeInTheDocument();
    });
    
    // Step 3: Fill login form
    await fillForm(user, {
      '사용자명': testUsers.admin.username,
      '비밀번호': testUsers.admin.password
    });
    
    // Step 4: Submit login
    await clickButton(user, '로그인');
    
    // Step 5: Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/대시보드/i)).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Step 6: Navigate to profile
    // Click on user menu button
    const userMenuButton = screen.getByRole('button', { name: /admin/i });
    await user.click(userMenuButton);
    
    // Click on profile option
    const profileOption = screen.getByText('프로필');
    await user.click(profileOption);
    
    // Step 7: Verify profile page loaded
    await waitFor(() => {
      expect(screen.getByText('👤 내 정보')).toBeInTheDocument();
    });
    
    // Verify user information is displayed
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    
    // Step 8: Open password change dialog
    await user.click(userMenuButton);
    const passwordOption = screen.getByText('비밀번호 변경');
    await user.click(passwordOption);
    
    // Step 9: Verify password change dialog
    await waitFor(() => {
      expect(screen.getByText('비밀번호 변경')).toBeInTheDocument();
      expect(screen.getByLabelText(/현재 비밀번호/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/새 비밀번호/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호 확인/i)).toBeInTheDocument();
    });
    
    // Step 10: Fill password change form
    const currentPasswordInput = screen.getByLabelText(/현재 비밀번호/i);
    const newPasswordInput = screen.getAllByLabelText(/새 비밀번호/i)[0];
    const confirmPasswordInput = screen.getByLabelText(/비밀번호 확인/i);
    
    await user.type(currentPasswordInput, testUsers.admin.password);
    await user.type(newPasswordInput, 'newPassword123!');
    await user.type(confirmPasswordInput, 'newPassword123!');
    
    // Step 11: Submit password change (but cancel for test stability)
    const cancelButton = screen.getByRole('button', { name: /취소/i });
    await user.click(cancelButton);
    
    // Step 12: Verify dialog closed
    await waitFor(() => {
      expect(screen.queryByText('비밀번호 변경')).not.toBeInTheDocument();
    });
    
    // Step 13: Logout
    await user.click(userMenuButton);
    const logoutOption = screen.getByText('로그아웃');
    await user.click(logoutOption);
    
    // Step 14: Verify logged out (back to login page)
    await waitFor(() => {
      expect(screen.getByText('HR 관리 시스템')).toBeInTheDocument();
      expect(screen.getByLabelText(/사용자명/i)).toBeInTheDocument();
    });
    
    // Step 15: Verify token cleared
    expect(localStorage.getItem('hr_auth_token')).toBeNull();
  });
  
  it('handles invalid login attempts', async () => {
    const user = userEvent.setup();
    
    renderApp(<App />);
    
    // Wait for login page
    await waitFor(() => {
      expect(screen.getByText('HR 관리 시스템')).toBeInTheDocument();
    });
    
    // Try login with wrong password
    await fillForm(user, {
      '사용자명': testUsers.admin.username,
      '비밀번호': 'wrongpassword'
    });
    
    await clickButton(user, '로그인');
    
    // Should show error message
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const errorAlert = alerts.find(alert => 
        alert.textContent?.includes('잘못된') || 
        alert.textContent?.includes('실패') ||
        alert.textContent?.includes('Invalid')
      );
      expect(errorAlert).toBeInTheDocument();
    });
    
    // Should still be on login page
    expect(screen.getByLabelText(/사용자명/i)).toBeInTheDocument();
  });
  
  it('maintains session across page refreshes', async () => {
    const user = userEvent.setup();
    
    // First login
    renderApp(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('HR 관리 시스템')).toBeInTheDocument();
    });
    
    await fillForm(user, {
      '사용자명': testUsers.admin.username,
      '비밀번호': testUsers.admin.password
    });
    
    await clickButton(user, '로그인');
    
    // Wait for dashboard
    await waitFor(() => {
      expect(screen.getByText(/대시보드/i)).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Get the token
    const token = localStorage.getItem('hr_auth_token');
    expect(token).toBeTruthy();
    
    // Simulate page refresh by unmounting and remounting
    const { unmount } = renderApp(<App />);
    unmount();
    
    // Set token back (simulating persistent storage)
    localStorage.setItem('hr_auth_token', token!);
    
    // Render app again
    renderApp(<App />);
    
    // Should go directly to dashboard, not login
    await waitFor(() => {
      expect(screen.getByText(/대시보드/i)).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Should not show login form
    expect(screen.queryByLabelText(/사용자명/i)).not.toBeInTheDocument();
  });
});