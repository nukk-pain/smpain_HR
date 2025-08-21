import { BaseApiService } from './base';
import { ApiResponse, Department, Position, OrganizationChart, DepartmentEmployees } from '../../types';

export class DepartmentApiService extends BaseApiService {
  // Department Management
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    return this.get<Department[]>('/departments/');
  }

  async createDepartment(data: any) {
    return this.post('/departments/', data);
  }

  async updateDepartment(id: string, data: any) {
    return this.put(`/departments/${id}`, data);
  }

  async deleteDepartment(id: string) {
    return this.delete(`/departments/${id}`);
  }

  async getDepartmentEmployees(departmentName: string): Promise<ApiResponse<DepartmentEmployees>> {
    return this.get<DepartmentEmployees>(`/departments/${departmentName}/employees`);
  }

  async getOrganizationChart(): Promise<ApiResponse<OrganizationChart>> {
    return this.get<OrganizationChart>('/organization-chart');
  }

  // Position Management
  async getPositions(): Promise<ApiResponse<Position[]>> {
    return this.get<Position[]>('/positions/');
  }

  async getPosition(id: string) {
    return this.get(`/positions/${id}`);
  }

  async createPosition(data: any) {
    return this.post('/positions/', data);
  }

  async updatePosition(id: string, data: any) {
    return this.put(`/positions/${id}`, data);
  }

  async deletePosition(id: string) {
    return this.delete(`/positions/${id}`);
  }

  async getPositionsByDepartment(department: string) {
    return this.get(`/positions/department/${department}`);
  }
}

export const departmentApiService = new DepartmentApiService();