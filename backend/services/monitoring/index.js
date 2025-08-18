/**
 * AI-HEADER
 * intent: Unified monitoring service interface for backward compatibility
 * domain_meaning: Integrates all monitoring services and provides legacy API
 * misleading_names: None
 * data_contracts: Maintains same interface as original ErrorLoggingMonitoringService
 * PII: Delegates PII handling to individual services
 * invariants: Must maintain 100% backward compatibility
 * rag_keywords: monitoring integration, unified interface, backward compatibility
 */

const ErrorLoggingService = require('./ErrorLoggingService');
const AuditTrailService = require('./AuditTrailService');
const SystemMonitoringService = require('./SystemMonitoringService');
const AlertingService = require('./AlertingService');
const AnalyticsService = require('./AnalyticsService');
const DataRetentionManager = require('./utils/DataRetentionManager');
const monitoringConfig = require('./config/monitoringConfig');

/**
 * DomainMeaning: Unified monitoring service maintaining backward compatibility
 * MisleadingNames: None
 * SideEffects: Initializes all sub-services
 * Invariants: Must provide same interface as original ErrorLoggingMonitoringService
 * RAG_Keywords: unified monitoring, service integration, backward compatibility
 * DuplicatePolicy: canonical
 * FunctionIdentity: unified-monitoring-service-001
 */
class MonitoringService {
  constructor(db) {
    // Initialize configuration
    this.config = monitoringConfig;
    this.db = db;
    
    // Initialize all services
    this.errorLogger = new ErrorLoggingService({ db, config: this.config });
    this.auditTrail = new AuditTrailService({ db, config: this.config });
    this.systemMonitor = new SystemMonitoringService({ db, config: this.config });
    this.alerting = new AlertingService({ db, config: this.config });
    this.analytics = new AnalyticsService({ db, config: this.config });
    this.retentionManager = new DataRetentionManager({ db, config: this.config });
    
    // Maintain references to collections for backward compatibility
    this.errorLogCollection = db.collection('error_logs');
    this.monitoringCollection = db.collection('monitoring_data');
    this.alertCollection = db.collection('alert_history');
    
    // Initialize monitoring interval reference
    this.monitoringInterval = null;
    
    console.log('✅ MonitoringService initialized with all sub-services');
  }

  /**
   * BACKWARD COMPATIBILITY METHODS
   * These methods maintain the same interface as the original ErrorLoggingMonitoringService
   */

  /**
   * DomainMeaning: Log error with comprehensive metadata (backward compatible)
   * MisleadingNames: None
   * SideEffects: Logs error and may trigger alerts
   * Invariants: Must maintain same signature as original
   * RAG_Keywords: error logging, backward compatibility
   * DuplicatePolicy: duplicate_of ErrorLoggingService.logError
   * FunctionIdentity: log-error-compat-001
   */
  async logError(error, context = {}) {
    const errorLog = await this.errorLogger.logError(error, context);
    
    // Check for alert conditions
    if (errorLog) {
      await this.alerting.checkErrorAlertConditions(errorLog);
    }
    
    return errorLog?._id;
  }

  /**
   * DomainMeaning: Log audit trail (backward compatible)
   * MisleadingNames: None
   * SideEffects: Creates audit log entry
   * Invariants: Must maintain same signature as original
   * RAG_Keywords: audit trail, backward compatibility
   * DuplicatePolicy: duplicate_of AuditTrailService.logAuditTrail
   * FunctionIdentity: log-audit-compat-001
   */
  async logAuditTrail(auditData) {
    return await this.auditTrail.logAuditTrail(auditData);
  }

  /**
   * DomainMeaning: Start monitoring (backward compatible)
   * MisleadingNames: None
   * SideEffects: Starts system monitoring
   * Invariants: Must maintain same behavior as original
   * RAG_Keywords: start monitoring, backward compatibility
   * DuplicatePolicy: duplicate_of SystemMonitoringService.startMonitoring
   * FunctionIdentity: start-monitoring-compat-001
   */
  startMonitoring() {
    this.systemMonitor.startMonitoring();
    this.monitoringInterval = this.systemMonitor.monitoringInterval;
  }

  /**
   * DomainMeaning: Stop monitoring (backward compatible)
   * MisleadingNames: None
   * SideEffects: Stops system monitoring
   * Invariants: Must maintain same behavior as original
   * RAG_Keywords: stop monitoring, backward compatibility
   * DuplicatePolicy: duplicate_of SystemMonitoringService.stopMonitoring
   * FunctionIdentity: stop-monitoring-compat-001
   */
  stopMonitoring() {
    this.systemMonitor.stopMonitoring();
    this.monitoringInterval = null;
  }

  /**
   * DomainMeaning: Collect metrics (backward compatible)
   * MisleadingNames: None
   * SideEffects: Collects and stores metrics
   * Invariants: Must maintain same behavior as original
   * RAG_Keywords: metrics collection, backward compatibility
   * DuplicatePolicy: duplicate_of SystemMonitoringService.collectMetrics
   * FunctionIdentity: collect-metrics-compat-001
   */
  async collectMetrics() {
    const metrics = await this.systemMonitor.collectMetrics();
    
    // Check for metric-based alerts
    if (metrics) {
      const alerts = this.systemMonitor.checkMetricThresholds(metrics);
      await this.alerting.checkMetricAlertConditions(alerts);
    }
    
    return metrics;
  }

  /**
   * DomainMeaning: Get error analytics (backward compatible)
   * MisleadingNames: None
   * SideEffects: None - read only
   * Invariants: Must maintain same signature as original
   * RAG_Keywords: error analytics, backward compatibility
   * DuplicatePolicy: duplicate_of AnalyticsService.getErrorAnalytics
   * FunctionIdentity: get-error-analytics-compat-001
   */
  async getErrorAnalytics(timeRangeHours = 24) {
    return await this.analytics.getErrorAnalytics(timeRangeHours);
  }

  /**
   * DomainMeaning: Get system health (backward compatible)
   * MisleadingNames: None
   * SideEffects: None - read only
   * Invariants: Must maintain same signature as original
   * RAG_Keywords: system health, backward compatibility
   * DuplicatePolicy: duplicate_of AnalyticsService.getSystemHealth
   * FunctionIdentity: get-system-health-compat-001
   */
  async getSystemHealth() {
    return await this.analytics.getSystemHealth();
  }

  /**
   * DomainMeaning: Perform manual cleanup (backward compatible)
   * MisleadingNames: None
   * SideEffects: Deletes old data
   * Invariants: Must maintain same behavior as original
   * RAG_Keywords: data cleanup, backward compatibility
   * DuplicatePolicy: duplicate_of DataRetentionManager.performManualCleanup
   * FunctionIdentity: perform-cleanup-compat-001
   */
  async performManualCleanup() {
    return await this.retentionManager.performManualCleanup();
  }

  /**
   * ADDITIONAL CONVENIENCE METHODS
   * These provide easy access to new functionality
   */

  /**
   * DomainMeaning: Query audit trails with filters
   * MisleadingNames: None
   * SideEffects: None - read only
   * Invariants: Must handle filters safely
   * RAG_Keywords: audit query, audit search
   * DuplicatePolicy: duplicate_of AuditTrailService.queryAuditTrails
   * FunctionIdentity: query-audit-001
   */
  async queryAuditTrails(filters = {}, options = {}) {
    return await this.auditTrail.queryAuditTrails(filters, options);
  }

  /**
   * DomainMeaning: Get active alerts
   * MisleadingNames: None
   * SideEffects: None - read only
   * Invariants: Must return array
   * RAG_Keywords: active alerts, unresolved alerts
   * DuplicatePolicy: duplicate_of AlertingService.getActiveAlerts
   * FunctionIdentity: get-active-alerts-001
   */
  async getActiveAlerts() {
    return await this.alerting.getActiveAlerts();
  }

  /**
   * DomainMeaning: Resolve an alert
   * MisleadingNames: None
   * SideEffects: Updates alert status
   * Invariants: Alert must exist
   * RAG_Keywords: resolve alert, clear alert
   * DuplicatePolicy: duplicate_of AlertingService.resolveAlert
   * FunctionIdentity: resolve-alert-001
   */
  async resolveAlert(alertId, resolution = {}) {
    return await this.alerting.resolveAlert(alertId, resolution);
  }

  /**
   * DomainMeaning: Register custom metric
   * MisleadingNames: None
   * SideEffects: Adds metric to collection
   * Invariants: Metric function must be valid
   * RAG_Keywords: custom metrics, metric registration
   * DuplicatePolicy: duplicate_of SystemMonitoringService.registerCustomMetric
   * FunctionIdentity: register-metric-001
   */
  registerCustomMetric(name, metricFunction) {
    this.systemMonitor.registerCustomMetric(name, metricFunction);
  }

  /**
   * DomainMeaning: Register alert handler
   * MisleadingNames: None
   * SideEffects: Adds handler to alerts
   * Invariants: Handler must be function
   * RAG_Keywords: alert handler, custom callback
   * DuplicatePolicy: duplicate_of AlertingService.registerAlertHandler
   * FunctionIdentity: register-handler-001
   */
  registerAlertHandler(alertType, handler) {
    this.alerting.registerAlertHandler(alertType, handler);
  }

  /**
   * DomainMeaning: Get retention statistics
   * MisleadingNames: None
   * SideEffects: None - read only
   * Invariants: Must return stats object
   * RAG_Keywords: retention stats, data lifecycle
   * DuplicatePolicy: duplicate_of DataRetentionManager.getRetentionStats
   * FunctionIdentity: get-retention-stats-001
   */
  async getRetentionStats() {
    return await this.retentionManager.getRetentionStats();
  }
}

// Export the main class
module.exports = MonitoringService;

// Also export as ErrorLoggingMonitoringService for complete backward compatibility
module.exports.ErrorLoggingMonitoringService = MonitoringService;

// Export individual services for direct access if needed
module.exports.ErrorLoggingService = ErrorLoggingService;
module.exports.AuditTrailService = AuditTrailService;
module.exports.SystemMonitoringService = SystemMonitoringService;
module.exports.AlertingService = AlertingService;
module.exports.AnalyticsService = AnalyticsService;
module.exports.DataRetentionManager = DataRetentionManager;