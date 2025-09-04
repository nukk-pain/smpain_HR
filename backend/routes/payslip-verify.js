const express = require('express');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { requireAuth, requirePermission } = require('../middleware/permissions');
const { asyncHandler } = require('../middleware/errorHandler');

// Create payslip verify routes
function createPayslipVerifyRoutes(db) {
  const router = express.Router();

  // Verify payslip upload status
  router.get('/verify-status', 
    requireAuth,
    requirePermission('payroll:view'),
    asyncHandler(async (req, res) => {
    
    try {
      // 1. Check database records from unified collection
      const dbDocuments = await db.collection('unified_documents')
        .find({ documentType: 'payslip' })
        .sort({ 'audit.uploadedAt': -1 })
        .limit(10)
        .toArray();
      
      // 2. Check file system
      const uploadsDir = path.join(__dirname, '../uploads/payslips');
      let fileSystemFiles = [];
      
      if (fs.existsSync(uploadsDir)) {
        fileSystemFiles = fs.readdirSync(uploadsDir).map(file => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            size: stats.size,
            modified: stats.mtime
          };
        });
      }
      
      // 3. Check data integrity
      const missingFiles = [];
      const validFiles = [];
      
      for (const doc of dbDocuments) {
        // Build file path from unified schema
        const filePath = doc.file?.path || 
          (doc.file?.systemName ? path.join(__dirname, '../uploads/payslips/', doc.file.systemName) : null);
        
        const fileExists = filePath && fs.existsSync(filePath);
        const fileName = doc.file?.originalName || doc.file?.systemName || 'unknown';
        const uploadedAt = doc.audit?.uploadedAt || doc.audit?.createdAt;
        
        if (fileExists) {
          validFiles.push({
            id: doc._id,
            fileName: fileName,
            uploadedAt: uploadedAt,
            status: 'valid'
          });
        } else {
          missingFiles.push({
            id: doc._id,
            fileName: fileName,
            uploadedAt: uploadedAt,
            status: 'missing_file'
          });
        }
      }
      
      // 4. Calculate statistics
      const stats = {
        totalDbRecords: dbDocuments.length,
        totalFiles: fileSystemFiles.length,
        validUploads: validFiles.length,
        missingFiles: missingFiles.length,
        lastUploadTime: dbDocuments.length > 0 ? 
          (dbDocuments[0].audit?.uploadedAt || dbDocuments[0].audit?.createdAt) : null
      };
      
      res.json({
        success: true,
        stats,
        recentUploads: validFiles.slice(0, 5),
        missingFiles,
        fileSystemFiles: fileSystemFiles.slice(0, 5)
      });
      
    } catch (error) {
      console.error('Error verifying upload status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify upload status'
      });
    }
    })
  );

  // Get detailed upload statistics
  router.get('/statistics',
    requireAuth,
    requirePermission('payroll:view'),
    asyncHandler(async (req, res) => {
    
    try {
      // Get statistics by month from unified collection
      const monthlyStats = await db.collection('unified_documents').aggregate([
        {
          $match: { documentType: 'payslip' }
        },
        {
          $group: {
            _id: {
              year: '$temporal.year',
              month: '$temporal.month'
            },
            count: { $sum: 1 },
            totalSize: { $sum: '$file.size' }
          }
        },
        {
          $sort: { '_id.year': -1, '_id.month': -1 }
        },
        {
          $limit: 12
        }
      ]).toArray();
      
      // Get statistics by user from unified collection
      const userStats = await db.collection('unified_documents').aggregate([
        {
          $match: { documentType: 'payslip' }
        },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
            lastUpload: { $max: '$audit.uploadedAt' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            userId: '$_id',
            userName: { $arrayElemAt: ['$user.name', 0] },
            count: 1,
            lastUpload: 1
          }
        },
        {
          $sort: { lastUpload: -1 }
        },
        {
          $limit: 20
        }
      ]).toArray();
      
      res.json({
        success: true,
        monthlyStats,
        userStats
      });
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
    })
  );

  return router;
}

module.exports = createPayslipVerifyRoutes;