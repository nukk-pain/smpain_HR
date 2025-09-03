/**
 * AI-HEADER
 * intent: Admin-specific payroll operations including debugging and rollback management
 * domain_meaning: Administrative endpoints for payroll system monitoring and recovery
 * misleading_names: None
 * data_contracts: Requires admin permissions, handles memory stats and rollback operations
 * PII: Contains memory usage data, operation logs, no direct employee data
 * invariants: All endpoints require admin permissions, rollback requires confirmation
 * rag_keywords: admin payroll, debug memory, rollback, snapshot, recovery, monitoring
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/permissions');
const RollbackService = require('../services/RollbackService');
const {
  strictRateLimiter,
  addSecurityHeaders,
  validateObjectId,
  preventNoSQLInjection
} = require('../middleware/payrollSecurity');
const {
  MEMORY_LIMITS,
  BACKUP_CONFIG,
  updateMemoryUsage,
  memoryUsage
} = require('../utils/payrollUtils');

const router = express.Router();

/**
 * Create admin payroll routes with enhanced monitoring and rollback capabilities
 * DomainMeaning: Factory function to create administrative payroll routes
 * MisleadingNames: None
 * SideEffects: Creates Express router with database connection
 * Invariants: Database connection and storage maps must be provided
 * RAG_Keywords: admin routes factory, database injection, storage monitoring
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_admin_payroll_routes_001
 */
function createAdminPayrollRoutes(db, previewStorage, idempotencyStorage) {
  const rollbackService = new RollbackService(db);

  // Using requirePermission from middleware/permissions.js

  /**
   * GET /api/admin/payroll/debug/memory - Memory usage monitoring endpoint
   * DomainMeaning: Administrative endpoint for monitoring preview and idempotency storage memory usage
   * MisleadingNames: None
   * SideEffects: Updates memory usage calculations
   * Invariants: Only Admin can access
   * RAG_Keywords: memory monitoring, debug, storage statistics, admin endpoint
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_memory_debug_001
   */
  router.get('/debug/memory',
    requireAuth,
    requirePermission('admin:permissions'),
    asyncHandler(async (req, res) => {
      try {
        // Update current memory usage
        updateMemoryUsage(previewStorage, idempotencyStorage);
        
        // Get MongoDB temp_uploads statistics
        let mongoStats = {
          totalDocuments: 0,
          previewDocuments: 0,
          expiredDocuments: 0
        };
        
        try {
          mongoStats.totalDocuments = await db.collection('temp_uploads').countDocuments();
          mongoStats.previewDocuments = await db.collection('temp_uploads').countDocuments({ type: 'preview' });
          mongoStats.expiredDocuments = await db.collection('temp_uploads').countDocuments({
            expiresAt: { $lt: new Date() }
          });
        } catch (mongoError) {
          console.warn(`⚠️ Failed to get MongoDB statistics: ${mongoError.message}`);
        }
        
        // Get file system backup statistics
        let backupStats = {
          totalFiles: 0,
          totalSizeMB: 0,
          expiredFiles: 0
        };
        
        try {
          if (fs.existsSync(BACKUP_CONFIG.backupDir)) {
            const files = fs.readdirSync(BACKUP_CONFIG.backupDir)
              .filter(f => f.endsWith('.json'));
            
            backupStats.totalFiles = files.length;
            
            for (const file of files) {
              const filePath = path.join(BACKUP_CONFIG.backupDir, file);
              try {
                const stats = fs.statSync(filePath);
                backupStats.totalSizeMB += stats.size;
                
                // Check if expired
                const backupContent = fs.readFileSync(filePath, 'utf8');
                const backupData = JSON.parse(backupContent);
                if (new Date(backupData.expiresAt) < new Date()) {
                  backupStats.expiredFiles++;
                }
              } catch (fileError) {
                // Count corrupted files as expired
                backupStats.expiredFiles++;
              }
            }
            
            backupStats.totalSizeMB = Math.round(backupStats.totalSizeMB / 1024 / 1024 * 100) / 100;
          }
        } catch (backupError) {
          console.warn(`⚠️ Failed to get backup statistics: ${backupError.message}`);
        }
        
        // Calculate usage percentages
        const previewUsagePercent = (memoryUsage.previewSizeBytes / MEMORY_LIMITS.maxPreviewSizeBytes) * 100;
        const idempotencyUsagePercent = (memoryUsage.idempotencySizeBytes / MEMORY_LIMITS.maxIdempotencySizeBytes) * 100;
        
        const stats = {
          timestamp: new Date(),
          limits: {
            maxPreviewEntries: MEMORY_LIMITS.maxPreviewEntries,
            maxIdempotencyEntries: MEMORY_LIMITS.maxIdempotencyEntries,
            maxPreviewSizeMB: Math.round(MEMORY_LIMITS.maxPreviewSizeBytes / 1024 / 1024),
            maxIdempotencySizeMB: Math.round(MEMORY_LIMITS.maxIdempotencySizeBytes / 1024 / 1024),
            warningThresholdPercent: MEMORY_LIMITS.warningThresholdPercent
          },
          current: {
            previewEntries: previewStorage.size,
            idempotencyEntries: idempotencyStorage.size,
            previewSizeMB: Math.round(memoryUsage.previewSizeBytes / 1024 / 1024 * 100) / 100,
            idempotencySizeMB: Math.round(memoryUsage.idempotencySizeBytes / 1024 / 1024 * 100) / 100,
            previewUsagePercent: Math.round(previewUsagePercent * 100) / 100,
            idempotencyUsagePercent: Math.round(idempotencyUsagePercent * 100) / 100
          },
          history: {
            lastCleanup: new Date(memoryUsage.lastCleanup),
            totalCleanupsPerformed: memoryUsage.totalCleanupsPerformed
          },
          mongodb: {
            totalTempUploads: mongoStats.totalDocuments,
            previewDocuments: mongoStats.previewDocuments,
            expiredDocuments: mongoStats.expiredDocuments,
            ttlIndexActive: mongoStats.expiredDocuments === 0 ? 'Working' : 'Needs cleanup'
          },
          fileSystemBackup: {
            totalFiles: backupStats.totalFiles,
            totalSizeMB: backupStats.totalSizeMB,
            expiredFiles: backupStats.expiredFiles,
            maxFiles: BACKUP_CONFIG.maxBackupFiles,
            backupDir: BACKUP_CONFIG.backupDir
          },
          warnings: []
        };
        
        // Add warnings if thresholds exceeded
        if (previewUsagePercent > MEMORY_LIMITS.warningThresholdPercent) {
          stats.warnings.push({
            type: 'PREVIEW_MEMORY_HIGH',
            message: `Preview storage memory usage is ${previewUsagePercent.toFixed(1)}% of limit`,
            severity: previewUsagePercent > 95 ? 'CRITICAL' : 'WARNING'
          });
        }
        
        if (idempotencyUsagePercent > MEMORY_LIMITS.warningThresholdPercent) {
          stats.warnings.push({
            type: 'IDEMPOTENCY_MEMORY_HIGH',
            message: `Idempotency storage memory usage is ${idempotencyUsagePercent.toFixed(1)}% of limit`,
            severity: idempotencyUsagePercent > 95 ? 'CRITICAL' : 'WARNING'
          });
        }
        
        res.json({
          success: true,
          data: stats
        });
        
      } catch (error) {
        console.error('Memory debug error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get memory statistics: ' + error.message
        });
      }
    })
  );

  /**
   * GET /api/admin/payroll/rollback/status/:operationId - Get rollback status for operation
   * DomainMeaning: Retrieve rollback status and audit history for a specific operation
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Only Admin can view rollback status
   * RAG_Keywords: rollback status, audit trail, operation history
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_rollback_status_001
   */
  router.get('/rollback/status/:operationId',
    requireAuth,
    requirePermission('payroll:manage'),
    addSecurityHeaders,
    validateObjectId,
    preventNoSQLInjection,
    asyncHandler(async (req, res) => {
      try {
        const { operationId } = req.params;
        
        console.log(`🔍 Getting rollback status for operation: ${operationId}`);
        
        const status = await rollbackService.getRollbackStatus(operationId);
        
        res.json({
          success: true,
          data: status,
          message: `Rollback status retrieved for operation: ${operationId}`
        });
        
      } catch (error) {
        console.error('Get rollback status error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get rollback status: ' + error.message
        });
      }
    })
  );

  /**
   * POST /api/admin/payroll/rollback/execute - Execute rollback for failed operation
   * DomainMeaning: Manually trigger rollback using saved snapshot
   * MisleadingNames: None
   * SideEffects: Restores database to previous state, removes newer data
   * Invariants: Only Admin can execute rollback
   * RAG_Keywords: manual rollback, snapshot restore, emergency recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_rollback_execute_001
   */
  router.post('/rollback/execute',
    requireAuth,
    requirePermission('payroll:manage'),
    addSecurityHeaders,
    preventNoSQLInjection,
    strictRateLimiter, // Limit rollback operations
    asyncHandler(async (req, res) => {
      try {
        const { operationId, dryRun = false, confirmationToken } = req.body;
        
        if (!operationId) {
          return res.status(400).json({
            success: false,
            error: 'Operation ID is required for rollback'
          });
        }
        
        // For actual rollback (not dry run), require confirmation token
        if (!dryRun && !confirmationToken) {
          return res.status(400).json({
            success: false,
            error: 'Confirmation token is required for actual rollback',
            requiresConfirmation: true,
            operationId
          });
        }
        
        console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Executing rollback for operation: ${operationId}`);
        console.log(`👤 Requested by: ${req.user.name} (${req.user.id})`);
        
        const rollbackResult = await rollbackService.executeRollback(operationId, {
          dryRun,
          confirmationRequired: false,
          skipAuditLog: false
        });
        
        if (dryRun) {
          res.json({
            success: true,
            dryRun: true,
            operationId,
            plan: rollbackResult.plan,
            message: 'Rollback plan generated successfully. Review and execute with confirmation token.'
          });
        } else {
          res.json({
            success: rollbackResult.success,
            operationId,
            rollbackCompleted: rollbackResult.success,
            result: rollbackResult,
            message: rollbackResult.success 
              ? 'Rollback completed successfully'
              : 'Rollback partially completed with some failures'
          });
        }
        
      } catch (error) {
        console.error('Execute rollback error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to execute rollback: ' + error.message,
          operationId: req.body.operationId
        });
      }
    })
  );

  /**
   * DELETE /api/admin/payroll/rollback/cleanup - Clean up expired snapshots and audit logs
   * DomainMeaning: Maintenance endpoint to remove old rollback data
   * MisleadingNames: None
   * SideEffects: Removes expired snapshots and audit logs from database
   * Invariants: Only Admin can trigger cleanup
   * RAG_Keywords: maintenance, cleanup, expired data removal
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_delete_rollback_cleanup_001
   */
  router.delete('/rollback/cleanup',
    requireAuth,
    requirePermission('payroll:manage'),
    addSecurityHeaders,
    preventNoSQLInjection,
    asyncHandler(async (req, res) => {
      try {
        console.log(`🧹 Starting rollback data cleanup requested by: ${req.user.name}`);
        
        const cleanupResult = await rollbackService.cleanupExpiredData();
        
        res.json({
          success: true,
          result: cleanupResult,
          message: `Cleanup completed: ${cleanupResult.expiredSnapshotsRemoved} snapshots, ${cleanupResult.oldAuditLogsRemoved} audit logs removed`
        });
        
      } catch (error) {
        console.error('Rollback cleanup error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to cleanup rollback data: ' + error.message
        });
      }
    })
  );

  return router;
}

module.exports = createAdminPayrollRoutes;