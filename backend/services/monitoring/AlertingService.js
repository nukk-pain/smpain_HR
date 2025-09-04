/**
 * AI-HEADER
 * intent: Alert management service for triggering and tracking system alerts
 * domain_meaning: Handles alert conditions, notifications, and alert history
 * misleading_names: None
 * data_contracts: Uses alert_history collection for alert persistence
 * PII: May contain user IDs in alert context
 * invariants: Must prevent alert flooding with cooldown mechanism
 * rag_keywords: alerting, notifications, threshold monitoring, alert management
 */

const { ObjectId } = require('mongodb');

/**
 * DomainMeaning: Service for managing system alerts and notifications
 * MisleadingNames: None
 * SideEffects: Creates database entries, may send notifications
 * Invariants: Must respect cooldown periods to prevent spam
 * RAG_Keywords: alerts, notifications, threshold monitoring
 * DuplicatePolicy: canonical
 * FunctionIdentity: alerting-service-001
 */
class AlertingService {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
    this.alertCollection = db.collection('alert_history');
    this.alertCooldowns = new Map();
    this.alertHandlers = new Map();
    this.initialize();
  }

  /**
   * DomainMeaning: Initialize alerting service with indexes
   * MisleadingNames: None
   * SideEffects: Creates MongoDB indexes
   * Invariants: Indexes must be created for query performance
   * RAG_Keywords: initialization, alert setup
   * DuplicatePolicy: canonical
   * FunctionIdentity: alerting-initialize-001
   */
  async initialize() {
    try {
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
        { severity: 1, timestamp: -1 }, 
        { background: true }
      );
      await this.alertCollection.createIndex(
        { resolved: 1, timestamp: -1 }, 
        { background: true }
      );
      
      // TTL index for automatic cleanup
      await this.alertCollection.createIndex(
        { timestamp: 1 },
        { 
          expireAfterSeconds: this.config.retention.alertHistoryDays * 24 * 60 * 60,
          background: true
        }
      );
      
      console.log('🔧 AlertingService initialized with indexes');
    } catch (error) {
      console.error('❌ Failed to initialize AlertingService:', error);
    }
  }

  /**
   * DomainMeaning: Check error log for alert conditions
   * MisleadingNames: None
   * SideEffects: May trigger alerts
   * Invariants: Must check all alert conditions
   * RAG_Keywords: error alerts, critical errors, alert conditions
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-error-alerts-001
   */
  async checkErrorAlertConditions(errorLog) {
    if (!errorLog) return;
    
    // Check for critical errors
    if (errorLog.severity === 'critical') {
      await this.triggerAlert({
        type: 'critical_error',
        severity: 'critical',
        title: `Critical Error: ${errorLog.type}`,
        message: errorLog.message,
        metadata: {
          errorId: errorLog._id,
          errorType: errorLog.type,
          category: errorLog.category,
          userId: errorLog.context?.userId,
          operation: errorLog.context?.operation
        }
      });
    }
    
    // Check error rate (requires aggregation)
    await this.checkErrorRate();
  }

  /**
   * DomainMeaning: Check system metrics for alert conditions
   * MisleadingNames: None
   * SideEffects: May trigger alerts
   * Invariants: Must check all metric thresholds
   * RAG_Keywords: metric alerts, threshold alerts, system alerts
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-metric-alerts-001
   */
  async checkMetricAlertConditions(alerts) {
    if (!alerts || alerts.length === 0) return;
    
    for (const alert of alerts) {
      const alertKey = `metric_${alert.type}`;
      
      if (!this.isAlertCooledDown(alertKey)) {
        await this.triggerAlert({
          type: alert.type,
          severity: this.determineMetricAlertSeverity(alert),
          title: this.getMetricAlertTitle(alert),
          message: `Current value: ${alert.value}, Threshold: ${alert.threshold}`,
          metadata: {
            currentValue: alert.value,
            threshold: alert.threshold,
            metricType: alert.type
          }
        });
        
        this.setAlertCooldown(alertKey, this.config.alerting.cooldownMs);
      }
    }
  }

  /**
   * DomainMeaning: Trigger and record an alert
   * MisleadingNames: None
   * SideEffects: Creates database entry, may send notifications
   * Invariants: Must respect cooldown and rate limits
   * RAG_Keywords: trigger alert, send notification, alert recording
   * DuplicatePolicy: canonical
   * FunctionIdentity: trigger-alert-001
   */
  async triggerAlert(alertData) {
    try {
      const alert = {
        _id: new ObjectId(),
        timestamp: new Date(),
        type: alertData.type,
        severity: alertData.severity || 'medium',
        title: alertData.title,
        message: alertData.message,
        metadata: alertData.metadata || {},
        environment: process.env.NODE_ENV || 'unknown',
        resolved: false,
        resolvedAt: null,
        notificationsSent: []
      };
      
      // Store alert in database
      await this.alertCollection.insertOne(alert);
      
      console.log(`🚨 Alert triggered: ${alert.title} (${alert.severity})`);
      
      // Send notifications based on severity and configuration
      await this.sendNotifications(alert);
      
      // Execute custom alert handlers if registered
      await this.executeAlertHandlers(alert);
      
      return alert._id;
      
    } catch (error) {
      console.error('❌ Failed to trigger alert:', error);
      return null;
    }
  }

  /**
   * DomainMeaning: Send notifications for an alert
   * MisleadingNames: None
   * SideEffects: May send emails, Slack messages, etc.
   * Invariants: Must handle notification failures gracefully
   * RAG_Keywords: notifications, email alerts, slack alerts
   * DuplicatePolicy: canonical
   * FunctionIdentity: send-notifications-001
   */
  async sendNotifications(alert) {
    const notifications = [];
    
    // Email notifications
    if (this.config.alerting.enableEmailAlerts && alert.severity === 'critical') {
      // TODO: Implement email notification
      console.log(`📧 Would send email alert: ${alert.title}`);
      notifications.push({ type: 'email', sentAt: new Date() });
    }
    
    // Slack notifications
    if (this.config.alerting.enableSlackAlerts && ['critical', 'high'].includes(alert.severity)) {
      // TODO: Implement Slack notification
      console.log(`💬 Would send Slack alert: ${alert.title}`);
      notifications.push({ type: 'slack', sentAt: new Date() });
    }
    
    // Update alert with notification status
    if (notifications.length > 0) {
      await this.alertCollection.updateOne(
        { _id: alert._id },
        { $set: { notificationsSent: notifications } }
      );
    }
  }

  /**
   * DomainMeaning: Check if alert is in cooldown period
   * MisleadingNames: None
   * SideEffects: None - read only check
   * Invariants: Must return boolean
   * RAG_Keywords: cooldown, rate limiting, alert spam prevention
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-cooldown-001
   */
  isAlertCooledDown(alertKey) {
    const cooldownUntil = this.alertCooldowns.get(alertKey);
    if (!cooldownUntil) return false;
    
    if (Date.now() < cooldownUntil) {
      return true;
    }
    
    this.alertCooldowns.delete(alertKey);
    return false;
  }

  /**
   * DomainMeaning: Set cooldown for an alert type
   * MisleadingNames: None
   * SideEffects: Modifies cooldown map
   * Invariants: Cooldown must be positive milliseconds
   * RAG_Keywords: set cooldown, rate limiting
   * DuplicatePolicy: canonical
   * FunctionIdentity: set-cooldown-001
   */
  setAlertCooldown(alertKey, cooldownMs) {
    this.alertCooldowns.set(alertKey, Date.now() + cooldownMs);
  }

  /**
   * DomainMeaning: Register custom alert handler
   * MisleadingNames: None
   * SideEffects: Modifies alert handlers map
   * Invariants: Handler must be a function
   * RAG_Keywords: custom handler, alert callback
   * DuplicatePolicy: canonical
   * FunctionIdentity: register-handler-001
   */
  registerAlertHandler(alertType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Alert handler must be a function');
    }
    this.alertHandlers.set(alertType, handler);
    console.log(`🎯 Alert handler registered for: ${alertType}`);
  }

  /**
   * DomainMeaning: Execute registered alert handlers
   * MisleadingNames: None
   * SideEffects: Executes custom functions
   * Invariants: Must handle handler failures gracefully
   * RAG_Keywords: execute handlers, custom callbacks
   * DuplicatePolicy: canonical
   * FunctionIdentity: execute-handlers-001
   */
  async executeAlertHandlers(alert) {
    const handler = this.alertHandlers.get(alert.type);
    if (handler) {
      try {
        await handler(alert);
      } catch (error) {
        console.error(`❌ Alert handler failed for ${alert.type}:`, error);
      }
    }
  }

  /**
   * DomainMeaning: Check error rate for threshold alerts
   * MisleadingNames: None
   * SideEffects: May trigger alerts
   * Invariants: Must calculate rate over time window
   * RAG_Keywords: error rate, threshold monitoring
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-error-rate-001
   */
  async checkErrorRate() {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    
    const errorCount = await this.db.collection('error_logs').countDocuments({
      timestamp: { $gte: oneMinuteAgo }
    });
    
    if (errorCount > this.config.alertThresholds.errorRatePerMinute) {
      const alertKey = 'error_rate_high';
      
      if (!this.isAlertCooledDown(alertKey)) {
        await this.triggerAlert({
          type: 'error_rate_high',
          severity: 'high',
          title: 'High Error Rate Detected',
          message: `${errorCount} errors in the last minute (threshold: ${this.config.alertThresholds.errorRatePerMinute})`,
          metadata: {
            errorCount,
            timeWindow: '1 minute',
            threshold: this.config.alertThresholds.errorRatePerMinute
          }
        });
        
        this.setAlertCooldown(alertKey, this.config.alerting.cooldownMs);
      }
    }
  }

  /**
   * DomainMeaning: Determine severity for metric alerts
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must return valid severity
   * RAG_Keywords: severity determination, metric alerts
   * DuplicatePolicy: canonical
   * FunctionIdentity: determine-metric-severity-001
   */
  determineMetricAlertSeverity(alert) {
    const ratio = alert.value / alert.threshold;
    
    if (ratio > 1.5) return 'critical';
    if (ratio > 1.2) return 'high';
    return 'medium';
  }

  /**
   * DomainMeaning: Get human-readable title for metric alerts
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must return string title
   * RAG_Keywords: alert title, metric description
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-metric-title-001
   */
  getMetricAlertTitle(alert) {
    const titles = {
      memory_high: 'High Memory Usage',
      cpu_high: 'High CPU Usage',
      event_loop_slow: 'Event Loop Delay',
      db_connections_high: 'Database Connection Pool Near Limit'
    };
    
    return titles[alert.type] || `Metric Alert: ${alert.type}`;
  }

  /**
   * DomainMeaning: Resolve an alert
   * MisleadingNames: None
   * SideEffects: Updates database
   * Invariants: Alert must exist
   * RAG_Keywords: resolve alert, clear alert
   * DuplicatePolicy: canonical
   * FunctionIdentity: resolve-alert-001
   */
  async resolveAlert(alertId, resolution = {}) {
    try {
      const result = await this.alertCollection.updateOne(
        { _id: new ObjectId(alertId) },
        {
          $set: {
            resolved: true,
            resolvedAt: new Date(),
            resolution: resolution
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Alert resolved: ${alertId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to resolve alert:', error);
      return false;
    }
  }

  /**
   * DomainMeaning: Get active alerts
   * MisleadingNames: None
   * SideEffects: None - read only
   * Invariants: Must return array
   * RAG_Keywords: active alerts, unresolved alerts
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-active-alerts-001
   */
  async getActiveAlerts() {
    return await this.alertCollection
      .find({ resolved: false })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
  }
}

module.exports = AlertingService;