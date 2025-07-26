import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
  [key: string]: boolean;
}

export function useLoading(initialStates: LoadingState = {}) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>(initialStates);
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false);
  }, [setLoading]);

  const toggleLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  // Set loading with automatic timeout
  const setLoadingWithTimeout = useCallback((
    key: string, 
    loading: boolean, 
    timeoutMs: number = 30000
  ) => {
    // Clear existing timeout
    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
    }

    setLoading(key, loading);

    if (loading && timeoutMs > 0) {
      timeoutRefs.current[key] = setTimeout(() => {
        console.warn(`Loading timeout for ${key} after ${timeoutMs}ms`);
        setLoading(key, false);
        delete timeoutRefs.current[key];
      }, timeoutMs);
    }
  }, [setLoading]);

  // Wrap an async function with loading state
  const withLoading = useCallback(<T extends any[], R>(
    key: string,
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      startLoading(key);
      try {
        const result = await fn(...args);
        return result;
      } finally {
        stopLoading(key);
      }
    };
  }, [startLoading, stopLoading]);

  // Get loading state for a specific key
  const isLoading = useCallback((key: string): boolean => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  // Check if any loading state is true
  const isAnyLoading = useCallback((): boolean => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  // Check if all specified keys are loading
  const areAllLoading = useCallback((keys: string[]): boolean => {
    return keys.every(key => loadingStates[key]);
  }, [loadingStates]);

  // Check if any of the specified keys are loading
  const isAnyOfLoading = useCallback((keys: string[]): boolean => {
    return keys.some(key => loadingStates[key]);
  }, [loadingStates]);

  // Reset all loading states
  const resetAll = useCallback(() => {
    // Clear all timeouts
    Object.values(timeoutRefs.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    timeoutRefs.current = {};

    setLoadingStates({});
  }, []);

  // Reset specific loading states
  const reset = useCallback((keys: string[]) => {
    // Clear specific timeouts
    keys.forEach(key => {
      if (timeoutRefs.current[key]) {
        clearTimeout(timeoutRefs.current[key]);
        delete timeoutRefs.current[key];
      }
    });

    setLoadingStates(prev => {
      const newState = { ...prev };
      keys.forEach(key => {
        delete newState[key];
      });
      return newState;
    });
  }, []);

  // Get all current loading keys
  const getLoadingKeys = useCallback((): string[] => {
    return Object.keys(loadingStates).filter(key => loadingStates[key]);
  }, [loadingStates]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    Object.values(timeoutRefs.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    timeoutRefs.current = {};
  }, []);

  return {
    loadingStates,
    setLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setLoadingWithTimeout,
    withLoading,
    isLoading,
    isAnyLoading,
    areAllLoading,
    isAnyOfLoading,
    resetAll,
    reset,
    getLoadingKeys,
    cleanup,
  };
}

// Simple loading hook for single state
export function useSimpleLoading(initialLoading: boolean = false) {
  const [loading, setLoading] = useState(initialLoading);

  const startLoading = useCallback(() => {
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const toggleLoading = useCallback(() => {
    setLoading(prev => !prev);
  }, []);

  const withLoading = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      startLoading();
      try {
        const result = await fn(...args);
        return result;
      } finally {
        stopLoading();
      }
    };
  }, [startLoading, stopLoading]);

  return {
    loading,
    setLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    withLoading,
    isLoading: loading,
  };
}