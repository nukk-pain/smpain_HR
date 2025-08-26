/**
 * Metrics Collector Interface
 * Defines the contract for metrics collection implementations
 */

class IMetricsCollector {
  /**
   * Collect all system metrics
   * @returns {Promise<Object>} Collected metrics
   */
  async collectMetrics() {
    throw new Error('Method "collectMetrics" must be implemented');
  }
  
  /**
   * Get system health status
   * @returns {Promise<Object>} System health information
   */
  async getSystemHealth() {
    throw new Error('Method "getSystemHealth" must be implemented');
  }
  
  /**
   * Measure event loop delay
   * @returns {Promise<number>} Event loop delay in milliseconds
   */
  async measureEventLoopDelay() {
    throw new Error('Method "measureEventLoopDelay" must be implemented');
  }
  
  /**
   * Get garbage collection statistics
   * @returns {Promise<Object>} GC statistics
   */
  async getGCStats() {
    throw new Error('Method "getGCStats" must be implemented');
  }
  
  /**
   * Collect database metrics
   * @returns {Promise<Object>} Database metrics
   */
  async collectDatabaseMetrics() {
    throw new Error('Method "collectDatabaseMetrics" must be implemented');
  }
  
  /**
   * Collect custom application metrics
   * @returns {Promise<Object>} Custom metrics
   */
  async collectCustomMetrics() {
    throw new Error('Method "collectCustomMetrics" must be implemented');
  }
  
  /**
   * Record a metric value
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Object} tags - Optional tags
   * @returns {Promise<void>}
   */
  async recordMetric(name, value, tags) {
    throw new Error('Method "recordMetric" must be implemented');
  }
  
  /**
   * Get metrics history
   * @param {string} metricName - Name of the metric
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Metric history
   */
  async getMetricHistory(metricName, startDate, endDate) {
    throw new Error('Method "getMetricHistory" must be implemented');
  }
}

module.exports = IMetricsCollector;