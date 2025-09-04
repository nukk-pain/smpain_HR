import { BaseApiService } from './base';
import { AuthResponse, ApiResponse } from '../../types';

export class AuthApiService extends BaseApiService {
  async login(username: string, password: string): Promise<AuthResponse> {
    console.log('🔐 Login attempt:', {
      baseURL: this.api.defaults.baseURL,
      url: '/auth/login',
      fullURL: `${this.api.defaults.baseURL}/auth/login`,
      method: 'POST'
    });
    
    const response = await this.api.post('/auth/login', { username, password });
    return response.data;
  }

  async logout(): Promise<ApiResponse<any>> {
    return this.post('/auth/logout');
  }

  async getCurrentUser(): Promise<AuthResponse> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async verifyPassword(password: string): Promise<{ verificationToken: string; expiresAt: string }> {
    const response = await this.api.post('/auth/verify-password', { password });
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  }
}

export const authApiService = new AuthApiService();