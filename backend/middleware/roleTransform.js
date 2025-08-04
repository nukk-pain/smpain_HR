/**
 * Middleware to handle role transformation for backward compatibility
 * Transforms 'manager' to 'supervisor' in responses and vice versa in requests
 */

// Transform role and field names in a single object
const transformRole = (obj, direction = 'toClient') => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (direction === 'toClient') {
    // Transform for client: manager -> supervisor
    if (obj.role === 'manager') {
      obj.role = 'supervisor';
    }
    // Transform field names: managerId -> supervisorId
    if (obj.managerId !== undefined) {
      obj.supervisorId = obj.managerId;
      delete obj.managerId;
    }
  } else {
    // Transform from client: supervisor -> manager (for backward compatibility)
    if (obj.role === 'supervisor') {
      obj.role = 'manager';
    }
    // Transform field names: supervisorId -> managerId
    if (obj.supervisorId !== undefined) {
      obj.managerId = obj.supervisorId;
      delete obj.supervisorId;
    }
  }
  
  return obj;
};

// Recursively transform roles in nested objects/arrays
const transformRoleDeep = (data, direction = 'toClient') => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => transformRoleDeep(item, direction));
  }
  
  if (typeof data === 'object') {
    // Clone to avoid mutating original
    const transformed = { ...data };
    
    // Transform role if present
    if (transformed.role) {
      transformRole(transformed, direction);
    }
    
    // Check for nested user objects
    if (transformed.user && transformed.user.role) {
      transformRole(transformed.user, direction);
    }
    
    // Check for arrays of users
    if (transformed.users && Array.isArray(transformed.users)) {
      transformed.users = transformed.users.map(user => transformRole({ ...user }, direction));
    }
    
    // Check for data property (common in API responses)
    if (transformed.data) {
      transformed.data = transformRoleDeep(transformed.data, direction);
    }
    
    return transformed;
  }
  
  return data;
};

// Middleware to transform request body
const transformRequestRoles = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = transformRoleDeep(req.body, 'fromClient');
  }
  next();
};

// Middleware to transform response
const transformResponseRoles = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Transform the response data
    const transformed = transformRoleDeep(data, 'toClient');
    
    // Call the original json method
    return originalJson.call(this, transformed);
  };
  
  next();
};

module.exports = {
  transformRole,
  transformRoleDeep,
  transformRequestRoles,
  transformResponseRoles
};