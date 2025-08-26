/**
 * Modular Error Logging and Monitoring Service
 * Orchestrator for modularized error logging, monitoring, and alerting services
 */

const ServiceContainer = require('./core/ServiceContainer');
const DatabaseManager = require('./core/DatabaseManager');
const LoggerFactory = require('./core/LoggerFactory');
const ErrorLogger = require('./logging/ErrorLogger');
const MetricsCollector = require('./monitoring/MetricsCollector');
const monitoringConfig = require('../config/monitoringConfig');

/**
 * Main orchestrator service that coordinates all monitoring modules
 */
class ErrorLoggingMonitoringServiceModular {
  constructor(db) {
    this.db = db;
    this.logger = LoggerFactory.createLogger('ErrorLoggingMonitoring');
    this.config = monitoringConfig;
    
    // Service instances
    this.errorLogger = null;
    this.metricsCollector = null;
    this.alertManager = null;
    this.systemHealthMonitor = null;
    
    // Monitoring state
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.alertCooldowns = new Map();
    
    // Initialize services
    this.initializeServices();
  }
  
  /**
   * Initialize all modular services
   */
  async initializeServices() {
    try {
      // Register services in the container
      ServiceContainer.register('database', () => this.db, { singleton: true });
      ServiceContainer.register('logger', () => LoggerFactory, { singleton: true });
      ServiceContainer.register('config', () => this.config, { singleton: true });
      
      // Register error logger
      ServiceContainer.register('errorLogger', (deps) => new ErrorLogger({
        db: deps.database,
        logger: deps.logger.createLogger('ErrorLogger'),
        config: deps.config
      }), { dependencies: ['database', 'logger', 'config'] });
      
      // Register metrics collector
      ServiceContainer.register('metricsCollector', (deps) => new MetricsCollector({
        db: deps.database,
        logger: deps.logger.createLogger('MetricsCollector'),
        config: deps.config
      }), { dependencies: ['database', 'logger', 'config'] });
      
      // Get service instances
      this.errorLogger = await ServiceContainer.get('errorLogger');
      this.metricsCollector = await ServiceContainer.get('metricsCollector');
      
      this.logger.info('Modular monitoring services initialized');
    } catch (error) {
      this.logger.error('Failed to initialize modular services:', error);
      throw error;
    }
  }
  
  /**
   * Initialize the service (called from server.js)
   */
  async initialize() {
    try {
      // Initialize all services through the container
      await ServiceContainer.initializeAll();
      
      // Create indexes for backward compatibility
      await this.ensureIndexes();
      
      // Start monitoring if enabled
      if (this.config.monitoring.intervalMs > 0) {
        await this.startMonitoring();
      }
      
      this.logger.info('ErrorLoggingMonitoringService (Modular) initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }
  
  /**
   * Ensure database indexes (backward compatibility)
   */
  async ensureIndexes() {
    // Indexes are now created in individual modules
    // This is kept for backward compatibility
    this.logger.debug('Indexes created by individual modules');
  }
  
  /**
   * Log an error (proxy to ErrorLogger)
   */
  async logError(error, context = {}) {
    if (!this.errorLogger) {
      console.error('ErrorLogger not initialized:', error);
      return null;
    }
    
    return this.errorLogger.logError(error, context);
  }
  
  /**
   * Log audit trail (simplified version for now)
   */
  async logAuditTrail(action, details = {}) {
    const auditEntry = {
      timestamp: new Date(),
      action,
      userId: details.userId || 'system',
      resourceType: details.resourceType,
      resourceId: details.resourceId,
      changes: details.changes,
      metadata: details.metadata || {},
      ip: details.ip,
      userAgent: details.userAgent
    };
    
    try {
      const auditCollection = this.db.collection('audit_logs');
      const result = await auditCollection.insertOne(auditEntry);
      return result.insertedId;
    } catch (error) {
      this.logger.error('Failed to log audit trail:', error);
      return null;
    }
  }
  
  /**
   * Start monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring already started');
      return;
    }
    
    this.isMonitoring = true;
    this.logger.info('Starting system monitoring...');
    
    // Initial metrics collection
    await this.collectAndStoreMetrics();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectAndStoreMetrics();
      } catch (error) {
        this.logger.error('Error in monitoring cycle:', error);
      }
    }, this.config.monitoring.intervalMs);
  }
  
  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.logger.info('System monitoring stopped');
  }
  
  /**
   * Collect and store metrics
   */
  async collectAndStoreMetrics() {
    if (!this.metricsCollector) {
      this.logger.warn('MetricsCollector not initialized');
      return;
    }
    
    try {
      // Collect all metrics
      const metrics = await this.metricsCollector.collectMetrics();
      
      // Check alert conditions
      await this.checkAlertConditions(metrics);
      
      this.logger.debug('Metrics collected and stored');
    } catch (error) {
      this.logger.error('Failed to collect metrics:', error);
    }
  }
  
  /**
   * Check alert conditions (simplified version)
   */
  async checkAlertConditions(metrics) {
    const alerts = [];
    
    // Check memory usage
    if (metrics.memory && metrics.memory.system.percentage > this.config.alertThresholds.memoryUsagePercent) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'warning',
        message: `Memory usage is ${metrics.memory.system.percentage.toFixed(2)}%`,
        value: metrics.memory.system.percentage
      });
    }
    
    // Check CPU usage
    if (metrics.cpu && metrics.cpu.usage > this.config.alertThresholds.cpuUsagePercent) {
      alerts.push({
        type: 'HIGH_CPU_USAGE',
        severity: 'warning',
        message: `CPU usage is ${metrics.cpu.usage}%`,
        value: metrics.cpu.usage
      });
    }
    
    // Check event loop delay
    if (metrics.eventLoopDelay > 100) {
      alerts.push({
        type: 'HIGH_EVENT_LOOP_DELAY',
        severity: 'warning',
        message: `Event loop delay is ${metrics.eventLoopDelay.toFixed(2)}ms`,
        value: metrics.eventLoopDelay
      });
    }
    
    // Trigger alerts with cooldown
    for (const alert of alerts) {
      await this.triggerAlert(alert);
    }
  }
  
  /**
   * Trigger an alert with cooldown
   */
  async triggerAlert(alert) {
    const alertKey = `${alert.type}:${alert.severity}`;
    
    // Check cooldown
    if (this.isAlertCooledDown(alert.type, alertKey)) {
      this.logger.debug(`Alert ${alertKey} is in cooldown`);
      return;
    }
    
    // Log the alert
    this.logger.warn(`ALERT: ${alert.message}`, alert);
    
    // Store alert in database
    try {
      const alertCollection = this.db.collection('alert_history');
      await alertCollection.insertOne({
        ...alert,
        timestamp: new Date(),
        acknowledged: false
      });
    } catch (error) {
      this.logger.error('Failed to store alert:', error);
    }
    
    // Set cooldown
    const cooldownDuration = this.config.alertCooldown[alert.type] || this.config.alertCooldown.default;
    this.setAlertCooldown(alert.type, alertKey, cooldownDuration);
  }
  
  /**
   * Check if alert is in cooldown
   */
  isAlertCooledDown(alertType, alertKey) {
    const cooldownUntil = this.alertCooldowns.get(alertKey);
    return cooldownUntil && Date.now() < cooldownUntil;
  }
  
  /**
   * Set alert cooldown
   */
  setAlertCooldown(alertType, alertKey, durationMs = 300000) {
    this.alertCooldowns.set(alertKey, Date.now() + durationMs);
    
    // Clean up expired cooldowns periodically
    setTimeout(() => {
      if (this.alertCooldowns.get(alertKey) <= Date.now()) {
        this.alertCooldowns.delete(alertKey);
      }
    }, durationMs + 1000);
  }
  
  /**
   * Get system health (proxy to MetricsCollector)
   */
  async getSystemHealth() {
    if (!this.metricsCollector) {
      return { status: 'unknown', message: 'MetricsCollector not initialized' };
    }
    
    return this.metricsCollector.getSystemHealth();
  }
  
  /**
   * Get error analytics (simplified version)
   */
  async getErrorAnalytics(options = {}) {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Default 24 hours
      endDate = new Date(),
      groupBy = 'severity'
    } = options;
    
    if (!this.errorLogger) {
      return { error: 'ErrorLogger not initialized' };
    }
    
    return this.errorLogger.getErrorStats(startDate, endDate);
  }
  
  /**
   * Perform manual cleanup
   */
  async performManualCleanup() {
    try {
      let totalDeleted = 0;
      
      // Cleanup old error logs
      if (this.errorLogger) {
        const errorLogsDeleted = await this.errorLogger.cleanupOldLogs(
          this.config.retention.errorLogsDays
        );
        totalDeleted += errorLogsDeleted;
        this.logger.info(`Cleaned up ${errorLogsDeleted} old error logs`);
      }
      
      // Cleanup old monitoring data
      const monitoringCollection = this.db.collection('monitoring_data');
      const monitoringCutoff = new Date();
      monitoringCutoff.setDate(monitoringCutoff.getDate() - this.config.retention.monitoringDataDays);
      
      const monitoringResult = await monitoringCollection.deleteMany({
        timestamp: { $lt: monitoringCutoff }
      });
      totalDeleted += monitoringResult.deletedCount;
      
      // Cleanup old alerts
      const alertCollection = this.db.collection('alert_history');
      const alertCutoff = new Date();
      alertCutoff.setDate(alertCutoff.getDate() - this.config.retention.alertHistoryDays);
      
      const alertResult = await alertCollection.deleteMany({
        timestamp: { $lt: alertCutoff }
      });
      totalDeleted += alertResult.deletedCount;
      
      this.logger.info(`Manual cleanup completed. Total deleted: ${totalDeleted}`);
      return { success: true, deletedCount: totalDeleted };
    } catch (error) {
      this.logger.error('Manual cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Shutdown the service gracefully
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down ErrorLoggingMonitoringService (Modular)...');
      
      // Stop monitoring
      await this.stopMonitoring();
      
      // Shutdown all services
      await ServiceContainer.shutdownAll();
      
      this.logger.info('ErrorLoggingMonitoringService (Modular) shut down successfully');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}

module.exports = ErrorLoggingMonitoringServiceModular;