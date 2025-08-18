/**
 * AI-HEADER
 * intent: Manage data retention and cleanup for monitoring collections
 * domain_meaning: Handles automatic and manual cleanup of old monitoring data
 * misleading_names: None
 * data_contracts: Operates on error_logs, monitoring_data, alert_history collections
 * PII: Ensures PII data is removed according to retention policies
 * invariants: Must not delete data within retention period
 * rag_keywords: data retention, cleanup, TTL, data lifecycle, GDPR compliance
 */

/**
 * DomainMeaning: Utility class for managing data retention policies
 * MisleadingNames: None
 * SideEffects: Deletes old data from database
 * Invariants: Must respect configured retention periods
 * RAG_Keywords: retention management, data cleanup, TTL management
 * DuplicatePolicy: canonical
 * FunctionIdentity: data-retention-manager-001
 */
class DataRetentionManager {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
  }

  /**
   * DomainMeaning: Perform manual cleanup of old data
   * MisleadingNames: None
   * SideEffects: Deletes documents from collections
   * Invariants: Must not delete data within retention period
   * RAG_Keywords: manual cleanup, data deletion, retention enforcement
   * DuplicatePolicy: canonical
   * FunctionIdentity: perform-cleanup-001
   */
  async performManualCleanup() {
    try {
      console.log('🧹 Starting manual cleanup process...');
      
      const results = {
        errorLogs: 0,
        monitoringData: 0,
        alertHistory: 0
      };
      
      // Cleanup error logs
      const errorLogCutoff = new Date(
        Date.now() - this.config.retention.errorLogsDays * 24 * 60 * 60 * 1000
      );
      
      const errorLogResult = await this.db.collection('error_logs').deleteMany({
        timestamp: { $lt: errorLogCutoff }
      });
      results.errorLogs = errorLogResult.deletedCount;
      
      // Cleanup monitoring data
      const monitoringCutoff = new Date(
        Date.now() - this.config.retention.monitoringDataDays * 24 * 60 * 60 * 1000
      );
      
      const monitoringResult = await this.db.collection('monitoring_data').deleteMany({
        timestamp: { $lt: monitoringCutoff }
      });
      results.monitoringData = monitoringResult.deletedCount;
      
      // Cleanup alert history
      const alertCutoff = new Date(
        Date.now() - this.config.retention.alertHistoryDays * 24 * 60 * 60 * 1000
      );
      
      const alertResult = await this.db.collection('alert_history').deleteMany({
        timestamp: { $lt: alertCutoff }
      });
      results.alertHistory = alertResult.deletedCount;
      
      console.log('🧹 Manual cleanup completed:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error);
      throw error;
    }
  }

  /**
   * DomainMeaning: Update TTL indexes for automatic cleanup
   * MisleadingNames: None
   * SideEffects: Modifies MongoDB indexes
   * Invariants: Must maintain at least one index per collection
   * RAG_Keywords: TTL index, automatic cleanup, index management
   * DuplicatePolicy: canonical
   * FunctionIdentity: update-ttl-indexes-001
   */
  async updateTTLIndexes() {
    try {
      console.log('🔧 Updating TTL indexes...');
      
      // Update error logs TTL
      await this.updateCollectionTTL(
        'error_logs',
        'timestamp',
        this.config.retention.errorLogsDays * 24 * 60 * 60
      );
      
      // Update monitoring data TTL
      await this.updateCollectionTTL(
        'monitoring_data',
        'timestamp',
        this.config.retention.monitoringDataDays * 24 * 60 * 60
      );
      
      // Update alert history TTL
      await this.updateCollectionTTL(
        'alert_history',
        'timestamp',
        this.config.retention.alertHistoryDays * 24 * 60 * 60
      );
      
      console.log('🔧 TTL indexes updated successfully');
      
    } catch (error) {
      console.error('❌ Failed to update TTL indexes:', error);
      throw error;
    }
  }

  /**
   * DomainMeaning: Update TTL index for a specific collection
   * MisleadingNames: None
   * SideEffects: Drops and recreates TTL index
   * Invariants: Must maintain data during index recreation
   * RAG_Keywords: TTL update, index recreation
   * DuplicatePolicy: canonical
   * FunctionIdentity: update-collection-ttl-001
   */
  async updateCollectionTTL(collectionName, fieldName, expireAfterSeconds) {
    try {
      const collection = this.db.collection(collectionName);
      
      // Get existing indexes
      const indexes = await collection.indexes();
      
      // Find and drop existing TTL index
      for (const index of indexes) {
        if (index.expireAfterSeconds !== undefined && index.key[fieldName]) {
          await collection.dropIndex(index.name);
          console.log(`  Dropped old TTL index on ${collectionName}.${fieldName}`);
          break;
        }
      }
      
      // Create new TTL index
      await collection.createIndex(
        { [fieldName]: 1 },
        { 
          expireAfterSeconds,
          background: true
        }
      );
      
      console.log(`  Created new TTL index on ${collectionName}.${fieldName} (${expireAfterSeconds}s)`);
      
    } catch (error) {
      console.error(`❌ Failed to update TTL for ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * DomainMeaning: Get retention statistics
   * MisleadingNames: None
   * SideEffects: None - read only operation
   * Invariants: Must return statistics object
   * RAG_Keywords: retention stats, data lifecycle stats
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-retention-stats-001
   */
  async getRetentionStats() {
    try {
      const stats = {
        collections: {},
        totalDocuments: 0,
        totalSize: 0
      };
      
      // Error logs stats
      const errorLogStats = await this.getCollectionRetentionStats(
        'error_logs',
        this.config.retention.errorLogsDays
      );
      stats.collections.errorLogs = errorLogStats;
      
      // Monitoring data stats
      const monitoringStats = await this.getCollectionRetentionStats(
        'monitoring_data',
        this.config.retention.monitoringDataDays
      );
      stats.collections.monitoringData = monitoringStats;
      
      // Alert history stats
      const alertStats = await this.getCollectionRetentionStats(
        'alert_history',
        this.config.retention.alertHistoryDays
      );
      stats.collections.alertHistory = alertStats;
      
      // Calculate totals
      stats.totalDocuments = 
        errorLogStats.totalDocuments + 
        monitoringStats.totalDocuments + 
        alertStats.totalDocuments;
      
      stats.totalSize = 
        errorLogStats.estimatedSize + 
        monitoringStats.estimatedSize + 
        alertStats.estimatedSize;
      
      return stats;
      
    } catch (error) {
      console.error('❌ Failed to get retention stats:', error);
      return null;
    }
  }

  /**
   * DomainMeaning: Get retention statistics for a specific collection
   * MisleadingNames: None
   * SideEffects: None - read only operation
   * Invariants: Must handle missing collections gracefully
   * RAG_Keywords: collection stats, document age distribution
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-collection-stats-001
   */
  async getCollectionRetentionStats(collectionName, retentionDays) {
    try {
      const collection = this.db.collection(collectionName);
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      // Total documents
      const totalDocuments = await collection.countDocuments();
      
      // Documents to be retained
      const retainedDocuments = await collection.countDocuments({
        timestamp: { $gte: cutoffDate }
      });
      
      // Documents to be deleted
      const expiredDocuments = await collection.countDocuments({
        timestamp: { $lt: cutoffDate }
      });
      
      // Get oldest and newest documents
      const oldest = await collection.findOne({}, { sort: { timestamp: 1 } });
      const newest = await collection.findOne({}, { sort: { timestamp: -1 } });
      
      // Estimate collection size (stats method may not be available in all drivers)
      let estimatedSize = 0;
      try {
        const stats = await this.db.command({ collStats: collectionName });
        estimatedSize = stats.size || 0;
      } catch (error) {
        // Fallback: estimate based on document count
        estimatedSize = totalDocuments * 1024; // Rough estimate: 1KB per document
      }
      
      return {
        collectionName,
        retentionDays,
        totalDocuments,
        retainedDocuments,
        expiredDocuments,
        oldestDocument: oldest?.timestamp || null,
        newestDocument: newest?.timestamp || null,
        estimatedSize: Math.round(estimatedSize / 1024 / 1024), // MB
        retentionCutoff: cutoffDate
      };
      
    } catch (error) {
      console.error(`❌ Failed to get stats for ${collectionName}:`, error);
      return {
        collectionName,
        error: error.message
      };
    }
  }
}

module.exports = DataRetentionManager;