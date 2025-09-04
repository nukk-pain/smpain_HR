/**
 * Alert Data Transfer Object
 * Defines the structure of alert data
 */

class AlertDTO {
  constructor(data = {}) {
    this.timestamp = data.timestamp || new Date();
    this.type = data.type || 'general';
    this.severity = data.severity || 'warning';
    this.title = data.title || '';
    this.message = data.message || '';
    this.source = data.source || 'system';
    this.metric = data.metric || null;
    this.threshold = data.threshold || null;
    this.actualValue = data.actualValue || null;
    this.comparison = data.comparison || null; // >, <, >=, <=, ==, !=
    this.triggered = data.triggered || false;
    this.acknowledged = data.acknowledged || false;
    this.acknowledgedBy = data.acknowledgedBy || null;
    this.acknowledgedAt = data.acknowledgedAt || null;
    this.resolved = data.resolved || false;
    this.resolvedAt = data.resolvedAt || null;
    this.autoResolved = data.autoResolved || false;
    this.cooldownUntil = data.cooldownUntil || null;
    this.metadata = data.metadata || {};
    this.tags = data.tags || [];
    this.actions = data.actions || [];
    this.notificationChannels = data.notificationChannels || [];
    this.correlationId = data.correlationId || null;
    this.groupKey = data.groupKey || null;
    this.count = data.count || 1;
    this.firstOccurrence = data.firstOccurrence || new Date();
    this.lastOccurrence = data.lastOccurrence || new Date();
  }
  
  /**
   * Validate the DTO
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validate() {
    const errors = [];
    
    // Required fields
    if (!this.title) {
      errors.push('Title is required');
    }
    
    if (!this.message) {
      errors.push('Message is required');
    }
    
    if (!this.timestamp || !(this.timestamp instanceof Date)) {
      errors.push('Valid timestamp is required');
    }
    
    // Validate type
    const validTypes = [
      'general', 'error', 'performance', 'security', 
      'availability', 'capacity', 'configuration'
    ];
    if (!validTypes.includes(this.type)) {
      errors.push(`Type must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate severity
    const validSeverities = ['critical', 'major', 'warning', 'minor', 'info'];
    if (!validSeverities.includes(this.severity)) {
      errors.push(`Severity must be one of: ${validSeverities.join(', ')}`);
    }
    
    // Validate comparison operator if threshold is set
    if (this.threshold !== null && this.comparison) {
      const validComparisons = ['>', '<', '>=', '<=', '==', '!='];
      if (!validComparisons.includes(this.comparison)) {
        errors.push(`Comparison must be one of: ${validComparisons.join(', ')}`);
      }
    }
    
    // Validate notification channels
    const validChannels = ['email', 'slack', 'webhook', 'sms', 'console'];
    for (const channel of this.notificationChannels) {
      if (!validChannels.includes(channel)) {
        errors.push(`Invalid notification channel: ${channel}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Convert to plain object for database storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      timestamp: this.timestamp,
      type: this.type,
      severity: this.severity,
      title: this.title,
      message: this.message,
      source: this.source,
      metric: this.metric,
      threshold: this.threshold,
      actualValue: this.actualValue,
      comparison: this.comparison,
      triggered: this.triggered,
      acknowledged: this.acknowledged,
      acknowledgedBy: this.acknowledgedBy,
      acknowledgedAt: this.acknowledgedAt,
      resolved: this.resolved,
      resolvedAt: this.resolvedAt,
      autoResolved: this.autoResolved,
      cooldownUntil: this.cooldownUntil,
      metadata: this.metadata,
      tags: this.tags,
      actions: this.actions,
      notificationChannels: this.notificationChannels,
      correlationId: this.correlationId,
      groupKey: this.groupKey,
      count: this.count,
      firstOccurrence: this.firstOccurrence,
      lastOccurrence: this.lastOccurrence
    };
  }
  
  /**
   * Check if alert is in cooldown
   * @returns {boolean} True if in cooldown
   */
  isInCooldown() {
    if (!this.cooldownUntil) return false;
    return new Date() < new Date(this.cooldownUntil);
  }
  
  /**
   * Check if alert needs escalation
   * @param {number} escalationThreshold - Number of occurrences before escalation
   * @returns {boolean} True if needs escalation
   */
  needsEscalation(escalationThreshold = 5) {
    return !this.acknowledged && this.count >= escalationThreshold;
  }
  
  /**
   * Create from metric threshold breach
   * @param {string} metricName - Name of the metric
   * @param {number} threshold - Threshold value
   * @param {number} actualValue - Actual value
   * @param {string} comparison - Comparison operator
   * @returns {AlertDTO} New AlertDTO instance
   */
  static fromMetricBreach(metricName, threshold, actualValue, comparison) {
    const comparisons = {
      '>': 'exceeded',
      '<': 'fell below',
      '>=': 'reached or exceeded',
      '<=': 'reached or fell below'
    };
    
    const action = comparisons[comparison] || 'breached threshold';
    
    return new AlertDTO({
      type: 'performance',
      severity: actualValue > threshold * 1.5 ? 'critical' : 'warning',
      title: `Metric ${metricName} ${action} threshold`,
      message: `${metricName} is ${actualValue} (threshold: ${comparison} ${threshold})`,
      metric: metricName,
      threshold,
      actualValue,
      comparison,
      triggered: true
    });
  }
  
  /**
   * Create from error
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   * @returns {AlertDTO} New AlertDTO instance
   */
  static fromError(error, context = {}) {
    return new AlertDTO({
      type: 'error',
      severity: error.severity || 'major',
      title: `Error: ${error.name || 'Unknown Error'}`,
      message: error.message,
      source: context.source || 'application',
      metadata: {
        stack: error.stack,
        code: error.code,
        ...context
      },
      triggered: true
    });
  }
}

module.exports = AlertDTO;