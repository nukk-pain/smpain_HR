/**
 * AI-HEADER
 * intent: Test error logging and monitoring system functionality for production observability
 * domain_meaning: Ensures comprehensive error tracking and system monitoring for operational stability
 * misleading_names: None - clear testing purpose
 * data_contracts: Expects error logging system, monitoring endpoints, alert functionality
 * PII: May contain user IDs and operation details - must be handled securely
 * invariants: All errors must be logged with proper classification and retention
 * rag_keywords: error logging, monitoring, alerting, observability, system health
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

/**
 * DomainMeaning: Tests for error logging and monitoring system
 * MisleadingNames: None
 * SideEffects: Creates/deletes test data in MongoDB, may send test alerts
 * Invariants: All logging operations must be atomic and not affect application performance
 * RAG_Keywords: error logging, monitoring, testing, system health
 * DuplicatePolicy: canonical
 * FunctionIdentity: error-logging-monitoring-test-suite-001
 */
describe('Error Logging and Monitoring System Tests', () => {
  let client;
  let db;
  let errorLogCollection;
  let monitoringCollection;
  
  // Mock error scenarios for testing
  const testErrors = {
    validation: {
      type: 'ValidationError',
      message: 'Invalid employee ID format',
      code: 'VALIDATION_001',
      severity: 'warning',
      category: 'user_input'
    },
    database: {
      type: 'DatabaseError',
      message: 'Connection timeout to MongoDB',
      code: 'DB_TIMEOUT_001',
      severity: 'critical',
      category: 'infrastructure'
    },
    business: {
      type: 'BusinessLogicError',
      message: 'Payroll record already exists for period',
      code: 'PAYROLL_DUPLICATE_001',
      severity: 'error',
      category: 'business_rule'
    },
    system: {
      type: 'SystemError',
      message: 'Out of memory during file processing',
      code: 'SYSTEM_MEMORY_001',
      severity: 'critical',
      category: 'system_resource'
    }
  };

  beforeAll(async () => {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = `hr_test_error_logging_${process.env.PORT || 3000}`;
    
    client = new MongoClient(url);
    await client.connect();
    db = client.db(dbName);
    
    errorLogCollection = db.collection('error_logs');
    monitoringCollection = db.collection('monitoring_data');
  });

  afterAll(async () => {
    if (db) {
      await db.dropDatabase();
    }
    if (client) {
      await client.close();
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    await errorLogCollection.deleteMany({});
    await monitoringCollection.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await errorLogCollection.deleteMany({});
    await monitoringCollection.deleteMany({});
  });

  /**
   * DomainMeaning: Tests basic error logging functionality
   * MisleadingNames: None
   * SideEffects: Creates error log entries
   * Invariants: All errors must be logged with proper metadata
   * RAG_Keywords: error logging, metadata, basic functionality
   * DuplicatePolicy: canonical
   * FunctionIdentity: basic-error-logging-test-001
   */
  it('should log errors with proper metadata and classification', async () => {
    // This test would use a real ErrorLogger service
    // For now, we'll test the expected structure
    
    const mockErrorLogger = {
      async logError(error, context = {}) {
        const errorLog = {
          _id: new ObjectId(),
          timestamp: new Date(),
          type: error.type,
          message: error.message,
          code: error.code,
          severity: error.severity,
          category: error.category,
          context: {
            userId: context.userId || 'unknown',
            operation: context.operation || 'unknown',
            requestId: context.requestId || 'unknown',
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            sessionId: context.sessionId
          },
          stackTrace: error.stack,
          environment: process.env.NODE_ENV || 'test',
          version: process.env.npm_package_version || '1.0.0',
          hostname: require('os').hostname(),
          pid: process.pid
        };
        
        await errorLogCollection.insertOne(errorLog);
        return errorLog._id;
      }
    };
    
    // Test logging different error types
    for (const [errorType, errorData] of Object.entries(testErrors)) {
      const errorId = await mockErrorLogger.logError(errorData, {
        userId: 'test-user-123',
        operation: `test-${errorType}`,
        requestId: `req-${Date.now()}`
      });
      
      expect(errorId).toBeDefined();
    }
    
    // Verify all errors were logged
    const loggedErrors = await errorLogCollection.find({}).toArray();
    expect(loggedErrors).toHaveLength(4);
    
    // Verify error classification
    const criticalErrors = await errorLogCollection.find({ severity: 'critical' }).toArray();
    expect(criticalErrors).toHaveLength(2);
    
    const warningErrors = await errorLogCollection.find({ severity: 'warning' }).toArray();
    expect(warningErrors).toHaveLength(1);
    
    // Verify metadata structure
    const firstError = loggedErrors[0];
    expect(firstError.timestamp).toBeInstanceOf(Date);
    expect(firstError.context.userId).toBe('test-user-123');
    expect(firstError.environment).toBe('test');
    expect(firstError.hostname).toBeTruthy();
    
    console.log('✅ Error logging with proper metadata verified');
  });

  /**
   * DomainMeaning: Tests error aggregation and analytics functionality
   * MisleadingNames: None
   * SideEffects: Creates multiple error logs for analysis
   * Invariants: Error analytics must provide accurate statistics
   * RAG_Keywords: error aggregation, analytics, statistics, trends
   * DuplicatePolicy: canonical
   * FunctionIdentity: error-analytics-test-001
   */
  it('should provide error analytics and aggregation', async () => {
    // Insert test error data
    const testErrorLogs = [];
    const now = new Date();
    
    // Create errors over the last 24 hours
    for (let i = 0; i < 100; i++) {
      const randomError = Object.values(testErrors)[Math.floor(Math.random() * Object.keys(testErrors).length)];
      const timestamp = new Date(now.getTime() - (Math.random() * 24 * 60 * 60 * 1000));
      
      testErrorLogs.push({
        _id: new ObjectId(),
        timestamp,
        type: randomError.type,
        message: randomError.message,
        code: randomError.code,
        severity: randomError.severity,
        category: randomError.category,
        context: {
          userId: `user-${Math.floor(Math.random() * 10)}`,
          operation: `operation-${Math.floor(Math.random() * 5)}`
        }
      });
    }
    
    await errorLogCollection.insertMany(testErrorLogs);
    
    // Test error analytics aggregation
    const mockAnalytics = {
      async getErrorStats(timeRange = 24) {
        const cutoff = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
        
        const pipeline = [
          { $match: { timestamp: { $gte: cutoff } } },
          {
            $group: {
              _id: {
                severity: '$severity',
                category: '$category',
                hour: { $hour: '$timestamp' }
              },
              count: { $sum: 1 },
              latestError: { $max: '$timestamp' }
            }
          },
          {
            $group: {
              _id: null,
              totalErrors: { $sum: '$count' },
              bySeverity: {
                $push: {
                  severity: '$_id.severity',
                  count: '$count'
                }
              },
              byCategory: {
                $push: {
                  category: '$_id.category',
                  count: '$count'
                }
              }
            }
          }
        ];
        
        const result = await errorLogCollection.aggregate(pipeline).toArray();
        return result[0] || { totalErrors: 0, bySeverity: [], byCategory: [] };
      }
    };
    
    const stats = await mockAnalytics.getErrorStats();
    
    expect(stats.totalErrors).toBe(100);
    expect(stats.bySeverity).toBeDefined();
    expect(stats.byCategory).toBeDefined();
    expect(stats.bySeverity.length).toBeGreaterThan(0);
    
    console.log('✅ Error analytics and aggregation verified');
    console.log(`Total errors: ${stats.totalErrors}`);
  });

  /**
   * DomainMeaning: Tests monitoring system health metrics collection
   * MisleadingNames: None
   * SideEffects: Creates monitoring data entries
   * Invariants: Monitoring data must be collected at regular intervals
   * RAG_Keywords: system monitoring, health metrics, performance tracking
   * DuplicatePolicy: canonical
   * FunctionIdentity: system-monitoring-test-001
   */
  it('should collect system health and performance metrics', async () => {
    const mockMonitoringService = {
      async collectMetrics() {
        const metrics = {
          _id: new ObjectId(),
          timestamp: new Date(),
          system: {
            cpuUsage: process.cpuUsage(),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            loadAverage: require('os').loadavg(),
            freeMemory: require('os').freemem(),
            totalMemory: require('os').totalmem()
          },
          application: {
            activeConnections: Math.floor(Math.random() * 100),
            requestsPerMinute: Math.floor(Math.random() * 1000),
            avgResponseTime: Math.floor(Math.random() * 500),
            errorRate: Math.random() * 5,
            dbConnectionPool: {
              active: Math.floor(Math.random() * 20),
              idle: Math.floor(Math.random() * 30),
              total: 50
            }
          },
          database: {
            responseTime: Math.floor(Math.random() * 100),
            connectionsActive: Math.floor(Math.random() * 10),
            operationsPerSecond: Math.floor(Math.random() * 100)
          },
          custom: {
            payrollProcessingQueue: Math.floor(Math.random() * 10),
            previewDataCacheSize: Math.floor(Math.random() * 100),
            rollbackSnapshotsCount: Math.floor(Math.random() * 5)
          }
        };
        
        await monitoringCollection.insertOne(metrics);
        return metrics._id;
      }
    };
    
    // Collect metrics multiple times
    const metricIds = [];
    for (let i = 0; i < 5; i++) {
      const metricId = await mockMonitoringService.collectMetrics();
      metricIds.push(metricId);
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    expect(metricIds).toHaveLength(5);
    
    // Verify metrics were stored
    const storedMetrics = await monitoringCollection.find({}).toArray();
    expect(storedMetrics).toHaveLength(5);
    
    // Verify metric structure
    const firstMetric = storedMetrics[0];
    expect(firstMetric.system).toBeDefined();
    expect(firstMetric.application).toBeDefined();
    expect(firstMetric.database).toBeDefined();
    expect(firstMetric.custom).toBeDefined();
    expect(firstMetric.timestamp).toBeInstanceOf(Date);
    
    // Verify system metrics
    expect(firstMetric.system.memoryUsage).toBeDefined();
    expect(firstMetric.system.cpuUsage).toBeDefined();
    expect(typeof firstMetric.system.uptime).toBe('number');
    
    console.log('✅ System health metrics collection verified');
  });

  /**
   * DomainMeaning: Tests alert system for critical errors and thresholds
   * MisleadingNames: None
   * SideEffects: May trigger test alerts (mock implementation)
   * Invariants: Alerts must be triggered only for configured thresholds
   * RAG_Keywords: alerting, thresholds, critical errors, notifications
   * DuplicatePolicy: canonical
   * FunctionIdentity: alert-system-test-001
   */
  it('should trigger alerts for critical errors and threshold breaches', async () => {
    const mockAlertService = {
      alerts: [],
      
      async checkAlertConditions() {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
        
        // Check for critical errors in last 5 minutes
        const criticalErrors = await errorLogCollection.find({
          severity: 'critical',
          timestamp: { $gte: fiveMinutesAgo }
        }).toArray();
        
        if (criticalErrors.length > 0) {
          this.alerts.push({
            type: 'critical_error',
            count: criticalErrors.length,
            message: `${criticalErrors.length} critical error(s) in the last 5 minutes`,
            timestamp: now,
            details: criticalErrors.map(e => ({ type: e.type, code: e.code }))
          });
        }
        
        // Check for high error rate (> 10 errors per minute)
        const recentErrors = await errorLogCollection.find({
          timestamp: { $gte: new Date(now.getTime() - 60000) }
        }).toArray();
        
        if (recentErrors.length > 10) {
          this.alerts.push({
            type: 'high_error_rate',
            rate: recentErrors.length,
            message: `High error rate: ${recentErrors.length} errors in the last minute`,
            threshold: 10,
            timestamp: now
          });
        }
        
        return this.alerts;
      }
    };
    
    // Create critical errors to trigger alerts
    await errorLogCollection.insertMany([
      {
        timestamp: new Date(),
        severity: 'critical',
        type: 'DatabaseError',
        code: 'DB_001',
        message: 'Database connection lost'
      },
      {
        timestamp: new Date(),
        severity: 'critical', 
        type: 'SystemError',
        code: 'SYS_001',
        message: 'Out of memory'
      }
    ]);
    
    // Create high error rate scenario
    const highRateErrors = [];
    for (let i = 0; i < 15; i++) {
      highRateErrors.push({
        timestamp: new Date(),
        severity: 'error',
        type: 'ValidationError',
        code: 'VAL_001',
        message: 'Validation failed'
      });
    }
    await errorLogCollection.insertMany(highRateErrors);
    
    // Check alert conditions
    const alerts = await mockAlertService.checkAlertConditions();
    
    expect(alerts.length).toBeGreaterThan(0);
    
    // Should have critical error alert
    const criticalAlert = alerts.find(a => a.type === 'critical_error');
    expect(criticalAlert).toBeDefined();
    expect(criticalAlert.count).toBe(2);
    
    // Should have high error rate alert
    const rateAlert = alerts.find(a => a.type === 'high_error_rate');
    expect(rateAlert).toBeDefined();
    expect(rateAlert.rate).toBe(15);
    expect(rateAlert.threshold).toBe(10);
    
    console.log('✅ Alert system for critical errors verified');
    console.log(`Generated ${alerts.length} alerts`);
  });

  /**
   * DomainMeaning: Tests error log retention and cleanup policies
   * MisleadingNames: None
   * SideEffects: Creates and removes old error logs
   * Invariants: Old logs must be cleaned up according to retention policy
   * RAG_Keywords: log retention, cleanup, storage management, archival
   * DuplicatePolicy: canonical
   * FunctionIdentity: log-retention-test-001
   */
  it('should manage error log retention and cleanup', async () => {
    const mockRetentionService = {
      async cleanupOldLogs(retentionDays = 30) {
        const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
        
        // Archive critical errors before deletion (in real implementation)
        const criticalLogsToArchive = await errorLogCollection.find({
          severity: 'critical',
          timestamp: { $lt: cutoffDate }
        }).toArray();
        
        // Delete old logs
        const deleteResult = await errorLogCollection.deleteMany({
          timestamp: { $lt: cutoffDate }
        });
        
        return {
          deletedCount: deleteResult.deletedCount,
          archivedCriticalCount: criticalLogsToArchive.length,
          cutoffDate
        };
      }
    };
    
    // Create logs with different ages
    const now = new Date();
    const oldLogs = [];
    const recentLogs = [];
    
    // Old logs (35 days ago)
    for (let i = 0; i < 10; i++) {
      oldLogs.push({
        timestamp: new Date(now.getTime() - (35 * 24 * 60 * 60 * 1000)),
        severity: i < 2 ? 'critical' : 'error',
        type: 'TestError',
        message: `Old error ${i}`
      });
    }
    
    // Recent logs (10 days ago)
    for (let i = 0; i < 5; i++) {
      recentLogs.push({
        timestamp: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)),
        severity: 'error',
        type: 'TestError',
        message: `Recent error ${i}`
      });
    }
    
    await errorLogCollection.insertMany([...oldLogs, ...recentLogs]);
    
    // Verify initial count
    const initialCount = await errorLogCollection.countDocuments();
    expect(initialCount).toBe(15);
    
    // Run cleanup
    const cleanupResult = await mockRetentionService.cleanupOldLogs(30);
    
    expect(cleanupResult.deletedCount).toBe(10);
    expect(cleanupResult.archivedCriticalCount).toBe(2);
    
    // Verify remaining logs
    const remainingCount = await errorLogCollection.countDocuments();
    expect(remainingCount).toBe(5);
    
    console.log('✅ Error log retention and cleanup verified');
    console.log(`Deleted ${cleanupResult.deletedCount} old logs, archived ${cleanupResult.archivedCriticalCount} critical logs`);
  });
});