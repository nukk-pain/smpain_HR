/**
 * AI-HEADER
 * intent: Analytics service for generating insights from monitoring data
 * domain_meaning: Provides error analytics, system health reports, and trend analysis
 * misleading_names: None
 * data_contracts: Reads from error_logs, monitoring_data, and alert_history collections
 * PII: May aggregate user-related error data
 * invariants: Analytics must not impact production performance
 * rag_keywords: analytics, reporting, error analysis, system health, trends
 */

const { ObjectId } = require('mongodb');

/**
 * DomainMeaning: Service for analyzing monitoring data and generating reports
 * MisleadingNames: None
 * SideEffects: None - read only operations
 * Invariants: Must handle large datasets efficiently
 * RAG_Keywords: analytics, reporting, data analysis, insights
 * DuplicatePolicy: canonical
 * FunctionIdentity: analytics-service-001
 */
class AnalyticsService {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
    this.errorLogCollection = db.collection('error_logs');
    this.monitoringCollection = db.collection('monitoring_data');
    this.alertCollection = db.collection('alert_history');
  }

  /**
   * DomainMeaning: Get comprehensive error analytics for time range
   * MisleadingNames: None
   * SideEffects: None - read only aggregation
   * Invariants: Must return structured analytics data
   * RAG_Keywords: error analytics, error trends, error patterns
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-error-analytics-001
   */
  async getErrorAnalytics(timeRangeHours = 24) {
    try {
      const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
      
      // Overall error statistics
      const totalErrors = await this.errorLogCollection.countDocuments({
        timestamp: { $gte: startTime }
      });
      
      // Errors by severity
      const errorsBySeverity = await this.errorLogCollection.aggregate([
        { $match: { timestamp: { $gte: startTime } } },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
            lastOccurred: { $max: '$timestamp' },
            types: { $addToSet: '$type' }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      // Errors by category
      const errorsByCategory = await this.errorLogCollection.aggregate([
        { $match: { timestamp: { $gte: startTime } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            severities: { $addToSet: '$severity' },
            topErrors: { 
              $push: { 
                type: '$type', 
                message: '$message' 
              } 
            }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      // Most frequent errors
      const topErrors = await this.errorLogCollection.aggregate([
        { $match: { timestamp: { $gte: startTime } } },
        {
          $group: {
            _id: {
              type: '$type',
              fingerprint: '$fingerprint'
            },
            count: { $sum: 1 },
            firstOccurred: { $min: '$timestamp' },
            lastOccurred: { $max: '$timestamp' },
            message: { $first: '$message' },
            severity: { $first: '$severity' },
            category: { $first: '$category' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();
      
      // Error trends over time (hourly buckets)
      const errorTrends = await this.errorLogCollection.aggregate([
        { $match: { timestamp: { $gte: startTime } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d %H:00',
                date: '$timestamp'
              }
            },
            count: { $sum: 1 },
            critical: {
              $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
            },
            high: {
              $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Users with most errors
      const userErrors = await this.errorLogCollection.aggregate([
        { $match: { 
          timestamp: { $gte: startTime },
          'context.userId': { $ne: 'unknown' }
        } },
        {
          $group: {
            _id: '$context.userId',
            count: { $sum: 1 },
            operations: { $addToSet: '$context.operation' },
            lastError: { $max: '$timestamp' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();
      
      // Operations with most errors
      const operationErrors = await this.errorLogCollection.aggregate([
        { $match: { timestamp: { $gte: startTime } } },
        {
          $group: {
            _id: '$context.operation',
            count: { $sum: 1 },
            errorTypes: { $addToSet: '$type' },
            avgDuration: { $avg: '$context.duration' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();
      
      return {
        timeRange: {
          start: startTime,
          end: new Date(),
          hours: timeRangeHours
        },
        summary: {
          totalErrors,
          errorsPerHour: totalErrors / timeRangeHours,
          uniqueErrorTypes: new Set(topErrors.map(e => e._id.type)).size
        },
        breakdown: {
          bySeverity: errorsBySeverity,
          byCategory: errorsByCategory
        },
        topErrors,
        trends: errorTrends,
        userAnalysis: userErrors,
        operationAnalysis: operationErrors
      };
      
    } catch (error) {
      console.error('❌ Failed to generate error analytics:', error);
      return null;
    }
  }

  /**
   * DomainMeaning: Get comprehensive system health report
   * MisleadingNames: None
   * SideEffects: None - read only aggregation
   * Invariants: Must return health status object
   * RAG_Keywords: system health, health check, status report
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-system-health-001
   */
  async getSystemHealth() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      
      // Recent errors
      const recentCriticalErrors = await this.errorLogCollection.countDocuments({
        timestamp: { $gte: oneHourAgo },
        severity: 'critical'
      });
      
      const recentTotalErrors = await this.errorLogCollection.countDocuments({
        timestamp: { $gte: oneHourAgo }
      });
      
      // Recent metrics
      const recentMetrics = await this.monitoringCollection
        .find({
          type: 'system_metrics',
          timestamp: { $gte: oneHourAgo }
        })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
      
      const latestMetrics = recentMetrics[0] || {};
      
      // Active alerts
      const activeAlerts = await this.alertCollection.countDocuments({
        resolved: false
      });
      
      const criticalAlerts = await this.alertCollection.countDocuments({
        resolved: false,
        severity: 'critical'
      });
      
      // Average metrics over last hour
      const avgMetrics = await this.monitoringCollection.aggregate([
        { 
          $match: { 
            type: 'system_metrics',
            timestamp: { $gte: oneHourAgo }
          }
        },
        {
          $group: {
            _id: null,
            avgCpu: { $avg: '$cpu.usage' },
            avgMemory: { $avg: '$memory.system.percentage' },
            avgEventLoopDelay: { $avg: '$eventLoop.delay' },
            maxCpu: { $max: '$cpu.usage' },
            maxMemory: { $max: '$memory.system.percentage' },
            maxEventLoopDelay: { $max: '$eventLoop.delay' }
          }
        }
      ]).toArray();
      
      const metrics = avgMetrics[0] || {};
      
      // System uptime and stability
      const uptime = latestMetrics.process?.uptime || 0;
      const uptimeDays = Math.floor(uptime / 86400);
      const uptimeHours = Math.floor((uptime % 86400) / 3600);
      
      // Daily error rate trend
      const dailyErrorRate = await this.errorLogCollection.countDocuments({
        timestamp: { $gte: oneDayAgo }
      });
      
      // Health score calculation (0-100)
      let healthScore = 100;
      
      // Deduct points for errors
      if (recentCriticalErrors > 0) healthScore -= 30;
      if (recentTotalErrors > 10) healthScore -= 20;
      else if (recentTotalErrors > 5) healthScore -= 10;
      
      // Deduct points for active alerts
      if (criticalAlerts > 0) healthScore -= 25;
      if (activeAlerts > 5) healthScore -= 15;
      else if (activeAlerts > 0) healthScore -= 5;
      
      // Deduct points for high resource usage
      if (metrics.avgCpu > 80) healthScore -= 15;
      else if (metrics.avgCpu > 60) healthScore -= 5;
      
      if (metrics.avgMemory > 85) healthScore -= 15;
      else if (metrics.avgMemory > 70) healthScore -= 5;
      
      if (metrics.avgEventLoopDelay > 100) healthScore -= 10;
      else if (metrics.avgEventLoopDelay > 50) healthScore -= 5;
      
      healthScore = Math.max(0, healthScore);
      
      // Determine health status
      let status;
      if (healthScore >= 90) status = 'healthy';
      else if (healthScore >= 70) status = 'warning';
      else if (healthScore >= 50) status = 'degraded';
      else status = 'critical';
      
      return {
        timestamp: now,
        status,
        healthScore,
        uptime: {
          days: uptimeDays,
          hours: uptimeHours,
          totalSeconds: uptime
        },
        errors: {
          lastHour: {
            total: recentTotalErrors,
            critical: recentCriticalErrors
          },
          lastDay: {
            total: dailyErrorRate,
            perHour: dailyErrorRate / 24
          }
        },
        alerts: {
          active: activeAlerts,
          critical: criticalAlerts
        },
        resources: {
          cpu: {
            current: latestMetrics.cpu?.usage || 0,
            average: metrics.avgCpu || 0,
            max: metrics.maxCpu || 0
          },
          memory: {
            current: latestMetrics.memory?.system?.percentage || 0,
            average: metrics.avgMemory || 0,
            max: metrics.maxMemory || 0
          },
          eventLoop: {
            current: latestMetrics.eventLoop?.delay || 0,
            average: metrics.avgEventLoopDelay || 0,
            max: metrics.maxEventLoopDelay || 0
          }
        },
        recommendations: this.getHealthRecommendations(healthScore, metrics, recentTotalErrors)
      };
      
    } catch (error) {
      console.error('❌ Failed to get system health:', error);
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * DomainMeaning: Generate health recommendations based on metrics
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must return array of recommendations
   * RAG_Keywords: recommendations, health advice, optimization tips
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-recommendations-001
   */
  getHealthRecommendations(healthScore, metrics, errorCount) {
    const recommendations = [];
    
    if (healthScore < 50) {
      recommendations.push({
        priority: 'high',
        message: 'System health is critical. Immediate attention required.'
      });
    }
    
    if (metrics.avgCpu > 70) {
      recommendations.push({
        priority: 'medium',
        message: 'High CPU usage detected. Consider scaling or optimizing CPU-intensive operations.'
      });
    }
    
    if (metrics.avgMemory > 75) {
      recommendations.push({
        priority: 'medium',
        message: 'High memory usage. Check for memory leaks or consider increasing resources.'
      });
    }
    
    if (metrics.avgEventLoopDelay > 50) {
      recommendations.push({
        priority: 'medium',
        message: 'Event loop delay detected. Review async operations and consider optimization.'
      });
    }
    
    if (errorCount > 10) {
      recommendations.push({
        priority: 'high',
        message: 'High error rate. Review error logs and address root causes.'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        message: 'System is healthy. Continue monitoring.'
      });
    }
    
    return recommendations;
  }

  /**
   * DomainMeaning: Get alert statistics and trends
   * MisleadingNames: None
   * SideEffects: None - read only aggregation
   * Invariants: Must return alert statistics
   * RAG_Keywords: alert stats, alert trends, notification analytics
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-alert-stats-001
   */
  async getAlertStats(timeRangeHours = 24) {
    try {
      const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
      
      const alertStats = await this.alertCollection.aggregate([
        { $match: { timestamp: { $gte: startTime } } },
        {
          $group: {
            _id: {
              type: '$type',
              severity: '$severity'
            },
            count: { $sum: 1 },
            resolved: {
              $sum: { $cond: ['$resolved', 1, 0] }
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  '$resolved',
                  { $subtract: ['$resolvedAt', '$timestamp'] },
                  null
                ]
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      return {
        timeRange: {
          start: startTime,
          end: new Date(),
          hours: timeRangeHours
        },
        alerts: alertStats
      };
      
    } catch (error) {
      console.error('❌ Failed to get alert stats:', error);
      return null;
    }
  }
}

module.exports = AnalyticsService;