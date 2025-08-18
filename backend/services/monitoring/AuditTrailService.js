/**
 * AI-HEADER
 * intent: Audit trail service for tracking sensitive operations and compliance
 * domain_meaning: Records all critical business operations for regulatory compliance
 * misleading_names: None
 * data_contracts: Uses monitoring_data collection for audit logs
 * PII: Contains user IDs and operation details - must comply with retention policies
 * invariants: All sensitive operations must be logged for compliance
 * rag_keywords: audit trail, compliance logging, operation tracking, payroll audit
 */

const { ObjectId } = require('mongodb');

/**
 * DomainMeaning: Service for logging audit trails for compliance
 * MisleadingNames: None
 * SideEffects: Creates database entries in monitoring_data collection
 * Invariants: Must log all sensitive operations atomically
 * RAG_Keywords: audit logging, compliance, operation tracking
 * DuplicatePolicy: canonical
 * FunctionIdentity: audit-trail-service-001
 */
class AuditTrailService {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
    this.monitoringCollection = db.collection('monitoring_data');
    this.initialize();
  }

  /**
   * DomainMeaning: Initialize audit trail service with indexes
   * MisleadingNames: None
   * SideEffects: Creates MongoDB indexes
   * Invariants: Indexes must be created for query performance
   * RAG_Keywords: initialization, indexes, audit setup
   * DuplicatePolicy: canonical
   * FunctionIdentity: audit-trail-initialize-001
   */
  async initialize() {
    try {
      // Create indexes for monitoring data
      await this.monitoringCollection.createIndex(
        { timestamp: -1 }, 
        { background: true }
      );
      await this.monitoringCollection.createIndex(
        { type: 1, timestamp: -1 }, 
        { background: true }
      );
      await this.monitoringCollection.createIndex(
        { userId: 1, timestamp: -1 }, 
        { background: true }
      );
      await this.monitoringCollection.createIndex(
        { action: 1, timestamp: -1 }, 
        { background: true }
      );
      await this.monitoringCollection.createIndex(
        { category: 1, timestamp: -1 }, 
        { background: true }
      );
      
      // TTL index for automatic cleanup
      await this.monitoringCollection.createIndex(
        { timestamp: 1 },
        { 
          expireAfterSeconds: this.config.retention.monitoringDataDays * 24 * 60 * 60,
          background: true
        }
      );
      
      console.log('🔧 AuditTrailService initialized with indexes');
    } catch (error) {
      console.error('❌ Failed to initialize AuditTrailService:', error);
    }
  }

  /**
   * DomainMeaning: Log audit trail for sensitive operations like payroll edits
   * MisleadingNames: None
   * SideEffects: Creates database entry in monitoring_data collection
   * Invariants: Must log all sensitive operations for compliance
   * RAG_Keywords: audit trail, payroll audit, security logging, compliance
   * DuplicatePolicy: canonical
   * FunctionIdentity: log-audit-trail-001
   */
  async logAuditTrail(auditData) {
    try {
      const auditLog = {
        _id: new ObjectId(),
        timestamp: new Date(),
        type: 'audit_trail',
        action: auditData.action || 'unknown',
        category: auditData.category || 'general',
        userId: auditData.userId,
        userName: auditData.userName,
        targetId: auditData.targetId,
        previousData: auditData.previousData,
        newData: auditData.newData,
        verificationToken: auditData.verificationToken,
        verifiedAt: auditData.verifiedAt,
        metadata: {
          ...auditData.metadata,
          serverTimestamp: new Date(),
          environment: process.env.NODE_ENV || 'development'
        }
      };

      // Store audit log in monitoring collection
      await this.monitoringCollection.insertOne(auditLog);

      console.log(`📝 Audit trail logged: ${auditLog.action} by ${auditLog.userName} - ${auditLog._id}`);
      return auditLog._id;

    } catch (error) {
      console.error('❌ Failed to log audit trail:', error);
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  }

  /**
   * DomainMeaning: Query audit trails for a specific user or operation
   * MisleadingNames: None
   * SideEffects: None - read only operation
   * Invariants: Must handle query filters safely
   * RAG_Keywords: audit query, audit search, compliance reporting
   * DuplicatePolicy: canonical
   * FunctionIdentity: query-audit-trails-001
   */
  async queryAuditTrails(filters = {}, options = {}) {
    try {
      const query = { type: 'audit_trail' };
      
      if (filters.userId) {
        query.userId = filters.userId;
      }
      
      if (filters.action) {
        query.action = filters.action;
      }
      
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.timestamp.$lte = new Date(filters.endDate);
        }
      }
      
      const limit = options.limit || 100;
      const skip = options.skip || 0;
      
      const results = await this.monitoringCollection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();
      
      return results;
      
    } catch (error) {
      console.error('❌ Failed to query audit trails:', error);
      return [];
    }
  }

  /**
   * DomainMeaning: Get audit statistics for reporting
   * MisleadingNames: None
   * SideEffects: None - read only operation
   * Invariants: Must aggregate data efficiently
   * RAG_Keywords: audit statistics, compliance reporting, audit analytics
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-audit-stats-001
   */
  async getAuditStats(timeRangeHours = 24) {
    try {
      const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
      
      const stats = await this.monitoringCollection.aggregate([
        { 
          $match: { 
            type: 'audit_trail',
            timestamp: { $gte: startTime } 
          } 
        },
        {
          $group: {
            _id: {
              action: '$action',
              category: '$category'
            },
            count: { $sum: 1 },
            users: { $addToSet: '$userId' },
            lastOccurred: { $max: '$timestamp' }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      return stats;
      
    } catch (error) {
      console.error('❌ Failed to get audit stats:', error);
      return [];
    }
  }
}

module.exports = AuditTrailService;