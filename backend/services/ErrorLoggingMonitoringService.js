/**
 * AI-HEADER
 * intent: Comprehensive error logging and monitoring service for production observability and system health
 * domain_meaning: Provides centralized error tracking, system monitoring, alerting, and analytics for operational stability
 * misleading_names: None - clear service purpose
 * data_contracts: Expects MongoDB collections for error logs and monitoring data
 * PII: May contain user IDs and request details - must be handled securely with data retention policies
 * invariants: All errors must be logged atomically, monitoring must not impact application performance
 * rag_keywords: error logging, monitoring, alerting, observability, system health, analytics
 */

const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const os = require('os');

/**
 * DomainMeaning: Service for comprehensive error logging and system monitoring
 * MisleadingNames: None
 * SideEffects: Creates database entries, may send alerts, collects system metrics
 * Invariants: All logging operations must be atomic and non-blocking to application flow
 * RAG_Keywords: error service, monitoring, logging, alerts, system health
 * DuplicatePolicy: canonical
 * FunctionIdentity: error-logging-monitoring-service-001
 */
class ErrorLoggingMonitoringService {
  constructor(db) {
    this.db = db;
    this.errorLogCollection = db.collection('error_logs');
    this.monitoringCollection = db.collection('monitoring_data');
    this.alertCollection = db.collection('alert_history');
    
    // Configuration
    this.config = {
      retention: {
        errorLogsDays: 90,
        monitoringDataDays: 30,
        alertHistoryDays: 365
      },
      alertThresholds: {
        criticalErrorsPerMinute: 1,
        errorRatePerMinute: 10,
        memoryUsagePercent: 85,
        cpuUsagePercent: 80,
        responseTimeMs: 2000,
        dbConnectionPoolThreshold: 45
      },
      monitoring: {
        intervalMs: 60000, // 1 minute
        enableSystemMetrics: true,
        enableApplicationMetrics: true,
        enableDatabaseMetrics: true
      }
    };
    
    // Alert cooldown to prevent spam
    this.alertCooldowns = new Map();
    
    // Initialize the service
    this.initialize();
  }

  /**
   * DomainMeaning: Initialize error logging service with required indexes and monitoring
   * MisleadingNames: None
   * SideEffects: Creates MongoDB indexes, starts monitoring interval
   * Invariants: Indexes must be created for optimal performance
   * RAG_Keywords: initialization, indexes, monitoring setup
   * DuplicatePolicy: canonical
   * FunctionIdentity: error-service-initialize-001
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
      
      // Create indexes for monitoring data
      await this.monitoringCollection.createIndex(
        { timestamp: -1 }, 
        { background: true }
      );
      await this.monitoringCollection.createIndex(
        { timestamp: 1 },
        { 
          expireAfterSeconds: this.config.retention.monitoringDataDays * 24 * 60 * 60,
          background: true
        }
      );
      
      // Create indexes for alert history
      await this.alertCollection.createIndex(
        { timestamp: -1 }, 
        { background: true }
      );
      await this.alertCollection.createIndex(
        { type: 1, timestamp: -1 }, 
        { background: true }
      );
      await this.alertCollection.createIndex(
        { timestamp: 1 },
        { 
          expireAfterSeconds: this.config.retention.alertHistoryDays * 24 * 60 * 60,
          background: true
        }
      );
      
      console.log('🔧 ErrorLoggingMonitoringService initialized with indexes');
      
      // Start monitoring if enabled
      if (this.config.monitoring.intervalMs > 0) {
        this.startMonitoring();
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize ErrorLoggingMonitoringService:', error);
    }
  }

  /**
   * DomainMeaning: Log error with comprehensive metadata and context
   * MisleadingNames: None
   * SideEffects: Creates error log entry, may trigger alerts
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
        severity: this.determineSeverity(error),
        category: this.determineCategory(error),
        
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
        fingerprint: this.generateErrorFingerprint(error, context),
        
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
      
      // Check for alert conditions
      this.checkAlertConditions(errorLog);
      
      console.log(`📝 Error logged: ${errorLog.type} (${errorLog.severity}) - ${errorLog._id}`);
      return errorLog._id;
      
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
    }
  }

  /**
   * DomainMeaning: Determine error severity based on error characteristics
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must return valid severity level
   * RAG_Keywords: error classification, severity, triage
   * DuplicatePolicy: canonical
   * FunctionIdentity: determine-severity-001
   */
  determineSeverity(error) {
    // Critical errors - system or data integrity threats
    if (error.name === 'DatabaseConnectionError' ||
        error.name === 'OutOfMemoryError' ||
        error.name === 'SecurityError' ||
        error.code?.startsWith('CRITICAL_') ||
        error.message?.includes('CRITICAL')) {
      return 'critical';
    }
    
    // High priority errors - functionality impacted
    if (error.name === 'ValidationError' ||
        error.name === 'AuthenticationError' ||
        error.name === 'AuthorizationError' ||
        error.code?.startsWith('AUTH_') ||
        error.code?.startsWith('VALIDATION_')) {
      return 'error';
    }
    
    // Warnings - degraded functionality but not broken
    if (error.name === 'DeprecationWarning' ||
        error.name === 'ConfigurationWarning' ||
        error.code?.startsWith('WARN_')) {
      return 'warning';
    }
    
    // Default to error for unknown types
    return 'error';
  }

  /**
   * DomainMeaning: Categorize error for better analysis and alerting
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must return valid category
   * RAG_Keywords: error categorization, classification, analysis
   * DuplicatePolicy: canonical
   * FunctionIdentity: determine-category-001
   */
  determineCategory(error) {
    // Infrastructure issues
    if (error.name?.includes('Database') || 
        error.name?.includes('Connection') ||
        error.code?.startsWith('DB_') ||
        error.code?.startsWith('CONN_')) {
      return 'infrastructure';
    }
    
    // User input problems
    if (error.name === 'ValidationError' ||
        error.name?.includes('Input') ||
        error.code?.startsWith('VALIDATION_') ||
        error.code?.startsWith('INPUT_')) {
      return 'user_input';
    }
    
    // Authentication and authorization
    if (error.name?.includes('Auth') ||
        error.code?.startsWith('AUTH_') ||
        error.code?.startsWith('PERM_')) {
      return 'security';
    }
    
    // Business logic violations
    if (error.name?.includes('Business') ||
        error.code?.startsWith('BUSINESS_') ||
        error.code?.startsWith('PAYROLL_')) {
      return 'business_rule';
    }
    
    // System resource issues
    if (error.name?.includes('Memory') ||
        error.name?.includes('Timeout') ||
        error.code?.startsWith('SYSTEM_') ||
        error.code?.startsWith('RESOURCE_')) {
      return 'system_resource';
    }
    
    // External service problems
    if (error.name?.includes('External') ||
        error.name?.includes('API') ||
        error.code?.startsWith('EXT_') ||
        error.code?.startsWith('API_')) {
      return 'external_service';
    }
    
    return 'application';
  }

  /**
   * DomainMeaning: Generate fingerprint for error deduplication
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Same error conditions must generate same fingerprint
   * RAG_Keywords: error fingerprinting, deduplication, identification
   * DuplicatePolicy: canonical
   * FunctionIdentity: generate-fingerprint-001
   */
  generateErrorFingerprint(error, context) {
    const fingerprintData = {
      type: error.name || error.type,
      message: error.message?.substring(0, 200), // Limit message length
      code: error.code,
      operation: context.operation,
      route: context.route
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * DomainMeaning: Start continuous system monitoring with configured interval
   * MisleadingNames: None
   * SideEffects: Creates monitoring interval, collects system metrics
   * Invariants: Monitoring must not significantly impact application performance
   * RAG_Keywords: monitoring, system metrics, performance tracking
   * DuplicatePolicy: canonical
   * FunctionIdentity: start-monitoring-001
   */
  startMonitoring() {
    console.log(`📊 Starting system monitoring (interval: ${this.config.monitoring.intervalMs}ms)`);
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('❌ Error collecting metrics:', error);
      }
    }, this.config.monitoring.intervalMs);
    
    // Ensure interval is cleared on process exit
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
  }

  /**
   * DomainMeaning: Stop system monitoring and cleanup intervals
   * MisleadingNames: None
   * SideEffects: Clears monitoring interval
   * Invariants: Must cleanly stop all monitoring activities
   * RAG_Keywords: monitoring cleanup, shutdown, resource cleanup
   * DuplicatePolicy: canonical
   * FunctionIdentity: stop-monitoring-001
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 System monitoring stopped');
    }
  }

  /**
   * DomainMeaning: Collect comprehensive system and application metrics
   * MisleadingNames: None
   * SideEffects: Creates monitoring data entry
   * Invariants: Metric collection must complete quickly to avoid performance impact
   * RAG_Keywords: metrics collection, system health, performance data
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-metrics-001
   */
  async collectMetrics() {
    try {
      const metrics = {
        _id: new ObjectId(),
        timestamp: new Date(),
        
        // System metrics
        system: this.config.monitoring.enableSystemMetrics ? {
          cpuUsage: process.cpuUsage(),
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          loadAverage: os.loadavg(),
          freeMemory: os.freemem(),
          totalMemory: os.totalmem(),
          memoryUsagePercent: Math.round((1 - os.freemem() / os.totalmem()) * 100),
          hostname: os.hostname(),
          platform: os.platform()
        } : null,
        
        // Application metrics
        application: this.config.monitoring.enableApplicationMetrics ? {
          nodeVersion: process.version,
          pid: process.pid,
          environment: process.env.NODE_ENV,
          activeHandles: process._getActiveHandles().length,
          activeRequests: process._getActiveRequests().length,
          eventLoopDelay: await this.measureEventLoopDelay(),
          gcStats: this.getGCStats()
        } : null,
        
        // Database metrics (if available)
        database: this.config.monitoring.enableDatabaseMetrics ? 
          await this.collectDatabaseMetrics() : null,
        
        // Custom application metrics
        custom: await this.collectCustomMetrics()
      };
      
      await this.monitoringCollection.insertOne(metrics);
      
      // Check metric-based alert conditions
      this.checkMetricAlerts(metrics);
      
    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
    }
  }

  /**
   * DomainMeaning: Measure Node.js event loop delay as performance indicator
   * MisleadingNames: None
   * SideEffects: None - measurement only
   * Invariants: Should complete quickly with minimal overhead
   * RAG_Keywords: event loop, performance, latency measurement
   * DuplicatePolicy: canonical
   * FunctionIdentity: measure-event-loop-delay-001
   */
  async measureEventLoopDelay() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        resolve(Number(delta / 1000000n)); // Convert to milliseconds
      });
    });
  }

  /**
   * DomainMeaning: Get garbage collection statistics if available
   * MisleadingNames: None
   * SideEffects: None - read-only
   * Invariants: Must handle cases where GC stats are not available
   * RAG_Keywords: garbage collection, memory management, performance
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-gc-stats-001
   */
  getGCStats() {
    try {
      // Note: In production, you might want to use a proper GC monitoring library
      // This is a simplified version
      return {
        available: false,
        reason: 'GC stats collection not implemented'
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * DomainMeaning: Collect database-specific metrics and connection health
   * MisleadingNames: None
   * SideEffects: Makes database queries to check health
   * Invariants: Database health checks must be lightweight and fast
   * RAG_Keywords: database metrics, connection health, performance monitoring
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-database-metrics-001
   */
  async collectDatabaseMetrics() {
    try {
      const startTime = Date.now();
      
      // Simple ping to measure response time
      await this.db.admin().ping();
      const responseTime = Date.now() - startTime;
      
      // Get database stats (may require admin privileges)
      let dbStats = null;
      try {
        dbStats = await this.db.stats();
      } catch (error) {
        // Stats not available - continue without them
      }
      
      return {
        responseTime,
        connected: true,
        stats: dbStats ? {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize
        } : null
      };
      
    } catch (error) {
      return {
        responseTime: null,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * DomainMeaning: Collect custom application-specific metrics
   * MisleadingNames: None
   * SideEffects: May query application collections for metrics
   * Invariants: Custom metrics collection should be efficient
   * RAG_Keywords: custom metrics, application monitoring, business metrics
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-custom-metrics-001
   */
  async collectCustomMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Payroll-specific metrics
      const payrollMetrics = {
        activePreviewSessions: 0, // Would be calculated from memory/temp storage
        rollbackSnapshotsCount: 0,
        recentErrorsCount: await this.errorLogCollection.countDocuments({
          timestamp: { $gte: oneHourAgo }
        })
      };
      
      // Try to get additional metrics if collections exist
      try {
        if (this.db.collection('temp_uploads')) {
          payrollMetrics.activePreviewSessions = await this.db.collection('temp_uploads')
            .countDocuments({ type: 'preview', expiresAt: { $gt: now } });
        }
        
        if (this.db.collection('rollback_snapshots')) {
          payrollMetrics.rollbackSnapshotsCount = await this.db.collection('rollback_snapshots')
            .countDocuments({ expiresAt: { $gt: now } });
        }
      } catch (error) {
        // Collections might not exist - continue with default values
      }
      
      return payrollMetrics;
      
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * DomainMeaning: Check for alert conditions based on error logs
   * MisleadingNames: None
   * SideEffects: May trigger alerts and update alert history
   * Invariants: Alert checking must be efficient and non-blocking
   * RAG_Keywords: alerting, error monitoring, threshold checking
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-alert-conditions-001
   */
  async checkAlertConditions(errorLog) {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      
      // Check for critical errors
      if (errorLog.severity === 'critical') {
        const alertKey = 'critical_error';
        if (!this.isAlertCooledDown(alertKey)) {
          await this.triggerAlert({
            type: alertKey,
            message: `Critical error occurred: ${errorLog.type} - ${errorLog.message}`,
            severity: 'critical',
            errorId: errorLog._id,
            details: {
              errorType: errorLog.type,
              errorCode: errorLog.code,
              operation: errorLog.context.operation,
              userId: errorLog.context.userId
            }
          });
          this.setAlertCooldown(alertKey, 5 * 60 * 1000); // 5 minute cooldown
        }
      }
      
      // Check for high error rate
      const recentErrorCount = await this.errorLogCollection.countDocuments({
        timestamp: { $gte: oneMinuteAgo }
      });
      
      if (recentErrorCount > this.config.alertThresholds.errorRatePerMinute) {
        const alertKey = 'high_error_rate';
        if (!this.isAlertCooledDown(alertKey)) {
          await this.triggerAlert({
            type: alertKey,
            message: `High error rate: ${recentErrorCount} errors in the last minute`,
            severity: 'warning',
            details: {
              errorCount: recentErrorCount,
              threshold: this.config.alertThresholds.errorRatePerMinute,
              timeWindow: '1 minute'
            }
          });
          this.setAlertCooldown(alertKey, 10 * 60 * 1000); // 10 minute cooldown
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to check alert conditions:', error);
    }
  }

  /**
   * DomainMeaning: Check for metric-based alert conditions
   * MisleadingNames: None
   * SideEffects: May trigger alerts based on system metrics
   * Invariants: Metric alert checking must be efficient
   * RAG_Keywords: metric alerts, threshold monitoring, system health
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-metric-alerts-001
   */
  async checkMetricAlerts(metrics) {
    try {
      // Memory usage alert
      if (metrics.system?.memoryUsagePercent > this.config.alertThresholds.memoryUsagePercent) {
        const alertKey = 'high_memory_usage';
        if (!this.isAlertCooledDown(alertKey)) {
          await this.triggerAlert({
            type: alertKey,
            message: `High memory usage: ${metrics.system.memoryUsagePercent}%`,
            severity: 'warning',
            details: {
              memoryUsagePercent: metrics.system.memoryUsagePercent,
              threshold: this.config.alertThresholds.memoryUsagePercent,
              freeMemory: metrics.system.freeMemory,
              totalMemory: metrics.system.totalMemory
            }
          });
          this.setAlertCooldown(alertKey, 15 * 60 * 1000); // 15 minute cooldown
        }
      }
      
      // Database response time alert
      if (metrics.database?.responseTime > this.config.alertThresholds.responseTimeMs) {
        const alertKey = 'slow_database_response';
        if (!this.isAlertCooledDown(alertKey)) {
          await this.triggerAlert({
            type: alertKey,
            message: `Slow database response: ${metrics.database.responseTime}ms`,
            severity: 'warning',
            details: {
              responseTime: metrics.database.responseTime,
              threshold: this.config.alertThresholds.responseTimeMs
            }
          });
          this.setAlertCooldown(alertKey, 5 * 60 * 1000); // 5 minute cooldown
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to check metric alerts:', error);
    }
  }

  /**
   * DomainMeaning: Trigger alert and log to alert history
   * MisleadingNames: None
   * SideEffects: Creates alert history entry, may send external notifications
   * Invariants: Alert triggering must be reliable and not fail application flow
   * RAG_Keywords: alert triggering, notifications, alert history
   * DuplicatePolicy: canonical
   * FunctionIdentity: trigger-alert-001
   */
  async triggerAlert(alertData) {
    try {
      const alert = {
        _id: new ObjectId(),
        timestamp: new Date(),
        ...alertData,
        hostname: os.hostname(),
        environment: process.env.NODE_ENV || 'unknown'
      };
      
      // Store alert in history
      await this.alertCollection.insertOne(alert);
      
      // Log alert to console (in production, you'd send to external systems)
      console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
      console.log(`🔍 Details:`, JSON.stringify(alert.details, null, 2));
      
      // In production, you would integrate with:
      // - Email notifications
      // - Slack/Teams webhooks
      // - PagerDuty/OpsGenie
      // - SMS alerts for critical issues
      
      return alert._id;
      
    } catch (error) {
      console.error('❌ Failed to trigger alert:', error);
    }
  }

  /**
   * DomainMeaning: Check if alert type is in cooldown period
   * MisleadingNames: None
   * SideEffects: None - read-only check
   * Invariants: Cooldown check must be fast and accurate
   * RAG_Keywords: alert cooldown, rate limiting, spam prevention
   * DuplicatePolicy: canonical
   * FunctionIdentity: is-alert-cooled-down-001
   */
  isAlertCooledDown(alertKey) {
    const cooldownInfo = this.alertCooldowns.get(alertKey);
    if (!cooldownInfo) return false;
    
    return Date.now() < cooldownInfo.expiresAt;
  }

  /**
   * DomainMeaning: Set cooldown period for alert type to prevent spam
   * MisleadingNames: None
   * SideEffects: Updates alert cooldown map
   * Invariants: Cooldown periods must be properly managed to prevent memory leaks
   * RAG_Keywords: alert cooldown, spam prevention, rate limiting
   * DuplicatePolicy: canonical
   * FunctionIdentity: set-alert-cooldown-001
   */
  setAlertCooldown(alertKey, cooldownMs) {
    const expiresAt = Date.now() + cooldownMs;
    this.alertCooldowns.set(alertKey, { expiresAt });
    
    // Clean up expired cooldowns periodically
    setTimeout(() => {
      if (this.alertCooldowns.has(alertKey)) {
        const cooldownInfo = this.alertCooldowns.get(alertKey);
        if (Date.now() >= cooldownInfo.expiresAt) {
          this.alertCooldowns.delete(alertKey);
        }
      }
    }, cooldownMs + 1000);
  }

  /**
   * DomainMeaning: Get comprehensive error analytics and statistics
   * MisleadingNames: None
   * SideEffects: None - read-only analytics
   * Invariants: Analytics queries must be optimized for performance
   * RAG_Keywords: error analytics, statistics, reporting, insights
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-error-analytics-001
   */
  async getErrorAnalytics(timeRangeHours = 24) {
    try {
      const cutoff = new Date(Date.now() - (timeRangeHours * 60 * 60 * 1000));
      
      const analytics = await this.errorLogCollection.aggregate([
        { $match: { timestamp: { $gte: cutoff } } },
        {
          $facet: {
            totalStats: [
              {
                $group: {
                  _id: null,
                  totalErrors: { $sum: 1 },
                  uniqueUsers: { $addToSet: '$context.userId' },
                  uniqueOperations: { $addToSet: '$context.operation' }
                }
              }
            ],
            bySeverity: [
              {
                $group: {
                  _id: '$severity',
                  count: { $sum: 1 }
                }
              }
            ],
            byCategory: [
              {
                $group: {
                  _id: '$category',
                  count: { $sum: 1 }
                }
              }
            ],
            byHour: [
              {
                $group: {
                  _id: { 
                    hour: { $hour: '$timestamp' },
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { '_id.date': 1, '_id.hour': 1 } }
            ],
            topErrors: [
              {
                $group: {
                  _id: '$fingerprint',
                  count: { $sum: 1 },
                  latestOccurrence: { $max: '$timestamp' },
                  type: { $first: '$type' },
                  message: { $first: '$message' },
                  severity: { $first: '$severity' }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]).toArray();
      
      const result = analytics[0];
      
      return {
        timeRange: `${timeRangeHours} hours`,
        totalErrors: result.totalStats[0]?.totalErrors || 0,
        uniqueUsers: result.totalStats[0]?.uniqueUsers?.length || 0,
        uniqueOperations: result.totalStats[0]?.uniqueOperations?.length || 0,
        bySeverity: result.bySeverity,
        byCategory: result.byCategory,
        hourlyTrend: result.byHour,
        topErrors: result.topErrors,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ Failed to generate error analytics:', error);
      throw error;
    }
  }

  /**
   * DomainMeaning: Get system health status and key metrics
   * MisleadingNames: None
   * SideEffects: None - read-only health check
   * Invariants: Health check must be fast and provide accurate system status
   * RAG_Keywords: system health, status check, monitoring dashboard
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-system-health-001
   */
  async getSystemHealth() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Get latest monitoring data
      const latestMetrics = await this.monitoringCollection
        .findOne({}, { sort: { timestamp: -1 } });
      
      // Get recent error counts
      const recentErrors = await this.errorLogCollection.aggregate([
        { $match: { timestamp: { $gte: oneHourAgo } } },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Get active alerts
      const activeAlerts = await this.alertCollection
        .find({ 
          timestamp: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } 
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
      
      const errorCounts = recentErrors.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
      
      return {
        status: 'healthy', // Would be calculated based on various factors
        timestamp: now,
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          version: process.version,
          environment: process.env.NODE_ENV
        },
        database: {
          connected: latestMetrics?.database?.connected || false,
          responseTime: latestMetrics?.database?.responseTime || null
        },
        errors: {
          lastHour: {
            total: Object.values(errorCounts).reduce((sum, count) => sum + count, 0),
            critical: errorCounts.critical || 0,
            error: errorCounts.error || 0,
            warning: errorCounts.warning || 0
          }
        },
        alerts: {
          recent: activeAlerts.length,
          latest: activeAlerts[0] || null
        },
        metrics: {
          latest: latestMetrics?.timestamp || null,
          monitoringActive: !!this.monitoringInterval
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get system health:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * DomainMeaning: Perform manual cleanup of old logs and data
   * MisleadingNames: None
   * SideEffects: Removes old data from database collections
   * Invariants: Cleanup must respect retention policies and not remove recent data
   * RAG_Keywords: data cleanup, retention policies, maintenance
   * DuplicatePolicy: canonical
   * FunctionIdentity: manual-cleanup-001
   */
  async performManualCleanup() {
    try {
      const now = new Date();
      
      // Clean up old error logs
      const errorLogCutoff = new Date(now.getTime() - (this.config.retention.errorLogsDays * 24 * 60 * 60 * 1000));
      const deletedErrorLogs = await this.errorLogCollection.deleteMany({
        timestamp: { $lt: errorLogCutoff }
      });
      
      // Clean up old monitoring data
      const monitoringCutoff = new Date(now.getTime() - (this.config.retention.monitoringDataDays * 24 * 60 * 60 * 1000));
      const deletedMonitoringData = await this.monitoringCollection.deleteMany({
        timestamp: { $lt: monitoringCutoff }
      });
      
      // Clean up old alert history
      const alertCutoff = new Date(now.getTime() - (this.config.retention.alertHistoryDays * 24 * 60 * 60 * 1000));
      const deletedAlerts = await this.alertCollection.deleteMany({
        timestamp: { $lt: alertCutoff }
      });
      
      const cleanupResult = {
        deletedErrorLogs: deletedErrorLogs.deletedCount,
        deletedMonitoringData: deletedMonitoringData.deletedCount,
        deletedAlerts: deletedAlerts.deletedCount,
        cutoffDates: {
          errorLogs: errorLogCutoff,
          monitoringData: monitoringCutoff,
          alerts: alertCutoff
        },
        completedAt: new Date()
      };
      
      console.log('🧹 Manual cleanup completed:', cleanupResult);
      return cleanupResult;
      
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = ErrorLoggingMonitoringService;