import { useState, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  showSuccessMessage?: boolean;
  showErrorMessage?: boolean;
}

export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    options: ApiOptions = {}
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      
      if (options.onError) {
        options.onError(errorMessage);
      } else {
        console.error('API Error:', errorMessage);
      }
      
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
    isLoading: state.loading,
    hasError: !!state.error,
    hasData: !!state.data,
  };
}

// Hook for multiple API calls
export function useMultipleApi() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const executeMultiple = useCallback(async (
    apiCalls: Record<string, () => Promise<any>>
  ) => {
    setLoading(true);
    setErrors({});

    const results: Record<string, any> = {};
    const errorMap: Record<string, string> = {};

    await Promise.all(
      Object.entries(apiCalls).map(async ([key, apiCall]) => {
        try {
          results[key] = await apiCall();
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
          errorMap[key] = errorMessage;
          console.error(`API Error (${key}):`, errorMessage);
        }
      })
    );

    setLoading(false);
    setErrors(errorMap);

    return { results, errors: errorMap };
  }, []);

  return {
    loading,
    errors,
    executeMultiple,
    hasErrors: Object.keys(errors).length > 0,
  };
}

// Hook for paginated data
export function usePaginatedApi<T = any>() {
  const [state, setState] = useState<{
    data: T[];
    loading: boolean;
    error: string | null;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    } | null;
  }>({
    data: [],
    loading: false,
    error: null,
    pagination: null,
  });

  const fetchPage = useCallback(async (
    apiCall: (page: number, limit?: number) => Promise<any>,
    page: number = 1,
    limit: number = 10
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall(page, limit);
      const { data, pagination } = response;

      setState({
        data: data || [],
        loading: false,
        error: null,
        pagination,
      });

      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      throw error;
    }
  }, []);

  const loadMore = useCallback(async (
    apiCall: (page: number, limit?: number) => Promise<any>
  ) => {
    if (!state.pagination?.hasNextPage || state.loading) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await apiCall(state.pagination.currentPage + 1);
      const { data, pagination } = response;

      setState(prev => ({
        data: [...prev.data, ...(data || [])],
        loading: false,
        error: null,
        pagination,
      }));

      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      
      throw error;
    }
  }, [state.pagination, state.loading]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      pagination: null,
    });
  }, []);

  return {
    ...state,
    fetchPage,
    loadMore,
    reset,
    isLoading: state.loading,
    hasError: !!state.error,
    hasData: state.data.length > 0,
    canLoadMore: state.pagination?.hasNextPage && !state.loading,
  };
}