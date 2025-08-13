// Common middleware functions for admin routes

// Permission middleware with role-based fallback
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userPermissions = req.user.permissions || [];
    const userRole = req.user.role;
    
    // Admin role has all permissions
    if (userRole === 'admin' || userRole === 'Admin') {
      return next();
    }
    
    // Check specific permission in user's permissions array
    if (userPermissions.includes(permission)) {
      return next();
    }

    // If user doesn't have explicit permission, check if their role should have it
    const roleBasedPermissions = {
      user: ['leave:view'],
      manager: ['leave:view', 'leave:manage', 'users:view'],
      supervisor: ['leave:view', 'leave:manage', 'users:view'],
      admin: ['users:view', 'users:manage', 'users:create', 'users:edit', 'users:delete',
               'leave:view', 'leave:manage', 'payroll:view', 'payroll:manage',
               'reports:view', 'files:view', 'files:manage', 'departments:view',
               'departments:manage', 'admin:permissions']
    };

    const rolePermissions = roleBasedPermissions[userRole.toLowerCase()] || [];
    if (rolePermissions.includes(permission)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Admin role check
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  requirePermission,
  requireAdmin
};