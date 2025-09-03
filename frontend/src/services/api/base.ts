import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../../types';
import { getApiUrl } from '../../config/env';
import { getValidToken, getAccessToken, getRefreshToken, storeTokens, storeToken, clearAuth } from '../../utils/tokenManager';

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
      // withCredentials removed: JWT header auth only
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Shared refresh state for this client instance
    let isRefreshing = false as boolean;
    let refreshPromise: Promise<string> | null = null;
    let requestQueue: Array<(token: string) => void> = [];

    const enqueueRequest = (cb: (token: string) => void) => { requestQueue.push(cb); };
    const resolveQueue = (token: string) => { requestQueue.forEach(cb => cb(token)); requestQueue = []; };
    const rejectQueue = () => { requestQueue = []; };

    const doRefresh = async (): Promise<string> => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      const resp = await this.api.post('/auth/refresh', { refreshToken }, { headers: { Authorization: '' } });
      const data = resp.data || {};
      const newAccess = data.accessToken || data.token;
      const newRefresh = data.refreshToken || refreshToken;
      if (!newAccess) throw new Error('Refresh returned no access token');
      if (newRefresh) storeTokens(newAccess, newRefresh); else storeToken(newAccess);
      this.api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
      return newAccess;
    };

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Skip auth header for login/refresh
        const url = config.url || '';
        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
        // Add JWT token to Authorization header
        const token = isAuthEndpoint ? null : (getAccessToken() || getValidToken());
        if (token && !isAuthEndpoint) {
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
        const { response, config } = error || {};
        const originalRequest = config || {};
        if (!response || response.status !== 401) {
          return Promise.reject(error);
        }
        const url: string = originalRequest?.url || '';
        const isLogin = url.includes('/auth/login');
        const isRefresh = url.includes('/auth/refresh');
        if (isLogin || isRefresh) {
          return Promise.reject(error);
        }
        if ((originalRequest as any)._retry) {
          return Promise.reject(error);
        }
        (originalRequest as any)._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = doRefresh()
            .then((token) => { resolveQueue(token); return token; })
            .catch((err) => {
              clearAuth();
              if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
              rejectQueue();
              throw err;
            })
            .finally(() => { isRefreshing = false; refreshPromise = null; });
        }

        return new Promise((resolve, reject) => {
          const retry = (token: string) => {
            if (!token) return reject(error);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(this.api.request(originalRequest));
          };
          if (refreshPromise) {
            enqueueRequest(retry);
          } else {
            reject(error);
          }
        });
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
