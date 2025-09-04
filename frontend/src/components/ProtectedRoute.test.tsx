/**
 * AI-HEADER
 * @intent: Test ProtectedRoute component for role-based access control
 * @domain_meaning: Ensure routes are protected based on user roles
 * @misleading_names: None
 * @data_contracts: User role must match requiredRole prop
 * @pii: No real user data in tests
 * @invariants: Only matching roles can access protected routes
 * @rag_keywords: protected route test, role based access, frontend security
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../hooks/useAuth');

describe('ProtectedRoute Component', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Role-based access control', () => {
    test('should deny Supervisor access to Admin-only route', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', role: 'Supervisor', email: 'supervisor@test.com' },
        loading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/payroll']}>
          <Routes>
            <Route
              path="/payroll"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <div>Payroll Management</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Should redirect to unauthorized page
      expect(screen.queryByText('Payroll Management')).not.toBeInTheDocument();
      expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
    });

    test('should deny User access to Admin-only route', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '456', role: 'User', email: 'user@test.com' },
        loading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/payroll']}>
          <Routes>
            <Route
              path="/payroll"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <div>Payroll Management</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Payroll Management')).not.toBeInTheDocument();
      expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
    });

    test('should allow Admin access to Admin-only route', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '789', role: 'Admin', email: 'admin@test.com' },
        loading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/payroll']}>
          <Routes>
            <Route
              path="/payroll"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <div>Payroll Management</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Should show the protected content
      expect(screen.getByText('Payroll Management')).toBeInTheDocument();
      expect(screen.queryByText('Unauthorized Access')).not.toBeInTheDocument();
    });

    test('should allow access when no role requirement specified', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', role: 'User', email: 'user@test.com' },
        loading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    test('should redirect unauthenticated users to login', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/payroll']}>
          <Routes>
            <Route
              path="/payroll"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <div>Payroll Management</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Payroll Management')).not.toBeInTheDocument();
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Multiple allowed roles', () => {
    test('should allow any of the specified roles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', role: 'Supervisor', email: 'supervisor@test.com' },
        loading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/leave']}>
          <Routes>
            <Route
              path="/leave"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'User']}>
                  <div>Leave Management</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Leave Management')).toBeInTheDocument();
    });
  });
});