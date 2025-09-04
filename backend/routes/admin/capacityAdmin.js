const express = require('express');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requireAdmin } = require('./shared/adminMiddleware');

function createCapacityAdminRoutes(db) {
  const router = express.Router();

  /**
   * GET /debug/temp-uploads - Get temporary upload storage status
   * DomainMeaning: Administrative debugging endpoint for temp uploads monitoring
   * MisleadingNames: None
   * SideEffects: Database read operations only
   * Invariants: Only admin users can access debug information  
   * RAG_Keywords: admin debug, temp uploads, system monitoring
   * DuplicatePolicy: canonical - primary debug endpoint
   * FunctionIdentity: hash_debug_temp_uploads_001
   */
  router.get('/debug/temp-uploads', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      // Get temp uploads statistics from MongoDB
      const tempUploadsStats = await db.collection('temp_uploads').aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalSizeBytes: { $sum: '$sizeBytes' },
            oldestEntry: { $min: '$createdAt' },
            newestEntry: { $max: '$createdAt' }
          }
        }
      ]).toArray();

      const stats = tempUploadsStats[0] || {
        totalEntries: 0,
        totalSizeBytes: 0,
        oldestEntry: null,
        newestEntry: null
      };

      res.json({
        success: true,
        data: stats,
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Debug temp uploads error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve debug information' 
      });
    }
  }));

  /**
   * GET /dashboard/temp-data - Get comprehensive temporary data monitoring dashboard
   * DomainMeaning: Administrative dashboard for monitoring temp uploads and storage health
   * MisleadingNames: None
   * SideEffects: Database read operations only, no modifications
   * Invariants: Only admin users can access dashboard data
   * RAG_Keywords: temp data dashboard, monitoring, storage metrics, system health
   * DuplicatePolicy: canonical - primary temp data dashboard endpoint
   * FunctionIdentity: hash_dashboard_temp_data_001
   */
  router.get('/dashboard/temp-data', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      // Get comprehensive temp uploads analytics from MongoDB
      const tempUploadsAnalytics = await db.collection('temp_uploads').aggregate([
        {
          $facet: {
            // Summary statistics
            summary: [
              {
                $group: {
                  _id: null,
                  totalEntries: { $sum: 1 },
                  totalSizeBytes: { $sum: '$sizeBytes' },
                  oldestEntry: { $min: '$createdAt' },
                  newestEntry: { $max: '$createdAt' },
                  avgSizeBytes: { $avg: '$sizeBytes' }
                }
              }
            ],
            // Size distribution analysis
            sizeDistribution: [
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        { case: { $lt: ['$sizeBytes', 1048576] }, then: 'small' }, // < 1MB
                        { case: { $lt: ['$sizeBytes', 10485760] }, then: 'medium' }, // 1-10MB
                        { case: { $gte: ['$sizeBytes', 10485760] }, then: 'large' } // >= 10MB
                      ],
                      default: 'unknown'
                    }
                  },
                  count: { $sum: 1 },
                  totalSize: { $sum: '$sizeBytes' }
                }
              }
            ],
            // Expiration analysis
            expirationAnalysis: [
              {
                $addFields: {
                  timeUntilExpiry: { $subtract: ['$expiresAt', '$$NOW'] },
                  isExpiring: { $lt: [{ $subtract: ['$expiresAt', '$$NOW'] }, 300000] }, // 5 minutes
                  isExpired: { $lt: ['$expiresAt', '$$NOW'] }
                }
              },
              {
                $group: {
                  _id: null,
                  expiringSoon: { $sum: { $cond: ['$isExpiring', 1, 0] } },
                  expiredCount: { $sum: { $cond: ['$isExpired', 1, 0] } },
                  averageRetentionTime: { $avg: { $subtract: ['$expiresAt', '$createdAt'] } }
                }
              }
            ],
            // Recent activity (last 10 entries)
            recentActivity: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  _id: 1,
                  type: 1,
                  uploadedBy: 1,
                  sizeBytes: 1,
                  createdAt: 1,
                  expiresAt: 1,
                  sizeMB: { $round: [{ $divide: ['$sizeBytes', 1048576] }, 2] }
                }
              }
            ]
          }
        }
      ]).toArray();

      const analytics = tempUploadsAnalytics[0] || {
        summary: [{ totalEntries: 0, totalSizeBytes: 0, oldestEntry: null, newestEntry: null, avgSizeBytes: 0 }],
        sizeDistribution: [],
        expirationAnalysis: [{ expiringSoon: 0, expiredCount: 0, averageRetentionTime: 0 }],
        recentActivity: []
      };

      // Process summary data
      const summaryData = analytics.summary[0] || { totalEntries: 0, totalSizeBytes: 0, oldestEntry: null, newestEntry: null };
      summaryData.totalSizeMB = Math.round((summaryData.totalSizeBytes / 1048576) * 100) / 100; // Convert to MB with 2 decimals

      // Process size distribution
      const sizeDistribution = {
        small: { count: 0, totalSize: 0 },
        medium: { count: 0, totalSize: 0 },
        large: { count: 0, totalSize: 0 }
      };
      
      analytics.sizeDistribution.forEach(item => {
        if (sizeDistribution[item._id]) {
          sizeDistribution[item._id] = {
            count: item.count,
            totalSize: item.totalSize,
            totalSizeMB: Math.round((item.totalSize / 1048576) * 100) / 100
          };
        }
      });

      // Process expiration analysis
      const expirationAnalysis = analytics.expirationAnalysis[0] || { expiringSoon: 0, expiredCount: 0, averageRetentionTime: 0 };
      expirationAnalysis.averageRetentionTimeMinutes = Math.round((expirationAnalysis.averageRetentionTime / 60000) * 100) / 100; // Convert to minutes

      // Mock storage metrics (in production, this would come from system monitoring)
      const storageMetrics = {
        memoryUsage: {
          heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
          external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100
        },
        diskUsage: {
          tempDataMB: summaryData.totalSizeMB,
          availableGB: 'N/A' // Would be calculated from fs.statSync in production
        },
        capacityStatus: summaryData.totalEntries > 80 ? 'warning' : summaryData.totalEntries > 50 ? 'caution' : 'normal'
      };

      res.json({
        success: true,
        data: {
          summary: summaryData,
          storageMetrics,
          expirationAnalysis,
          sizeDistribution,
          recentActivity: analytics.recentActivity
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Temp data dashboard error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve dashboard data' 
      });
    }
  }));

  /**
   * GET /capacity/status - Get current storage capacity status
   * DomainMeaning: Administrative capacity monitoring for temp uploads system
   * MisleadingNames: None
   * SideEffects: Database read operations only for capacity analysis
   * Invariants: Only admin users can access capacity status
   * RAG_Keywords: capacity status, storage monitoring, system health, temp uploads
   * DuplicatePolicy: canonical - primary capacity status endpoint
   * FunctionIdentity: hash_capacity_status_001
   */
  router.get('/capacity/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      // Get current temp uploads usage statistics
      const currentUsageStats = await db.collection('temp_uploads').aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalSizeBytes: { $sum: '$sizeBytes' },
            avgSizeBytes: { $avg: '$sizeBytes' }
          }
        }
      ]).toArray();

      const usage = currentUsageStats[0] || { totalEntries: 0, totalSizeBytes: 0, avgSizeBytes: 0 };
      const totalSizeMB = Math.round((usage.totalSizeBytes / 1024 / 1024) * 100) / 100;

      // Get current memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;

      // Default capacity limits (can be configured via policy)
      const limits = {
        maxSizeMB: 100, // 100MB default limit
        maxEntries: 50, // 50 entries default limit
        warningThresholdPercent: 75,
        criticalThresholdPercent: 90
      };

      // Calculate utilization percentage
      const sizeUtilizationPercent = Math.round((totalSizeMB / limits.maxSizeMB) * 100);
      const entriesUtilizationPercent = Math.round((usage.totalEntries / limits.maxEntries) * 100);
      const maxUtilizationPercent = Math.max(sizeUtilizationPercent, entriesUtilizationPercent);

      // Determine health status
      let healthStatus;
      if (maxUtilizationPercent >= limits.criticalThresholdPercent) {
        healthStatus = {
          status: 'critical',
          message: 'Storage capacity critical - immediate cleanup required'
        };
      } else if (maxUtilizationPercent >= limits.warningThresholdPercent) {
        healthStatus = {
          status: 'warning',
          message: 'Storage capacity approaching limits - cleanup recommended'
        };
      } else {
        healthStatus = {
          status: 'healthy',
          message: 'Storage capacity within normal limits'
        };
      }

      // Generate recommendations based on current status
      const recommendations = [];
      if (maxUtilizationPercent >= limits.warningThresholdPercent) {
        recommendations.push('Run cleanup to remove expired entries');
        recommendations.push('Consider increasing storage limits if needed');
      }
      if (usage.totalEntries > limits.maxEntries * 0.8) {
        recommendations.push('Monitor upload frequency to prevent rapid capacity growth');
      }
      if (totalSizeMB > limits.maxSizeMB * 0.8) {
        recommendations.push('Review large file uploads and implement size restrictions if needed');
      }

      res.json({
        success: true,
        data: {
          currentUsage: {
            totalSizeMB,
            totalEntries: usage.totalEntries,
            memoryUsageMB,
            utilizationPercentage: maxUtilizationPercent
          },
          limits,
          healthStatus,
          recommendations
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Capacity status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve capacity status'
      });
    }
  }));

  /**
   * POST /capacity/cleanup - Execute manual capacity cleanup
   * DomainMeaning: Administrative cleanup operation for temp uploads storage
   * MisleadingNames: None
   * SideEffects: May delete expired or old temp upload data from database
   * Invariants: Only admin users can execute cleanup operations
   * RAG_Keywords: capacity cleanup, storage maintenance, temp uploads cleanup
   * DuplicatePolicy: canonical - primary capacity cleanup endpoint
   * FunctionIdentity: hash_capacity_cleanup_001
   */
  router.post('/capacity/cleanup', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const { policy = 'expired_only', dryRun = false } = req.body;

      // Get capacity status before cleanup
      const beforeStats = await db.collection('temp_uploads').aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalSizeBytes: { $sum: '$sizeBytes' }
          }
        }
      ]).toArray();

      const beforeCleanup = beforeStats[0] || { totalEntries: 0, totalSizeBytes: 0 };
      const startTime = Date.now();

      let cleanupFilter;
      switch (policy) {
        case 'expired_only':
          cleanupFilter = { expiresAt: { $lt: new Date() } };
          break;
        case 'older_than_4_hours':
          cleanupFilter = { createdAt: { $lt: new Date(Date.now() - 4 * 60 * 60 * 1000) } };
          break;
        case 'all_temp':
          cleanupFilter = {};
          break;
        default:
          cleanupFilter = { expiresAt: { $lt: new Date() } };
      }

      if (dryRun) {
        // Dry run: calculate what would be removed without actually removing
        const wouldRemoveStats = await db.collection('temp_uploads').aggregate([
          { $match: cleanupFilter },
          {
            $group: {
              _id: null,
              wouldRemoveEntries: { $sum: 1 },
              wouldFreeSizeBytes: { $sum: '$sizeBytes' }
            }
          }
        ]).toArray();

        const dryRunResults = wouldRemoveStats[0] || { wouldRemoveEntries: 0, wouldFreeSizeBytes: 0 };

        res.json({
          success: true,
          data: {
            dryRunResults: {
              wouldRemoveEntries: dryRunResults.wouldRemoveEntries,
              wouldFreeSpaceMB: Math.round((dryRunResults.wouldFreeSizeBytes / 1024 / 1024) * 100) / 100
            }
          },
          message: 'Dry run completed successfully'
        });
      } else {
        // Actual cleanup: remove matching entries
        const cleanupResult = await db.collection('temp_uploads').deleteMany(cleanupFilter);

        // Get capacity status after cleanup
        const afterStats = await db.collection('temp_uploads').aggregate([
          {
            $group: {
              _id: null,
              totalEntries: { $sum: 1 },
              totalSizeBytes: { $sum: '$sizeBytes' }
            }
          }
        ]).toArray();

        const afterCleanup = afterStats[0] || { totalEntries: 0, totalSizeBytes: 0 };
        const cleanupDurationMs = Date.now() - startTime;
        const freedSpaceBytes = beforeCleanup.totalSizeBytes - afterCleanup.totalSizeBytes;

        res.json({
          success: true,
          data: {
            cleanupResults: {
              removedEntries: cleanupResult.deletedCount,
              freedSpaceMB: Math.round((freedSpaceBytes / 1024 / 1024) * 100) / 100,
              cleanupDurationMs
            },
            summary: {
              beforeCleanup: {
                entries: beforeCleanup.totalEntries,
                sizeMB: Math.round((beforeCleanup.totalSizeBytes / 1024 / 1024) * 100) / 100
              },
              afterCleanup: {
                entries: afterCleanup.totalEntries,
                sizeMB: Math.round((afterCleanup.totalSizeBytes / 1024 / 1024) * 100) / 100
              }
            }
          },
          message: `Cleanup completed: ${cleanupResult.deletedCount} entries removed`
        });
      }

    } catch (error) {
      console.error('Capacity cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute capacity cleanup'
      });
    }
  }));

  /**
   * POST /capacity/policy - Configure capacity management policies
   * DomainMeaning: Administrative configuration for capacity management system
   * MisleadingNames: None
   * SideEffects: Creates or updates capacity policy configuration in database
   * Invariants: Only admin users can modify capacity policies
   * RAG_Keywords: capacity policy, storage configuration, system administration
   * DuplicatePolicy: canonical - primary capacity policy endpoint
   * FunctionIdentity: hash_capacity_policy_001
   */
  router.post('/capacity/policy', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        maxSizeMB,
        maxEntries,
        warningThresholdPercent,
        criticalThresholdPercent,
        autoCleanupEnabled,
        autoCleanupIntervalMinutes,
        cleanupPolicies
      } = req.body;

      // Validation
      const validationErrors = [];
      
      if (typeof maxSizeMB !== 'number' || maxSizeMB <= 0) {
        validationErrors.push('maxSizeMB must be a positive number');
      }
      if (typeof maxEntries !== 'number' || maxEntries <= 0) {
        validationErrors.push('maxEntries must be a positive number');
      }
      if (typeof warningThresholdPercent !== 'number' || warningThresholdPercent <= 0 || warningThresholdPercent > 100) {
        validationErrors.push('warningThresholdPercent must be between 1 and 100');
      }
      if (typeof criticalThresholdPercent !== 'number' || criticalThresholdPercent <= 0 || criticalThresholdPercent > 100) {
        validationErrors.push('criticalThresholdPercent must be between 1 and 100');
      }
      if (warningThresholdPercent >= criticalThresholdPercent) {
        validationErrors.push('criticalThresholdPercent must be greater than warningThresholdPercent');
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid policy values: ' + validationErrors.join(', ')
        });
      }

      // Create new capacity policy
      const newPolicy = {
        policyId: `capacity_policy_${Date.now()}`,
        maxSizeMB,
        maxEntries,
        warningThresholdPercent,
        criticalThresholdPercent,
        autoCleanupEnabled: autoCleanupEnabled || false,
        autoCleanupIntervalMinutes: autoCleanupIntervalMinutes || 30,
        cleanupPolicies: cleanupPolicies || {
          removeExpired: true,
          removeOldestWhenFull: false,
          maxAgeHours: 4
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user.username || req.user.name || 'admin'
      };

      // Deactivate existing policies
      await db.collection('capacity_policies').updateMany(
        { isActive: true },
        { $set: { isActive: false, deactivatedAt: new Date() } }
      );

      // Insert new policy
      await db.collection('capacity_policies').insertOne(newPolicy);

      res.json({
        success: true,
        data: {
          policyId: newPolicy.policyId,
          updatedAt: newPolicy.updatedAt
        },
        message: 'Capacity policy updated successfully'
      });

    } catch (error) {
      console.error('Capacity policy error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update capacity policy'
      });
    }
  }));

  return router;
}

module.exports = createCapacityAdminRoutes;