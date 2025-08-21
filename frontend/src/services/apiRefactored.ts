import {
  authApiService,
  userApiService,
  leaveApiService,
  payrollApiService,
  departmentApiService,
  documentApiService,
  adminApiService,
} from './api';

/**
 * Refactored API Service - maintains backward compatibility
 * while delegating to domain-specific services
 */
class ApiService {
  // Authentication
  login = authApiService.login.bind(authApiService);
  logout = authApiService.logout.bind(authApiService);
  getCurrentUser = authApiService.getCurrentUser.bind(authApiService);
  verifyPassword = authApiService.verifyPassword.bind(authApiService);
  changePassword = authApiService.changePassword.bind(authApiService);

  // Users
  getUsers = userApiService.getUsers.bind(userApiService);
  getUser = userApiService.getUser.bind(userApiService);
  createUser = userApiService.createUser.bind(userApiService);
  updateUser = userApiService.updateUser.bind(userApiService);
  updateUserProfile = userApiService.updateUserProfile.bind(userApiService);
  deleteUser = userApiService.deleteUser.bind(userApiService);
  activateUser = userApiService.activateUser.bind(userApiService);
  deactivateUser = userApiService.deactivateUser.bind(userApiService);
  reactivateUser = userApiService.reactivateUser.bind(userApiService);
  resetUserPassword = userApiService.resetUserPassword.bind(userApiService);
  getEmploymentInfo = userApiService.getEmploymentInfo.bind(userApiService);
  bulkImportUsers = userApiService.bulkImportUsers.bind(userApiService);
  getUserStats = userApiService.getUserStats.bind(userApiService);
  getUserPermissions = userApiService.getUserPermissions.bind(userApiService);
  updateUserPermissions = userApiService.updateUserPermissions.bind(userApiService);
  getAvailablePermissions = userApiService.getAvailablePermissions.bind(userApiService);

  // Leave Management
  getLeaveRequests = leaveApiService.getLeaveRequests.bind(leaveApiService);
  createLeaveRequest = leaveApiService.createLeaveRequest.bind(leaveApiService);
  updateLeaveRequest = leaveApiService.updateLeaveRequest.bind(leaveApiService);
  deleteLeaveRequest = leaveApiService.deleteLeaveRequest.bind(leaveApiService);
  approveLeaveRequest = leaveApiService.approveLeaveRequest.bind(leaveApiService);
  cancelLeaveRequest = leaveApiService.cancelLeaveRequest.bind(leaveApiService);
  approveLeaveCancellation = leaveApiService.approveLeaveCancellation.bind(leaveApiService);
  getPendingCancellations = leaveApiService.getPendingCancellations.bind(leaveApiService);
  getCancellationHistory = leaveApiService.getCancellationHistory.bind(leaveApiService);
  getEmployeeLeaveLog = leaveApiService.getEmployeeLeaveLog.bind(leaveApiService);
  getAdminLeaveOverview = leaveApiService.getAdminLeaveOverview.bind(leaveApiService);
  getEmployeeLeaveDetails = leaveApiService.getEmployeeLeaveDetails.bind(leaveApiService);
  adjustEmployeeLeave = leaveApiService.adjustEmployeeLeave.bind(leaveApiService);
  getLeaveBalance = leaveApiService.getLeaveBalance.bind(leaveApiService);
  getPendingLeaveRequests = leaveApiService.getPendingLeaveRequests.bind(leaveApiService);
  getLeaveHistory = leaveApiService.getLeaveHistory.bind(leaveApiService);
  approveLeave = leaveApiService.approveLeave.bind(leaveApiService);
  rejectLeave = leaveApiService.rejectLeave.bind(leaveApiService);
  getLeaveStats = leaveApiService.getLeaveStats.bind(leaveApiService);
  getLeavePolicy = leaveApiService.getLeavePolicy.bind(leaveApiService);
  updateLeavePolicy = leaveApiService.updateLeavePolicy.bind(leaveApiService);
  getPolicyHistory = leaveApiService.getPolicyHistory.bind(leaveApiService);
  getBulkPendingRequests = leaveApiService.getBulkPendingRequests.bind(leaveApiService);
  bulkApproveLeaveRequests = leaveApiService.bulkApproveLeaveRequests.bind(leaveApiService);
  exportLeaveToExcel = leaveApiService.exportLeaveToExcel.bind(leaveApiService);

  // Payroll Management
  getMonthlyPayments = payrollApiService.getMonthlyPayments.bind(payrollApiService);
  exportPayrollExcel = payrollApiService.exportPayrollExcel.bind(payrollApiService);
  updatePayroll = payrollApiService.updatePayroll.bind(payrollApiService);
  getSalesData = payrollApiService.getSalesData.bind(payrollApiService);
  getBonuses = payrollApiService.getBonuses.bind(payrollApiService);
  addBonus = payrollApiService.addBonus.bind(payrollApiService);
  getPayrollRecords = payrollApiService.getPayrollRecords.bind(payrollApiService);
  getPayrollRecord = payrollApiService.getPayrollRecord.bind(payrollApiService);
  createPayrollRecord = payrollApiService.createPayrollRecord.bind(payrollApiService);
  updatePayrollRecord = payrollApiService.updatePayrollRecord.bind(payrollApiService);
  deletePayrollRecord = payrollApiService.deletePayrollRecord.bind(payrollApiService);
  getPayrollStats = payrollApiService.getPayrollStats.bind(payrollApiService);
  getPayrollReport = payrollApiService.getPayrollReport.bind(payrollApiService);
  downloadPayrollReport = payrollApiService.downloadPayrollReport.bind(payrollApiService);
  downloadComparisonReport = payrollApiService.downloadComparisonReport.bind(payrollApiService);
  downloadPayslip = payrollApiService.downloadPayslip.bind(payrollApiService);
  uploadPayrollFile = payrollApiService.uploadPayrollFile.bind(payrollApiService);
  getUploadPreview = payrollApiService.getUploadPreview.bind(payrollApiService);
  compareUploadData = payrollApiService.compareUploadData.bind(payrollApiService);
  processUpload = payrollApiService.processUpload.bind(payrollApiService);
  previewPayrollExcel = payrollApiService.previewPayrollExcel.bind(payrollApiService);
  confirmPayrollExcel = payrollApiService.confirmPayrollExcel.bind(payrollApiService);
  exportPayrollData = payrollApiService.exportPayrollData.bind(payrollApiService);
  uploadPayslip = payrollApiService.uploadPayslip.bind(payrollApiService);
  downloadPayslipPdf = payrollApiService.downloadPayslipPdf.bind(payrollApiService);
  deletePayslip = payrollApiService.deletePayslip.bind(payrollApiService);
  getIncentiveTypes = payrollApiService.getIncentiveTypes.bind(payrollApiService);
  getIncentiveConfig = payrollApiService.getIncentiveConfig.bind(payrollApiService);
  updateIncentiveConfig = payrollApiService.updateIncentiveConfig.bind(payrollApiService);
  calculateIncentive = payrollApiService.calculateIncentive.bind(payrollApiService);
  simulateIncentive = payrollApiService.simulateIncentive.bind(payrollApiService);
  batchCalculateIncentives = payrollApiService.batchCalculateIncentives.bind(payrollApiService);
  getIncentiveHistory = payrollApiService.getIncentiveHistory.bind(payrollApiService);
  validateIncentiveFormula = payrollApiService.validateIncentiveFormula.bind(payrollApiService);

  // Departments
  getDepartments = departmentApiService.getDepartments.bind(departmentApiService);
  createDepartment = departmentApiService.createDepartment.bind(departmentApiService);
  updateDepartment = departmentApiService.updateDepartment.bind(departmentApiService);
  deleteDepartment = departmentApiService.deleteDepartment.bind(departmentApiService);
  getDepartmentEmployees = departmentApiService.getDepartmentEmployees.bind(departmentApiService);
  getOrganizationChart = departmentApiService.getOrganizationChart.bind(departmentApiService);

  // Positions
  getPositions = departmentApiService.getPositions.bind(departmentApiService);
  getPosition = departmentApiService.getPosition.bind(departmentApiService);
  createPosition = departmentApiService.createPosition.bind(departmentApiService);
  updatePosition = departmentApiService.updatePosition.bind(departmentApiService);
  deletePosition = departmentApiService.deletePosition.bind(departmentApiService);
  getPositionsByDepartment = departmentApiService.getPositionsByDepartment.bind(departmentApiService);

  // Documents
  getMyDocuments = documentApiService.getMyDocuments.bind(documentApiService);
  downloadDocument = documentApiService.downloadDocument.bind(documentApiService);
  getDocumentPreviewUrl = documentApiService.getDocumentPreviewUrl.bind(documentApiService);
  generateCertificate = documentApiService.generateCertificate.bind(documentApiService);
  getAdminDocuments = documentApiService.getAdminDocuments.bind(documentApiService);
  deleteDocument = documentApiService.deleteDocument.bind(documentApiService);
  replaceDocument = documentApiService.replaceDocument.bind(documentApiService);
  restoreDocument = documentApiService.restoreDocument.bind(documentApiService);

  // Admin/Statistics
  getDashboardStats = adminApiService.getDashboardStats.bind(adminApiService);
}

// Export class and singleton instance
export { ApiService };
export const apiService = new ApiService();
export default apiService;