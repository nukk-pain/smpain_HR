// Enhanced permission middleware with role-based access control
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../utils/database');
const { unauthorizedError, forbiddenError } = require('../utils/responses');

// Permission constants
const PERMISSIONS = {
  // User management
  'user:view': 'View user information',
  'user:create': 'Create new users',
  'user:edit': 'Edit user information',
  'user:delete': 'Delete users',
  'user:manage': 'Full user management access',

  // Leave management
  'leave:view': 'View leave requests',
  'leave:create': 'Create leave requests',
  'leave:edit': 'Edit leave requests',
  'leave:delete': 'Delete leave requests',
  'leave:approve': 'Approve/reject leave requests',
  'leave:manage': 'Full leave management access',

  // Payroll
  'payroll:view': 'View payroll information',
  'payroll:create': 'Create payroll records',
  'payroll:edit': 'Edit payroll records',
  'payroll:delete': 'Delete payroll records',
  'payroll:manage': 'Full payroll management access',

  // Reports
  'reports:view': 'View reports',
  'reports:export': 'Export reports',
  'reports:manage': 'Full report management access',

  // Admin functions
  'admin:system': 'System administration',
  'admin:audit': 'Audit system logs',
  'admin:config': 'Configure system settings',

  // Department management
  'departments:view': 'View departments',
  'departments:create': 'Create departments',
  'departments:edit': 'Edit departments',
  'departments:delete': 'Delete departments',
  'departments:manage': 'Full department management',
};

// Role-based default permissions
const ROLE_PERMISSIONS = {
  'Admin': Object.keys(PERMISSIONS), // Admins get all permissions
  'Manager': [
    'user:view',
    'user:edit',
    'leave:view',
    'leave:approve',
    'leave:manage',
    'payroll:view',
    'reports:view',
    'reports:export',
    'departments:view',
    'departments:edit',
  ],
  'Supervisor': [
    'user:view',
    'user:edit',
    'leave:view',
    'leave:approve',
    'leave:manage',
    'payroll:view',
    'reports:view',
    'reports:export',
    'departments:view',
    'departments:edit',
  ],
  'User': [
    'user:view', // Only own profile
    'leave:view', // Only own requests
    'leave:create',
    'leave:edit', // Only own pending requests
    'payroll:view', // Only own records
  ],
};

// Permission groups for easier management
const PERMISSION_GROUPS = {
  'user_management': ['user:view', 'user:create', 'user:edit', 'user:delete'],
  'leave_management': ['leave:view', 'leave:create', 'leave:edit', 'leave:delete', 'leave:approve'],
  'payroll_management': ['payroll:view', 'payroll:create', 'payroll:edit', 'payroll:delete'],
  'department_management': ['departments:view', 'departments:create', 'departments:edit', 'departments:delete'],
  'reporting': ['reports:view', 'reports:export'],
  'administration': ['admin:system', 'admin:audit', 'admin:config'],
};

// Authentication middleware (JWT-based)
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return unauthorizedError(res, 'Authentication required');
  }
  next();
};

// Permission check middleware factory
const requirePermission = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return unauthorizedError(res, 'Authentication required');
      }

      // Check if user has the required permission
      const hasPermission = await checkUserPermission(user, permission, req, options);
      
      if (!hasPermission) {
        return forbiddenError(res, `Permission denied: ${permission}`);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return forbiddenError(res, 'Permission check failed');
    }
  };
};

// Role-based access control middleware
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return unauthorizedError(res, 'Authentication required');
    }

    if (!roleArray.includes(user.role)) {
      return forbiddenError(res, `Access denied. Required role: ${roleArray.join(' or ')}`);
    }

    next();
  };
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  return requireRole('Admin')(req, res, next);
};

// Supervisor or Admin middleware (formerly Manager)
const requireSupervisorOrAdmin = (req, res, next) => {
  return requireRole(['Supervisor', 'Manager', 'Admin'])(req, res, next);
};

// Legacy alias for backward compatibility
const requireManagerOrAdmin = requireSupervisorOrAdmin;

// Resource ownership middleware
const requireOwnership = (resourceIdParam = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return unauthorizedError(res, 'Authentication required');
      }

      // Admins can access any resource
      if (user.role === 'Admin') {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      
      // If checking user's own profile
      if (resourceIdParam === 'id' && resourceId === user._id) {
        return next();
      }

      // For other resources, check if user owns the resource
      const db = await getDatabase();
      const collection = getCollectionFromRoute(req.route.path);
      
      if (collection) {
        const resource = await db.collection(collection).findOne({
          _id: new ObjectId(resourceId)
        });

        if (!resource) {
          return forbiddenError(res, 'Resource not found');
        }

        if (resource[userIdField]?.toString() !== user._id) {
          return forbiddenError(res, 'Access denied: You can only access your own resources');
        }
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return forbiddenError(res, 'Ownership check failed');
    }
  };
};

// Department-based access control
const requireDepartmentAccess = (allowSameDepartment = true, allowManagers = true) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return unauthorizedError(res, 'Authentication required');
      }

      // Admins can access everything
      if (user.role === 'Admin') {
        return next();
      }

      // Managers can access their department (if allowed)
      if (allowManagers && user.role === 'Manager') {
        return next();
      }

      // Check department access for specific resources
      const targetUserId = req.params.userId || req.body.userId;
      
      if (targetUserId && allowSameDepartment) {
        const db = await getDatabase();
        const targetUser = await db.collection('users').findOne({
          _id: new ObjectId(targetUserId)
        });

        if (targetUser && targetUser.department === user.department) {
          return next();
        }
      }

      return forbiddenError(res, 'Access denied: Department restriction');
    } catch (error) {
      console.error('Department access check error:', error);
      return forbiddenError(res, 'Department access check failed');
    }
  };
};

// Check if user has a specific permission
async function checkUserPermission(user, permission, req = null, options = {}) {
  try {
    // Admins have all permissions
    if (user.role === 'Admin') {
      return true;
    }

    // Check explicit user permissions
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    // Check role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    if (rolePermissions.includes(permission)) {
      // Additional context-based checks
      return await contextualPermissionCheck(user, permission, req, options);
    }

    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

// Contextual permission checks (e.g., users can only view their own data)
async function contextualPermissionCheck(user, permission, req, options = {}) {
  if (!req) return true;

  // For viewing permissions, users can only see their own data
  if (permission.endsWith(':view')) {
    // Check if it's the user's own data
    const userId = req.params.id || req.params.userId || req.query.user_id;
    
    if (userId && userId !== user._id) {
      // Managers can view their department's data
      if (user.role === 'Manager' && options.allowDepartmentAccess) {
        return await checkDepartmentAccess(user, userId);
      }
      return false;
    }
  }

  // For edit/delete permissions on leave requests
  if (permission.includes('leave:') && !permission.includes('approve')) {
    const leaveId = req.params.id;
    if (leaveId) {
      return await checkLeaveOwnership(user, leaveId);
    }
  }

  return true;
}

// Check if user has access to another user's data based on department
async function checkDepartmentAccess(user, targetUserId) {
  try {
    const db = await getDatabase();
    const targetUser = await db.collection('users').findOne({
      _id: new ObjectId(targetUserId)
    });

    return targetUser && targetUser.department === user.department;
  } catch (error) {
    console.error('Department access check error:', error);
    return false;
  }
}

// Check if user owns a leave request
async function checkLeaveOwnership(user, leaveId) {
  try {
    const db = await getDatabase();
    const leaveRequest = await db.collection('leaveRequests').findOne({
      _id: new ObjectId(leaveId)
    });

    return leaveRequest && leaveRequest.userId.toString() === user._id;
  } catch (error) {
    console.error('Leave ownership check error:', error);
    return false;
  }
}

// Get collection name from route path
function getCollectionFromRoute(routePath) {
  if (routePath.includes('/users')) return 'users';
  if (routePath.includes('/leave')) return 'leaveRequests';
  if (routePath.includes('/payroll')) return 'payroll';
  if (routePath.includes('/departments')) return 'departments';
  return null;
}

// Permission combination middleware (requires ALL permissions)
const requireAllPermissions = (permissions) => {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return unauthorizedError(res, 'Authentication required');
    }

    for (const permission of permissions) {
      const hasPermission = await checkUserPermission(user, permission, req);
      if (!hasPermission) {
        return forbiddenError(res, `Permission denied: ${permission}`);
      }
    }

    next();
  };
};

// Permission combination middleware (requires ANY permission)
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return unauthorizedError(res, 'Authentication required');
    }

    for (const permission of permissions) {
      const hasPermission = await checkUserPermission(user, permission, req);
      if (hasPermission) {
        return next();
      }
    }

    return forbiddenError(res, `Permission denied. Required: ${permissions.join(' or ')}`);
  };
};

// Get user's effective permissions
async function getUserPermissions(user) {
  const permissions = new Set();

  // Add role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  rolePermissions.forEach(perm => permissions.add(perm));

  // Add explicit user permissions
  if (user.permissions) {
    user.permissions.forEach(perm => permissions.add(perm));
  }

  return Array.from(permissions);
}

// Permission info middleware (adds permission info to request)
const addPermissionInfo = async (req, res, next) => {
  const user = req.user;
  
  if (user) {
    req.userPermissions = await getUserPermissions(user);
    req.hasPermission = (permission) => checkUserPermission(user, permission, req);
  }

  next();
};

module.exports = {
  // Core middleware
  requireAuth,
  requirePermission,
  requireRole,
  requireAdmin,
  requireManagerOrAdmin,
  requireSupervisorOrAdmin,
  requireOwnership,
  requireDepartmentAccess,
  requireAllPermissions,
  requireAnyPermission,
  addPermissionInfo,

  // Utility functions
  checkUserPermission,
  getUserPermissions,
  
  // Constants
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
};