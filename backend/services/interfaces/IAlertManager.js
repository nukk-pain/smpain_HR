/**
 * Alert Manager Interface
 * Defines the contract for alert management implementations
 */

class IAlertManager {
  /**
   * Check if any alert conditions are met
   * @param {Object} metrics - Current system metrics
   * @returns {Promise<Array>} List of triggered alerts
   */
  async checkAlertConditions(metrics) {
    throw new Error('Method "checkAlertConditions" must be implemented');
  }
  
  /**
   * Trigger an alert
   * @param {Object} alert - Alert details
   * @returns {Promise<void>}
   */
  async triggerAlert(alert) {
    throw new Error('Method "triggerAlert" must be implemented');
  }
  
  /**
   * Check if an alert is in cooldown
   * @param {string} alertType - Type of alert
   * @param {string} alertKey - Unique key for the alert
   * @returns {Promise<boolean>} True if in cooldown
   */
  async isAlertCooledDown(alertType, alertKey) {
    throw new Error('Method "isAlertCooledDown" must be implemented');
  }
  
  /**
   * Set alert cooldown
   * @param {string} alertType - Type of alert
   * @param {string} alertKey - Unique key for the alert
   * @param {number} duration - Cooldown duration in milliseconds
   * @returns {Promise<void>}
   */
  async setAlertCooldown(alertType, alertKey, duration) {
    throw new Error('Method "setAlertCooldown" must be implemented');
  }
  
  /**
   * Get alert history
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Alert history
   */
  async getAlertHistory(startDate, endDate) {
    throw new Error('Method "getAlertHistory" must be implemented');
  }
  
  /**
   * Clear expired cooldowns
   * @returns {Promise<number>} Number of cooldowns cleared
   */
  async clearExpiredCooldowns() {
    throw new Error('Method "clearExpiredCooldowns" must be implemented');
  }
}

module.exports = IAlertManager;