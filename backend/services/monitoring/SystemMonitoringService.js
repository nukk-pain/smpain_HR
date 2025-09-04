/**
 * AI-HEADER
 * intent: System monitoring service for tracking application and infrastructure health
 * domain_meaning: Collects and stores system metrics for performance monitoring
 * misleading_names: None
 * data_contracts: Uses monitoring_data collection for metrics storage
 * PII: No PII data collected
 * invariants: Monitoring must not impact application performance
 * rag_keywords: system monitoring, metrics collection, performance tracking
 */

const { ObjectId } = require('mongodb');
const MetricsCollector = require('./utils/MetricsCollector');

/**
 * DomainMeaning: Service for continuous system monitoring
 * MisleadingNames: None
 * SideEffects: Creates database entries, runs periodic monitoring
 * Invariants: Must handle monitoring failures gracefully
 * RAG_Keywords: system monitor, metrics, performance monitoring
 * DuplicatePolicy: canonical
 * FunctionIdentity: system-monitoring-service-001
 */
class SystemMonitoringService {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
    this.monitoringCollection = db.collection('monitoring_data');
    this.monitoringInterval = null;
    this.customMetrics = new Map();
    this.initialize();
  }

  /**
   * DomainMeaning: Initialize monitoring service
   * MisleadingNames: None
   * SideEffects: Starts monitoring interval if enabled
   * Invariants: Must handle initialization failures gracefully
   * RAG_Keywords: initialization, monitoring setup
   * DuplicatePolicy: canonical
   * FunctionIdentity: system-monitor-initialize-001
   */
  async initialize() {
    try {
      console.log('🔧 SystemMonitoringService initialized');
      
      // Start monitoring if enabled
      if (this.config.monitoring.intervalMs > 0 && this.config.monitoring.enableSystemMetrics) {
        this.startMonitoring();
      }
    } catch (error) {
      console.error('❌ Failed to initialize SystemMonitoringService:', error);
    }
  }

  /**
   * DomainMeaning: Start periodic monitoring
   * MisleadingNames: None
   * SideEffects: Creates interval timer for metric collection
   * Invariants: Must prevent multiple intervals
   * RAG_Keywords: start monitoring, periodic collection
   * DuplicatePolicy: canonical
   * FunctionIdentity: start-monitoring-001
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      console.log('⚠️ Monitoring already running');
      return;
    }
    
    console.log('📊 Starting system monitoring with interval:', this.config.monitoring.intervalMs + 'ms');
    
    // Collect metrics immediately
    this.collectMetrics();
    
    // Set up periodic collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.intervalMs);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
  }

  /**
   * DomainMeaning: Stop monitoring gracefully
   * MisleadingNames: None
   * SideEffects: Clears interval timer
   * Invariants: Must handle already stopped state
   * RAG_Keywords: stop monitoring, cleanup
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
   * DomainMeaning: Collect and store all metrics
   * MisleadingNames: None
   * SideEffects: Creates database entries
   * Invariants: Must handle collection failures gracefully
   * RAG_Keywords: metrics collection, data gathering
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-metrics-001
   */
  async collectMetrics() {
    try {
      const metrics = await MetricsCollector.collectAllMetrics();
      
      // Add custom metrics if any
      if (this.customMetrics.size > 0) {
        metrics.custom = {};
        for (const [key, value] of this.customMetrics.entries()) {
          metrics.custom[key] = typeof value === 'function' ? await value() : value;
        }
      }
      
      // Add database metrics if enabled
      if (this.config.monitoring.enableDatabaseMetrics) {
        metrics.database = await this.collectDatabaseMetrics();
      }
      
      // Store metrics
      const metricsDocument = {
        _id: new ObjectId(),
        type: 'system_metrics',
        timestamp: new Date(),
        environment: process.env.NODE_ENV,
        ...metrics
      };
      
      await this.monitoringCollection.insertOne(metricsDocument);
      
      // Check for alert conditions
      this.checkMetricThresholds(metrics);
      
      return metrics;
      
    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
      return null;
    }
  }

  /**
   * DomainMeaning: Collect database-specific metrics
   * MisleadingNames: None
   * SideEffects: None - read only operations
   * Invariants: Must handle connection failures
   * RAG_Keywords: database metrics, connection pool, db stats
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-db-metrics-001
   */
  async collectDatabaseMetrics() {
    try {
      const dbStats = await this.db.stats();
      const serverStatus = await this.db.admin().serverStatus();
      
      return {
        collections: dbStats.collections,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // MB
        storageSize: Math.round(dbStats.storageSize / 1024 / 1024), // MB
        indexes: dbStats.indexes,
        indexSize: Math.round(dbStats.indexSize / 1024 / 1024), // MB
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0,
          totalCreated: serverStatus.connections?.totalCreated || 0
        },
        opcounters: serverStatus.opcounters || {},
        uptime: serverStatus.uptime || 0
      };
    } catch (error) {
      console.error('❌ Failed to collect database metrics:', error);
      return {
        error: 'Failed to collect database metrics',
        message: error.message
      };
    }
  }

  /**
   * DomainMeaning: Register custom metrics for collection
   * MisleadingNames: None
   * SideEffects: Modifies customMetrics map
   * Invariants: Metric names must be unique
   * RAG_Keywords: custom metrics, application metrics
   * DuplicatePolicy: canonical
   * FunctionIdentity: register-custom-metric-001
   */
  registerCustomMetric(name, metricFunction) {
    this.customMetrics.set(name, metricFunction);
    console.log(`📊 Custom metric registered: ${name}`);
  }

  /**
   * DomainMeaning: Check if metrics exceed configured thresholds
   * MisleadingNames: None
   * SideEffects: May trigger alerts (in future integration)
   * Invariants: Must check all configured thresholds
   * RAG_Keywords: threshold checking, alert conditions
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-thresholds-001
   */
  checkMetricThresholds(metrics) {
    const thresholds = this.config.alertThresholds;
    const alerts = [];
    
    // Check memory usage
    if (metrics.memory.system.percentage > thresholds.memoryUsagePercent) {
      alerts.push({
        type: 'memory_high',
        value: metrics.memory.system.percentage,
        threshold: thresholds.memoryUsagePercent
      });
    }
    
    // Check CPU usage
    if (metrics.cpu.usage > thresholds.cpuUsagePercent) {
      alerts.push({
        type: 'cpu_high',
        value: metrics.cpu.usage,
        threshold: thresholds.cpuUsagePercent
      });
    }
    
    // Check event loop delay
    if (metrics.eventLoop.delay > thresholds.responseTimeMs) {
      alerts.push({
        type: 'event_loop_slow',
        value: metrics.eventLoop.delay,
        threshold: thresholds.responseTimeMs
      });
    }
    
    // Check database connections
    if (metrics.database && metrics.database.connections.current > thresholds.dbConnectionPoolThreshold) {
      alerts.push({
        type: 'db_connections_high',
        value: metrics.database.connections.current,
        threshold: thresholds.dbConnectionPoolThreshold
      });
    }
    
    // Return alerts for potential processing by AlertingService
    return alerts;
  }

  /**
   * DomainMeaning: Get recent metrics for analysis
   * MisleadingNames: None
   * SideEffects: None - read only operation
   * Invariants: Must handle large datasets efficiently
   * RAG_Keywords: metrics query, recent metrics, data retrieval
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-recent-metrics-001
   */
  async getRecentMetrics(minutes = 60) {
    const startTime = new Date(Date.now() - minutes * 60 * 1000);
    
    const metrics = await this.monitoringCollection
      .find({
        type: 'system_metrics',
        timestamp: { $gte: startTime }
      })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    
    return metrics;
  }
}

module.exports = SystemMonitoringService;