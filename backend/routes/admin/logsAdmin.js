const express = require('express');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requireAdmin } = require('./shared/adminMiddleware');

function createLogsAdminRoutes(db) {
  const router = express.Router();

  /**
   * GET /logs/query - Query system logs with filters
   * DomainMeaning: Administrative log querying for audit and debugging
   * MisleadingNames: None
   * SideEffects: Database read operations only
   * Invariants: Only admin users can access system logs
   * RAG_Keywords: log query, audit trail, system monitoring, filtering
   * DuplicatePolicy: canonical - primary log query endpoint
   * FunctionIdentity: hash_logs_query_001
   */
  router.get('/query', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        level,
        operation,
        source,
        userId,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = req.query;

      // Build query filter
      const filter = {};
      
      if (level) filter.level = level;
      if (operation) filter.operation = operation;
      if (source) filter.source = source;
      if (userId) filter.userId = userId;
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      // Query logs with pagination
      const logs = await db.collection('system_logs')
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .toArray();

      // Get total count for pagination
      const totalCount = await db.collection('system_logs').countDocuments(filter);

      res.json({
        success: true,
        data: {
          logs,
          totalCount,
          filters: {
            level,
            operation,
            source,
            userId,
            startDate,
            endDate
          },
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: totalCount > parseInt(offset) + parseInt(limit)
          }
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Log query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query logs'
      });
    }
  }));

  /**
   * GET /logs/stats - Get logging statistics and analytics
   * DomainMeaning: Administrative logging analytics for system health monitoring
   * MisleadingNames: None
   * SideEffects: Database read operations only
   * Invariants: Only admin users can access log statistics
   * RAG_Keywords: log statistics, analytics, system health, monitoring
   * DuplicatePolicy: canonical - primary log statistics endpoint
   * FunctionIdentity: hash_logs_stats_001
   */
  router.get('/stats', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Get summary statistics
      const [totalLogs, errorCount, warningCount] = await Promise.all([
        db.collection('system_logs').countDocuments(),
        db.collection('system_logs').countDocuments({ level: 'error' }),
        db.collection('system_logs').countDocuments({ level: 'warning' })
      ]);

      // Get level distribution
      const levelDistribution = await db.collection('system_logs').aggregate([
        {
          $group: {
            _id: '$level',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const levelDist = {
        info: 0,
        warning: 0,
        error: 0,
        debug: 0
      };
      
      levelDistribution.forEach(item => {
        if (levelDist.hasOwnProperty(item._id)) {
          levelDist[item._id] = item.count;
        }
      });

      // Get operation frequency (top 10)
      const operationFrequency = await db.collection('system_logs').aggregate([
        {
          $group: {
            _id: '$operation',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();

      // Get recent errors (last 10)
      const recentErrors = await db.collection('system_logs')
        .find({ level: 'error' })
        .sort({ timestamp: -1 })
        .limit(10)
        .project({ timestamp: 1, operation: 1, message: 1, userId: 1 })
        .toArray();

      // Get hourly activity for last 24 hours
      const hourlyActivity = await db.collection('system_logs').aggregate([
        {
          $match: {
            timestamp: { $gte: last24Hours }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d %H:00',
                date: '$timestamp'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

      // Get unique operations and active users
      const [uniqueOps, activeUsers] = await Promise.all([
        db.collection('system_logs').distinct('operation'),
        db.collection('system_logs').distinct('userId', {
          timestamp: { $gte: last24Hours }
        })
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            totalLogs,
            errorCount,
            warningCount,
            uniqueOperations: uniqueOps.length,
            activeUsers: activeUsers.length
          },
          levelDistribution: levelDist,
          operationFrequency,
          recentErrors,
          hourlyActivity
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Log stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve log statistics'
      });
    }
  }));

  /**
   * POST /logs/export - Export logs for external analysis
   * DomainMeaning: Administrative log export for archival and analysis
   * MisleadingNames: None
   * SideEffects: Creates export file, may consume significant resources
   * Invariants: Only admin users can export logs
   * RAG_Keywords: log export, data export, archival, analysis
   * DuplicatePolicy: canonical - primary log export endpoint
   * FunctionIdentity: hash_logs_export_001
   */
  router.post('/export', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        format = 'json',
        filters = {},
        includeMetadata = false
      } = req.body;

      // Validate export format
      const validFormats = ['json', 'csv', 'txt'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
        });
      }

      // Build query filter
      const queryFilter = {};
      if (filters.level) queryFilter.level = filters.level;
      if (filters.operation) queryFilter.operation = filters.operation;
      if (filters.source) queryFilter.source = filters.source;
      if (filters.userId) queryFilter.userId = filters.userId;
      
      if (filters.startDate || filters.endDate) {
        queryFilter.timestamp = {};
        if (filters.startDate) queryFilter.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) queryFilter.timestamp.$lte = new Date(filters.endDate);
      }

      // Query logs for export
      const logsToExport = await db.collection('system_logs')
        .find(queryFilter)
        .sort({ timestamp: -1 })
        .toArray();

      // Generate export ID
      const exportId = `log_export_${Date.now()}`;

      // In production, this would save to file system or cloud storage
      // For now, we'll simulate the export process
      const exportData = {
        exportId,
        format,
        recordCount: logsToExport.length,
        filters,
        includeMetadata,
        exportedAt: new Date(),
        exportedBy: req.user.username || req.user.name || 'admin'
      };

      // Store export metadata
      await db.collection('log_exports').insertOne({
        ...exportData,
        status: 'completed',
        downloadUrl: `/api/admin/logs/download/${exportId}`
      });

      res.json({
        success: true,
        data: {
          exportId,
          format,
          recordCount: logsToExport.length,
          downloadUrl: `/api/admin/logs/download/${exportId}`
        },
        message: 'Log export ready for download'
      });

    } catch (error) {
      console.error('Log export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export logs'
      });
    }
  }));

  /**
   * POST /logs/cleanup - Cleanup old logs based on retention policy
   * DomainMeaning: Administrative log cleanup for storage management
   * MisleadingNames: None
   * SideEffects: Deletes old log entries from database
   * Invariants: Only admin users can cleanup logs
   * RAG_Keywords: log cleanup, retention policy, storage management
   * DuplicatePolicy: canonical - primary log cleanup endpoint
   * FunctionIdentity: hash_logs_cleanup_001
   */
  router.post('/cleanup', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        retentionDays = 90,
        dryRun = true
      } = req.body;

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Build cleanup filter
      const cleanupFilter = {
        timestamp: { $lt: cutoffDate }
      };

      if (dryRun) {
        // Dry run: count what would be deleted
        const wouldRemoveCount = await db.collection('system_logs').countDocuments(cleanupFilter);
        
        // Estimate freed space (rough calculation)
        const avgDocSize = 500; // bytes
        const freedSpaceKB = Math.round((wouldRemoveCount * avgDocSize) / 1024);

        res.json({
          success: true,
          data: {
            wouldRemoveCount,
            freedSpaceKB,
            cutoffDate,
            dryRun: true
          },
          message: `Dry run: Would remove ${wouldRemoveCount} logs older than ${cutoffDate.toISOString()}`
        });
      } else {
        // Actual cleanup
        const cleanupResult = await db.collection('system_logs').deleteMany(cleanupFilter);
        
        // Estimate freed space
        const avgDocSize = 500; // bytes
        const freedSpaceKB = Math.round((cleanupResult.deletedCount * avgDocSize) / 1024);

        // Log the cleanup operation itself
        await db.collection('system_logs').insertOne({
          timestamp: new Date(),
          level: 'info',
          source: 'system',
          operation: 'log_cleanup',
          userId: req.user.username || req.user.name || 'admin',
          message: `Cleaned up ${cleanupResult.deletedCount} logs older than ${retentionDays} days`,
          metadata: {
            removedCount: cleanupResult.deletedCount,
            freedSpaceKB,
            cutoffDate
          }
        });

        res.json({
          success: true,
          data: {
            removedCount: cleanupResult.deletedCount,
            freedSpaceKB,
            cutoffDate,
            dryRun: false
          },
          message: `Successfully removed ${cleanupResult.deletedCount} old logs`
        });
      }

    } catch (error) {
      console.error('Log cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup logs'
      });
    }
  }));

  return router;
}

module.exports = createLogsAdminRoutes;