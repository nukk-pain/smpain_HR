/**
 * AI-HEADER
 * intent: Centralized configuration for monitoring and logging services
 * domain_meaning: Defines thresholds, retention policies, and monitoring intervals
 * misleading_names: None
 * data_contracts: Configuration object with retention, alert, and monitoring settings
 * PII: No PII data stored
 * invariants: Configuration values must be positive integers
 * rag_keywords: monitoring config, alert thresholds, retention policy, logging configuration
 */

/**
 * DomainMeaning: Monitoring system configuration
 * MisleadingNames: None
 * SideEffects: None - pure configuration object
 * Invariants: All time values in appropriate units (days, ms, etc)
 * RAG_Keywords: configuration, thresholds, retention, monitoring settings
 * DuplicatePolicy: canonical
 * FunctionIdentity: monitoring-config-001
 */
const monitoringConfig = {
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
  },
  
  alerting: {
    cooldownMs: 300000, // 5 minutes
    maxAlertsPerHour: 10,
    enableEmailAlerts: process.env.ENABLE_EMAIL_ALERTS === 'true',
    enableSlackAlerts: process.env.ENABLE_SLACK_ALERTS === 'true'
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV !== 'production',
    enableFile: process.env.ENABLE_FILE_LOGGING === 'true'
  }
};

module.exports = monitoringConfig;