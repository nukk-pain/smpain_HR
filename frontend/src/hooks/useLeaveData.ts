import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { queryKeys } from '../config/queryClient';
import { useNotification } from '../components/NotificationProvider';

// Types
interface LeaveOverviewParams {
  year: number;
  department?: string;
}

interface TeamStatusParams {
  year: number;
  department: string;
}

interface LeaveAdjustmentData {
  employeeId: string;
  adjustmentType: 'add' | 'subtract';
  days: number;
  reason: string;
  year: number;
}

// Hook for fetching leave overview (admin only)
export const useLeaveOverview = (year: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.leave.overview(year),
    queryFn: async () => {
      const response = await apiService.get('/admin/leave/overview');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled,
  });
};

// Hook for fetching team status
export const useTeamStatus = (department: string, year: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.leave.teamStatus(department, year),
    queryFn: async () => {
      const response = await apiService.get('/leave/team-status', {
        params: { department, year }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
  });
};

// Hook for fetching department stats
export const useDepartmentStats = (year: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['leave', 'departmentStats', year] as const,
    queryFn: async () => {
      const response = await apiService.get('/leave/team-status/department-stats', {
        year
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
  });
};

// Hook for fetching departments
export const useDepartments = () => {
  return useQuery({
    queryKey: queryKeys.departments.list(),
    queryFn: async () => {
      const response = await apiService.getDepartments();
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30분 (거의 변경 없음)
    gcTime: 60 * 60 * 1000, // 1시간
  });
};

// Hook for fetching employee leave balance
export const useEmployeeLeaveBalance = (userId: string, year: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.leave.balance(userId, year),
    queryFn: async () => {
      const response = await apiService.get(`/leave/balance/${userId}`, {
        params: { year }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!userId,
  });
};

// Hook for fetching employee leave log
export const useEmployeeLeaveLog = (employeeId: string, year: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.leave.employeeLog(employeeId, year),
    queryFn: async () => {
      const response = await apiService.getEmployeeLeaveLog(employeeId, year);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enabled && !!employeeId,
  });
};

// Hook for leave adjustment mutation
export const useLeaveAdjustment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: async (data: LeaveAdjustmentData) => {
      const response = await apiService.post('/leave/adjust', data);
      return response.data;
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leave.all });

      // Snapshot the previous values
      const previousOverview = queryClient.getQueryData(
        queryKeys.leave.overview(newData.year)
      );
      const previousBalance = queryClient.getQueryData(
        queryKeys.leave.balance(newData.employeeId, newData.year)
      );

      // Optimistically update the data
      queryClient.setQueryData(
        queryKeys.leave.balance(newData.employeeId, newData.year),
        (old: any) => {
          if (!old) return old;
          
          const adjustment = newData.adjustmentType === 'add' ? newData.days : -newData.days;
          return {
            ...old,
            remainingAnnualLeave: (old.remainingAnnualLeave || 0) + adjustment,
            totalAnnualLeave: (old.totalAnnualLeave || 0) + adjustment,
          };
        }
      );

      // Return context with snapshot values
      return { previousOverview, previousBalance };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousOverview) {
        queryClient.setQueryData(
          queryKeys.leave.overview(newData.year),
          context.previousOverview
        );
      }
      if (context?.previousBalance) {
        queryClient.setQueryData(
          queryKeys.leave.balance(newData.employeeId, newData.year),
          context.previousBalance
        );
      }
      showError('휴가 조정 중 오류가 발생했습니다.');
    },
    onSuccess: (data, variables) => {
      showSuccess('휴가가 성공적으로 조정되었습니다.');
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leave.all 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leave.balance(variables.employeeId, variables.year)
      });
    },
  });
};

// Hook for prefetching leave data
export const usePrefetchLeaveData = () => {
  const queryClient = useQueryClient();

  const prefetchOverview = async (year: number) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.leave.overview(year),
      queryFn: async () => {
        const response = await apiService.get('/leave/overview', {
          params: { year }
        });
        return response.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchTeamStatus = async (department: string, year: number) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.leave.teamStatus(department, year),
      queryFn: async () => {
        const response = await apiService.get('/leave/team-status', {
          params: { department, year }
        });
        return response.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchOverview, prefetchTeamStatus };
};