/**
 * UnifiedLeaveOverview Virtual Scrolling Tests
 * TDD approach for implementing virtual scrolling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import UnifiedLeaveOverview from './UnifiedLeaveOverview';
import { AuthProvider } from './AuthProvider';
import { NotificationProvider } from './NotificationProvider';

// Generate mock data for testing virtual scrolling
const generateMockEmployees = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    employeeId: `emp-${i}`,
    name: `Employee ${i}`,
    department: i % 3 === 0 ? 'HR' : i % 3 === 1 ? 'IT' : 'Sales',
    position: 'Staff',
    totalAnnualLeave: 15,
    usedAnnualLeave: Math.floor(Math.random() * 15),
    pendingAnnualLeave: 0,
    remainingAnnualLeave: 15 - Math.floor(Math.random() * 15),
    usageRate: Math.random(),
    riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
  }));
};

// Mock API to return large dataset
vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn().mockImplementation((url) => {
      if (url === '/admin/leave/overview') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              statistics: {
                totalEmployees: 1000,
                averageUsageRate: 0.5,
                highRiskCount: 300,
                pendingRequests: 50,
              },
              employees: generateMockEmployees(1000),
            },
          },
        });
      }
      if (url.includes('/departments')) {
        return Promise.resolve({
          data: [
            { _id: '1', name: 'HR' },
            { _id: '2', name: 'IT' },
            { _id: '3', name: 'Sales' },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    }),
    getDepartments: vi.fn().mockResolvedValue({
      data: [
        { _id: '1', name: 'HR' },
        { _id: '2', name: 'IT' },
        { _id: '3', name: 'Sales' },
      ],
    }),
  },
}));

describe('UnifiedLeaveOverview Virtual Scrolling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NotificationProvider>
            <AuthProvider initialUser={{ 
              _id: '1', 
              userId: '1',
              name: 'Test Admin', 
              role: 'Admin',
              department: 'HR'
            }}>
              {component}
            </AuthProvider>
          </NotificationProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Virtual Scrolling Implementation', () => {
    it('should render virtual scrolling for large employee lists (>100 employees)', async () => {
      renderWithProviders(
        <UnifiedLeaveOverview userRole="admin" initialViewMode="overview" />
      );

      // Wait for data to load - look for the main loading indicator, not the usage bars
      await waitFor(() => {
        const loadingIndicator = document.querySelector('.MuiCircularProgress-root');
        expect(loadingIndicator).not.toBeInTheDocument();
      }, { timeout: 10000 });

      // Check for virtual scrolling container
      const virtualList = document.querySelector('[data-testid="virtual-employee-list"]');
      expect(virtualList).toBeInTheDocument();
    });

    it('should not use virtual scrolling for small employee lists (<100 employees)', async () => {
      // Mock API to return small dataset
      const { apiService } = await import('../services/api');
      vi.mocked(apiService.get).mockImplementationOnce((url) => {
        if (url === '/admin/leave/overview') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                statistics: {
                  totalEmployees: 50,
                  averageUsageRate: 0.5,
                  highRiskCount: 10,
                  pendingRequests: 5,
                },
                employees: generateMockEmployees(50),
              },
            },
          });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithProviders(
        <UnifiedLeaveOverview userRole="admin" initialViewMode="overview" />
      );

      await waitFor(() => {
        const loadingIndicator = document.querySelector('.MuiCircularProgress-root');
        expect(loadingIndicator).not.toBeInTheDocument();
      }, { timeout: 10000 });

      // Virtual scrolling container should not exist
      const virtualList = document.querySelector('[data-testid="virtual-employee-list"]');
      expect(virtualList).not.toBeInTheDocument();
    });
  });
});