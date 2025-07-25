/**
 * Field name conversion utilities for consistent API responses
 * Converts between snake_case (database) and camelCase (API)
 */

/**
 * Convert snake_case to camelCase
 * @param {string} str - Snake case string
 * @returns {string} Camel case string
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 * @param {string} str - Camel case string
 * @returns {string} Snake case string
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from snake_case to camelCase
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with camelCase keys
 */
function convertKeysToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamel(item));
  }
  
  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = convertKeysToCamel(obj[key]);
      return result;
    }, {});
  }
  
  return obj;
}

/**
 * Convert object keys from camelCase to snake_case
 * @param {Object} obj - Object with camelCase keys
 * @returns {Object} Object with snake_case keys
 */
function convertKeysToSnake(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnake(item));
  }
  
  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = convertKeysToSnake(obj[key]);
      return result;
    }, {});
  }
  
  return obj;
}

/**
 * Common field mappings for special cases
 */
const fieldMappings = {
  // Database to API
  toApi: {
    '_id': 'id',
    'user_id': 'userId',
    'employee_id': 'employeeId',
    'year_month': 'yearMonth',
    'start_date': 'startDate',
    'end_date': 'endDate',
    'leave_type': 'leaveType',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'is_active': 'isActive',
    'hire_date': 'hireDate',
    'phone_number': 'phoneNumber',
    'birth_date': 'birthDate',
    'substitute_employee': 'substituteEmployee',
    'days_count': 'daysCount',
    'leave_balance': 'leaveBalance',
    'total_amount': 'totalAmount',
    'base_salary': 'baseSalary',
    'sales_amount': 'salesAmount'
  },
  // API to Database
  toDb: {}
};

// Generate reverse mappings
Object.entries(fieldMappings.toApi).forEach(([dbField, apiField]) => {
  fieldMappings.toDb[apiField] = dbField;
});

/**
 * Convert database document to API response format
 * @param {Object} doc - Database document
 * @returns {Object} API-formatted object
 */
function dbToApi(doc) {
  if (!doc) return doc;
  
  if (Array.isArray(doc)) {
    return doc.map(item => dbToApi(item));
  }
  
  const converted = {};
  
  Object.entries(doc).forEach(([key, value]) => {
    // Check for special mapping first
    const mappedKey = fieldMappings.toApi[key] || snakeToCamel(key);
    
    // Recursively convert nested objects
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      converted[mappedKey] = dbToApi(value);
    } else {
      converted[mappedKey] = value;
    }
  });
  
  return converted;
}

/**
 * Convert API request to database format
 * @param {Object} data - API request data
 * @returns {Object} Database-formatted object
 */
function apiToDb(data) {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => apiToDb(item));
  }
  
  const converted = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Check for special mapping first
    const mappedKey = fieldMappings.toDb[key] || camelToSnake(key);
    
    // Don't convert 'id' back to '_id' for updates
    if (key === 'id' && mappedKey === '_id') {
      return; // Skip this field
    }
    
    // Recursively convert nested objects
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      converted[mappedKey] = apiToDb(value);
    } else {
      converted[mappedKey] = value;
    }
  });
  
  return converted;
}

/**
 * Express middleware for automatic field conversion
 * Converts request body from camelCase to snake_case
 */
function requestConverter(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.dbBody = apiToDb(req.body); // Store converted version
    // Keep original body for backward compatibility
  }
  next();
}

/**
 * Express middleware for automatic response conversion
 * Converts response from snake_case to camelCase
 */
function responseConverter(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Only convert successful responses with data
    if (data && data.success !== false && (data.data || Array.isArray(data))) {
      if (data.data) {
        data.data = dbToApi(data.data);
      } else if (Array.isArray(data)) {
        data = dbToApi(data);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

module.exports = {
  snakeToCamel,
  camelToSnake,
  convertKeysToCamel,
  convertKeysToSnake,
  dbToApi,
  apiToDb,
  requestConverter,
  responseConverter,
  fieldMappings
};