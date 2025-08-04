const { ObjectId } = require('mongodb');

/**
 * Helper function to get user ObjectId from session userId
 * @param {Object} db - Database instance
 * @param {string} userId - User ID (ObjectId or username/name)
 * @returns {ObjectId|null} - User ObjectId or null if not found
 */
const getUserObjectId = async (db, userId) => {
  if (ObjectId.isValid(userId)) {
    return new ObjectId(userId);
  } else {
    // If userId is not valid ObjectId, find user by name or username
    const user = await db.collection('users').findOne({ 
      $or: [
        { name: userId },
        { username: userId }
      ]
    });
    return user ? user._id : null;
  }
};

/**
 * Helper function to safely convert to ObjectId
 * @param {string} id - ID to convert
 * @returns {ObjectId} - Converted ObjectId
 * @throws {Error} - If ID format is invalid
 */
const toObjectId = (id) => {
  if (ObjectId.isValid(id)) {
    return new ObjectId(id);
  } else {
    throw new Error('Invalid ID format');
  }
};

/**
 * Helper function to add id field for frontend compatibility
 * @param {Object} request - Request object
 * @returns {Object} - Request object with id field added
 */
const addIdField = (request) => {
  return {
    ...request,
    id: request._id ? request._id.toString() : undefined
  };
};

/**
 * Permission middleware generator (JWT-based)
 * @param {string} permission - Required permission
 * @returns {Function} - Middleware function
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    // JWT authentication sets req.user via requireAuth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
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
    // This handles cases where users were created before the permission system
    // or when role-based permissions are expected
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
    
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions'
    });
  };
};

module.exports = {
  getUserObjectId,
  toObjectId,
  addIdField,
  requirePermission
};