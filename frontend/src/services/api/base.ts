import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../../types';
import { getApiUrl } from '../../config/env';
import { getValidToken, clearAuth } from '../../utils/tokenManager';

export class BaseApiService {
  protected api: AxiosInstance;

  constructor() {
    // Production fallback to hardcoded URL if env var fails
    let apiUrl = '/api'; // Default value
    
    // Check environment variables
    const directApiUrl = import.meta.env.VITE_API_URL;
    const configApiUrl = getApiUrl();
    
    // Prefer env var, then config system
    if (directApiUrl) {
      apiUrl = directApiUrl;
    } else if (configApiUrl && configApiUrl !== '/api') {
      apiUrl = configApiUrl;
    }
    
    // API URL debugging (console only)
    console.log('🌐 API Service initialized with URL:', apiUrl);
    
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add JWT token to Authorization header
        const token = getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          if (import.meta.env.DEV) {
            console.log('🔑 Token added to request', {
              url: config.url,
              method: config.method,
              hasToken: true,
              tokenLength: token.length,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn('⚠️ No token available for request', {
              url: config.url,
              method: config.method,
              timestamp: new Date().toISOString()
            });
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Only clear token if this is not a login request and not already on login page
          const isLoginRequest = error.config?.url?.includes('/auth/login');
          const isOnLoginPage = window.location.pathname === '/login';
          
          if (import.meta.env.DEV) {
            console.warn('🚫 401 Unauthorized received', {
              url: error.config?.url,
              isLoginRequest,
              isOnLoginPage,
              currentPath: window.location.pathname,
              willClearToken: !isLoginRequest && !isOnLoginPage,
              timestamp: new Date().toISOString()
            });
          }
          
          if (!isLoginRequest && !isOnLoginPage) {
            if (import.meta.env.DEV) {
              console.warn('🗑️ Clearing token due to 401 error');
            }
            clearAuth();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(url, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.delete(url, { data });
    return response.data;
  }

  async upload(url: string, formData: FormData): Promise<any> {
    // Generate a simple CSRF token for file uploads
    const csrfToken = Math.random().toString(36).substr(2) + Date.now().toString(36);
    
    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-csrf-token': csrfToken,
      },
    });
    return response.data;
  }

  // Upload with progress tracking
  async uploadWithProgress(
    url: string, 
    formData: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  }
}