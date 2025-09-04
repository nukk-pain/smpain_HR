import { BaseApiService } from './base';
import { ApiResponse } from '../../types';

export class AdminApiService extends BaseApiService {
  // Dashboard Statistics
  async getDashboardStats() {
    return this.get('/admin/stats/system');
  }
}

export const adminApiService = new AdminApiService();