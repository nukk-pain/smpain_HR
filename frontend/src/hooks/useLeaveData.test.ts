import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLeaveOverview, useTeamStatus, useDepartments, useDepartmentStats } from './useLeaveData';
import { apiService } from '../services/api';
import React from 'react';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    getDepartments: jest.fn(),
    getEmployeeLeaveLog: jest.fn(),
  },
}));

// Mock the notification provider
jest.mock('../components/NotificationProvider', () => ({
  useNotification: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

describe('useLeaveData hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useLeaveOverview', () => {
    it('should fetch leave overview data', async () => {
      const mockData = {
        success: true,
        data: {
          statistics: { totalEmployees: 100 },
          employees: [],
        },
      };
      
      (apiService.get as jest.Mock).mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useLeaveOverview(2025), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(apiService.get).toHaveBeenCalledWith('/admin/leave/overview');
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useLeaveOverview(2025, false), { wrapper });

      expect(result.current.isIdle).toBe(true);
      expect(apiService.get).not.toHaveBeenCalled();
    });

    it('should cache data for subsequent requests', async () => {
      const mockData = { data: { test: 'data' } };
      (apiService.get as jest.Mock).mockResolvedValueOnce({ data: mockData });

      const { result, rerender } = renderHook(() => useLeaveOverview(2025), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiService.get).toHaveBeenCalledTimes(1);

      // Rerender should use cached data
      rerender();
      expect(result.current.data).toEqual(mockData);
      expect(apiService.get).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  describe('useTeamStatus', () => {
    it('should fetch team status data', async () => {
      const mockData = {
        data: {
          members: [],
          departments: ['HR', 'IT'],
        },
      };
      
      (apiService.get as jest.Mock).mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useTeamStatus('HR', 2025), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(apiService.get).toHaveBeenCalledWith('/leave/team-status', {
        params: { department: 'HR', year: 2025 },
      });
    });
  });

  describe('useDepartmentStats', () => {
    it('should fetch department stats', async () => {
      const mockData = {
        data: [
          { department: 'HR', totalEmployees: 10, avgUsageRate: 0.5 },
          { department: 'IT', totalEmployees: 15, avgUsageRate: 0.6 },
        ],
      };
      
      (apiService.get as jest.Mock).mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useDepartmentStats(2025), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(apiService.get).toHaveBeenCalledWith('/leave/team-status/department-stats', {
        year: 2025,
      });
    });
  });

  describe('useDepartments', () => {
    it('should fetch departments list', async () => {
      const mockData = [
        { _id: '1', name: 'HR' },
        { _id: '2', name: 'IT' },
      ];
      
      (apiService.getDepartments as jest.Mock).mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useDepartments(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(apiService.getDepartments).toHaveBeenCalled();
    });

    it('should use longer cache time for departments', async () => {
      const mockData = [{ _id: '1', name: 'HR' }];
      (apiService.getDepartments as jest.Mock).mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useDepartments(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Check that staleTime is properly set (30 minutes)
      const query = queryClient.getQueryCache().find(['departments', 'list']);
      expect(query?.options.staleTime).toBe(30 * 60 * 1000);
    });
  });
});