/**
 * Error Log Data Transfer Object
 * Defines the structure of error log data
 */

class ErrorLogDTO {
  constructor(data = {}) {
    this.timestamp = data.timestamp || new Date();
    this.message = data.message || '';
    this.severity = data.severity || 'error';
    this.category = data.category || 'UNKNOWN';
    this.fingerprint = data.fingerprint || '';
    this.stack = data.stack || '';
    this.code = data.code || null;
    this.metadata = data.metadata || {};
    this.userId = data.userId || null;
    this.requestId = data.requestId || null;
    this.correlationId = data.correlationId || null;
    this.service = data.service || 'unknown';
    this.method = data.method || null;
    this.url = data.url || null;
    this.httpMethod = data.httpMethod || null;
    this.statusCode = data.statusCode || null;
    this.userAgent = data.userAgent || null;
    this.ip = data.ip || null;
    this.resolved = data.resolved || false;
    this.resolvedAt = data.resolvedAt || null;
    this.resolvedBy = data.resolvedBy || null;
    this.notes = data.notes || '';
    this.tags = data.tags || [];
  }
  
  /**
   * Validate the DTO
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validate() {
    const errors = [];
    
    // Required fields
    if (!this.message) {
      errors.push('Message is required');
    }
    
    if (!this.timestamp || !(this.timestamp instanceof Date)) {
      errors.push('Valid timestamp is required');
    }
    
    // Validate severity
    const validSeverities = ['critical', 'error', 'warning', 'info', 'debug', 'trace'];
    if (!validSeverities.includes(this.severity)) {
      errors.push(`Severity must be one of: ${validSeverities.join(', ')}`);
    }
    
    // Validate category
    const validCategories = [
      'DATABASE', 'VALIDATION', 'AUTHENTICATION', 
      'NETWORK', 'FILE_SYSTEM', 'BUSINESS_LOGIC', 'UNKNOWN'
    ];
    if (!validCategories.includes(this.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }
    
    // Validate metadata is an object
    if (this.metadata && typeof this.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }
    
    // Validate tags is an array
    if (!Array.isArray(this.tags)) {
      errors.push('Tags must be an array');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Convert to plain object for database storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      timestamp: this.timestamp,
      message: this.message,
      severity: this.severity,
      category: this.category,
      fingerprint: this.fingerprint,
      stack: this.stack,
      code: this.code,
      metadata: this.metadata,
      userId: this.userId,
      requestId: this.requestId,
      correlationId: this.correlationId,
      service: this.service,
      method: this.method,
      url: this.url,
      httpMethod: this.httpMethod,
      statusCode: this.statusCode,
      userAgent: this.userAgent,
      ip: this.ip,
      resolved: this.resolved,
      resolvedAt: this.resolvedAt,
      resolvedBy: this.resolvedBy,
      notes: this.notes,
      tags: this.tags
    };
  }
  
  /**
   * Create from Error object
   * @param {Error} error - JavaScript Error object
   * @param {Object} context - Additional context
   * @returns {ErrorLogDTO} New ErrorLogDTO instance
   */
  static fromError(error, context = {}) {
    return new ErrorLogDTO({
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...context
    });
  }
  
  /**
   * Create from Express request
   * @param {Object} req - Express request object
   * @param {Error} error - Error that occurred
   * @returns {ErrorLogDTO} New ErrorLogDTO instance
   */
  static fromRequest(req, error) {
    return new ErrorLogDTO({
      message: error.message,
      stack: error.stack,
      code: error.code,
      userId: req.user?.id,
      requestId: req.id,
      correlationId: req.correlationId,
      url: req.originalUrl || req.url,
      httpMethod: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      metadata: {
        params: req.params,
        query: req.query,
        headers: req.headers
      }
    });
  }
}

module.exports = ErrorLogDTO;