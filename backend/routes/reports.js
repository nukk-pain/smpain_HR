const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const PayrollRepository = require('../repositories/PayrollRepository');
const PayrollDocumentRepository = require('../repositories/PayrollDocumentRepository');
const { validateObjectId } = require('../validation/schemas');
const {
  strictRateLimiter,
  validateObjectId: validateMongoId,
  preventNoSQLInjection
} = require('../middleware/payrollSecurity');
const { parseEmployeeFromFilename, extractYearMonth } = require('../utils/filenameParser');

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

        // Set response headers for PDF download with original filename
        const originalName = document.originalFileName || document.displayName || document.fileName;
        
        // Encode filename for different browsers (RFC 5987)
        const encodedFilename = encodeURIComponent(originalName);
        const asciiFilename = originalName.replace(/[^\x00-\x7F]/g, '_');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
        );
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

  // Match employees by file names for bulk payslip upload
  router.post('/payslip/match-employees', 
    requireAuth,
    requirePermission('payroll:manage'),
    asyncHandler(async (req, res) => {
      try {
        const { fileNames } = req.body;
        
        if (!fileNames || !Array.isArray(fileNames)) {
          return res.status(400).json({ error: 'File names array is required' });
        }

        // Get all active users for matching
        const users = await db.collection('users').find(
          { status: { $ne: 'inactive' } },
          { projection: { _id: 1, name: 1, employeeId: 1, department: 1 } }
        ).toArray();

        const matches = [];
        const availableUsers = users.map(u => ({
          id: u._id.toString(),
          name: u.name,
          employeeId: u.employeeId,
          department: u.department
        }));

        for (const fileInfo of fileNames) {
          const { fileName, employeeName } = fileInfo;
          
          if (!employeeName) {
            matches.push({
              fileName,
              matched: false,
              error: 'No employee name found in filename'
            });
            continue;
          }

          // Try exact match first
          let matchedUser = users.find(u => 
            u.name && u.name.toLowerCase() === employeeName.toLowerCase()
          );

          // If no exact match, try partial match
          if (!matchedUser) {
            const lowerEmployeeName = employeeName.toLowerCase();
            
            // Try to match by last name or first name
            const candidates = users.filter(u => {
              if (!u.name) return false;
              const lowerUserName = u.name.toLowerCase();
              
              // Check if employee name is contained in user name or vice versa
              return lowerUserName.includes(lowerEmployeeName) || 
                     lowerEmployeeName.includes(lowerUserName);
            });

            if (candidates.length === 1) {
              matchedUser = candidates[0];
            } else if (candidates.length > 1) {
              // Multiple candidates, need manual selection
              matches.push({
                fileName,
                matched: false,
                suggestions: candidates.map(u => ({
                  id: u._id.toString(),
                  name: u.name,
                  employeeId: u.employeeId,
                  department: u.department
                })),
                error: 'Multiple matches found, manual selection required'
              });
              continue;
            }
          }

          if (matchedUser) {
            matches.push({
              fileName,
              matched: true,
              user: {
                id: matchedUser._id.toString(),
                name: matchedUser.name,
                employeeId: matchedUser.employeeId,
                department: matchedUser.department
              }
            });
          } else {
            matches.push({
              fileName,
              matched: false,
              error: 'No matching employee found'
            });
          }
        }

        res.json({
          success: true,
          matches,
          availableUsers
        });
      } catch (error) {
        console.error('Error matching employees:', error);
        res.status(500).json({ error: 'Failed to match employees: ' + error.message });
      }
    })
  );

  // Get upload history for payslips
  router.get('/payslip/upload-history',
    requireAuth,
    requirePermission('payroll:view'),
    asyncHandler(async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 50;
        
        // Get recent upload history
        const history = await db.collection('payroll_documents').aggregate([
          {
            $match: {
              documentType: 'payslip'
            }
          },
          {
            $sort: { uploadedAt: -1 }
          },
          {
            $limit: limit
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
            $lookup: {
              from: 'users',
              localField: 'uploadedBy',
              foreignField: '_id',
              as: 'uploader'
            }
          },
          {
            $project: {
              uploadedAt: 1,
              originalFileName: 1,
              year: 1,
              month: 1,
              userName: { $arrayElemAt: ['$user.name', 0] },
              userDepartment: { $arrayElemAt: ['$user.department', 0] },
              uploadedByName: { $arrayElemAt: ['$uploader.name', 0] }
            }
          }
        ]).toArray();

        res.json({
          success: true,
          history: history
        });
      } catch (error) {
        console.error('Error fetching upload history:', error);
        res.status(500).json({ 
          error: 'Failed to fetch upload history: ' + error.message 
        });
      }
    })
  );

  // Bulk upload payslips with unique ID system to handle Korean filenames
  const bulkPayslipUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/temp/');
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Generate unique ID for physical storage
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const safeFilename = `payslip_${timestamp}_${uniqueId}.pdf`;
        
        // Store original filename metadata in request for later use
        if (!req.fileMetadata) {
          req.fileMetadata = [];
        }
        req.fileMetadata.push({
          uniqueId: safeFilename,
          originalName: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype
        });
        
        cb(null, safeFilename);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 50 // Maximum 50 files
    },
    fileFilter: (req, file, cb) => {
      // Validate PDF files
      const isPdf = file.mimetype === 'application/pdf' || 
                    path.extname(file.originalname).toLowerCase() === '.pdf';
      if (!isPdf) {
        return cb(new Error('Only PDF files are allowed'), false);
      }
      cb(null, true);
    }
  });

  router.post('/payslip/bulk-upload',
    requireAuth,
    requirePermission('payroll:manage'),
    bulkPayslipUpload.array('payslips', 50),
    asyncHandler(async (req, res) => {
      try {
        console.log('📥 Bulk upload request received');
        console.log('Request body keys:', Object.keys(req.body));
        console.log('Files received:', req.files?.length || 0);
        console.log('File metadata:', req.fileMetadata);
        
        const { mappings } = req.body;
        const files = req.files;
        const fileMetadata = req.fileMetadata || [];

        if (!files || files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }

        if (!mappings) {
          // Clean up uploaded files
          for (const file of files) {
            try {
              await fs.promises.unlink(file.path);
            } catch (err) {
              console.error('Error deleting file:', err);
            }
          }
          return res.status(400).json({ error: 'Mappings are required' });
        }

        console.log('Raw mappings:', mappings);
        const parsedMappings = JSON.parse(mappings);
        console.log('Parsed mappings:', parsedMappings);
        const uploadResults = [];
        let successCount = 0;
        let errorCount = 0;

        // Process files in parallel batches for better performance
        const BATCH_SIZE = 5; // Process 5 files at a time
        const fileGroups = [];
        
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          fileGroups.push(files.slice(i, i + BATCH_SIZE));
        }

        for (let groupIndex = 0; groupIndex < fileGroups.length; groupIndex++) {
          const fileGroup = fileGroups[groupIndex];
          const batchPromises = fileGroup.map(async (file, fileIndex) => {
            // Calculate the overall file index
            const overallIndex = groupIndex * BATCH_SIZE + fileIndex;
            const metadata = fileMetadata[overallIndex] || {};
            
            // IMPORTANT: Use the mapping by index since file order is preserved
            // The mapping at index N corresponds to the file at index N
            const mapping = parsedMappings[overallIndex];
            
            // Use the original filename from the mapping (which is not corrupted)
            const originalFilename = mapping ? mapping.fileName : (metadata.originalName || file.originalname);
            
            console.log(`📁 Processing file #${overallIndex + 1}: ${originalFilename}`);
            console.log(`   Stored as: ${file.filename}`);
            console.log(`   Mapping:`, mapping);
            
            if (!mapping || !mapping.userId) {
              console.log(`❌ No mapping or userId for file #${overallIndex + 1}`);
              // Clean up file if no mapping found
              try {
                await fs.promises.unlink(file.path);
              } catch (err) {
                console.error('Error deleting unmapped file:', err);
              }
              return {
                fileName: originalFilename,
                success: false,
                error: 'No mapping or userId found for file'
              };
            }

            try {
            // Parse year and month from yearMonth (format: YYYYMM or YYYYMMDD)
            let year, month;
            if (mapping.yearMonth) {
              year = parseInt(mapping.yearMonth.substring(0, 4));
              month = parseInt(mapping.yearMonth.substring(4, 6));
            } else {
              // Default to current year/month if not provided
              const now = new Date();
              year = now.getFullYear();
              month = now.getMonth() + 1;
            }

            // Check if user exists
            const user = await db.collection('users').findOne({ 
              _id: new ObjectId(mapping.userId) 
            });

            if (!user) {
              throw new Error('User not found');
            }

            // Check for existing payslip for the same user and month
            const existingPayslip = await db.collection('payroll_documents').findOne({
              userId: new ObjectId(mapping.userId),
              year: year,
              month: month,
              documentType: 'payslip'
            });

            if (existingPayslip) {
              // Mark as duplicate but continue with other files
              errorCount++;
              
              // Clean up the uploaded file
              try {
                await fs.promises.unlink(file.path);
              } catch (err) {
                console.error('Error deleting duplicate file:', err);
              }
              
              return {
                fileName: originalFilename,
                success: false,
                error: `급여명세서가 이미 존재합니다 (${user.name}, ${year}년 ${month}월)`,
                isDuplicate: true
              };
            }

            // Use the unique filename already generated by multer
            const uniqueFileName = file.filename; // This is the safe filename from multer
            const destinationDir = path.join(__dirname, '../uploads/payslips/');
            
            // Ensure destination directory exists
            if (!fs.existsSync(destinationDir)) {
              fs.mkdirSync(destinationDir, { recursive: true });
            }
            
            const destinationPath = path.join(destinationDir, uniqueFileName);

            // Move file to permanent location
            await fs.promises.rename(file.path, destinationPath);

            // Parse employee info from original filename
            const parsedInfo = parseEmployeeFromFilename(originalFilename);
            
            // Save document record with both unique ID and original filename
            const documentRecord = {
              userId: new ObjectId(mapping.userId),
              uniqueId: uniqueFileName,  // Unique ID for physical storage
              fileName: uniqueFileName,   // Keep for backward compatibility
              originalFileName: originalFilename,  // Original Korean filename
              displayName: originalFilename,  // For UI display
              filePath: destinationPath,
              fileSize: file.size,
              mimeType: metadata.mimetype || file.mimetype || 'application/pdf',
              year,
              month,
              uploadedAt: new Date(),
              uploadedBy: new ObjectId(req.user.id || req.user._id),
              uploadedByName: req.user.username,
              userName: user.name,
              employeeId: user.employeeId,
              department: user.department,
              documentType: 'payslip',
              metadata: {
                encoding: metadata.encoding,
                yearMonth: mapping.yearMonth,
                parsedEmployeeName: parsedInfo.name,
                parsedCompany: parsedInfo.company,
                parsedEmploymentType: parsedInfo.employmentType,
                parsedYearMonth: parsedInfo.yearMonth
              }
            };

            await documentRepo.createDocument(documentRecord);

              console.log(`✅ Payslip uploaded: ${originalFilename} for ${user.name} (${year}-${month})`);
              console.log(`   Stored as: ${uniqueFileName}`);
              
              return {
                fileName: originalFilename,
                success: true,
                uniqueId: uniqueFileName,
                userId: mapping.userId,
                userName: user.name
              };

            } catch (error) {
              console.error(`Error uploading payslip ${originalFilename}:`, error);
              
              // Clean up file on error
              try {
                await fs.promises.unlink(file.path);
              } catch (err) {
                console.error('Error deleting file after error:', err);
              }

              return {
                fileName: originalFilename,
                success: false,
                error: error.message
              };
            }
          });

          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Process results
          batchResults.forEach(result => {
            uploadResults.push(result);
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
            }
          });
        }

        res.json({
          success: true,
          uploadedCount: successCount,
          errorCount,
          results: uploadResults
        });

      } catch (error) {
        console.error('Bulk upload error:', error);
        
        // Clean up all uploaded files on error
        if (req.files) {
          for (const file of req.files) {
            try {
              await fs.promises.unlink(file.path);
            } catch (err) {
              console.error('Error deleting file:', err);
            }
          }
        }

        res.status(500).json({ 
          error: 'Failed to process bulk upload: ' + error.message 
        });
      }
    })
  );

  /**
   * GET /api/reports/payslip/download/:documentId - Download PDF payslip by document ID
   * DomainMeaning: Download PDF payslip with original Korean filename restoration
   * MisleadingNames: None
   * SideEffects: Logs download access, streams file content with UTF-8 filename
   * Invariants: Users can only download their own payslips unless admin
   * RAG_Keywords: pdf download, korean filename, utf-8 encoding, unique id system
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_payslip_by_docid_001
   */
  router.get('/payslip/download/:documentId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { documentId } = req.params;
      
      try {
        // Get document from database
        const document = await db.collection('payroll_documents').findOne({
          _id: new ObjectId(documentId)
        });
        
        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }
        
        // Check permissions
        const isOwner = document.userId.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin' || req.user.role === 'Admin';
        const hasPermission = req.user.permissions?.includes('payroll:view');
        
        if (!isOwner && !isAdmin && !hasPermission) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        // Check file exists
        if (!fs.existsSync(document.filePath)) {
          console.error(`File not found: ${document.filePath}`);
          return res.status(404).json({ error: 'File not found on server' });
        }
        
        // Set headers for download with original filename
        const originalName = document.originalFileName || document.displayName || document.fileName || 'payslip.pdf';
        
        // Encode filename for different browsers (RFC 5987)
        const encodedFilename = encodeURIComponent(originalName);
        const asciiFilename = originalName.replace(/[^\x00-\x7F]/g, '_');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
        );
        res.setHeader('Content-Length', document.fileSize);
        
        // Stream file to response
        const fileStream = fs.createReadStream(document.filePath);
        fileStream.pipe(res);
        
        fileStream.on('end', () => {
          console.log(`📄 Payslip downloaded: ${originalName} (stored as: ${document.uniqueId || document.fileName}) by ${req.user.username}`);
        });
        
        fileStream.on('error', (error) => {
          console.error('File stream error:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
          }
        });
        
      } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
      }
    })
  );

  return router;
}

module.exports = createReportsRoutes;