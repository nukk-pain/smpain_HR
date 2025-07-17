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
 * Permission middleware generator
 * @param {string} permission - Required permission
 * @returns {Function} - Middleware function
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userPermissions = req.session.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = {
  getUserObjectId,
  toObjectId,
  addIdField,
  requirePermission
};