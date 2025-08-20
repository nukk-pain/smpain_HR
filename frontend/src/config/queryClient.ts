import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분 (v5: cacheTime → gcTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  all: ['leave'] as const,
  leave: {
    all: ['leave'] as const,
    overview: (year: number) => ['leave', 'overview', year] as const,
    teamStatus: (department: string, year: number) => ['leave', 'team', department, year] as const,
    balance: (userId: string, year: number) => ['leave', 'balance', userId, year] as const,
    employeeLog: (employeeId: string, year: number) => ['leave', 'log', employeeId, year] as const,
  },
  departments: {
    all: ['departments'] as const,
    list: () => ['departments', 'list'] as const,
  },
} as const;