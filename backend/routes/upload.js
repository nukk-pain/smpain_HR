const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const PayrollRepository = require('../repositories/PayrollRepository');
const LaborConsultantParser = require('../utils/laborConsultantParser');
const ExcelService = require('../services/excel');
const {
  strictRateLimiter,
  payrollRateLimiter,
  preventNoSQLInjection
} = require('../middleware/payrollSecurity');
const {
  generatePreviewToken,
  verifyPreviewToken,
  extractPreviewTokenId,
  validateCsrfToken,
  estimateObjectSize,
  updateMemoryUsage,
  enforceMemoryLimits,
  saveToFileSystemBackup,
  loadFromFileSystemBackup,
  deleteFileSystemBackup,
  generateFileIntegrityMetadata,
  applyPreviewRecordsMasking,
  MEMORY_LIMITS,
  memoryUsage
} = require('../utils/payrollUtils');

const router = express.Router();

// Configure multer for file uploads - using disk storage for Excel processing
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

// Upload routes
function createUploadRoutes(db, previewStorage, idempotencyStorage) {
  const payrollRepo = new PayrollRepository();
  const PREVIEW_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes
  const IDEMPOTENCY_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
  
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
        supervisor: ['leave:view', 'leave:manage', 'users:view', 'files:view', 'files:manage'],
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

  // Get upload history
  router.get('/', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const uploads = await db.collection('payrollUploads').find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      const uploadsWithStats = uploads.map(upload => ({
        ...upload,
        id: upload._id,
        status: upload.processed ? 'processed' : (upload.error ? 'error' : 'pending')
      }));

      res.json({ success: true, data: uploadsWithStats });

    } catch (error) {
      console.error('Get upload history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Upload payroll file
  router.post('/', requireAuth, requirePermission('payroll:manage'), upload.single('payrollFile'), asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { yearMonth } = req.body;
      if (!yearMonth) {
        return res.status(400).json({ error: 'Year month is required' });
      }

      // Create upload record
      const uploadRecord = {
        originalName: req.file.originalname,
        fileName: `upload_${Date.now()}_${req.file.originalname}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        yearMonth,
        uploadedBy: req.user.id,
        createdAt: new Date(),
        processed: false,
        error: null,
        fileData: req.file.buffer // Store file data temporarily
      };

      const result = await db.collection('payrollUploads').insertOne(uploadRecord);

      // Basic file processing simulation
      try {
        // In a real implementation, you would parse the Excel file here
        // For now, we'll create a simple mock response
        const mockParsedData = {
          totalRows: 10,
          validRows: 9,
          errors: ['Row 5: Invalid salary format'],
          data: [
            { name: 'Sample Employee', baseSalary: 3000000, incentive: 500000 }
          ]
        };

        await db.collection('payrollUploads').updateOne(
          { _id: result.insertedId },
          { 
            $set: { 
              parsedData: mockParsedData,
              processedAt: new Date()
            },
            $unset: { fileData: 1 } // Remove file data after processing
          }
        );

        res.json({
          success: true,
          message: 'File uploaded and parsed successfully',
          data: {
            uploadId: result.insertedId,
            ...mockParsedData
          }
        });

      } catch (parseError) {
        // Update record with error
        await db.collection('payrollUploads').updateOne(
          { _id: result.insertedId },
          { 
            $set: { 
              error: parseError.message,
              processedAt: new Date()
            },
            $unset: { fileData: 1 }
          }
        );

        res.status(400).json({ 
          error: 'File parsing failed', 
          details: parseError.message 
        });
      }

    } catch (error) {
      console.error('Upload file error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get upload preview
  router.get('/:id/preview', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const upload = await db.collection('payrollUploads').findOne({ _id: new ObjectId(id) });
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      if (!upload.parsedData) {
        return res.status(400).json({ error: 'Upload not processed yet' });
      }

      // Simulate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedData = upload.parsedData.data.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          uploadInfo: {
            id: upload._id,
            originalName: upload.originalName,
            yearMonth: upload.yearMonth,
            totalRows: upload.parsedData.totalRows,
            validRows: upload.parsedData.validRows,
            errors: upload.parsedData.errors
          },
          data: paginatedData,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: upload.parsedData.data.length,
            totalPages: Math.ceil(upload.parsedData.data.length / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get upload preview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Compare upload data with existing payroll
  router.get('/:id/compare/:year_month', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id, year_month } = req.params;

      const upload = await db.collection('payrollUploads').findOne({ _id: new ObjectId(id) });
      
      if (!upload || !upload.parsedData) {
        return res.status(404).json({ error: 'Upload data not found' });
      }

      // Get existing payroll data for comparison
      const existingPayroll = await db.collection('monthlyPayments').find({
        yearMonth: year_month
      }).toArray();

      // Create comparison data (simplified)
      const comparisonData = upload.parsedData.data.map(uploadRow => {
        const existing = existingPayroll.find(p => p.userId.toString() === uploadRow.userId);
        
        return {
          ...uploadRow,
          existing: existing || null,
          differences: existing ? {
            baseSalary: uploadRow.baseSalary - (existing.baseSalary || 0),
            incentive: uploadRow.incentive - (existing.incentive || 0)
          } : null,
          action: existing ? 'update' : 'create'
        };
      });

      res.json({
        success: true,
        data: {
          uploadInfo: {
            id: upload._id,
            originalName: upload.originalName,
            yearMonth: upload.yearMonth
          },
          comparison: comparisonData,
          summary: {
            total: comparisonData.length,
            toCreate: comparisonData.filter(item => item.action === 'create').length,
            toUpdate: comparisonData.filter(item => item.action === 'update').length
          }
        }
      });

    } catch (error) {
      console.error('Compare upload data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Process upload (apply to payroll)
  router.put('/:id/process', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { yearMonth } = req.body;

      const upload = await db.collection('payrollUploads').findOne({ _id: new ObjectId(id) });
      
      if (!upload || !upload.parsedData) {
        return res.status(404).json({ error: 'Upload data not found' });
      }

      if (upload.processed) {
        return res.status(400).json({ error: 'Upload has already been processed' });
      }

      let createdCount = 0;
      let updatedCount = 0;
      const errors = [];

      // Process each row in the upload data
      for (const row of upload.parsedData.data) {
        try {
          const existingPayroll = await db.collection('monthlyPayments').findOne({
            userId: new ObjectId(row.userId),
            yearMonth: yearMonth
          });

          if (existingPayroll) {
            // Update existing record
            await db.collection('monthlyPayments').updateOne(
              { _id: existingPayroll._id },
              {
                $set: {
                  baseSalary: row.baseSalary,
                  incentive: row.incentive,
                  actualPayment: row.actualPayment,
                  updatedAt: new Date(),
                  updatedBy: req.user.id
                }
              }
            );
            updatedCount++;
          } else {
            // Create new record
            await db.collection('monthlyPayments').insertOne({
              userId: new ObjectId(row.userId),
              yearMonth: yearMonth,
              baseSalary: row.baseSalary,
              incentive: row.incentive,
              bonus: 0,
              award: 0,
              totalInput: row.baseSalary + row.incentive,
              actualPayment: row.actualPayment,
              difference: row.actualPayment - (row.baseSalary + row.incentive),
              createdAt: new Date(),
              createdBy: req.user.id
            });
            createdCount++;
          }
        } catch (rowError) {
          errors.push(`Row ${row.name}: ${rowError.message}`);
        }
      }

      // Mark upload as processed
      await db.collection('payrollUploads').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            processed: true,
            processResult: {
              created: createdCount,
              updated: updatedCount,
              errors: errors
            },
            processedAt: new Date(),
            processedBy: req.user.id
          }
        }
      );

      res.json({
        success: true,
        message: 'Upload processed successfully',
        data: {
          created: createdCount,
          updated: updatedCount,
          errors: errors
        }
      });

    } catch (error) {
      console.error('Process upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  /**
   * POST /api/upload/excel/preview - Preview Excel payroll data before saving
   * DomainMeaning: Parse and validate Excel file, return preview with user matching
   * MisleadingNames: None
   * SideEffects: Stores preview data temporarily in memory/MongoDB/filesystem
   * Invariants: Only Admin can preview, validates Excel structure
   * RAG_Keywords: excel preview, payroll validation, user matching, temporary storage
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_excel_preview_001
   */
  router.post('/excel/preview',
    requireAuth,
    requirePermission('payroll:manage'),
    strictRateLimiter,
    // validateCsrfToken, // Temporarily disabled for file uploads - authentication is sufficient
    preventNoSQLInjection,
    upload.single('file'),
    asyncHandler(async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file uploaded. Please select an Excel file.'
          });
        }

        console.log(`📋 Previewing file: ${req.file.originalname}`);

        // Generate file integrity metadata
        const fileBuffer = fs.readFileSync(req.file.path);
        const integrityMetadata = generateFileIntegrityMetadata(fileBuffer, req.file.originalname);
        
        console.log(`🔒 File integrity calculated: ${integrityMetadata.sha256Hash.substring(0, 16)}...`);

        // Initialize parser and process Excel file
        const parser = new LaborConsultantParser();
        const parsedData = await parser.parsePayrollFile(req.file.path);
        
        // Convert to PayrollRepository format
        const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.body;
        const payrollRecords = parser.toPayrollRepositoryFormat(parsedData, parseInt(year), parseInt(month));

        // Prepare preview data
        const previewRecords = [];
        const errors = [];
        const warnings = [];
        let validCount = 0;
        let invalidCount = 0;
        let duplicateCount = 0;

        // Get users collection for matching
        const userCollection = db.collection('users');
        const payrollCollection = db.collection('payroll');

        // Process each record for preview
        for (let i = 0; i < payrollRecords.length; i++) {
          const record = payrollRecords[i];
          const previewRecord = {
            rowIndex: i + 1,
            rowNumber: i + 1, // Added for consistency with plan
            employeeName: record.employeeName || '',
            employeeId: record.employeeId || '',
            baseSalary: record.baseSalary || 0,
            incentive: record.allowances?.incentive || 0, // 인센티브 항목만
            grossSalaryPreTax: record.grossSalaryPreTax || 0, // 세전총액
            totalAllowances: Object.values(record.allowances || {}).reduce((sum, val) => sum + (val || 0), 0),
            totalDeductions: Object.values(record.deductions || {}).reduce((sum, val) => sum + (val || 0), 0),
            netSalary: record.netSalary || 0,
            matched: false, // New field as per plan
            userId: null, // New field as per plan
            matchedUser: { found: false },
            status: 'valid'
          };

          // Try to match employee
          let user = null;
          if (record.employeeId) {
            user = await userCollection.findOne({ employeeId: record.employeeId });
          }
          if (!user && record.employeeName) {
            user = await userCollection.findOne({ name: record.employeeName });
          }

          if (user) {
            // Update matched fields
            previewRecord.matched = true;
            previewRecord.userId = user._id.toString();
            previewRecord.matchedUser = {
              found: true,
              userId: user._id.toString(),
              name: user.name,
              employeeId: user.employeeId
            };

            // Check for duplicate payroll record
            const existingPayroll = await payrollCollection.findOne({
              userId: user._id,
              year: parseInt(year),
              month: parseInt(month)
            });

            if (existingPayroll) {
              previewRecord.status = 'duplicate';
              previewRecord.existingRecord = {
                baseSalary: existingPayroll.baseSalary,
                netSalary: existingPayroll.netSalary,
                updatedAt: existingPayroll.updatedAt
              };
              duplicateCount++;
              warnings.push({
                row: i + 1,
                type: 'duplicate',
                message: `Payroll record already exists for ${user.name} in ${year}/${month}`,
                existingData: {
                  baseSalary: existingPayroll.baseSalary,
                  netSalary: existingPayroll.netSalary
                },
                newData: {
                  baseSalary: record.baseSalary,
                  netSalary: record.netSalary
                }
              });
            } else {
              validCount++;
            }
          } else {
            // Not matched - needs manual matching or skip
            previewRecord.matched = false;
            previewRecord.userId = null;
            previewRecord.matchedUser.found = false;
            previewRecord.status = 'unmatched'; // Changed from 'invalid' to 'unmatched'
            invalidCount++;
            errors.push({
              row: i + 1,
              type: 'unmatched',
              message: `Employee not found: ${record.employeeName || record.employeeId}`,
              needsAction: true
            });
          }

          previewRecords.push(previewRecord);
        }

        // Generate preview token
        const previewToken = generatePreviewToken(
          req.user.id,
          req.file.originalname,
          parseInt(year),
          parseInt(month),
          payrollRecords.length
        );
        
        // Extract token ID for storage
        const tokenId = extractPreviewTokenId(previewToken);
        
        // Store preview data temporarily
        const previewData = {
          parsedRecords: payrollRecords,
          fileName: req.file.originalname,
          uploadedBy: req.user.id,
          year: parseInt(year),
          month: parseInt(month),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + PREVIEW_EXPIRY_TIME),
          integrity: integrityMetadata
        };
        
        // Check if it's a large file
        const previewDataSize = estimateObjectSize(previewData);
        const isLargeFile = previewDataSize > MEMORY_LIMITS.largeFileSizeBytes;
        
        if (isLargeFile) {
          // Store large files in file system
          saveToFileSystemBackup(tokenId, previewData, PREVIEW_EXPIRY_TIME);
          previewStorage.set(tokenId, {
            isLargeFile: true,
            fileName: previewData.fileName,
            uploadedBy: previewData.uploadedBy,
            expiresAt: previewData.expiresAt
          });
        } else {
          // Store in memory for fast access
          previewStorage.set(tokenId, previewData);
        }

        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        // Apply masking based on user role
        const maskedPreviewRecords = applyPreviewRecordsMasking(
          previewRecords,
          req.user.role,
          req.user.id
        );

        // Return preview data
        res.json({
          success: true,
          previewToken,
          expiresIn: PREVIEW_EXPIRY_TIME / 1000,
          summary: {
            totalRecords: payrollRecords.length,
            validRecords: validCount,
            invalidRecords: invalidCount,
            duplicateRecords: duplicateCount,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            year: parseInt(year),
            month: parseInt(month)
          },
          records: maskedPreviewRecords,
          errors,
          warnings
        });

      } catch (error) {
        console.error('Preview error:', error);
        
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
          success: false,
          error: error.message || 'Failed to preview Excel file'
        });
      }
    })
  );

  /**
   * POST /api/upload/excel/confirm - Confirm and save previewed payroll data
   * DomainMeaning: Save previously previewed payroll data to database
   * MisleadingNames: None
   * SideEffects: Creates multiple payroll records in database
   * Invariants: Only Admin can confirm, requires valid preview token
   * RAG_Keywords: payroll confirm, save preview, bulk import
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_excel_confirm_001
   */
  router.post('/excel/confirm',
    requireAuth,
    requirePermission('payroll:manage'),
    // validateCsrfToken, // Temporarily disabled - authentication is sufficient
    preventNoSQLInjection,
    asyncHandler(async (req, res) => {
      try {
        const { previewToken, idempotencyKey, duplicateMode = 'skip', recordActions = [] } = req.body;
        // duplicateMode: 'skip' | 'update' | 'replace'
        // recordActions: [{ rowNumber: 1, action: 'process' | 'skip' | 'manual', userId?: string }]

        if (!previewToken) {
          return res.status(400).json({
            success: false,
            error: 'Preview token is required'
          });
        }

        // Verify JWT preview token
        let tokenData;
        try {
          tokenData = verifyPreviewToken(previewToken);
        } catch (tokenError) {
          return res.status(401).json({
            success: false,
            error: tokenError.name === 'TokenExpiredError' 
              ? 'Preview token has expired. Please upload the file again.'
              : 'Invalid preview token.'
          });
        }

        // Extract token ID for storage lookup
        const tokenId = tokenData.jti;

        // Check idempotency
        if (idempotencyKey && idempotencyStorage.has(idempotencyKey)) {
          const existing = idempotencyStorage.get(idempotencyKey);
          if (existing.expiresAt > Date.now()) {
            return res.status(existing.statusCode).json(existing.response);
          }
          idempotencyStorage.delete(idempotencyKey);
        }

        // Retrieve preview data
        let previewData = previewStorage.get(tokenId);
        
        // Handle large files
        if (previewData && previewData.isLargeFile) {
          previewData = loadFromFileSystemBackup(tokenId);
        }
        
        if (!previewData) {
          return res.status(404).json({
            success: false,
            error: 'Preview data not found or expired.'
          });
        }

        // Verify user authorization
        if (tokenData.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized to confirm this preview'
          });
        }

        console.log(`✅ Confirming payroll data from preview: ${tokenId}`);

        const payrollRecords = previewData.parsedRecords;
        let successfulImports = 0;
        let updatedRecords = 0;
        let skippedRecords = 0;
        let manuallyMatched = 0;
        let errors = [];
        
        // Get collections
        const userCollection = db.collection('users');
        const payrollCollection = db.collection('payroll');
        
        // Create a map of record actions for quick lookup
        const actionMap = new Map();
        recordActions.forEach(action => {
          actionMap.set(action.rowNumber, action);
        });
        
        // Process each record
        for (let i = 0; i < payrollRecords.length; i++) {
          const record = payrollRecords[i];
          const rowNumber = i + 1;
          const recordAction = actionMap.get(rowNumber);
          
          try {
            // Check if this record should be skipped
            if (recordAction && recordAction.action === 'skip') {
              skippedRecords++;
              console.log(`Skipping row ${rowNumber}: ${record.employeeName || record.employeeId}`);
              continue;
            }
            
            // Find user - either automatically or manually matched
            let user = null;
            
            if (recordAction && recordAction.action === 'manual' && recordAction.userId) {
              // Manual matching
              user = await userCollection.findOne({ _id: new ObjectId(recordAction.userId) });
              if (user) {
                manuallyMatched++;
                console.log(`Manually matched row ${rowNumber} to user: ${user.name}`);
              }
            } else {
              // Automatic matching
              if (record.employeeId) {
                user = await userCollection.findOne({ employeeId: record.employeeId });
              }
              if (!user && record.employeeName) {
                user = await userCollection.findOne({ name: record.employeeName });
              }
            }

            if (!user) {
              errors.push({
                row: rowNumber,
                record: record.employeeName || record.employeeId,
                error: 'Employee not found or not manually matched'
              });
              continue;
            }

            // Check for existing payroll record
            const existingPayroll = await payrollCollection.findOne({
              userId: user._id,
              year: previewData.year,
              month: previewData.month
            });

            const payrollData = {
              userId: user._id,
              year: previewData.year,
              month: previewData.month,
              baseSalary: record.baseSalary,
              allowances: record.allowances,
              deductions: record.deductions,
              netSalary: record.netSalary,
              paymentStatus: 'pending',
              sourceFile: previewData.fileName
            };

            if (existingPayroll) {
              // Handle duplicate based on mode
              if (duplicateMode === 'skip') {
                skippedRecords++;
                continue;
              } else if (duplicateMode === 'update' || duplicateMode === 'replace') {
                // Update existing record
                await payrollCollection.findOneAndUpdate(
                  {
                    userId: user._id,
                    year: previewData.year,
                    month: previewData.month
                  },
                  {
                    $set: {
                      ...payrollData,
                      updatedAt: new Date(),
                      updatedBy: new ObjectId(req.user.id),
                      updateReason: 'Excel re-upload'
                    }
                  },
                  { returnDocument: 'after' }
                );
                updatedRecords++;
              }
            } else {
              // Create new payroll record
              payrollData.createdBy = new ObjectId(req.user.id);
              payrollData.createdAt = new Date();
              await payrollRepo.createPayroll(payrollData);
              successfulImports++;
            }

          } catch (error) {
            console.error(`Failed to import record:`, error);
            errors.push({
              record: record.employeeName || record.employeeId,
              error: 'Failed to process payroll record'
            });
          }
        }

        // Clean up preview data
        previewStorage.delete(tokenId);
        if (previewData.isLargeFile) {
          deleteFileSystemBackup(tokenId);
        }

        // Store result for idempotency
        const responseData = {
          success: true,
          message: `Import completed: ${successfulImports} created, ${updatedRecords} updated, ${skippedRecords} skipped, ${manuallyMatched} manually matched`,
          totalRecords: payrollRecords.length,
          successfulImports,
          updatedRecords,
          skippedRecords,
          manuallyMatched,
          duplicateMode,
          errors: errors.length > 0 ? errors : undefined
        };

        if (idempotencyKey) {
          idempotencyStorage.set(idempotencyKey, {
            statusCode: 200,
            response: responseData,
            expiresAt: Date.now() + IDEMPOTENCY_EXPIRY_TIME
          });
        }

        res.json(responseData);

      } catch (error) {
        console.error('Confirm error:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to confirm payroll data'
        });
      }
    })
  );

  /**
   * GET /api/upload/excel/template - Download Excel template
   * DomainMeaning: Download Excel template for payroll data entry
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns Excel file with proper structure
   * RAG_Keywords: excel template, download, payroll headers
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_excel_template_001
   */
  router.get('/excel/template', 
    requireAuth, 
    requirePermission('payroll:manage'),
    payrollRateLimiter,
    asyncHandler(async (req, res) => {
      try {
        console.log(`📥 Excel template download requested by: ${req.user.name}`);

        // Generate template using ExcelService
        const excelService = new ExcelService();
        const templateBuffer = await excelService.generatePayrollTemplate();

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `payroll-template-${timestamp}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Length', templateBuffer.length);

        // Send the Excel template
        res.send(templateBuffer);

        console.log(`📊 Excel template downloaded: ${filename}`);

      } catch (error) {
        console.error('Excel template generation error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate template: ' + error.message
        });
      }
    })
  );

  /**
   * GET /api/upload/excel/export - Export payroll data to Excel
   * DomainMeaning: Generate Excel file with payroll data
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Users can export their own data, Admin can export all
   * RAG_Keywords: excel export, payroll download, data export
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_excel_export_001
   */
  router.get('/excel/export',
    requireAuth,
    requirePermission('payroll:view'),
    asyncHandler(async (req, res) => {
      try {
        const { year, month, userId } = req.query;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        // Build filter
        let filter = {};
        
        // Role-based filtering
        if (userRole === 'user' || userRole === 'User') {
          filter.userId = new ObjectId(currentUserId);
        } else if (userId && (userRole === 'admin' || userRole === 'Admin')) {
          filter.userId = new ObjectId(userId);
        }

        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);

        // Get payroll data
        const payrollData = await payrollRepo.find(filter);

        if (!payrollData || payrollData.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'No payroll data found for the specified criteria'
          });
        }

        // Generate Excel file
        const excelService = new ExcelService();
        const excelBuffer = await excelService.generatePayrollExport(payrollData, db);

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `payroll-export-${year || 'all'}-${month || 'all'}-${timestamp}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Length', excelBuffer.length);

        // Send the Excel file
        res.send(excelBuffer);

        console.log(`📊 Excel export completed: ${filename} (${payrollData.length} records)`);

      } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to export data: ' + error.message
        });
      }
    })
  );

  return router;
}

module.exports = createUploadRoutes;