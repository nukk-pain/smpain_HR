/**
 * MongoDB Query Sanitizer
 * Prevents NoSQL injection attacks by sanitizing user input before database queries
 */

/**
 * Sanitizes a value to ensure it's safe for MongoDB queries
 * Prevents operator injection attacks like { $ne: null }
 * @param {any} value - The value to sanitize
 * @param {string} type - Expected type ('string', 'number', 'boolean', 'objectId')
 * @returns {any} - Sanitized value or null if invalid
 */
function sanitizeValue(value, type = 'string') {
  // Null or undefined values
  if (value === null || value === undefined) {
    return null;
  }

  // Check for MongoDB operators (keys starting with $)
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    const hasOperator = keys.some(key => key.startsWith('$'));
    if (hasOperator) {
      console.warn('Potential NoSQL injection attempt detected:', value);
      return null;
    }
  }

  // Type-specific sanitization
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return null;
      }
      // Remove any null bytes and ensure it's a plain string
      return String(value).replace(/\0/g, '');

    case 'number':
      const num = Number(value);
      return isNaN(num) ? null : num;

    case 'boolean':
      return Boolean(value);

    case 'objectId':
      // MongoDB ObjectId validation (24 hex characters)
      if (typeof value !== 'string' || !/^[0-9a-fA-F]{24}$/.test(value)) {
        return null;
      }
      return value;

    default:
      return null;
  }
}

/**
 * Sanitizes an entire query object for MongoDB
 * @param {object} query - The query object to sanitize
 * @param {object} schema - Schema defining expected types for each field
 * @returns {object} - Sanitized query object
 */
function sanitizeQuery(query, schema = {}) {
  if (!query || typeof query !== 'object') {
    return {};
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Skip keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) {
      console.warn('MongoDB operator in query key detected and removed:', key);
      continue;
    }

    // Get expected type from schema or default to string
    const expectedType = schema[key] || 'string';
    
    // Sanitize the value
    const sanitizedValue = sanitizeValue(value, expectedType);
    
    // Only include non-null values in the sanitized query
    if (sanitizedValue !== null) {
      sanitized[key] = sanitizedValue;
    }
  }

  return sanitized;
}

/**
 * Sanitizes user input for authentication queries
 * @param {string} username - Username to sanitize
 * @param {string} password - Password to sanitize
 * @returns {object} - Object with sanitized username and password
 */
function sanitizeAuthInput(username, password) {
  return {
    username: sanitizeValue(username, 'string'),
    password: sanitizeValue(password, 'string')
  };
}

/**
 * Validates and sanitizes MongoDB update operations
 * @param {object} update - Update object to sanitize
 * @returns {object} - Sanitized update object
 */
function sanitizeUpdate(update) {
  if (!update || typeof update !== 'object') {
    return {};
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(update)) {
    // Allow $set, $unset, $inc, $push, $pull operators at top level
    if (key === '$set' || key === '$unset' || key === '$inc' || key === '$push' || key === '$pull') {
      // Recursively sanitize the nested object
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = {};
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (!nestedKey.startsWith('$')) {
            sanitized[key][nestedKey] = nestedValue;
          }
        }
      }
    } else if (!key.startsWith('$')) {
      // Regular field update
      sanitized[key] = value;
    }
  }

  return sanitized;
}

module.exports = {
  sanitizeValue,
  sanitizeQuery,
  sanitizeAuthInput,
  sanitizeUpdate
};