/**
 * AI-HEADER
 * intent: Core error logging service for capturing and persisting application errors
 * domain_meaning: Handles error recording with metadata, context, and classification
 * misleading_names: None
 * data_contracts: Expects MongoDB connection, uses error_logs collection
 * PII: May contain user IDs and request details - handled with retention policies
 * invariants: All errors must be logged atomically, logging must not block application
 * rag_keywords: error logging, error persistence, error metadata, error context
 */

const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const os = require('os');
const ErrorClassifier = require('./utils/ErrorClassifier');

/**
 * DomainMeaning: Service for logging errors to persistent storage
 * MisleadingNames: None
 * SideEffects: Creates database entries in error_logs collection
 * Invariants: Logging operations must be atomic and non-blocking
 * RAG_Keywords: error logging, error service, error persistence
 * DuplicatePolicy: canonical
 * FunctionIdentity: error-logging-service-001
 */
class ErrorLoggingService {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
    this.errorLogCollection = db.collection('error_logs');
    this.initialize();
  }

  /**
   * DomainMeaning: Initialize error logging service with indexes
   * MisleadingNames: None
   * SideEffects: Creates MongoDB indexes
   * Invariants: Indexes must be created for optimal performance
   * RAG_Keywords: initialization, indexes, setup
   * DuplicatePolicy: canonical
   * FunctionIdentity: error-logging-initialize-001
   */
  async initialize() {
    try {
      // Create indexes for error logs
      await this.errorLogCollection.createIndex(
        { timestamp: -1 }, 
        { background: true }
      );
      await this.errorLogCollection.createIndex(
        { severity: 1, timestamp: -1 }, 
        { background: true }
      );
      await this.errorLogCollection.createIndex(
        { category: 1, timestamp: -1 }, 
        { background: true }
      );
      await this.errorLogCollection.createIndex(
        { 'context.userId': 1, timestamp: -1 }, 
        { background: true }
      );
      await this.errorLogCollection.createIndex(
        { 'context.operation': 1, timestamp: -1 }, 
        { background: true }
      );
      
      // TTL index for automatic cleanup
      await this.errorLogCollection.createIndex(
        { timestamp: 1 },
        { 
          expireAfterSeconds: this.config.retention.errorLogsDays * 24 * 60 * 60,
          background: true
        }
      );
      
      console.log('🔧 ErrorLoggingService initialized with indexes');
    } catch (error) {
      console.error('❌ Failed to initialize ErrorLoggingService:', error);
    }
  }

  /**
   * DomainMeaning: Log error with comprehensive metadata and context
   * MisleadingNames: None
   * SideEffects: Creates error log entry in database
   * Invariants: Error logging must never throw or block application flow
   * RAG_Keywords: error logging, metadata, context, classification
   * DuplicatePolicy: canonical
   * FunctionIdentity: log-error-001
   */
  async logError(error, context = {}) {
    try {
      const errorLog = {
        _id: new ObjectId(),
        timestamp: new Date(),
        
        // Error classification
        type: error.name || error.type || 'UnknownError',
        message: error.message || 'Unknown error occurred',
        code: error.code || 'UNKNOWN_001',
        severity: ErrorClassifier.determineSeverity(error),
        category: ErrorClassifier.determineCategory(error),
        
        // Context information
        context: {
          userId: context.userId || 'unknown',
          operation: context.operation || 'unknown',
          requestId: context.requestId || crypto.randomBytes(8).toString('hex'),
          userAgent: context.userAgent,
          ipAddress: context.ipAddress,
          sessionId: context.sessionId,
          route: context.route,
          method: context.method,
          statusCode: context.statusCode,
          duration: context.duration
        },
        
        // Technical details
        stackTrace: error.stack,
        errorData: error.data || null,
        
        // System information
        environment: process.env.NODE_ENV || 'unknown',
        version: process.env.npm_package_version || '1.0.0',
        hostname: os.hostname(),
        pid: process.pid,
        
        // Fingerprinting for duplicate detection
        fingerprint: ErrorClassifier.generateErrorFingerprint(error, context),
        
        // Correlation for related errors
        correlationId: context.correlationId || null,
        
        // Additional metadata
        metadata: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: os.platform(),
          arch: os.arch()
        }
      };
      
      // Store error log
      await this.errorLogCollection.insertOne(errorLog);
      
      console.log(`📝 Error logged: ${errorLog.type} (${errorLog.severity}) - ${errorLog._id}`);
      
      // Return error log for potential alert checking
      return errorLog;
      
    } catch (loggingError) {
      // Critical: logging failed - output to console as fallback
      console.error('❌ CRITICAL: Error logging failed:', loggingError);
      console.error('❌ Original error that failed to log:', error);
      
      // Try to log the logging failure itself (simple version)
      try {
        await this.errorLogCollection.insertOne({
          _id: new ObjectId(),
          timestamp: new Date(),
          type: 'LoggingSystemError',
          message: 'Failed to log error: ' + loggingError.message,
          severity: 'critical',
          category: 'system',
          originalError: {
            type: error.name || error.type,
            message: error.message
          }
        });
      } catch (fallbackError) {
        console.error('❌ CRITICAL: Fallback error logging also failed:', fallbackError);
      }
      
      return null;
    }
  }

  /**
   * DomainMeaning: Get error statistics for a time range
   * MisleadingNames: None
   * SideEffects: None - read only operation
   * Invariants: Must handle large datasets efficiently
   * RAG_Keywords: error statistics, error counts, error trends
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-error-stats-001
   */
  async getErrorStats(timeRangeHours = 24) {
    const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    
    const stats = await this.errorLogCollection.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: {
            severity: '$severity',
            category: '$category'
          },
          count: { $sum: 1 },
          lastOccurred: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    return stats;
  }
}

module.exports = ErrorLoggingService;