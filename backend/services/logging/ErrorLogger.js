/**
 * Error Logger Service
 * Handles error logging and categorization
 */

const crypto = require('crypto');
const BaseService = require('../core/BaseService');
const IErrorLogger = require('../interfaces/IErrorLogger');
const ErrorLogDTO = require('../dto/ErrorLogDTO');

class ErrorLogger extends BaseService {
  constructor(dependencies) {
    super(dependencies);
    this.collectionName = 'error_logs';
    this.collection = null;
  }
  
  async onInitialize() {
    if (this.db) {
      this.collection = this.db.collection(this.collectionName);
      await this.ensureIndexes();
    }
  }
  
  async ensureIndexes() {
    if (!this.collection) return;
    
    try {
      await this.collection.createIndex({ timestamp: -1 });
      await this.collection.createIndex({ severity: 1, timestamp: -1 });
      await this.collection.createIndex({ category: 1, timestamp: -1 });
      await this.collection.createIndex({ fingerprint: 1 });
      await this.collection.createIndex({ resolved: 1 });
      await this.collection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days TTL
      );
    } catch (error) {
      this.logger.error('Failed to create indexes:', error);
    }
  }
  
  /**
   * Log an error to the database
   */
  async logError(error, context = {}) {
    try {
      // Create DTO from error
      const errorLog = ErrorLogDTO.fromError(error, context);
      
      // Determine severity and category
      errorLog.severity = await this.determineSeverity(error);
      errorLog.category = await this.determineCategory(error);
      errorLog.fingerprint = await this.generateErrorFingerprint(error);
      
      // Validate DTO
      const validation = errorLog.validate();
      if (!validation.valid) {
        this.logger.warn('Invalid error log data:', validation.errors);
      }
      
      // Save to database if collection is available
      if (this.collection) {
        const result = await this.collection.insertOne(errorLog.toObject());
        return result.insertedId.toString();
      } else {
        // Fallback to console logging
        this.logger.error('Error logged (no DB):', errorLog.toObject());
        return null;
      }
    } catch (logError) {
      this.logger.error('Failed to log error:', logError);
      // Don't throw - we don't want logging failures to break the app
      return null;
    }
  }
  
  /**
   * Determine error severity
   */
  async determineSeverity(error) {
    // Critical errors
    if (error.name === 'MongoNetworkError' ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('out of memory') ||
        error.message?.includes('FATAL')) {
      return 'critical';
    }
    
    // Error level
    if (error.statusCode >= 500 ||
        error.name === 'TypeError' ||
        error.name === 'ReferenceError' ||
        error.name === 'SyntaxError') {
      return 'error';
    }
    
    // Warning level
    if (error.statusCode >= 400 && error.statusCode < 500 ||
        error.name === 'ValidationError' ||
        error.name === 'CastError') {
      return 'warning';
    }
    
    // Info level
    if (error.statusCode >= 300 && error.statusCode < 400) {
      return 'info';
    }
    
    // Default to error
    return 'error';
  }
  
  /**
   * Determine error category
   */
  async determineCategory(error) {
    const categories = this.config.errorCategories || {
      DATABASE: ['MongoError', 'MongooseError', 'MongoNetworkError'],
      VALIDATION: ['ValidationError', 'JoiError', 'TypeError'],
      AUTHENTICATION: ['JsonWebTokenError', 'UnauthorizedError', 'TokenExpiredError'],
      NETWORK: ['NetworkError', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
      FILE_SYSTEM: ['ENOENT', 'EACCES', 'EISDIR', 'EMFILE'],
      BUSINESS_LOGIC: ['BusinessError', 'PayrollError', 'LeaveCalculationError']
    };
    
    // Check error name
    for (const [category, patterns] of Object.entries(categories)) {
      if (patterns.some(pattern => error.name?.includes(pattern))) {
        return category;
      }
    }
    
    // Check error message
    for (const [category, patterns] of Object.entries(categories)) {
      if (patterns.some(pattern => error.message?.includes(pattern))) {
        return category;
      }
    }
    
    // Check error code
    if (error.code) {
      for (const [category, patterns] of Object.entries(categories)) {
        if (patterns.some(pattern => error.code === pattern)) {
          return category;
        }
      }
    }
    
    return 'UNKNOWN';
  }
  
  /**
   * Generate error fingerprint for deduplication
   */
  async generateErrorFingerprint(error) {
    const parts = [
      error.name || 'UnknownError',
      error.message?.substring(0, 100) || '',
      error.code || ''
    ];
    
    // Add stack trace location if available
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const relevantLine = stackLines.find(line => 
        line.includes('at ') && !line.includes('node_modules')
      );
      if (relevantLine) {
        parts.push(relevantLine.trim());
      }
    }
    
    const fingerprint = crypto
      .createHash('md5')
      .update(parts.join('|'))
      .digest('hex');
    
    return fingerprint;
  }
  
  /**
   * Get error statistics
   */
  async getErrorStats(startDate, endDate) {
    if (!this.collection) {
      return { errors: [] };
    }
    
    try {
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              category: '$category',
              severity: '$severity'
            },
            count: { $sum: 1 },
            firstOccurrence: { $min: '$timestamp' },
            lastOccurrence: { $max: '$timestamp' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];
      
      const stats = await this.collection.aggregate(pipeline).toArray();
      
      return {
        totalErrors: stats.reduce((sum, stat) => sum + stat.count, 0),
        byCategory: stats.reduce((acc, stat) => {
          const key = `${stat._id.category}_${stat._id.severity}`;
          acc[key] = stat.count;
          return acc;
        }, {}),
        details: stats
      };
    } catch (error) {
      this.logger.error('Failed to get error stats:', error);
      return { errors: [] };
    }
  }
  
  /**
   * Clean up old logs
   */
  async cleanupOldLogs(retentionDays) {
    if (!this.collection) {
      return 0;
    }
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const result = await this.collection.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old logs:', error);
      return 0;
    }
  }
}

module.exports = ErrorLogger;