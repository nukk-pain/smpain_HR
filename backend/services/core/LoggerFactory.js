/**
 * Logger Factory
 * Creates consistent loggers for all modules
 */

const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');

// Create async local storage for correlation ID
const asyncLocalStorage = new AsyncLocalStorage();

class LoggerFactory {
  constructor() {
    this.loggers = new Map();
    this.globalConfig = {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      includeStackTrace: process.env.NODE_ENV !== 'production'
    };
    this.logDestinations = [];
    this.sanitizeFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  }
  
  /**
   * Create a logger for a specific module
   */
  createLogger(moduleName) {
    if (this.loggers.has(moduleName)) {
      return this.loggers.get(moduleName);
    }
    
    const logger = {
      module: moduleName,
      
      trace: (message, meta) => this.log('trace', moduleName, message, meta),
      debug: (message, meta) => this.log('debug', moduleName, message, meta),
      info: (message, meta) => this.log('info', moduleName, message, meta),
      warn: (message, meta) => this.log('warn', moduleName, message, meta),
      error: (message, error, meta) => {
        if (error instanceof Error) {
          this.log('error', moduleName, message, { 
            error: {
              name: error.name,
              message: error.message,
              stack: this.globalConfig.includeStackTrace ? error.stack : undefined,
              code: error.code
            },
            ...meta 
          });
        } else {
          this.log('error', moduleName, message, { error, ...meta });
        }
      },
      fatal: (message, error, meta) => {
        if (error instanceof Error) {
          this.log('fatal', moduleName, message, { 
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack, // Always include stack for fatal
              code: error.code
            },
            ...meta 
          });
        } else {
          this.log('fatal', moduleName, message, { error, ...meta });
        }
      },
      
      // Child logger with additional context
      child: (context) => {
        const childModuleName = `${moduleName}:${context.component || 'child'}`;
        return this.createLogger(childModuleName);
      }
    };
    
    this.loggers.set(moduleName, logger);
    return logger;
  }
  
  /**
   * Core logging method
   */
  log(level, module, message, meta = {}) {
    // Check log level
    if (!this.shouldLog(level)) {
      return;
    }
    
    // Sanitize metadata
    const sanitizedMeta = this.sanitizeMetadata(meta);
    
    // Get correlation ID from async context
    const store = asyncLocalStorage.getStore();
    const correlationId = store?.correlationId;
    
    // Create log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      correlationId,
      ...sanitizedMeta,
      pid: process.pid,
      hostname: require('os').hostname()
    };
    
    // Format log entry
    const formattedLog = this.formatLog(logEntry);
    
    // Write to destinations
    this.writeLog(level, formattedLog);
  }
  
  /**
   * Check if should log based on level
   */
  shouldLog(level) {
    const levels = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      fatal: 5
    };
    
    const currentLevel = levels[this.globalConfig.level] || 2;
    const messageLevel = levels[level] || 2;
    
    return messageLevel >= currentLevel;
  }
  
  /**
   * Sanitize metadata to remove sensitive information
   */
  sanitizeMetadata(meta) {
    if (typeof meta !== 'object' || meta === null) {
      return meta;
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(meta)) {
      // Check if field should be sanitized
      if (this.sanitizeFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Format log entry based on configuration
   */
  formatLog(logEntry) {
    if (this.globalConfig.format === 'json') {
      return JSON.stringify(logEntry);
    }
    
    // Text format
    const { timestamp, level, module, message, correlationId, ...meta } = logEntry;
    let formatted = `${timestamp} [${level.toUpperCase()}] [${module}]`;
    
    if (correlationId) {
      formatted += ` [${correlationId}]`;
    }
    
    formatted += ` ${message}`;
    
    if (Object.keys(meta).length > 0) {
      formatted += ` ${JSON.stringify(meta)}`;
    }
    
    return formatted;
  }
  
  /**
   * Write log to appropriate destination
   */
  writeLog(level, formattedLog) {
    // Console output with color coding
    const colors = {
      trace: '\x1b[90m',  // Gray
      debug: '\x1b[36m',  // Cyan
      info: '\x1b[32m',   // Green
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
      fatal: '\x1b[35m'   // Magenta
    };
    
    const resetColor = '\x1b[0m';
    
    if (process.env.NODE_ENV !== 'production' && colors[level]) {
      console.log(`${colors[level]}${formattedLog}${resetColor}`);
    } else if (level === 'error' || level === 'fatal') {
      console.error(formattedLog);
    } else if (level === 'warn') {
      console.warn(formattedLog);
    } else {
      console.log(formattedLog);
    }
    
    // Write to additional destinations if configured
    for (const destination of this.logDestinations) {
      try {
        destination.write(level, formattedLog);
      } catch (error) {
        console.error('Failed to write to log destination:', error);
      }
    }
  }
  
  /**
   * Add a custom log destination
   */
  addDestination(destination) {
    this.logDestinations.push(destination);
  }
  
  /**
   * Set global configuration
   */
  setConfig(config) {
    this.globalConfig = { ...this.globalConfig, ...config };
  }
  
  /**
   * Create a new correlation context
   */
  static runWithCorrelation(correlationId, callback) {
    return asyncLocalStorage.run({ correlationId }, callback);
  }
  
  /**
   * Get current correlation ID
   */
  static getCorrelationId() {
    const store = asyncLocalStorage.getStore();
    return store?.correlationId;
  }
  
  /**
   * Express middleware to add correlation ID
   */
  correlationMiddleware() {
    return (req, res, next) => {
      const correlationId = req.headers['x-correlation-id'] || 
                           req.headers['x-request-id'] || 
                           this.generateCorrelationId();
      
      LoggerFactory.runWithCorrelation(correlationId, () => {
        req.correlationId = correlationId;
        res.setHeader('X-Correlation-Id', correlationId);
        next();
      });
    };
  }
  
  /**
   * Generate correlation ID
   */
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
module.exports = new LoggerFactory();