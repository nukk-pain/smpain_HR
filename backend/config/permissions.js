// 권한 설정 파일 - 모든 환경에서 동일한 권한 보장
const PERMISSIONS = {
  // 기본 권한 정의
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  
  LEAVE_VIEW: 'leave:view',
  LEAVE_MANAGE: 'leave:manage',
  
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_MANAGE: 'payroll:manage',
  
  REPORTS_VIEW: 'reports:view',
  
  FILES_VIEW: 'files:view',
  FILES_MANAGE: 'files:manage',
  
  DEPARTMENTS_VIEW: 'departments:view',
  DEPARTMENTS_MANAGE: 'departments:manage',
  
  ADMIN_PERMISSIONS: 'admin:permissions'
};

// 역할별 기본 권한
const DEFAULT_PERMISSIONS = {
  user: [
    PERMISSIONS.LEAVE_VIEW
  ],
  manager: [
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.USERS_VIEW
  ],
  admin: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.FILES_VIEW,
    PERMISSIONS.FILES_MANAGE,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.DEPARTMENTS_MANAGE,
    PERMISSIONS.ADMIN_PERMISSIONS
  ]
};

module.exports = {
  PERMISSIONS,
  DEFAULT_PERMISSIONS
};