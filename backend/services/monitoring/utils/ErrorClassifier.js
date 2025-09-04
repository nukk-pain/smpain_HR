/**
 * AI-HEADER
 * intent: Classify and categorize errors for proper logging and handling
 * domain_meaning: Determines error severity, category, and generates fingerprints for deduplication
 * misleading_names: None
 * data_contracts: Expects error objects with standard properties (name, message, code)
 * PII: May process error messages containing user context
 * invariants: Must return valid severity and category for all errors
 * rag_keywords: error classification, severity, category, fingerprint, error analysis
 */

const crypto = require('crypto');

/**
 * DomainMeaning: Utility class for error classification and analysis
 * MisleadingNames: None
 * SideEffects: None - pure functions only
 * Invariants: All methods must handle null/undefined errors gracefully
 * RAG_Keywords: error classifier, severity determination, error categorization
 * DuplicatePolicy: canonical
 * FunctionIdentity: error-classifier-001
 */
class ErrorClassifier {
  /**
   * DomainMeaning: Determine error severity based on error characteristics
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must return valid severity level
   * RAG_Keywords: error classification, severity, triage
   * DuplicatePolicy: canonical
   * FunctionIdentity: determine-severity-001
   */
  static determineSeverity(error) {
    // Critical errors - system or data integrity threats
    if (error.name === 'DatabaseConnectionError' ||
        error.name === 'OutOfMemoryError' ||
        error.name === 'SecurityError' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOMEM' ||
        error.message?.includes('Cannot connect to database') ||
        error.message?.includes('Authentication failed')) {
      return 'critical';
    }
    
    // High severity - significant functionality impaired
    if (error.name === 'TypeError' ||
        error.name === 'ReferenceError' ||
        error.name === 'PayrollProcessingError' ||
        error.statusCode === 500 ||
        error.message?.includes('Internal server error')) {
      return 'high';
    }
    
    // Medium severity - user-facing errors
    if (error.name === 'ValidationError' ||
        error.name === 'BadRequestError' ||
        error.statusCode === 400 ||
        error.statusCode === 404) {
      return 'medium';
    }
    
    // Low severity - warnings and minor issues
    if (error.name === 'DeprecationWarning' ||
        error.type === 'warning' ||
        error.statusCode === 304) {
      return 'low';
    }
    
    // Default to medium if uncertain
    return 'medium';
  }

  /**
   * DomainMeaning: Categorize error by type for analytics
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must return valid category string
   * RAG_Keywords: error categorization, error types, classification
   * DuplicatePolicy: canonical
   * FunctionIdentity: determine-category-001
   */
  static determineCategory(error) {
    // Infrastructure and system errors
    if (error.name === 'MongoError' ||
        error.name === 'MongoServerError' ||
        error.name === 'DatabaseError' ||
        error.code?.startsWith('E11') || // MongoDB duplicate key
        error.message?.includes('database') ||
        error.message?.includes('connection')) {
      return 'database';
    }
    
    // Authentication and authorization
    if (error.name === 'UnauthorizedError' ||
        error.name === 'ForbiddenError' ||
        error.name === 'JsonWebTokenError' ||
        error.statusCode === 401 ||
        error.statusCode === 403 ||
        error.message?.includes('auth') ||
        error.message?.includes('permission')) {
      return 'authentication';
    }
    
    // Input validation errors
    if (error.name === 'ValidationError' ||
        error.name === 'BadRequestError' ||
        error.statusCode === 400 ||
        error.message?.includes('validation') ||
        error.message?.includes('invalid')) {
      return 'validation';
    }
    
    // Business logic errors
    if (error.name === 'BusinessLogicError' ||
        error.name === 'PayrollError' ||
        error.message?.includes('business rule') ||
        error.message?.includes('policy')) {
      return 'business_logic';
    }
    
    // Network and external service errors
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('network') ||
        error.message?.includes('timeout')) {
      return 'network';
    }
    
    // File system errors
    if (error.code === 'ENOENT' ||
        error.code === 'EACCES' ||
        error.code === 'EISDIR' ||
        error.message?.includes('file') ||
        error.message?.includes('directory')) {
      return 'filesystem';
    }
    
    // System resource errors
    if (error.name === 'OutOfMemoryError' ||
        error.code === 'ENOMEM' ||
        error.message?.includes('memory') ||
        error.message?.includes('resource')) {
      return 'system_resource';
    }
    
    // Default category
    return 'application';
  }

  /**
   * DomainMeaning: Generate unique fingerprint for error deduplication
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Same error must generate same fingerprint
   * RAG_Keywords: error fingerprint, deduplication, error identity
   * DuplicatePolicy: canonical
   * FunctionIdentity: generate-fingerprint-001
   */
  static generateErrorFingerprint(error, context = {}) {
    const fingerprintData = {
      type: error.name || error.type || 'unknown',
      message: error.message ? error.message.substring(0, 100) : 'no_message',
      code: error.code || 'no_code',
      stackTrace: error.stack ? error.stack.split('\n')[0] : 'no_stack',
      operation: context.operation || 'unknown',
      route: context.route || 'unknown'
    };
    
    const fingerprintString = JSON.stringify(fingerprintData);
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }
}

module.exports = ErrorClassifier;