/**
 * Metrics Data Transfer Object
 * Defines the structure of metrics data
 */

class MetricsDTO {
  constructor(data = {}) {
    this.timestamp = data.timestamp || new Date();
    this.name = data.name || '';
    this.value = data.value || 0;
    this.unit = data.unit || 'count';
    this.type = data.type || 'gauge'; // gauge, counter, histogram, summary
    this.tags = data.tags || {};
    this.metadata = data.metadata || {};
    
    // System metrics
    this.cpu = data.cpu || null;
    this.memory = data.memory || null;
    this.disk = data.disk || null;
    this.network = data.network || null;
    
    // Application metrics
    this.requests = data.requests || null;
    this.errors = data.errors || null;
    this.responseTime = data.responseTime || null;
    this.throughput = data.throughput || null;
    
    // Database metrics
    this.dbConnections = data.dbConnections || null;
    this.dbQueries = data.dbQueries || null;
    this.dbLatency = data.dbLatency || null;
    
    // Process metrics
    this.eventLoopDelay = data.eventLoopDelay || null;
    this.gcStats = data.gcStats || null;
    this.heapUsed = data.heapUsed || null;
    this.heapTotal = data.heapTotal || null;
    this.rss = data.rss || null;
  }
  
  /**
   * Validate the DTO
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validate() {
    const errors = [];
    
    // Required fields for individual metrics
    if (this.name && !this.value && this.value !== 0) {
      errors.push('Value is required when name is provided');
    }
    
    // Validate timestamp
    if (!this.timestamp || !(this.timestamp instanceof Date)) {
      errors.push('Valid timestamp is required');
    }
    
    // Validate metric type
    const validTypes = ['gauge', 'counter', 'histogram', 'summary'];
    if (this.name && !validTypes.includes(this.type)) {
      errors.push(`Type must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate unit
    const validUnits = [
      'count', 'bytes', 'milliseconds', 'seconds', 
      'percent', 'ratio', 'requests', 'errors'
    ];
    if (this.name && !validUnits.includes(this.unit)) {
      errors.push(`Unit must be one of: ${validUnits.join(', ')}`);
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
    const obj = {
      timestamp: this.timestamp
    };
    
    // Include individual metric if name is provided
    if (this.name) {
      obj.name = this.name;
      obj.value = this.value;
      obj.unit = this.unit;
      obj.type = this.type;
    }
    
    // Include system metrics if provided
    if (this.cpu !== null) obj.cpu = this.cpu;
    if (this.memory !== null) obj.memory = this.memory;
    if (this.disk !== null) obj.disk = this.disk;
    if (this.network !== null) obj.network = this.network;
    
    // Include application metrics if provided
    if (this.requests !== null) obj.requests = this.requests;
    if (this.errors !== null) obj.errors = this.errors;
    if (this.responseTime !== null) obj.responseTime = this.responseTime;
    if (this.throughput !== null) obj.throughput = this.throughput;
    
    // Include database metrics if provided
    if (this.dbConnections !== null) obj.dbConnections = this.dbConnections;
    if (this.dbQueries !== null) obj.dbQueries = this.dbQueries;
    if (this.dbLatency !== null) obj.dbLatency = this.dbLatency;
    
    // Include process metrics if provided
    if (this.eventLoopDelay !== null) obj.eventLoopDelay = this.eventLoopDelay;
    if (this.gcStats !== null) obj.gcStats = this.gcStats;
    if (this.heapUsed !== null) obj.heapUsed = this.heapUsed;
    if (this.heapTotal !== null) obj.heapTotal = this.heapTotal;
    if (this.rss !== null) obj.rss = this.rss;
    
    // Always include tags and metadata
    if (Object.keys(this.tags).length > 0) obj.tags = this.tags;
    if (Object.keys(this.metadata).length > 0) obj.metadata = this.metadata;
    
    return obj;
  }
  
  /**
   * Create system metrics DTO
   * @param {Object} data - System metrics data
   * @returns {MetricsDTO} New MetricsDTO instance
   */
  static createSystemMetrics(data) {
    return new MetricsDTO({
      timestamp: new Date(),
      cpu: data.cpu,
      memory: data.memory,
      disk: data.disk,
      network: data.network,
      eventLoopDelay: data.eventLoopDelay,
      gcStats: data.gcStats,
      heapUsed: data.heapUsed,
      heapTotal: data.heapTotal,
      rss: data.rss,
      tags: { type: 'system' }
    });
  }
  
  /**
   * Create application metrics DTO
   * @param {Object} data - Application metrics data
   * @returns {MetricsDTO} New MetricsDTO instance
   */
  static createApplicationMetrics(data) {
    return new MetricsDTO({
      timestamp: new Date(),
      requests: data.requests,
      errors: data.errors,
      responseTime: data.responseTime,
      throughput: data.throughput,
      tags: { type: 'application' }
    });
  }
  
  /**
   * Create database metrics DTO
   * @param {Object} data - Database metrics data
   * @returns {MetricsDTO} New MetricsDTO instance
   */
  static createDatabaseMetrics(data) {
    return new MetricsDTO({
      timestamp: new Date(),
      dbConnections: data.connections,
      dbQueries: data.queries,
      dbLatency: data.latency,
      tags: { type: 'database' }
    });
  }
}

module.exports = MetricsDTO;