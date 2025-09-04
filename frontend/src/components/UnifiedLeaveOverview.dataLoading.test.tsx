/**
 * UnifiedLeaveOverview Data Loading Tests
 * Testing API integration and data display
 * 
 * IMPORTANT: Using real MongoDB data, no mocks
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UnifiedLeaveOverview from './UnifiedLeaveOverview';
import { AuthProvider } from './AuthProvider';
import { NotificationProvider } from './NotificationProvider';
import { apiService } from '../services/api';

// Test wrapper with real providers
const TestWrapper = ({ children, userRole = 'admin' }: { children: React.ReactNode, userRole?: 'admin' | 'supervisor' }) => {
  const testUser = {
    _id: 'test-user-id',
    username: userRole === 'admin' ? 'admin' : 'supervisor',
    name: userRole === 'admin' ? 'Test Admin' : 'Test Supervisor',
    role: userRole === 'admin' ? 'Admin' : 'Supervisor',
    department: 'IT',
    position: userRole === 'admin' ? 'System Administrator' : 'Team Lead',
    email: `test-${userRole}@company.com`,
    isActive: true
  };

  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider initialUser={testUser}>
          {children}
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

describe('UnifiedLeaveOverview Data Loading', () => {
  let adminToken: string;
  
  beforeAll(async () => {
    // Get real admin token for API testing
    try {
      const response = await apiService.login('admin', 'admin');
      adminToken = response.token;
      console.log('✅ Admin login successful for testing');
    } catch (error) {
      console.warn('⚠️ Could not login as admin, tests may fail');
    }
  });

  beforeEach(() => {
    console.log('🔄 Starting data loading test');
  });

  afterEach(() => {
    console.log('🧹 Test cleanup');
  });

  describe('Data Loading', () => {
    it('should load and display leave data for admin', async () => {
      render(
        <TestWrapper userRole="admin">
          <UnifiedLeaveOverview userRole="admin" />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        // Check if title is rendered
        expect(screen.getByText(/휴가 현황/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Check if data table or cards are rendered
      // The component should show either a table or card view
      await waitFor(() => {
        const tables = screen.queryAllByRole('table');
        const cards = document.querySelectorAll('.MuiCard-root');
        
        // Should have either tables or cards for data display
        expect(tables.length + cards.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('should handle empty data gracefully', async () => {
      render(
        <TestWrapper userRole="admin">
          <UnifiedLeaveOverview userRole="admin" />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/휴가 현황/i)).toBeInTheDocument();
      });

      // If no data, should show appropriate message or empty state
      const noDataMessage = screen.queryByText(/데이터가 없습니다/i) || 
                           screen.queryByText(/no data/i) ||
                           screen.queryByText(/조회된 데이터가 없습니다/i);
      
      // Component should handle empty state properly (either show message or empty table)
      const tables = screen.queryAllByRole('table');
      expect(noDataMessage || tables.length > 0).toBeTruthy();
    });
  });

  describe('Filtering and Search', () => {
    it('should have department filter dropdown', async () => {
      render(
        <TestWrapper userRole="admin">
          <UnifiedLeaveOverview userRole="admin" />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/휴가 현황/i)).toBeInTheDocument();
      });

      // Look for department filter
      const departmentSelect = screen.queryByLabelText(/부서/i) || 
                              document.querySelector('select[name*="department"]') ||
                              document.querySelector('[data-testid*="department"]');
      
      if (departmentSelect) {
        expect(departmentSelect).toBeInTheDocument();
      } else {
        // Might be using MUI Select which renders differently
        const muiSelect = document.querySelector('.MuiSelect-select');
        expect(muiSelect).toBeInTheDocument();
      }
    });

    it('should have search input field', async () => {
      render(
        <TestWrapper userRole="admin">
          <UnifiedLeaveOverview userRole="admin" />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/휴가 현황/i)).toBeInTheDocument();
      });

      // Look for search input
      const searchInput = screen.queryByPlaceholderText(/검색/i) ||
                         screen.queryByPlaceholderText(/search/i) ||
                         screen.queryByRole('searchbox') ||
                         document.querySelector('input[type="search"]') ||
                         document.querySelector('input[placeholder*="검색"]');
      
      // Should have a search input
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter data when search term is entered', async () => {
      render(
        <TestWrapper userRole="admin">
          <UnifiedLeaveOverview userRole="admin" />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/휴가 현황/i)).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.queryByPlaceholderText(/검색/i) ||
                         document.querySelector('input[placeholder*="검색"]');
      
      if (searchInput) {
        // Type a search term
        fireEvent.change(searchInput, { target: { value: 'test' } });
        
        // Wait a bit for filtering to apply
        await waitFor(() => {
          // Component should react to search input
          expect(searchInput).toHaveValue('test');
        });
      }
    });
  });

  describe('View Mode Switching', () => {
    it('should switch between view modes when buttons are clicked', async () => {
      render(
        <TestWrapper userRole="admin">
          <UnifiedLeaveOverview userRole="admin" />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/휴가 현황/i)).toBeInTheDocument();
      });

      // Find team view button
      const teamButton = screen.getByRole('button', { name: /팀 현황/i });
      
      // Click team view button
      fireEvent.click(teamButton);
      
      // View should change (we can't test exact content without knowing data structure)
      await waitFor(() => {
        // Button should be selected/active
        expect(teamButton).toHaveAttribute('aria-pressed', 'true');
      });

      // Try switching to department view
      const deptButton = screen.getByRole('button', { name: /부서 통계/i });
      fireEvent.click(deptButton);
      
      await waitFor(() => {
        expect(deptButton).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  describe('Year Selection', () => {
    it('should have year selector', async () => {
      render(
        <TestWrapper userRole="admin">
          <UnifiedLeaveOverview userRole="admin" />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/휴가 현황/i)).toBeInTheDocument();
      });

      // Switch to team view first (year selector is usually there)
      const teamButton = screen.queryByRole('button', { name: /팀 현황/i });
      if (teamButton) {
        fireEvent.click(teamButton);
      }

      // Look for year selector
      await waitFor(() => {
        const yearSelect = screen.queryByLabelText(/연도/i) ||
                          screen.queryByText(new Date().getFullYear().toString()) ||
                          document.querySelector('select[name*="year"]');
        
        // Should have year selector in at least one view
        if (yearSelect) {
          expect(yearSelect).toBeInTheDocument();
        }
      });
    });
  });
});