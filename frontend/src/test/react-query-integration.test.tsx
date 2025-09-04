import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import UnifiedLeaveOverview from '../components/UnifiedLeaveOverview';
import { AuthProvider } from '../components/AuthProvider';
import { NotificationProvider } from '../components/NotificationProvider';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn().mockImplementation((url) => {
      if (url === '/admin/leave/overview') {
        return Promise.resolve({
          data: {
            statistics: {
              totalEmployees: 10,
              averageUsageRate: 0.5,
              highRiskCount: 2,
              pendingRequests: 3,
            },
            employees: [],
            departments: ['HR', 'IT'],
          },
        });
      }
      if (url === '/leave/team-status') {
        return Promise.resolve({
          data: {
            members: [],
            departments: ['HR', 'IT'],
          },
        });
      }
      if (url === '/leave/team-status/department-stats') {
        return Promise.resolve({
          data: [],
        });
      }
      if (url.startsWith('/departments')) {
        return Promise.resolve({
          data: [
            { _id: '1', name: 'HR' },
            { _id: '2', name: 'IT' },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    }),
    getDepartments: vi.fn().mockResolvedValue({
      data: [
        { _id: '1', name: 'HR' },
        { _id: '2', name: 'IT' },
      ],
    }),
    getEmployeeLeaveLog: vi.fn().mockResolvedValue({
      data: {
        totalAnnualLeave: 15,
        usedLeave: 5,
        remainingLeave: 10,
        leaves: [],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('React Query Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
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
              role: 'admin',
              department: 'HR'
            }}>
              {component}
            </AuthProvider>
          </NotificationProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should use React Query for data fetching', async () => {
    renderWithProviders(
      <UnifiedLeaveOverview userRole="admin" initialViewMode="overview" />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Check that data is displayed
    await waitFor(() => {
      expect(screen.getByText(/전체 현황/)).toBeInTheDocument();
    });
  });

  it('should cache data between renders', async () => {
    const { apiService } = await import('../services/api');
    const getSpy = vi.spyOn(apiService, 'get');

    // First render
    const { unmount } = renderWithProviders(
      <UnifiedLeaveOverview userRole="admin" initialViewMode="overview" />
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const callCount = getSpy.mock.calls.length;
    
    // Unmount and remount
    unmount();
    
    renderWithProviders(
      <UnifiedLeaveOverview userRole="admin" initialViewMode="overview" />
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should use cached data, no new API calls
    expect(getSpy.mock.calls.length).toBe(callCount);
  });

  it('should handle different view modes with conditional fetching', async () => {
    const { apiService } = await import('../services/api');
    const getSpy = vi.spyOn(apiService, 'get');

    renderWithProviders(
      <UnifiedLeaveOverview userRole="admin" initialViewMode="team" />
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should only call team-status API, not overview
    const overviewCalls = getSpy.mock.calls.filter(
      call => call[0] === '/admin/leave/overview'
    );
    expect(overviewCalls.length).toBe(0);

    const teamCalls = getSpy.mock.calls.filter(
      call => call[0] === '/leave/team-status'
    );
    expect(teamCalls.length).toBeGreaterThan(0);
  });
});