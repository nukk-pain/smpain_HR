/**
 * Error Logger Interface
 * Defines the contract for error logging implementations
 */

class IErrorLogger {
  /**
   * Log an error to the database
   * @param {Error} error - The error object to log
   * @param {Object} context - Additional context information
   * @returns {Promise<string>} The error log ID
   */
  async logError(error, context) {
    throw new Error('Method "logError" must be implemented');
  }
  
  /**
   * Determine the severity of an error
   * @param {Error} error - The error to analyze
   * @returns {Promise<string>} Severity level (critical, error, warning, info)
   */
  async determineSeverity(error) {
    throw new Error('Method "determineSeverity" must be implemented');
  }
  
  /**
   * Determine the category of an error
   * @param {Error} error - The error to categorize
   * @returns {Promise<string>} Error category
   */
  async determineCategory(error) {
    throw new Error('Method "determineCategory" must be implemented');
  }
  
  /**
   * Generate a fingerprint for error deduplication
   * @param {Error} error - The error to fingerprint
   * @returns {Promise<string>} Error fingerprint
   */
  async generateErrorFingerprint(error) {
    throw new Error('Method "generateErrorFingerprint" must be implemented');
  }
  
  /**
   * Get error statistics for a time period
   * @param {Date} startDate - Start of the period
   * @param {Date} endDate - End of the period
   * @returns {Promise<Object>} Error statistics
   */
  async getErrorStats(startDate, endDate) {
    throw new Error('Method "getErrorStats" must be implemented');
  }
  
  /**
   * Clean up old error logs
   * @param {number} retentionDays - Number of days to retain logs
   * @returns {Promise<number>} Number of logs cleaned up
   */
  async cleanupOldLogs(retentionDays) {
    throw new Error('Method "cleanupOldLogs" must be implemented');
  }
}

module.exports = IErrorLogger;