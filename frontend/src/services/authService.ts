import apiService from './api';

export const authService = {
  async verifyPassword(password: string) {
    return apiService.verifyPassword(password);
  },

  async login(username: string, password: string) {
    return apiService.login(username, password);
  },

  async logout() {
    return apiService.logout();
  },

  async getCurrentUser() {
    return apiService.getCurrentUser();
  }
};