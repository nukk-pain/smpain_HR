import { BaseApiService } from './base';
import { ApiResponse, User } from '../../types';

export class UserApiService extends BaseApiService {
  async getUsers(params?: {
    department?: string;
    position?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<ApiResponse<User[]>> {
    return this.get<User[]>('/users/', params);
  }

  async getUser(id: string) {
    return this.get(`/users/${id}`);
  }

  async createUser(data: any) {
    return this.post('/users/', data);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/users/${id}`, data);
  }

  async updateUserProfile(id: string, data: { name: string; birthDate?: string; phoneNumber?: string }) {
    return this.put(`/users/profile/${id}`, data);
  }

  async deleteUser(id: string, confirmed: boolean = false) {
    return this.delete(`/users/${id}`, { confirmed });
  }

  async activateUser(id: string) {
    return this.post(`/users/${id}/activate`);
  }

  async deactivateUser(id: string, reason?: string) {
    return this.put(`/users/${id}/deactivate`, { reason });
  }

  async reactivateUser(id: string) {
    return this.put(`/users/${id}/reactivate`);
  }

  async resetUserPassword(id: string, password: string) {
    return this.post(`/users/${id}/reset-password`, { password });
  }

  async getEmploymentInfo(id: string) {
    return this.get(`/users/${id}/employment-info`);
  }

  async bulkImportUsers(users: any[]) {
    return this.post('/users/bulk-import', { users });
  }

  async getUserStats() {
    return this.get('/users/stats/overview');
  }

  async getUserPermissions(userId: string) {
    return this.get(`/users/${userId}/permissions`);
  }

  async updateUserPermissions(userId: string, permissions: string[]) {
    return this.put(`/users/${userId}/permissions`, { permissions });
  }

  async getAvailablePermissions() {
    // TODO: This endpoint doesn't exist in backend - needs implementation
    console.warn('getAvailablePermissions endpoint not implemented in backend');
    return Promise.resolve({ 
      success: true, 
      data: [],
      message: 'Endpoint not implemented' 
    });
  }
}

export const userApiService = new UserApiService();