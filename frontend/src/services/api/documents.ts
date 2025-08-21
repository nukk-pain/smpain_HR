import { BaseApiService } from './base';
import { ApiResponse } from '../../types';
import { getValidToken } from '../../utils/tokenManager';

export class DocumentApiService extends BaseApiService {
  // My Documents
  async getMyDocuments(params?: {
    type?: string;
    year?: number;
    month?: number;
    category?: string;
  }): Promise<ApiResponse<any[]>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.get(`/documents${queryString ? '?' + queryString : ''}`);
  }

  async downloadDocument(documentId: string) {
    const response = await this.api.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  getDocumentPreviewUrl(documentId: string): string {
    const token = getValidToken();
    return `${this.api.defaults.baseURL}/documents/${documentId}/preview?token=${token}`;
  }

  async generateCertificate(data: {
    type: 'employment' | 'career' | 'income';
    purpose: string;
    language?: 'ko' | 'en';
  }): Promise<ApiResponse<any>> {
    return this.post('/documents/certificate/generate', data);
  }

  // Admin Document Management
  async getAdminDocuments(params?: {
    userId?: string;
    type?: string;
    includeDeleted?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.get(`/documents/admin/all${queryString ? '?' + queryString : ''}`);
  }

  async deleteDocument(documentId: string, reason: string): Promise<ApiResponse<any>> {
    return this.delete(`/documents/${documentId}`, { reason });
  }

  async replaceDocument(documentId: string, formData: FormData): Promise<ApiResponse<any>> {
    return this.upload(`/documents/${documentId}/replace`, formData);
  }

  async restoreDocument(documentId: string): Promise<ApiResponse<any>> {
    return this.put(`/documents/${documentId}/restore`, {});
  }
}

export const documentApiService = new DocumentApiService();