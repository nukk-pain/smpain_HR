/*
 * AI-HEADER
 * Intent: Health monitoring and automated rollback for feature flags
 * Domain Meaning: Monitors feature flag performance and triggers automatic rollbacks
 * Misleading Names: None
 * Data Contracts: Health metrics, error thresholds, rollback triggers
 * PII: No PII data - operational metrics only
 * Invariants: Health checks must be continuous, rollbacks must be atomic
 * RAG Keywords: health monitoring, automatic rollback, circuit breaker, error tracking
 */

const featureFlags = require('../config/featureFlags');
const FeatureFlagRollback = require('./featureFlagRollback');
const fs = require('fs').promises;
const path = require('path');

/**
 * Feature Flag Health Monitor
 * DomainMeaning: Monitors feature flag health and triggers automatic rollbacks
 * MisleadingNames: None
 * SideEffects: May trigger automatic rollbacks, writes metrics to disk
 * Invariants: Must track all feature usage, must respect thresholds
 * RAG_Keywords: health monitor, automatic rollback, error tracking, circuit breaker
 * DuplicatePolicy: canonical - primary health monitoring implementation
 * FunctionIdentity: hash_health_monitor_001
 */
class FeatureFlagHealthMonitor {
  constructor() {
    this.rollbackService = new FeatureFlagRollback();
    this.healthMetrics = new Map();
    this.errorThresholds = new Map();
    this.monitoringInterval = null;
    this.metricsFile = path.join(__dirname, '../../logs/feature-health-metrics.json');
    
    // Default configuration
    this.defaultConfig = {
      errorThreshold: 0.1, // 10% error rate
      sampleSize: 100, // minimum requests before evaluation
      cooldownPeriod: 300000, // 5 minutes
      autoRollback: true,
      monitoringWindow: 60000 // 1 minute window for metrics
    };
    
    // Feature-specific configurations
    this.featureConfigs = {
      PREVIEW_UPLOAD: {
        errorThreshold: 0.05, // 5% for critical feature
        sampleSize: 50,
        cooldownPeriod: 600000, // 10 minutes
        autoRollback: true,
        monitoringWindow: 60000
      },
      BULK_OPERATIONS: {
        errorThreshold: 0.1,
        sampleSize: 20,
        cooldownPeriod: 300000,
        autoRollback: true,
        monitoringWindow: 60000
      },
      LEGACY_UPLOAD: {
        errorThreshold: 0.2, // Higher tolerance for legacy
        sampleSize: 10,
        cooldownPeriod: 60000,
        autoRollback: false, // Don't auto-rollback legacy
        monitoringWindow: 60000
      }
    };
    
    // Rollback state
    this.rollbackCooldowns = new Map();
    this.rollbackHistory = [];
  }

  /**
   * Initialize health monitoring
   * DomainMeaning: Start monitoring all feature flags
   * MisleadingNames: None
   * SideEffects: Starts interval timer, loads saved metrics
   * Invariants: Must be called before monitoring starts
   * RAG_Keywords: initialization, monitoring start, metrics loading
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_initialize_002
   */
  async initialize() {
    console.log('🏥 Initializing Feature Flag Health Monitor...');
    
    // Load saved metrics
    await this.loadMetrics();
    
    // Initialize metrics for all flags
    for (const flagName of featureFlags.getAllFlags()) {
      if (!this.healthMetrics.has(flagName)) {
        this.healthMetrics.set(flagName, this.createMetricEntry());
      }
      
      // Set configuration
      const config = this.featureConfigs[flagName] || this.defaultConfig;
      this.errorThresholds.set(flagName, config);
    }
    
    // Save initial state for all flags
    this.rollbackService.saveState('Initial state before monitoring');
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('✅ Health Monitor initialized');
  }

  /**
   * Create new metric entry
   * DomainMeaning: Initialize metrics structure for a feature
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Must return complete metric structure
   * RAG_Keywords: metric creation, initialization, data structure
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_create_metric_003
   */
  createMetricEntry() {
    return {
      requests: 0,
      errors: 0,
      successes: 0,
      errorRate: 0,
      windowStart: Date.now(),
      recentErrors: [],
      lastError: null,
      lastSuccess: null,
      totalRequests: 0,
      totalErrors: 0
    };
  }

  /**
   * Record feature usage
   * DomainMeaning: Track success or failure of feature flag usage
   * MisleadingNames: None
   * SideEffects: Updates metrics, may trigger rollback
   * Invariants: Must record all usage events
   * RAG_Keywords: usage tracking, error recording, metric update
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_record_usage_004
   */
  async recordUsage(flagName, success = true, errorDetails = null) {
    if (!this.healthMetrics.has(flagName)) {
      this.healthMetrics.set(flagName, this.createMetricEntry());
    }
    
    const metrics = this.healthMetrics.get(flagName);
    const now = Date.now();
    
    // Update metrics
    metrics.requests++;
    metrics.totalRequests++;
    
    if (success) {
      metrics.successes++;
      metrics.lastSuccess = now;
    } else {
      metrics.errors++;
      metrics.totalErrors++;
      metrics.lastError = now;
      
      // Store recent error details
      metrics.recentErrors.push({
        timestamp: now,
        details: errorDetails,
        message: errorDetails?.message || 'Unknown error'
      });
      
      // Keep only last 10 errors
      if (metrics.recentErrors.length > 10) {
        metrics.recentErrors.shift();
      }
    }
    
    // Calculate error rate
    metrics.errorRate = metrics.requests > 0 ? metrics.errors / metrics.requests : 0;
    
    // Check if we should trigger rollback
    await this.evaluateHealthAndRollback(flagName);
    
    // Save metrics periodically
    if (metrics.totalRequests % 100 === 0) {
      await this.saveMetrics();
    }
  }

  /**
   * Evaluate health and trigger rollback if needed
   * DomainMeaning: Check metrics against thresholds and rollback if unhealthy
   * MisleadingNames: None
   * SideEffects: May trigger automatic rollback
   * Invariants: Must respect cooldown and sample size
   * RAG_Keywords: health evaluation, threshold check, automatic rollback
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_evaluate_health_005
   */
  async evaluateHealthAndRollback(flagName) {
    const metrics = this.healthMetrics.get(flagName);
    const config = this.errorThresholds.get(flagName) || this.defaultConfig;
    
    // Check if feature is enabled
    if (!featureFlags.isEnabled(flagName)) {
      return; // Don't monitor disabled features
    }
    
    // Check if in cooldown
    if (this.isInCooldown(flagName)) {
      return;
    }
    
    // Check if we have enough samples
    if (metrics.requests < config.sampleSize) {
      return;
    }
    
    // Check if error rate exceeds threshold
    if (metrics.errorRate > config.errorThreshold && config.autoRollback) {
      console.log(`⚠️ Feature ${flagName} unhealthy: ${(metrics.errorRate * 100).toFixed(2)}% error rate`);
      await this.triggerAutomaticRollback(flagName, metrics, config);
    }
  }

  /**
   * Trigger automatic rollback
   * DomainMeaning: Execute rollback for unhealthy feature
   * MisleadingNames: None
   * SideEffects: Disables feature, saves rollback state
   * Invariants: Must record rollback event
   * RAG_Keywords: automatic rollback, feature disable, recovery action
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_trigger_rollback_006
   */
  async triggerAutomaticRollback(flagName, metrics, config) {
    console.log(`🚨 Triggering automatic rollback for ${flagName}`);
    
    // Save current state before rollback
    const stateId = this.rollbackService.saveState(`Pre-rollback state for ${flagName}`);
    
    // Disable the feature
    featureFlags.setFlag(flagName, false);
    
    // Record rollback event
    const rollbackEvent = {
      flagName,
      timestamp: new Date().toISOString(),
      trigger: 'automatic',
      reason: {
        errorRate: metrics.errorRate,
        threshold: config.errorThreshold,
        requests: metrics.requests,
        errors: metrics.errors,
        recentErrors: metrics.recentErrors.slice(-5) // Last 5 errors
      },
      stateId,
      cooldownUntil: new Date(Date.now() + config.cooldownPeriod).toISOString()
    };
    
    this.rollbackHistory.push(rollbackEvent);
    this.rollbackCooldowns.set(flagName, Date.now() + config.cooldownPeriod);
    
    // Reset metrics for fresh start
    this.healthMetrics.set(flagName, this.createMetricEntry());
    
    // Save rollback event
    await this.saveRollbackHistory(rollbackEvent);
    
    // Notify administrators
    await this.notifyRollback(rollbackEvent);
    
    console.log(`✅ Automatic rollback completed for ${flagName}`);
    
    return rollbackEvent;
  }

  /**
   * Manual rollback trigger
   * DomainMeaning: Allow manual rollback of feature flags
   * MisleadingNames: None
   * SideEffects: Disables feature, saves state
   * Invariants: Must record manual trigger
   * RAG_Keywords: manual rollback, admin action, forced disable
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_manual_rollback_007
   */
  async manualRollback(flagName, reason = 'Manual rollback requested') {
    console.log(`🔄 Manual rollback requested for ${flagName}`);
    
    // Save current state
    const stateId = this.rollbackService.saveState(`Manual rollback for ${flagName}`);
    
    // Disable the feature
    featureFlags.setFlag(flagName, false);
    
    // Record event
    const rollbackEvent = {
      flagName,
      timestamp: new Date().toISOString(),
      trigger: 'manual',
      reason,
      stateId
    };
    
    this.rollbackHistory.push(rollbackEvent);
    
    // Reset metrics
    this.healthMetrics.set(flagName, this.createMetricEntry());
    
    await this.saveRollbackHistory(rollbackEvent);
    
    return {
      success: true,
      event: rollbackEvent
    };
  }

  /**
   * Restore feature after rollback
   * DomainMeaning: Re-enable feature after cooldown or manual intervention
   * MisleadingNames: None
   * SideEffects: Enables feature, clears cooldown
   * Invariants: Must check cooldown period
   * RAG_Keywords: feature restore, re-enable, recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_restore_feature_008
   */
  async restoreFeature(flagName, force = false) {
    if (!force && this.isInCooldown(flagName)) {
      const cooldownEnd = this.rollbackCooldowns.get(flagName);
      const remaining = cooldownEnd - Date.now();
      return {
        success: false,
        message: `Feature ${flagName} is in cooldown for ${Math.ceil(remaining / 1000)} seconds`
      };
    }
    
    // Clear cooldown
    this.rollbackCooldowns.delete(flagName);
    
    // Re-enable feature
    featureFlags.setFlag(flagName, true);
    
    // Reset metrics for fresh start
    this.healthMetrics.set(flagName, this.createMetricEntry());
    
    console.log(`✅ Feature ${flagName} restored`);
    
    return {
      success: true,
      message: `Feature ${flagName} has been restored`
    };
  }

  /**
   * Check if feature is in cooldown
   * DomainMeaning: Determine if feature is in post-rollback cooldown
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Must respect cooldown period
   * RAG_Keywords: cooldown check, recovery period, timing
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_is_in_cooldown_009
   */
  isInCooldown(flagName) {
    const cooldownEnd = this.rollbackCooldowns.get(flagName);
    if (!cooldownEnd) return false;
    
    if (Date.now() >= cooldownEnd) {
      this.rollbackCooldowns.delete(flagName);
      return false;
    }
    
    return true;
  }

  /**
   * Start periodic monitoring
   * DomainMeaning: Begin continuous health monitoring
   * MisleadingNames: None
   * SideEffects: Starts interval timer
   * Invariants: Must not duplicate timers
   * RAG_Keywords: monitoring start, periodic check, continuous monitoring
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_start_monitoring_010
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }
    
    // Check health every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    console.log('📊 Health monitoring started (30s intervals)');
  }

  /**
   * Perform health check on all features
   * DomainMeaning: Evaluate all feature metrics and reset windows
   * MisleadingNames: None
   * SideEffects: May reset metrics, trigger rollbacks
   * Invariants: Must check all features
   * RAG_Keywords: health check, metric evaluation, window reset
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_perform_health_check_011
   */
  async performHealthCheck() {
    const now = Date.now();
    
    for (const [flagName, metrics] of this.healthMetrics) {
      const config = this.errorThresholds.get(flagName) || this.defaultConfig;
      
      // Reset metrics window if expired
      if (now - metrics.windowStart > config.monitoringWindow) {
        // Keep totals but reset window metrics
        metrics.requests = 0;
        metrics.errors = 0;
        metrics.successes = 0;
        metrics.errorRate = 0;
        metrics.windowStart = now;
      }
      
      // Evaluate health
      await this.evaluateHealthAndRollback(flagName);
    }
  }

  /**
   * Get health status report
   * DomainMeaning: Generate comprehensive health report
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Must include all features
   * RAG_Keywords: health report, status summary, metrics overview
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_health_status_012
   */
  getHealthStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      features: {},
      rollbackHistory: this.rollbackHistory.slice(-10), // Last 10 rollbacks
      activeRollbacks: []
    };
    
    for (const flagName of featureFlags.getAllFlags()) {
      const metrics = this.healthMetrics.get(flagName) || this.createMetricEntry();
      const config = this.errorThresholds.get(flagName) || this.defaultConfig;
      const inCooldown = this.isInCooldown(flagName);
      
      status.features[flagName] = {
        enabled: featureFlags.isEnabled(flagName),
        health: {
          errorRate: (metrics.errorRate * 100).toFixed(2) + '%',
          requests: metrics.requests,
          errors: metrics.errors,
          totalRequests: metrics.totalRequests,
          totalErrors: metrics.totalErrors,
          lastError: metrics.lastError ? new Date(metrics.lastError).toISOString() : null,
          lastSuccess: metrics.lastSuccess ? new Date(metrics.lastSuccess).toISOString() : null
        },
        config: {
          errorThreshold: (config.errorThreshold * 100).toFixed(2) + '%',
          sampleSize: config.sampleSize,
          autoRollback: config.autoRollback
        },
        status: inCooldown ? 'cooldown' : (featureFlags.isEnabled(flagName) ? 'active' : 'disabled')
      };
      
      if (inCooldown) {
        status.activeRollbacks.push({
          flagName,
          cooldownEnd: new Date(this.rollbackCooldowns.get(flagName)).toISOString()
        });
      }
    }
    
    return status;
  }

  /**
   * Save metrics to disk
   * DomainMeaning: Persist health metrics for recovery
   * MisleadingNames: None
   * SideEffects: Writes to file system
   * Invariants: Must handle write failures gracefully
   * RAG_Keywords: save metrics, persistence, disk write
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_save_metrics_013
   */
  async saveMetrics() {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        metrics: Object.fromEntries(this.healthMetrics),
        rollbackHistory: this.rollbackHistory
      };
      
      const dir = path.dirname(this.metricsFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.metricsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  /**
   * Load metrics from disk
   * DomainMeaning: Restore saved metrics on startup
   * MisleadingNames: None
   * SideEffects: Reads from file system
   * Invariants: Must handle missing file
   * RAG_Keywords: load metrics, restore state, disk read
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_load_metrics_014
   */
  async loadMetrics() {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      const saved = JSON.parse(data);
      
      if (saved.metrics) {
        this.healthMetrics = new Map(Object.entries(saved.metrics));
      }
      
      if (saved.rollbackHistory) {
        this.rollbackHistory = saved.rollbackHistory;
      }
      
      console.log('📈 Loaded saved health metrics');
    } catch (error) {
      // File doesn't exist or is invalid
      console.log('📊 Starting with fresh health metrics');
    }
  }

  /**
   * Save rollback history
   * DomainMeaning: Persist rollback event for audit
   * MisleadingNames: None
   * SideEffects: Writes to file system
   * Invariants: Must append to history
   * RAG_Keywords: save rollback, audit log, history persistence
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_save_rollback_history_015
   */
  async saveRollbackHistory(event) {
    try {
      const historyFile = path.join(__dirname, '../../logs/rollback-events.jsonl');
      const dir = path.dirname(historyFile);
      await fs.mkdir(dir, { recursive: true });
      
      // Append as JSON Lines
      await fs.appendFile(historyFile, JSON.stringify(event) + '\n');
    } catch (error) {
      console.error('Failed to save rollback history:', error);
    }
  }

  /**
   * Notify administrators of rollback
   * DomainMeaning: Send alerts about automatic rollbacks
   * MisleadingNames: None
   * SideEffects: Would send notifications
   * Invariants: Must not throw on failure
   * RAG_Keywords: notification, alert, rollback notification
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_notify_rollback_016
   */
  async notifyRollback(event) {
    // In production, this would:
    // - Send email alerts
    // - Post to Slack/Teams
    // - Create incident ticket
    // - Update dashboard
    
    console.log('📧 ROLLBACK NOTIFICATION:', {
      feature: event.flagName,
      trigger: event.trigger,
      errorRate: event.reason.errorRate ? (event.reason.errorRate * 100).toFixed(2) + '%' : 'N/A',
      timestamp: event.timestamp
    });
  }

  /**
   * Shutdown monitoring
   * DomainMeaning: Gracefully stop health monitoring
   * MisleadingNames: None
   * SideEffects: Stops timers, saves state
   * Invariants: Must save metrics before shutdown
   * RAG_Keywords: shutdown, cleanup, stop monitoring
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_shutdown_017
   */
  async shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    await this.saveMetrics();
    
    console.log('🛑 Health monitoring shutdown complete');
  }
}

// Export singleton instance
module.exports = new FeatureFlagHealthMonitor();