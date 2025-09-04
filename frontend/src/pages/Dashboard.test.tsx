/**
 * Dashboard Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

// Mock UnifiedDashboard
vi.mock('../components/UnifiedDashboard', () => ({
  default: () => <div data-testid="unified-dashboard">Unified Dashboard</div>,
}));

// Mock UserDashboard
vi.mock('../components/UserDashboard', () => ({
  default: () => <div data-testid="user-dashboard">User Dashboard</div>,
}));

// Mock AuthProvider
const mockUser = vi.fn();
vi.mock('../components/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser(),
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    checkAuth: vi.fn(),
  }),
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders UnifiedDashboard for admin users', () => {
    mockUser.mockReturnValue({
      id: '1',
      username: 'admin',
      role: 'admin',
      name: 'Admin User',
    });

    renderDashboard();
    
    expect(screen.getByTestId('unified-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('user-dashboard')).not.toBeInTheDocument();
  });

  it('renders UserDashboard for regular users', () => {
    mockUser.mockReturnValue({
      id: '2',
      username: 'user',
      role: 'user',
      name: 'Regular User',
    });

    renderDashboard();
    
    expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('unified-dashboard')).not.toBeInTheDocument();
  });

  it('renders UserDashboard for manager users', () => {
    mockUser.mockReturnValue({
      id: '3',
      username: 'manager',
      role: 'manager',
      name: 'Manager User',
    });

    renderDashboard();
    
    expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('unified-dashboard')).not.toBeInTheDocument();
  });

  it('renders UserDashboard when user is null', () => {
    mockUser.mockReturnValue(null);

    renderDashboard();
    
    expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('unified-dashboard')).not.toBeInTheDocument();
  });

  it('renders UserDashboard when user role is undefined', () => {
    mockUser.mockReturnValue({
      id: '4',
      username: 'unknown',
      name: 'Unknown User',
      // role is undefined
    });

    renderDashboard();
    
    expect(screen.getByTestId('user-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('unified-dashboard')).not.toBeInTheDocument();
  });
});