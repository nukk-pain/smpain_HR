/**
 * AI-HEADER
 * intent: Implement comprehensive rollback mechanism for payroll operations with snapshot and recovery
 * domain_meaning: Provides safe rollback functionality for failed payroll operations to maintain data integrity
 * misleading_names: None - clear rollback purpose
 * data_contracts: Expects MongoDB collections, transaction support, snapshot storage
 * PII: May handle sensitive payroll data during rollback operations
 * invariants: All rollback operations must maintain data consistency and auditability
 * rag_keywords: rollback, transaction, snapshot, recovery, data integrity, payroll
 */

const { ObjectId } = require('mongodb');
const crypto = require('crypto');

/**
 * DomainMeaning: Service for managing rollback operations with snapshot-based recovery
 * MisleadingNames: None
 * SideEffects: Creates snapshots, modifies database during rollback operations
 * Invariants: All rollback operations must be atomic and logged
 * RAG_Keywords: rollback service, snapshot, recovery, audit trail
 * DuplicatePolicy: canonical
 * FunctionIdentity: rollback-service-class-001
 */
class RollbackService {
  constructor(db) {
    this.db = db;
    this.snapshotCollection = db.collection('rollback_snapshots');
    this.auditCollection = db.collection('rollback_audit_log');
    
    // Ensure indexes for performance
    this.initialize();
  }

  /**
   * DomainMeaning: Initialize rollback service with required indexes and collections
   * MisleadingNames: None
   * SideEffects: Creates MongoDB indexes and collections
   * Invariants: Indexes must be created for optimal performance
   * RAG_Keywords: initialization, indexes, collections setup
   * DuplicatePolicy: canonical
   * FunctionIdentity: rollback-initialize-001
   */
  async initialize() {
    try {
      // Create indexes for snapshot collection
      await this.snapshotCollection.createIndex(
        { operationId: 1 }, 
        { background: true }
      );
      await this.snapshotCollection.createIndex(
        { createdAt: 1, expiresAt: 1 }, 
        { background: true }
      );
      
      // Create indexes for audit collection
      await this.auditCollection.createIndex(
        { operationId: 1, timestamp: 1 }, 
        { background: true }
      );
      
      console.log('🔧 RollbackService initialized with required indexes');
    } catch (error) {
      console.error('❌ Failed to initialize RollbackService:', error);
    }
  }

  /**
   * DomainMeaning: Create snapshot of current database state before risky operation
   * MisleadingNames: None
   * SideEffects: Stores data snapshot in rollback_snapshots collection
   * Invariants: Snapshot must capture complete state of affected collections
   * RAG_Keywords: snapshot, backup, pre-operation state
   * DuplicatePolicy: canonical
   * FunctionIdentity: create-snapshot-001
   */
  async createSnapshot(operationId, collections, metadata = {}) {
    try {
      const snapshotId = new ObjectId();
      const timestamp = new Date();
      
      console.log(`📸 Creating snapshot for operation: ${operationId}`);
      
      const snapshotData = {
        _id: snapshotId,
        operationId,
        timestamp,
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
        collections: {},
        metadata: {
          ...metadata,
          userId: metadata.userId || 'system',
          operation: metadata.operation || 'unknown'
        }
      };

      // Capture current state of specified collections
      for (const collectionName of collections) {
        const collection = this.db.collection(collectionName);
        
        // For payroll operations, we typically care about specific queries
        let query = {};
        
        if (collectionName === 'payroll' && metadata.payrollQuery) {
          query = metadata.payrollQuery;
        } else if (collectionName === 'users' && metadata.userQuery) {
          query = metadata.userQuery;
        }
        
        const documents = await collection.find(query).toArray();
        snapshotData.collections[collectionName] = {
          query,
          documents,
          documentCount: documents.length
        };
        
        console.log(`📋 Captured ${documents.length} documents from ${collectionName}`);
      }
      
      // Store snapshot
      await this.snapshotCollection.insertOne(snapshotData);
      
      // Log audit trail
      await this.logAuditEvent(operationId, 'SNAPSHOT_CREATED', {
        snapshotId,
        collectionsCount: collections.length,
        totalDocuments: Object.values(snapshotData.collections)
          .reduce((sum, col) => sum + col.documentCount, 0)
      });
      
      console.log(`✅ Snapshot created successfully: ${snapshotId}`);
      return snapshotId;
      
    } catch (error) {
      console.error(`❌ Failed to create snapshot for operation ${operationId}:`, error);
      throw new Error(`Snapshot creation failed: ${error.message}`);
    }
  }

  /**
   * DomainMeaning: Execute rollback using previously created snapshot
   * MisleadingNames: None
   * SideEffects: Restores database to snapshot state, removes newer data
   * Invariants: Rollback must be atomic and completely restore previous state
   * RAG_Keywords: rollback execution, restore, snapshot recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: execute-rollback-001
   */
  async executeRollback(operationId, options = {}) {
    const {
      dryRun = false,
      confirmationRequired = true,
      skipAuditLog = false
    } = options;

    try {
      console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Starting rollback for operation: ${operationId}`);
      
      // Find the snapshot
      const snapshot = await this.snapshotCollection.findOne({ operationId });
      
      if (!snapshot) {
        throw new Error(`No snapshot found for operation: ${operationId}`);
      }
      
      if (new Date() > snapshot.expiresAt) {
        throw new Error(`Snapshot expired for operation: ${operationId}`);
      }

      const rollbackPlan = [];
      let totalDocumentsToRestore = 0;
      
      // Build rollback execution plan
      for (const [collectionName, snapshotData] of Object.entries(snapshot.collections)) {
        const collection = this.db.collection(collectionName);
        
        // Find documents that should be removed (created after snapshot)
        const newDocuments = await collection.find({
          ...snapshotData.query,
          createdAt: { $gt: snapshot.timestamp }
        }).toArray();
        
        rollbackPlan.push({
          collection: collectionName,
          documentsToRemove: newDocuments.length,
          documentsToRestore: snapshotData.documents.length,
          restoreDocuments: snapshotData.documents,
          removeQuery: {
            ...snapshotData.query,
            createdAt: { $gt: snapshot.timestamp }
          }
        });
        
        totalDocumentsToRestore += snapshotData.documents.length;
      }
      
      console.log(`📋 Rollback plan prepared: ${totalDocumentsToRestore} documents to restore across ${rollbackPlan.length} collections`);
      
      if (dryRun) {
        console.log('🔍 DRY RUN - Rollback plan:');
        rollbackPlan.forEach((plan, index) => {
          console.log(`  ${index + 1}. ${plan.collection}: Remove ${plan.documentsToRemove}, Restore ${plan.documentsToRestore}`);
        });
        return { success: true, dryRun: true, plan: rollbackPlan };
      }
      
      // Check if MongoDB supports transactions
      const supportsTransactions = await this.checkTransactionSupport();
      
      if (supportsTransactions) {
        // Use transaction-based rollback
        return await this.executeTransactionalRollback(operationId, rollbackPlan, snapshot);
      } else {
        // Use manual rollback with error recovery
        return await this.executeManualRollback(operationId, rollbackPlan, snapshot);
      }
      
    } catch (error) {
      console.error(`❌ Rollback failed for operation ${operationId}:`, error);
      
      if (!skipAuditLog) {
        await this.logAuditEvent(operationId, 'ROLLBACK_FAILED', {
          error: error.message,
          timestamp: new Date()
        });
      }
      
      throw new Error(`Rollback execution failed: ${error.message}`);
    }
  }

  /**
   * DomainMeaning: Execute rollback using MongoDB transactions (replica set only)
   * MisleadingNames: None
   * SideEffects: Modifies database within transaction scope
   * Invariants: All rollback operations must succeed or all must fail
   * RAG_Keywords: transactional rollback, atomic operations, replica set
   * DuplicatePolicy: canonical
   * FunctionIdentity: transactional-rollback-001
   */
  async executeTransactionalRollback(operationId, rollbackPlan, snapshot) {
    const session = this.db.client.startSession();
    
    try {
      let rollbackResult;
      
      await session.withTransaction(async () => {
        console.log('🔄 Executing transactional rollback...');
        
        for (const plan of rollbackPlan) {
          const collection = this.db.collection(plan.collection);
          
          // Remove documents created after snapshot
          if (plan.documentsToRemove > 0) {
            const removeResult = await collection.deleteMany(plan.removeQuery, { session });
            console.log(`🗑️ Removed ${removeResult.deletedCount} documents from ${plan.collection}`);
          }
          
          // Restore original documents if any existed
          if (plan.restoreDocuments.length > 0) {
            // Remove _id to avoid conflicts, MongoDB will generate new ones
            const documentsToInsert = plan.restoreDocuments.map(doc => {
              const { _id, ...docWithoutId } = doc;
              return {
                ...docWithoutId,
                restoredFromSnapshot: true,
                originalId: _id,
                restoredAt: new Date()
              };
            });
            
            const restoreResult = await collection.insertMany(documentsToInsert, { session });
            console.log(`📥 Restored ${restoreResult.insertedCount} documents to ${plan.collection}`);
          }
        }
        
        rollbackResult = {
          success: true,
          transactional: true,
          restoredCollections: rollbackPlan.length,
          timestamp: new Date()
        };
      });
      
      // Log successful rollback
      await this.logAuditEvent(operationId, 'ROLLBACK_COMPLETED', rollbackResult);
      
      console.log(`✅ Transactional rollback completed for operation: ${operationId}`);
      return rollbackResult;
      
    } finally {
      await session.endSession();
    }
  }

  /**
   * DomainMeaning: Execute rollback manually with error recovery (standalone MongoDB)
   * MisleadingNames: None
   * SideEffects: Modifies database with individual operations and recovery tracking
   * Invariants: Must track progress and allow for recovery from partial failures
   * RAG_Keywords: manual rollback, error recovery, standalone MongoDB
   * DuplicatePolicy: canonical
   * FunctionIdentity: manual-rollback-001
   */
  async executeManualRollback(operationId, rollbackPlan, snapshot) {
    console.log('🔄 Executing manual rollback (no transaction support)...');
    
    const progressTracker = {
      operationId,
      startTime: new Date(),
      completedSteps: [],
      failedSteps: [],
      totalSteps: rollbackPlan.length
    };
    
    try {
      for (let i = 0; i < rollbackPlan.length; i++) {
        const plan = rollbackPlan[i];
        const stepId = `${plan.collection}_${i}`;
        
        try {
          const collection = this.db.collection(plan.collection);
          
          // Store progress
          progressTracker.completedSteps.push({
            stepId,
            collection: plan.collection,
            action: 'starting',
            timestamp: new Date()
          });
          
          // Remove documents created after snapshot
          let removeCount = 0;
          if (plan.documentsToRemove > 0) {
            const removeResult = await collection.deleteMany(plan.removeQuery);
            removeCount = removeResult.deletedCount;
            console.log(`🗑️ Removed ${removeCount} documents from ${plan.collection}`);
          }
          
          // Restore original documents
          let restoreCount = 0;
          if (plan.restoreDocuments.length > 0) {
            const documentsToInsert = plan.restoreDocuments.map(doc => {
              const { _id, ...docWithoutId } = doc;
              return {
                ...docWithoutId,
                restoredFromSnapshot: true,
                originalId: _id,
                restoredAt: new Date()
              };
            });
            
            const restoreResult = await collection.insertMany(documentsToInsert);
            restoreCount = restoreResult.insertedCount;
            console.log(`📥 Restored ${restoreCount} documents to ${plan.collection}`);
          }
          
          // Update progress
          progressTracker.completedSteps[progressTracker.completedSteps.length - 1] = {
            stepId,
            collection: plan.collection,
            action: 'completed',
            removeCount,
            restoreCount,
            timestamp: new Date()
          };
          
        } catch (stepError) {
          console.error(`❌ Failed to rollback ${plan.collection}:`, stepError);
          
          progressTracker.failedSteps.push({
            stepId,
            collection: plan.collection,
            error: stepError.message,
            timestamp: new Date()
          });
          
          // Continue with other collections but log the failure
          console.log(`⚠️ Continuing rollback despite failure in ${plan.collection}`);
        }
      }
      
      const rollbackResult = {
        success: progressTracker.failedSteps.length === 0,
        manual: true,
        completedSteps: progressTracker.completedSteps.length,
        failedSteps: progressTracker.failedSteps.length,
        duration: Date.now() - progressTracker.startTime.getTime(),
        timestamp: new Date()
      };
      
      // Log rollback attempt
      await this.logAuditEvent(operationId, 
        rollbackResult.success ? 'ROLLBACK_COMPLETED' : 'ROLLBACK_PARTIAL', 
        { ...rollbackResult, progressTracker }
      );
      
      if (rollbackResult.success) {
        console.log(`✅ Manual rollback completed for operation: ${operationId}`);
      } else {
        console.log(`⚠️ Manual rollback partially completed for operation: ${operationId}`);
        console.log(`Failed steps: ${progressTracker.failedSteps.map(s => s.collection).join(', ')}`);
      }
      
      return rollbackResult;
      
    } catch (error) {
      console.error(`❌ Manual rollback failed for operation ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * DomainMeaning: Check if MongoDB instance supports transactions
   * MisleadingNames: None
   * SideEffects: None - read-only check
   * Invariants: Must accurately detect transaction support
   * RAG_Keywords: transaction support, replica set detection, MongoDB capabilities
   * DuplicatePolicy: canonical
   * FunctionIdentity: check-transaction-support-001
   */
  async checkTransactionSupport() {
    try {
      const adminDb = this.db.admin();
      const serverStatus = await adminDb.serverStatus();
      
      // Check if running as replica set
      const isReplicaSet = serverStatus.repl && serverStatus.repl.setName;
      
      console.log(`🔍 Transaction support check: ${isReplicaSet ? 'Supported (Replica Set)' : 'Not supported (Standalone)'}`);
      return isReplicaSet;
      
    } catch (error) {
      console.warn(`⚠️ Could not determine transaction support:`, error.message);
      return false;
    }
  }

  /**
   * DomainMeaning: Log audit events for rollback operations
   * MisleadingNames: None
   * SideEffects: Creates audit log entries
   * Invariants: All rollback operations must be auditable
   * RAG_Keywords: audit logging, compliance, rollback tracking
   * DuplicatePolicy: canonical
   * FunctionIdentity: audit-log-001
   */
  async logAuditEvent(operationId, eventType, data = {}) {
    try {
      const auditEntry = {
        _id: new ObjectId(),
        operationId,
        eventType,
        timestamp: new Date(),
        data: {
          ...data,
          serverInfo: {
            hostname: require('os').hostname(),
            pid: process.pid,
            nodeVersion: process.version
          }
        }
      };
      
      await this.auditCollection.insertOne(auditEntry);
      console.log(`📝 Audit event logged: ${eventType} for operation ${operationId}`);
      
    } catch (error) {
      console.error(`❌ Failed to log audit event:`, error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  /**
   * DomainMeaning: Clean up expired snapshots and audit logs
   * MisleadingNames: None
   * SideEffects: Removes old data from rollback collections
   * Invariants: Must preserve recent snapshots and audit trail
   * RAG_Keywords: cleanup, maintenance, snapshot expiration
   * DuplicatePolicy: canonical
   * FunctionIdentity: cleanup-expired-001
   */
  async cleanupExpiredData() {
    try {
      const now = new Date();
      
      // Remove expired snapshots
      const expiredSnapshots = await this.snapshotCollection.deleteMany({
        expiresAt: { $lt: now }
      });
      
      // Remove old audit logs (keep for 30 days)
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      const oldAuditLogs = await this.auditCollection.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });
      
      console.log(`🧹 Cleanup completed: ${expiredSnapshots.deletedCount} snapshots, ${oldAuditLogs.deletedCount} audit logs removed`);
      
      return {
        expiredSnapshotsRemoved: expiredSnapshots.deletedCount,
        oldAuditLogsRemoved: oldAuditLogs.deletedCount
      };
      
    } catch (error) {
      console.error(`❌ Cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * DomainMeaning: Get rollback status and history for an operation
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Must provide complete operation history
   * RAG_Keywords: rollback status, operation history, audit trail
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-rollback-status-001
   */
  async getRollbackStatus(operationId) {
    try {
      const snapshot = await this.snapshotCollection.findOne({ operationId });
      const auditLogs = await this.auditCollection
        .find({ operationId })
        .sort({ timestamp: 1 })
        .toArray();
      
      return {
        operationId,
        hasSnapshot: !!snapshot,
        snapshotExpired: snapshot ? (new Date() > snapshot.expiresAt) : false,
        snapshotCreatedAt: snapshot?.timestamp,
        snapshotExpiresAt: snapshot?.expiresAt,
        auditEvents: auditLogs.length,
        latestEvent: auditLogs[auditLogs.length - 1]?.eventType,
        timeline: auditLogs.map(log => ({
          eventType: log.eventType,
          timestamp: log.timestamp,
          summary: this.summarizeAuditData(log.data)
        }))
      };
      
    } catch (error) {
      console.error(`❌ Failed to get rollback status for ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * DomainMeaning: Create human-readable summary of audit data
   * MisleadingNames: None
   * SideEffects: None - pure function
   * Invariants: Must provide consistent summary format
   * RAG_Keywords: audit summary, human readable, data presentation
   * DuplicatePolicy: canonical
   * FunctionIdentity: summarize-audit-data-001
   */
  summarizeAuditData(data) {
    if (!data) return 'No data';
    
    if (data.collectionsCount !== undefined) {
      return `${data.collectionsCount} collections, ${data.totalDocuments} documents`;
    }
    
    if (data.completedSteps !== undefined) {
      return `${data.completedSteps} completed, ${data.failedSteps || 0} failed`;
    }
    
    if (data.error) {
      return `Error: ${data.error}`;
    }
    
    return 'Details available';
  }
}

module.exports = RollbackService;