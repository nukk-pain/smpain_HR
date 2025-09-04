/**
 * AI-HEADER
 * @intent: Test Navigation component menu filtering based on user roles
 * @domain_meaning: Ensure navigation menu shows only role-appropriate items
 * @misleading_names: None
 * @data_contracts: Menu items filtered by user role
 * @pii: No real user data
 * @invariants: Payroll menus only visible to Admin role
 * @rag_keywords: navigation test, menu filtering, role based menu
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from './Navigation';
import { useAuth } from '../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../hooks/useAuth');

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  Dashboard: () => <div>DashboardIcon</div>,
  People: () => <div>PeopleIcon</div>,
  Event: () => <div>EventIcon</div>,
  Payment: () => <div>PaymentIcon</div>,
  AttachMoney: () => <div>AttachMoneyIcon</div>,
  TrendingUp: () => <div>TrendingUpIcon</div>,
  Group: () => <div>GroupIcon</div>,
}));

describe('Navigation Menu Filtering', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should not show payroll menu items for Supervisor role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', role: 'Supervisor', email: 'supervisor@test.com' },
      loading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Payroll-related items should not be visible
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument();
    expect(screen.queryByText('Payroll Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Bonus')).not.toBeInTheDocument();
    expect(screen.queryByText('Sales')).not.toBeInTheDocument();
    expect(screen.queryByText('Daily Workers')).not.toBeInTheDocument();

    // Leave management should still be visible
    expect(screen.getByText(/Leave/i)).toBeInTheDocument();
  });

  test('should not show payroll menu items for User role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '456', role: 'User', email: 'user@test.com' },
      loading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Payroll-related items should not be visible
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument();
    expect(screen.queryByText('Bonus')).not.toBeInTheDocument();
    expect(screen.queryByText('Sales')).not.toBeInTheDocument();
    expect(screen.queryByText('Daily Workers')).not.toBeInTheDocument();
  });

  test('should show payroll menu items for Admin role', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '789', role: 'Admin', email: 'admin@test.com' },
      loading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // All menu items should be visible for Admin
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('Leave')).toBeInTheDocument();
    // Note: Some items might be in submenus or have different text
  });

  test('should show leave menu for all authenticated users', () => {
    const roles = ['Admin', 'Supervisor', 'User'];
    
    roles.forEach(role => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', role, email: `${role.toLowerCase()}@test.com` },
        loading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      const { unmount } = render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      );

      expect(screen.getByText(/Leave/i)).toBeInTheDocument();
      unmount();
    });
  });
});