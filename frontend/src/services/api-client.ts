import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

// Base types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  documents: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalDocuments: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  retries?: number;
}

// API Error class
export class ApiError extends Error {
  public status: number;
  public response?: any;
  public code?: string;

  constructor(message: string, status: number, response?: any, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    this.code = code;
  }
}

// Main API Client
export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private defaultTimeout: number = 10000;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || (import.meta as any).env.VITE_API_BASE_URL || '/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        if (config.method === 'get') {
          config.params = { ...config.params, _t: Date.now() };
        }

        // Add request logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        const { response, request, message } = error;

        if (process.env.NODE_ENV === 'development') {
          console.error('❌ API Error:', {
            url: error.config?.url,
            status: response?.status,
            message: response?.data?.error || message,
          });
        }

        // Handle specific HTTP status codes
        if (response) {
          const { status, data } = response;
          const errorMessage = data?.error || data?.message || 'An error occurred';

          switch (status) {
            case 401:
              // Unauthorized - redirect to login
              if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
              break;
            case 403:
              // Forbidden
              break;
            case 404:
              // Not found
              break;
            case 422:
              // Validation error
              break;
            case 500:
              // Server error
              break;
          }

          throw new ApiError(errorMessage, status, response, data?.code);
        } else if (request) {
          // Network error
          throw new ApiError('Network error. Please check your connection.', 0);
        } else {
          // Request setup error
          throw new ApiError(message || 'Request failed', 0);
        }
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data || response.data;
  }

  async post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data || response.data;
  }

  async put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data || response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data.data || response.data;
  }

  async delete<T = any>(url: string, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data || response.data;
  }

  // File upload method
  async upload<T = any>(url: string, formData: FormData, config?: ApiRequestConfig): Promise<T> {
    const uploadConfig: ApiRequestConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    };

    const response = await this.client.post<ApiResponse<T>>(url, formData, uploadConfig);
    return response.data.data || response.data;
  }

  // Paginated requests
  async getPaginated<T = any>(
    url: string, 
    page: number = 1, 
    limit: number = 10, 
    params?: any
  ): Promise<PaginatedResponse<T>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<T>>>(url, {
      params: { page, limit, ...params }
    });
    return response.data.data || response.data;
  }

  // Bulk operations
  async bulkCreate<T = any>(url: string, items: any[]): Promise<T> {
    return this.post<T>(url, { items });
  }

  async bulkUpdate<T = any>(url: string, updates: Array<{ id: string; data: any }>): Promise<T> {
    return this.put<T>(url, { updates });
  }

  async bulkDelete<T = any>(url: string, ids: string[]): Promise<T> {
    return this.delete<T>(url, { data: { ids } });
  }

  // Retry mechanism
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Don't retry on client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError!;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }

  // Cancel all pending requests
  cancelAllRequests(message: string = 'Requests cancelled') {
    // This would require implementing cancellation tokens
    // For now, we'll just log
    console.log('Cancelling all pending requests:', message);
  }

  // Update base configuration
  setBaseURL(baseURL: string) {
    this.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }

  setTimeout(timeout: number) {
    this.defaultTimeout = timeout;
    this.client.defaults.timeout = timeout;
  }

  setHeader(name: string, value: string) {
    this.client.defaults.headers.common[name] = value;
  }

  removeHeader(name: string) {
    delete this.client.defaults.headers.common[name];
  }

  // Get raw axios instance for advanced usage
  getRawClient(): AxiosInstance {
    return this.client;
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

// Export default instance
export default apiClient;