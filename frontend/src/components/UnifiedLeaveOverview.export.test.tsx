import { describe, it, expect, vi } from 'vitest';
import { apiService } from '../services/api';

// Simple test to verify the export function exists
describe('UnifiedLeaveOverview Export API', () => {
  it('should have exportLeaveToExcel method in apiService', () => {
    expect(apiService.exportLeaveToExcel).toBeDefined();
    expect(typeof apiService.exportLeaveToExcel).toBe('function');
  });

  it('should call the correct API endpoint', async () => {
    // Mock the internal API call
    const mockGet = vi.fn().mockResolvedValue({
      data: new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      headers: {
        'content-disposition': 'attachment; filename="test.xlsx"'
      }
    });
    
    // @ts-ignore - accessing private property for testing
    apiService.api = { get: mockGet };

    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {}
    };
    
    document.createElement = vi.fn(() => mockLink as any);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    await apiService.exportLeaveToExcel({
      view: 'overview',
      year: 2025,
      department: '개발팀',
      riskLevel: 'high'
    });

    // Note: Korean characters are URL encoded
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/leave/export/excel?view=overview&year=2025&department=%EA%B0%9C%EB%B0%9C%ED%8C%80&riskLevel=high',
      expect.objectContaining({
        responseType: 'blob',
        headers: expect.objectContaining({
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
      })
    );
  });

  it('should handle export without optional parameters', async () => {
    // Mock the internal API call
    const mockGet = vi.fn().mockResolvedValue({
      data: new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      headers: {}
    });
    
    // @ts-ignore - accessing private property for testing
    apiService.api = { get: mockGet };

    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {}
    };
    
    document.createElement = vi.fn(() => mockLink as any);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    await apiService.exportLeaveToExcel({
      view: 'team',
      year: 2025
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/admin/leave/export/excel?view=team&year=2025',
      expect.objectContaining({
        responseType: 'blob'
      })
    );
  });

  it('should throw error when export fails', async () => {
    // Mock the internal API call to fail
    const mockGet = vi.fn().mockRejectedValue(new Error('Network error'));
    
    // @ts-ignore - accessing private property for testing
    apiService.api = { get: mockGet };

    await expect(apiService.exportLeaveToExcel({
      view: 'overview',
      year: 2025
    })).rejects.toThrow('Excel 내보내기에 실패했습니다.');
  });
});