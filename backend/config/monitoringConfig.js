/**
 * Monitoring Configuration
 * Central configuration for error logging, monitoring, and alerting
 */

module.exports = {
  // Data retention policies (in days)
  retention: {
    errorLogsDays: 90,
    monitoringDataDays: 30,
    alertHistoryDays: 365,
    auditLogsDays: 365,
    performanceLogsDays: 7
  },
  
  // Alert thresholds
  alertThresholds: {
    criticalErrorsPerMinute: 1,
    errorRatePerMinute: 10,
    warningRatePerMinute: 50,
    memoryUsagePercent: 85,
    cpuUsagePercent: 80,
    responseTimeMs: 2000,
    dbConnectionPoolThreshold: 45,
    diskUsagePercent: 90
  },
  
  // Monitoring intervals and settings
  monitoring: {
    intervalMs: 60000, // 1 minute
    enableSystemMetrics: true,
    enableApplicationMetrics: true,
    enableDatabaseMetrics: true,
    enableCustomMetrics: true,
    enableEventLoopMonitoring: true,
    enableGarbageCollectionStats: true
  },
  
  // Alert cool-down periods (in milliseconds)
  alertCooldown: {
    criticalError: 300000, // 5 minutes
    highMemory: 600000, // 10 minutes
    highCpu: 600000, // 10 minutes
    slowResponse: 300000, // 5 minutes
    dbConnectionIssue: 300000, // 5 minutes
    default: 300000 // 5 minutes
  },
  
  // Error categorization rules
  errorCategories: {
    DATABASE: ['MongoError', 'MongooseError', 'MongoNetworkError'],
    VALIDATION: ['ValidationError', 'JoiError', 'TypeError'],
    AUTHENTICATION: ['JsonWebTokenError', 'UnauthorizedError', 'TokenExpiredError'],
    NETWORK: ['NetworkError', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
    FILE_SYSTEM: ['ENOENT', 'EACCES', 'EISDIR', 'EMFILE'],
    BUSINESS_LOGIC: ['BusinessError', 'PayrollError', 'LeaveCalculationError'],
    UNKNOWN: [] // Default category
  },
  
  // Performance monitoring thresholds
  performance: {
    slowQueryThresholdMs: 100,
    slowApiThresholdMs: 1000,
    memoryLeakDetectionEnabled: true,
    memoryLeakThresholdMb: 100, // Alert if memory increases by 100MB
    cpuProfilingEnabled: false,
    heapSnapshotEnabled: false
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json', // 'json' or 'text'
    includeStackTrace: process.env.NODE_ENV !== 'production',
    maxMessageLength: 10000,
    sanitizeFields: ['password', 'token', 'apiKey', 'secret', 'authorization']
  },
  
  // External integrations (future expansion)
  integrations: {
    slack: {
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#alerts'
    },
    email: {
      enabled: false,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      fromAddress: 'alerts@hrsystem.com'
    },
    sentry: {
      enabled: false,
      dsn: process.env.SENTRY_DSN
    }
  },
  
  // Batch processing configuration
  batch: {
    errorLogBatchSize: 100,
    metricsBatchSize: 500,
    flushIntervalMs: 5000 // Flush batches every 5 seconds
  },
  
  // Circuit breaker configuration
  circuitBreaker: {
    enabled: true,
    threshold: 5, // Number of failures before opening
    timeout: 60000, // Time before attempting to close (1 minute)
    resetTimeout: 30000 // Time to wait before resetting failure count
  }
};