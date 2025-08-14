const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PayrollRepository = require('../repositories/PayrollRepository');
const PayrollDocumentRepository = require('../repositories/PayrollDocumentRepository');
const { validateObjectId } = require('../validation/schemas');
const {
  strictRateLimiter,
  validateObjectId: validateMongoId,
  preventNoSQLInjection
} = require('../middleware/payrollSecurity');

const router = express.Router();

// Reports routes
function createReportsRoutes(db) {
  const payrollRepo = new PayrollRepository();
  const documentRepo = new PayrollDocumentRepository();

  // Configure multer for PDF payslip uploads
  const payslipUpload = multer({
    dest: 'uploads/payslips/',
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['application/pdf'];
      const allowedExtensions = ['.pdf'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
      }
    }
  });

  // Permission middleware with role-based fallback
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userPermissions = req.user.permissions || [];
      const userRole = req.user.role;
      
      // Admin role has all permissions
      if (userRole === 'admin' || userRole === 'Admin') {
        return next();
      }
      
      // Check specific permission in user's permissions array
      if (userPermissions.includes(permission)) {
        return next();
      }

      // If user doesn't have explicit permission, check if their role should have it
      const roleBasedPermissions = {
        user: ['leave:view'],
        manager: ['leave:view', 'leave:manage', 'users:view', 'reports:view', 'reports:export'],
        supervisor: ['leave:view', 'leave:manage', 'users:view', 'reports:view', 'reports:export'],
        admin: ['users:view', 'users:manage', 'users:create', 'users:edit', 'users:delete',
                 'leave:view', 'leave:manage', 'payroll:view', 'payroll:manage',
                 'reports:view', 'files:view', 'files:manage', 'departments:view',
                 'departments:manage', 'admin:permissions']
      };

      const rolePermissions = roleBasedPermissions[userRole.toLowerCase()] || [];
      if (rolePermissions.includes(permission)) {
        return next();
      }
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    };
  };

  // Generate payroll report data (queries both collections)
  router.get('/payroll/:year_month', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;
      
      // Parse year and month from year_month string (e.g., "2025-06")
      const [yearStr, monthStr] = year_month.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      // Query from monthlyPayments collection (old system)
      const monthlyPayrollReport = await db.collection('monthlyPayments').aggregate([
        { $match: { yearMonth: year_month } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'salesData',
            let: { userId: '$userId', yearMonth: '$yearMonth' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$yearMonth', '$$yearMonth'] }
                    ]
                  }
                }
              }
            ],
            as: 'salesData'
          }
        },
        {
          $lookup: {
            from: 'bonuses',
            let: { userId: '$userId', yearMonth: '$yearMonth' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$yearMonth', '$$yearMonth'] }
                    ]
                  }
                }
              }
            ],
            as: 'bonuses'
          }
        },
        {
          $project: {
            employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
            name: { $arrayElemAt: ['$user.name', 0] },
            department: { $arrayElemAt: ['$user.department', 0] },
            position: { $arrayElemAt: ['$user.position', 0] },
            yearMonth: '$yearMonth',
            baseSalary: '$baseSalary',
            incentive: '$incentive',
            bonus: '$bonus',
            award: '$award',
            totalInput: '$totalInput',
            actualPayment: '$actualPayment',
            difference: '$difference',
            salesAmount: { $arrayElemAt: ['$salesData.salesAmount', 0] },
            bonusDetails: '$bonuses'
          }
        },
        { $sort: { name: 1 } }
      ]).toArray();

      
      // Query from payroll collection (new system from Excel uploads)
      const newPayrollReport = await db.collection('payroll').aggregate([
        { $match: { year, month } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
            name: { $arrayElemAt: ['$user.name', 0] },
            department: { $arrayElemAt: ['$user.department', 0] },
            position: { $arrayElemAt: ['$user.position', 0] },
            yearMonth: { $literal: year_month }, // Add for consistency
            baseSalary: '$baseSalary',
            incentive: { $ifNull: ['$allowances.incentive', 0] },
            bonus: { $literal: 0 }, // Not in new schema
            award: { $literal: 0 }, // Not in new schema  
            totalInput: {
              $add: [
                '$baseSalary',
                { $ifNull: ['$allowances.incentive', 0] },
                { $ifNull: ['$allowances.meal', 0] },
                { $ifNull: ['$allowances.transportation', 0] },
                { $ifNull: ['$allowances.childCare', 0] },
                { $ifNull: ['$allowances.overtime', 0] },
                { $ifNull: ['$allowances.nightShift', 0] },
                { $ifNull: ['$allowances.holidayWork', 0] },
                { $ifNull: ['$allowances.other', 0] }
              ]
            },
            actualPayment: '$netSalary',
            difference: { $subtract: ['$netSalary', '$baseSalary'] },
            salesAmount: { $literal: 0 }, // Not tracked in new system
            bonusDetails: { $literal: [] }
          }
        },
        { $sort: { name: 1 } }
      ]).toArray();
      
      // Combine results from both collections
      const combinedPayrollReport = [...monthlyPayrollReport, ...newPayrollReport];
      
      // Calculate summary statistics
      const summary = {
        totalEmployees: combinedPayrollReport.length,
        totalBaseSalary: combinedPayrollReport.reduce((sum, p) => sum + (p.baseSalary || 0), 0),
        totalIncentive: combinedPayrollReport.reduce((sum, p) => sum + (p.incentive || 0), 0),
        totalBonus: combinedPayrollReport.reduce((sum, p) => sum + (p.bonus || 0), 0),
        totalAward: combinedPayrollReport.reduce((sum, p) => sum + (p.award || 0), 0),
        totalPayroll: combinedPayrollReport.reduce((sum, p) => sum + (p.actualPayment || 0), 0),
        avgSalary: combinedPayrollReport.length > 0 ? 
          Math.round(combinedPayrollReport.reduce((sum, p) => sum + (p.actualPayment || 0), 0) / combinedPayrollReport.length) : 0
      };

      res.json({
        success: true,
        data: {
          reportData: combinedPayrollReport,
          summary,
          generatedAt: new Date(),
          generatedBy: req.user.name,
          yearMonth: year_month
        }
      });

    } catch (error) {
      console.error('Generate payroll report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Download payroll report as Excel (mock implementation)
  router.get('/payroll/:year_month/excel', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;

      // In a real implementation, you would generate an actual Excel file here
      // For now, we'll return a mock response
      const mockExcelData = Buffer.from('Mock Excel Data for ' + year_month);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payroll_${year_month}.xlsx"`,
        'Content-Length': mockExcelData.length
      });

      res.send(mockExcelData);

    } catch (error) {
      console.error('Download payroll report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Download comparison report
  router.get('/comparison/:upload_id/:year_month/excel', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { upload_id, year_month } = req.params;

      // Get upload data
      const upload = await db.collection('payrollUploads').findOne({ _id: new ObjectId(upload_id) });
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      // Mock comparison Excel file
      const mockExcelData = Buffer.from(`Mock Comparison Report: Upload ${upload_id} vs ${year_month}`);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="comparison_${upload_id}_${year_month}.xlsx"`,
        'Content-Length': mockExcelData.length
      });

      res.send(mockExcelData);

    } catch (error) {
      console.error('Download comparison report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Download payslip for individual employee
  router.get('/payslip/:userId/:year_month/excel', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { userId, year_month } = req.params;
      const currentUser = req.user;

      // Check permissions - users can only download their own payslip
      if (currentUser.role === 'user' && currentUser.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get employee payroll data
      const payrollData = await db.collection('monthlyPayments').findOne({
        userId: new ObjectId(userId),
        yearMonth: year_month
      });

      if (!payrollData) {
        return res.status(404).json({ error: 'Payroll data not found' });
      }

      // Get employee info
      const employee = await db.collection('users').findOne({ _id: new ObjectId(userId) });

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Mock payslip Excel file
      const mockExcelData = Buffer.from(`Mock Payslip for ${employee.name} - ${year_month}`);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payslip_${employee.name}_${year_month}.xlsx"`,
        'Content-Length': mockExcelData.length
      });

      res.send(mockExcelData);

    } catch (error) {
      console.error('Download payslip error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Leave report
  router.get('/leave/:year_month', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;

      const leaveReport = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            $expr: {
              $eq: [
                { $dateToString: { format: '%Y-%m', date: '$startDate' } },
                year_month
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
            name: { $arrayElemAt: ['$user.name', 0] },
            department: { $arrayElemAt: ['$user.department', 0] },
            leaveType: '$leaveType',
            startDate: '$startDate',
            endDate: '$endDate',
            totalDays: '$totalDays',
            status: '$status',
            reason: '$reason',
            submittedAt: '$submittedAt'
          }
        },
        { $sort: { submittedAt: -1 } }
      ]).toArray();

      // Calculate leave statistics
      const stats = {
        totalRequests: leaveReport.length,
        approvedRequests: leaveReport.filter(r => r.status === 'approved').length,
        pendingRequests: leaveReport.filter(r => r.status === 'pending').length,
        rejectedRequests: leaveReport.filter(r => r.status === 'rejected').length,
        totalDaysTaken: leaveReport
          .filter(r => r.status === 'approved')
          .reduce((sum, r) => sum + (r.totalDays || 0), 0),
        leaveTypeBreakdown: leaveReport.reduce((acc, r) => {
          acc[r.leaveType] = (acc[r.leaveType] || 0) + 1;
          return acc;
        }, {})
      };

      res.json({
        success: true,
        data: {
          reportData: leaveReport,
          statistics: stats,
          generatedAt: new Date(),
          yearMonth: year_month
        }
      });

    } catch (error) {
      console.error('Generate leave report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  /**
   * POST /api/reports/payroll/:id/payslip/upload - Upload PDF payslip for payroll record
   * DomainMeaning: Upload and store PDF payslip document for specific payroll record
   * MisleadingNames: None
   * SideEffects: Stores PDF file, creates document record in database
   * Invariants: Only Admin can upload, validates payroll record exists
   * RAG_Keywords: pdf upload, payslip document, file storage, admin permissions
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_payslip_upload_001
   */
  router.post('/payroll/:id/payslip/upload', 
    requireAuth, 
    requirePermission('payroll:manage'), 
    validateMongoId,
    strictRateLimiter,
    preventNoSQLInjection,
    (req, res, next) => {
      payslipUpload.single('payslip')(req, res, (err) => {
        if (err) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'File size too large. Maximum size is 5MB.'
            });
          }
          if (err.message.includes('Invalid file type')) {
            return res.status(400).json({
              success: false,
              error: 'Invalid file type. Only PDF files are allowed.'
            });
          }
          return res.status(400).json({
            success: false,
            error: err.message
          });
        }
        next();
      });
    },
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;

        // Check if payroll record exists
        const payrollRecord = await payrollRepo.findById(id);
        if (!payrollRecord) {
          return res.status(404).json({
            success: false,
            error: 'Payroll record not found'
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file uploaded. Please select a PDF file.'
          });
        }

        console.log(`📄 Processing uploaded payslip: ${req.file.originalname}`);

        // Get user information for the payroll record
        const userCollection = db.collection('users');
        const user = await userCollection.findOne({ _id: payrollRecord.userId });

        // Create document record
        const documentData = {
          payrollId: new ObjectId(id),
          userId: payrollRecord.userId,
          year: payrollRecord.year,
          month: payrollRecord.month,
          documentType: 'payslip',
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          uploadedBy: new ObjectId(req.user.id)
        };

        const documentResult = await documentRepo.createDocument(documentData);

        res.json({
          success: true,
          message: 'Payslip uploaded successfully',
          documentId: documentResult._id,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          payrollRecord: {
            id: payrollRecord._id,
            employeeName: user?.name || 'Unknown',
            year: payrollRecord.year,
            month: payrollRecord.month,
            paymentStatus: payrollRecord.paymentStatus
          },
          uploadedAt: new Date(),
          uploadedBy: req.user.name
        });

        console.log(`✅ Payslip uploaded: ${req.file.originalname} for ${user?.name || 'Unknown'} (${payrollRecord.year}-${payrollRecord.month})`);

      } catch (error) {
        console.error('Payslip upload error:', error);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        if (error.message.includes('Invalid file type')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type. Only PDF files are allowed.'
          });
        }

        res.status(500).json({
          success: false,
          error: 'Failed to upload payslip: ' + error.message
        });
      }
    })
  );

  /**
   * GET /api/reports/payroll/:id/payslip - Download PDF payslip for payroll record
   * DomainMeaning: Download PDF payslip document with access control and audit logging
   * MisleadingNames: None
   * SideEffects: Logs download access, streams file content
   * Invariants: Users can only download their own payslips, Admin can download any
   * RAG_Keywords: pdf download, payslip access, file streaming, access control
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_payslip_download_001
   */
  router.get('/payroll/:id/payslip', requireAuth, requirePermission('payroll:view'), validateObjectId,
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        // Check if payroll record exists
        const payrollRecord = await payrollRepo.findById(id);
        if (!payrollRecord) {
          return res.status(404).json({
            success: false,
            error: 'Payroll record not found'
          });
        }

        // Check permissions - users can only download their own payslips
        if ((userRole === 'user' || userRole === 'User') && 
            payrollRecord.userId.toString() !== currentUserId) {
          return res.status(403).json({ 
            success: false,
            error: 'Access denied. You can only download your own payslips.' 
          });
        }

        // Find the payslip document for this payroll record
        const payslipDocument = await documentRepo.findByPayrollId(id);
        if (!payslipDocument || payslipDocument.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Payslip not found for this payroll record'
          });
        }

        // Get the most recent payslip (in case there are multiple)
        const document = payslipDocument.sort((a, b) => 
          new Date(b.uploadedAt) - new Date(a.uploadedAt)
        )[0];

        // Check if file exists
        if (!fs.existsSync(document.filePath)) {
          return res.status(404).json({
            success: false,
            error: 'Payslip file not found on server'
          });
        }

        // Log the download access
        await documentRepo.logAccess(document._id, req.user.id, 'downloaded');

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Length', document.fileSize);

        // Stream the file
        const fileStream = fs.createReadStream(document.filePath);
        fileStream.pipe(res);

        fileStream.on('end', () => {
          console.log(`📄 Payslip downloaded: ${document.fileName} by ${req.user.name}`);
        });

        fileStream.on('error', (error) => {
          console.error('File stream error:', error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Failed to download payslip file'
            });
          }
        });

      } catch (error) {
        console.error('Payslip download error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to download payslip: ' + error.message
        });
      }
    })
  );

  /**
   * DELETE /api/reports/payroll/:id/payslip - Delete PDF payslip for payroll record
   * DomainMeaning: Delete PDF payslip document with audit logging (Admin only)
   * MisleadingNames: None
   * SideEffects: Deletes document record, removes physical file, logs deletion
   * Invariants: Only Admin can delete, validates payroll record exists
   * RAG_Keywords: pdf delete, payslip removal, admin permissions, audit logging
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_delete_payslip_001
   */
  router.delete('/payroll/:id/payslip', requireAuth, requirePermission('payroll:manage'), validateObjectId,
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;

        // Check if payroll record exists
        const payrollRecord = await payrollRepo.findById(id);
        if (!payrollRecord) {
          return res.status(404).json({
            success: false,
            error: 'Payroll record not found'
          });
        }

        // Find the payslip document for this payroll record
        const payslipDocuments = await documentRepo.findByPayrollId(id);
        if (!payslipDocuments || payslipDocuments.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Payslip not found for this payroll record'
          });
        }

        // Get the most recent payslip (in case there are multiple)
        const document = payslipDocuments.sort((a, b) => 
          new Date(b.uploadedAt) - new Date(a.uploadedAt)
        )[0];

        // Log the deletion attempt
        await documentRepo.logAccess(document._id, req.user.id, 'delete_requested');

        // Delete physical file (gracefully handle missing files)
        let fileDeleted = false;
        if (fs.existsSync(document.filePath)) {
          try {
            fs.unlinkSync(document.filePath);
            fileDeleted = true;
            console.log(`🗑️ Physical file deleted: ${document.filePath}`);
          } catch (fileError) {
            console.warn(`Warning: Could not delete physical file ${document.filePath}:`, fileError.message);
            // Continue with database deletion even if file deletion fails
          }
        } else {
          console.warn(`Warning: Physical file not found: ${document.filePath}`);
        }

        // Log the successful deletion before removing the document
        await documentRepo.logAccess(document._id, req.user.id, 'deleted');

        // Delete document record from database
        await documentRepo.delete(document._id);

        // Get user information for response
        const userCollection = db.collection('users');
        const user = await userCollection.findOne({ _id: payrollRecord.userId });

        res.json({
          success: true,
          message: 'Payslip deleted successfully',
          deletedDocument: {
            id: document._id,
            fileName: document.fileName,
            fileSize: document.fileSize,
            payrollRecord: {
              id: payrollRecord._id,
              employeeName: user?.name || 'Unknown',
              year: payrollRecord.year,
              month: payrollRecord.month,
              paymentStatus: payrollRecord.paymentStatus
            }
          },
          fileDeleted: fileDeleted,
          deletedBy: req.user.name,
          deletedAt: new Date()
        });

        console.log(`✅ Payslip deleted: ${document.fileName} for ${user?.name || 'Unknown'} (${payrollRecord.year}-${payrollRecord.month})`);

      } catch (error) {
        console.error('Payslip deletion error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete payslip: ' + error.message
        });
      }
    })
  );

  return router;
}

module.exports = createReportsRoutes;