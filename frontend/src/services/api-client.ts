import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { getValidToken, removeToken } from '../utils/tokenManager';

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
    // Use environment variable
    const apiUrl = import.meta.env.VITE_API_URL;
    
    if (!apiUrl) {
      console.error('VITE_API_URL is not defined in environment variables');
      throw new Error('API URL configuration is missing');
    }
    
    // apiUrl이 이미 /api를 포함하고 있는지 확인
    const finalUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
    this.baseURL = baseURL || finalUrl;
    
    // 디버깅
    console.log('🔧 API Client URL:', this.baseURL);
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
      // Removed withCredentials since we're using JWT tokens instead of cookies
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add JWT token to Authorization header
        const token = getValidToken();
        if (token && !(config as any).skipAuth) {
          if (!config.headers) {
            config.headers = {
              'Content-Type': 'application/json',
            };
          }
          (config.headers as any).Authorization = `Bearer ${token}`;
        }

        // Add timestamp to prevent caching
        if (config.method === 'get') {
          config.params = { ...config.params, _t: Date.now() };
        }

        // Add request logging in development
        if ((import.meta as any).env.DEV || (import.meta as any).env.VITE_DEBUG === 'true') {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
          if (token) {
            console.log('🔑 Authorization header added');
          }
        }

        return config;
      },
      (error) => {
        if ((import.meta as any).env.DEV || (import.meta as any).env.VITE_DEBUG === 'true') {
          console.error('❌ Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if ((import.meta as any).env.DEV || (import.meta as any).env.VITE_DEBUG === 'true') {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        const { response, request, message } = error;

        if ((import.meta as any).env.DEV || (import.meta as any).env.VITE_DEBUG === 'true') {
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
              // Unauthorized - clear token and redirect to login
              console.log('🔄 401 error - clearing token and redirecting to login');
              removeToken();
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
    return (response.data.data || response.data) as T;
  }

  async post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return (response.data.data || response.data) as T;
  }

  async put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return (response.data.data || response.data) as T;
  }

  async patch<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return (response.data.data || response.data) as T;
  }

  async delete<T = any>(url: string, config?: ApiRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return (response.data.data || response.data) as T;
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
    return (response.data.data || response.data) as T;
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
    return (response.data.data || response.data) as PaginatedResponse<T>;
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