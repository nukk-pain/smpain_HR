import { useState, useCallback } from 'react';

export interface ErrorState {
  [key: string]: string | null;
}

export interface ErrorDetails {
  message: string;
  code?: string | number;
  details?: any;
  timestamp?: Date;
}

export function useError(initialErrors: ErrorState = {}) {
  const [errors, setErrors] = useState<ErrorState>(initialErrors);

  const setError = useCallback((key: string, error: string | Error | null) => {
    setErrors(prev => ({
      ...prev,
      [key]: error ? (typeof error === 'string' ? error : error.message) : null
    }));
  }, []);

  const setErrorDetails = useCallback((key: string, errorDetails: ErrorDetails | null) => {
    setErrors(prev => ({
      ...prev,
      [key]: errorDetails ? errorDetails.message : null
    }));
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasError = useCallback((key: string): boolean => {
    return !!errors[key];
  }, [errors]);

  const getError = useCallback((key: string): string | null => {
    return errors[key] || null;
  }, [errors]);

  const hasAnyError = useCallback((): boolean => {
    return Object.values(errors).some(error => error !== null);
  }, [errors]);

  const getAllErrors = useCallback((): string[] => {
    return Object.values(errors).filter(error => error !== null) as string[];
  }, [errors]);

  const getErrorKeys = useCallback((): string[] => {
    return Object.keys(errors).filter(key => errors[key] !== null);
  }, [errors]);

  // Handle API errors automatically
  const handleApiError = useCallback((key: string, error: any) => {
    let errorMessage = 'An unexpected error occurred';

    if (error.response) {
      // Server responded with error status
      errorMessage = error.response.data?.error || 
                    error.response.data?.message || 
                    `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'Network error: Please check your connection';
    } else if (error.message) {
      // Something else happened
      errorMessage = error.message;
    }

    setError(key, errorMessage);
    return errorMessage;
  }, [setError]);

  // Wrap an async function with error handling
  const withErrorHandling = useCallback(<T extends any[], R>(
    key: string,
    fn: (...args: T) => Promise<R>,
    options: {
      clearOnStart?: boolean;
      rethrow?: boolean;
    } = {}
  ) => {
    return async (...args: T): Promise<R | null> => {
      if (options.clearOnStart) {
        clearError(key);
      }

      try {
        const result = await fn(...args);
        clearError(key); // Clear error on success
        return result;
      } catch (error: any) {
        const errorMessage = handleApiError(key, error);
        
        if (options.rethrow) {
          throw error;
        }
        
        console.error(`Error in ${key}:`, errorMessage);
        return null;
      }
    };
  }, [clearError, handleApiError]);

  // Set error with automatic clearing after timeout
  const setErrorWithTimeout = useCallback((
    key: string, 
    error: string | Error, 
    timeoutMs: number = 5000
  ) => {
    setError(key, error);

    setTimeout(() => {
      clearError(key);
    }, timeoutMs);
  }, [setError, clearError]);

  // Handle multiple errors at once
  const setMultipleErrors = useCallback((errorMap: Record<string, string | Error | null>) => {
    setErrors(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(errorMap).map(([key, error]) => [
          key,
          error ? (typeof error === 'string' ? error : error.message) : null
        ])
      )
    }));
  }, []);

  // Get user-friendly error message
  const getUserFriendlyError = useCallback((key: string): string => {
    const error = errors[key];
    if (!error) return '';

    // Map common errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'Network error': 'Please check your internet connection and try again.',
      'Server error: 500': 'Our server is experiencing issues. Please try again later.',
      'Server error: 404': 'The requested resource was not found.',
      'Server error: 403': 'You do not have permission to perform this action.',
      'Server error: 401': 'Please log in to continue.',
      'Validation failed': 'Please check your input and try again.',
    };

    // Check for exact matches first
    if (errorMappings[error]) {
      return errorMappings[error];
    }

    // Check for partial matches
    for (const [pattern, message] of Object.entries(errorMappings)) {
      if (error.includes(pattern)) {
        return message;
      }
    }

    return error;
  }, [errors]);

  return {
    errors,
    setError,
    setErrorDetails,
    clearError,
    clearAllErrors,
    hasError,
    getError,
    hasAnyError,
    getAllErrors,
    getErrorKeys,
    handleApiError,
    withErrorHandling,
    setErrorWithTimeout,
    setMultipleErrors,
    getUserFriendlyError,
  };
}

// Simple error hook for single error state
export function useSimpleError() {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const hasError = error !== null;

  const handleError = useCallback((error: any) => {
    let errorMessage = 'An unexpected error occurred';

    if (error.response) {
      errorMessage = error.response.data?.error || 
                    error.response.data?.message || 
                    `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'Network error: Please check your connection';
    } else if (error.message) {
      errorMessage = error.message;
    }

    setError(errorMessage);
    return errorMessage;
  }, []);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      clearOnStart?: boolean;
      rethrow?: boolean;
    } = {}
  ) => {
    return async (...args: T): Promise<R | null> => {
      if (options.clearOnStart) {
        clearError();
      }

      try {
        const result = await fn(...args);
        clearError(); // Clear error on success
        return result;
      } catch (error: any) {
        const errorMessage = handleError(error);
        
        if (options.rethrow) {
          throw error;
        }
        
        console.error('Error:', errorMessage);
        return null;
      }
    };
  }, [clearError, handleError]);

  return {
    error,
    setError,
    clearError,
    hasError,
    handleError,
    withErrorHandling,
  };
}