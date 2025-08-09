/*
 * AI-HEADER
 * Intent: Implement comprehensive payroll CRUD API with enhanced schema support
 * Domain Meaning: Employee payroll management with allowances and deductions
 * Misleading Names: payroll vs monthlyPayments - payroll uses new enhanced schema
 * Data Contracts: Uses PayrollRepository with allowances/deductions objects
 * PII: Contains sensitive salary data - requires Admin/HR permissions
 * Invariants: netSalary = baseSalary + totalAllowances - totalDeductions
 * RAG Keywords: payroll, salary, allowances, deductions, CRUD API, validation
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const PayrollRepository = require('../repositories/PayrollRepository');
const PayrollDocumentRepository = require('../repositories/PayrollDocumentRepository');
const LaborConsultantParser = require('../utils/laborConsultantParser');
const ExcelProcessor = require('../excelProcessor');
const { payrollSchemas, validate, validateObjectId } = require('../validation/schemas');

const router = express.Router();

/**
 * Create payroll routes with enhanced PayrollRepository
 * DomainMeaning: Factory function to create payroll API routes with database dependency injection
 * MisleadingNames: None
 * SideEffects: Creates Express router with database connection
 * Invariants: Database connection must be provided
 * RAG_Keywords: express router factory, database injection
 * DuplicatePolicy: canonical - primary payroll routes factory
 * FunctionIdentity: hash_payroll_routes_enhanced_001
 */
function createPayrollRoutes(db) {
  const payrollRepo = new PayrollRepository();
  const documentRepo = new PayrollDocumentRepository();

  // Permission middleware
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

      // Role-based permissions fallback
      const roleBasedPermissions = {
        user: ['payroll:view'],
        manager: ['payroll:view', 'payroll:manage'],
        supervisor: ['payroll:view', 'payroll:manage'],
        admin: ['payroll:view', 'payroll:manage', 'payroll:create', 'payroll:delete']
      };

      const rolePermissions = roleBasedPermissions[userRole.toLowerCase()] || [];
      if (rolePermissions.includes(permission)) {
        return next();
      }
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    };
  };

  /**
   * POST /api/payroll - Create new payroll record
   * DomainMeaning: Create new employee payroll entry with allowances and deductions
   * MisleadingNames: None
   * SideEffects: Inserts payroll record into database
   * Invariants: Requires Admin permissions, validates duplicate entries
   * RAG_Keywords: payroll create, allowances deductions, validation
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_payroll_create_001
   */
  router.post('/', requireAuth, requirePermission('payroll:manage'), 
    validate.body(payrollSchemas.create), 
    asyncHandler(async (req, res) => {
      try {
        const payrollData = {
          userId: new ObjectId(req.body.userId),
          year: req.body.year,
          month: req.body.month,
          baseSalary: req.body.baseSalary,
          allowances: {
            overtime: req.body.allowances?.overtime || 0,
            position: req.body.allowances?.position || 0,
            meal: req.body.allowances?.meal || 0,
            transportation: req.body.allowances?.transportation || 0,
            other: req.body.allowances?.other || 0
          },
          deductions: {
            nationalPension: req.body.deductions?.nationalPension || 0,
            healthInsurance: req.body.deductions?.healthInsurance || 0,
            employmentInsurance: req.body.deductions?.employmentInsurance || 0,
            incomeTax: req.body.deductions?.incomeTax || 0,
            localIncomeTax: req.body.deductions?.localIncomeTax || 0,
            other: req.body.deductions?.other || 0
          },
          paymentStatus: 'pending',
          createdBy: new ObjectId(req.user.id)
        };

        const result = await payrollRepo.createPayroll(payrollData);

        res.status(201).json({
          success: true,
          message: 'Payroll record created successfully',
          data: result
        });

      } catch (error) {
        console.error('Create payroll error:', error);
        
        if (error.message.includes('already exists')) {
          return res.status(400).json({ 
            success: false,
            error: 'Payroll record already exists for this user and period' 
          });
        }
        
        res.status(500).json({ 
          success: false,
          error: 'Failed to create payroll record' 
        });
      }
    })
  );

  /**
   * GET /api/payroll - Get payroll records with pagination and filters
   * DomainMeaning: Retrieve payroll records with role-based access control
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Users can only see their own records, Admin/HR can see all
   * RAG_Keywords: payroll list, pagination, filtering, access control
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_payroll_list_001
   */
  router.get('/', requireAuth, requirePermission('payroll:view'),
    asyncHandler(async (req, res) => {
      try {
        const { year, month, userId, paymentStatus, page = 1, limit = 10 } = req.query;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        // Build filter based on role and query parameters
        let filter = {};
        
        // Role-based filtering
        if (userRole === 'user' || userRole === 'User') {
          filter.userId = new ObjectId(currentUserId);
        } else if (userId) {
          filter.userId = new ObjectId(userId);
        }

        // Period filtering
        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        // Get payroll records with user information
        const collection = await payrollRepo.getCollection();
        const skip = (page - 1) * limit;

        const pipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              userId: 1,
              year: 1,
              month: 1,
              baseSalary: 1,
              allowances: 1,
              deductions: 1,
              totalAllowances: 1,
              totalDeductions: 1,
              netSalary: 1,
              paymentStatus: 1,
              paymentDate: 1,
              createdAt: 1,
              updatedAt: 1,
              'user.name': 1,
              'user.employeeId': 1,
              'user.department': 1,
              'user.position': 1
            }
          },
          { $sort: { year: -1, month: -1, 'user.employeeId': 1 } },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ];

        const payrollRecords = await collection.aggregate(pipeline).toArray();
        
        // Get total count for pagination
        const totalCount = await collection.countDocuments(filter);

        res.json({
          success: true,
          data: payrollRecords,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        });

      } catch (error) {
        console.error('Get payroll records error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to retrieve payroll records' 
        });
      }
    })
  );

  /**
   * GET /api/payroll/:id - Get specific payroll record
   * DomainMeaning: Retrieve detailed payroll information for a specific record
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Users can only access their own records
   * RAG_Keywords: payroll detail, access control, user data
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_payroll_detail_001
   */
  router.get('/:id', requireAuth, requirePermission('payroll:view'), validateObjectId,
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        const payrollRecord = await payrollRepo.findById(id);
        
        if (!payrollRecord) {
          return res.status(404).json({ 
            success: false,
            error: 'Payroll record not found' 
          });
        }

        // Check permissions - users can only see their own records
        if ((userRole === 'user' || userRole === 'User') && 
            payrollRecord.userId.toString() !== currentUserId) {
          return res.status(403).json({ 
            success: false,
            error: 'Access denied' 
          });
        }

        // Get user information
        const collection = await payrollRepo.getCollection();
        const [detailRecord] = await collection.aggregate([
          { $match: { _id: new ObjectId(id) } },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              userId: 1,
              year: 1,
              month: 1,
              baseSalary: 1,
              allowances: 1,
              deductions: 1,
              totalAllowances: 1,
              totalDeductions: 1,
              netSalary: 1,
              paymentStatus: 1,
              paymentDate: 1,
              createdAt: 1,
              updatedAt: 1,
              createdBy: 1,
              approvedBy: 1,
              'user.name': 1,
              'user.employeeId': 1,
              'user.department': 1,
              'user.position': 1
            }
          }
        ]).toArray();

        res.json({
          success: true,
          data: detailRecord
        });

      } catch (error) {
        console.error('Get payroll detail error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to retrieve payroll record' 
        });
      }
    })
  );

  /**
   * PUT /api/payroll/:id - Update payroll record
   * DomainMeaning: Modify existing payroll data with recalculation of totals
   * MisleadingNames: None
   * SideEffects: Updates payroll record, recalculates netSalary
   * Invariants: Only Admin/HR can update, maintains data integrity
   * RAG_Keywords: payroll update, calculation, admin permissions
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_put_payroll_update_001
   */
  router.put('/:id', requireAuth, requirePermission('payroll:manage'), validateObjectId,
    validate.body(payrollSchemas.update),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        
        const existingRecord = await payrollRepo.findById(id);
        if (!existingRecord) {
          return res.status(404).json({ 
            success: false,
            error: 'Payroll record not found' 
          });
        }

        const updateData = {
          updatedAt: new Date(),
          updatedBy: new ObjectId(req.user.id)
        };

        // Update fields if provided
        if (req.body.baseSalary !== undefined) updateData.baseSalary = req.body.baseSalary;
        
        // Update allowances
        if (req.body.allowances) {
          updateData.allowances = {
            ...existingRecord.allowances,
            ...req.body.allowances
          };
        }

        // Update deductions
        if (req.body.deductions) {
          updateData.deductions = {
            ...existingRecord.deductions,
            ...req.body.deductions
          };
        }

        if (req.body.paymentStatus) updateData.paymentStatus = req.body.paymentStatus;

        // Recalculate totals
        const allowances = updateData.allowances || existingRecord.allowances;
        const deductions = updateData.deductions || existingRecord.deductions;
        
        updateData.totalAllowances = Object.values(allowances || {}).reduce((sum, val) => sum + (val || 0), 0);
        updateData.totalDeductions = Object.values(deductions || {}).reduce((sum, val) => sum + (val || 0), 0);
        updateData.netSalary = (updateData.baseSalary || existingRecord.baseSalary) + updateData.totalAllowances - updateData.totalDeductions;

        const result = await payrollRepo.update(id, updateData);

        res.json({
          success: true,
          message: 'Payroll record updated successfully',
          data: result
        });

      } catch (error) {
        console.error('Update payroll error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to update payroll record' 
        });
      }
    })
  );

  /**
   * DELETE /api/payroll/:id - Delete payroll record (soft delete)
   * DomainMeaning: Remove payroll record with audit trail preservation
   * MisleadingNames: DELETE vs soft delete - actually marks as deleted
   * SideEffects: Marks record as deleted, preserves audit trail
   * Invariants: Only Admin can delete, maintains data integrity
   * RAG_Keywords: payroll delete, soft delete, admin permissions
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_delete_payroll_001
   */
  router.delete('/:id', requireAuth, requirePermission('payroll:manage'), validateObjectId,
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        
        const existingRecord = await payrollRepo.findById(id);
        if (!existingRecord) {
          return res.status(404).json({ 
            success: false,
            error: 'Payroll record not found' 
          });
        }

        // Soft delete - mark as deleted but preserve record
        const updateData = {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: new ObjectId(req.user.id),
          paymentStatus: 'cancelled'
        };

        await payrollRepo.update(id, updateData);

        res.json({
          success: true,
          message: 'Payroll record deleted successfully'
        });

      } catch (error) {
        console.error('Delete payroll error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to delete payroll record' 
        });
      }
    })
  );

  /**
   * Configure multer for Excel file uploads
   * DomainMeaning: File upload middleware for Excel payroll processing
   * MisleadingNames: None
   * SideEffects: Stores uploaded files temporarily
   * Invariants: Only Excel files accepted, 10MB limit
   * RAG_Keywords: multer upload, excel file handling
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_multer_excel_config_001
   */
  const upload = multer({
    dest: 'uploads/temp/',
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      const allowedExtensions = ['.xls', '.xlsx'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only Excel files (.xls, .xlsx) are allowed.'), false);
      }
    }
  });

  /**
   * POST /api/payroll/excel/upload - Upload and process Excel payroll file
   * DomainMeaning: Bulk import payroll data from Excel using LaborConsultantParser
   * MisleadingNames: None
   * SideEffects: Creates multiple payroll records, processes Excel file
   * Invariants: Only Admin can upload, validates Excel structure
   * RAG_Keywords: excel upload, bulk payroll import, labor consultant format
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_excel_upload_001
   */
  router.post('/excel/upload', requireAuth, requirePermission('payroll:manage'),
    upload.single('file'),
    asyncHandler(async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file uploaded. Please select an Excel file.'
          });
        }

        console.log(`📂 Processing uploaded file: ${req.file.originalname}`);

        // Initialize parser and process Excel file
        const parser = new LaborConsultantParser();
        const parsedData = await parser.parsePayrollFile(req.file.path);
        
        // Convert to PayrollRepository format
        const { year = 2025, month = 7 } = req.body;
        const payrollRecords = parser.toPayrollRepositoryFormat(parsedData, parseInt(year), parseInt(month));

        // Process results tracking
        let successfulImports = 0;
        let errors = [];

        // Import each record
        for (const record of payrollRecords) {
          try {
            // Find user by employeeId or name
            const userCollection = db.collection('users');
            let user = null;
            
            if (record.employeeId) {
              user = await userCollection.findOne({ employeeId: record.employeeId });
            }
            
            if (!user && record.employeeName) {
              user = await userCollection.findOne({ name: record.employeeName });
            }

            if (!user) {
              errors.push({
                record: record.employeeName || record.employeeId,
                error: 'Employee not found in system'
              });
              continue;
            }

            // Create payroll record
            const payrollData = {
              userId: user._id,
              year: record.year,
              month: record.month,
              baseSalary: record.baseSalary,
              allowances: record.allowances,
              deductions: record.deductions,
              netSalary: record.netSalary,
              paymentStatus: 'pending',
              createdBy: new ObjectId(req.user.id),
              // Additional metadata
              sourceFile: record.sourceFile,
              extractedAt: record.extractedAt
            };

            await payrollRepo.createPayroll(payrollData);
            successfulImports++;

          } catch (error) {
            console.error(`Failed to import record for ${record.employeeName}:`, error);
            errors.push({
              record: record.employeeName || record.employeeId,
              error: error.message.includes('already exists') ? 
                'Payroll record already exists for this period' : 
                'Failed to create payroll record'
            });
          }
        }

        // Clean up uploaded file
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.json({
          success: true,
          message: `Excel file processed successfully. ${successfulImports} records imported.`,
          totalRecords: payrollRecords.length,
          successfulImports,
          errors: errors.length > 0 ? errors : undefined,
          summary: {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            processedAt: new Date(),
            year: parseInt(year),
            month: parseInt(month)
          }
        });

      } catch (error) {
        console.error('Excel upload error:', error);
        
        // Clean up uploaded file on error
        const fs = require('fs');
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        if (error.message.includes('Required sheet')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid Excel format. Please use the correct labor consultant format.'
          });
        }

        res.status(500).json({
          success: false,
          error: 'Failed to process Excel file: ' + error.message
        });
      }
    })
  );

  /**
   * GET /api/payroll/excel/export - Export payroll data to Excel file
   * DomainMeaning: Generate and download Excel file containing payroll data
   * MisleadingNames: None
   * SideEffects: None - read-only operation that generates file
   * Invariants: Users can export their own data, Admin can export all data
   * RAG_Keywords: excel export, payroll download, data export, file generation
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_excel_export_001
   */
  router.get('/excel/export', requireAuth, requirePermission('payroll:view'),
    asyncHandler(async (req, res) => {
      try {
        const { year, month, userId } = req.query;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        // Build filter for payroll data
        let filter = {};
        
        // Role-based filtering
        if (userRole === 'user' || userRole === 'User') {
          filter.userId = new ObjectId(currentUserId);
        } else if (userId) {
          filter.userId = new ObjectId(userId);
        }

        // Period filtering
        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);

        // Get payroll data with user information
        const collection = await payrollRepo.getCollection();
        const pipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              employeeId: '$user.employeeId',
              name: '$user.name',
              department: '$user.department',
              position: '$user.position',
              year: 1,
              month: 1,
              baseSalary: 1,
              allowances: 1,
              deductions: 1,
              totalAllowances: 1,
              totalDeductions: 1,
              netSalary: 1,
              paymentStatus: 1,
              paymentDate: 1
            }
          },
          { $sort: { year: -1, month: -1, employeeId: 1 } }
        ];

        const payrollData = await collection.aggregate(pipeline).toArray();

        // Transform data for Excel export
        const excelData = payrollData.map(record => ({
          employeeId: record.employeeId || '',
          name: record.name || '',
          department: record.department || '',
          position: record.position || '',
          year: record.year,
          month: record.month,
          baseSalary: record.baseSalary || 0,
          
          // Allowances breakdown
          overtimeAllowance: record.allowances?.overtime || 0,
          positionAllowance: record.allowances?.position || 0,
          mealAllowance: record.allowances?.meal || 0,
          transportationAllowance: record.allowances?.transportation || 0,
          otherAllowances: record.allowances?.other || 0,
          totalAllowances: record.totalAllowances || 0,
          
          // Deductions breakdown
          nationalPension: record.deductions?.nationalPension || 0,
          healthInsurance: record.deductions?.healthInsurance || 0,
          employmentInsurance: record.deductions?.employmentInsurance || 0,
          incomeTax: record.deductions?.incomeTax || 0,
          localIncomeTax: record.deductions?.localIncomeTax || 0,
          otherDeductions: record.deductions?.other || 0,
          totalDeductions: record.totalDeductions || 0,
          
          netSalary: record.netSalary || 0,
          paymentStatus: record.paymentStatus || 'pending',
          paymentDate: record.paymentDate ? record.paymentDate.toISOString().split('T')[0] : ''
        }));

        // Generate Excel file
        const excelProcessor = new ExcelProcessor();
        const workbook = await excelProcessor.generatePayrollExcelFile(excelData, {
          year: year ? parseInt(year) : new Date().getFullYear(),
          month: month ? parseInt(month) : new Date().getMonth() + 1,
          exportedBy: req.user.name,
          exportedAt: new Date()
        });

        // Generate filename
        const periodStr = year && month ? `${year}-${String(month).padStart(2, '0')}` : 'all';
        const filename = `payroll-export-${periodStr}-${Date.now()}.xlsx`;

        // Set response headers for Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // Write Excel file to response
        await workbook.xlsx.write(res);
        res.end();

        console.log(`📊 Excel export completed: ${filename} (${excelData.length} records)`);

      } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to export Excel file: ' + error.message
        });
      }
    })
  );

  /**
   * Configure multer for PDF payslip uploads
   * DomainMeaning: File upload middleware for PDF payslip document processing
   * MisleadingNames: None
   * SideEffects: Stores uploaded PDF files temporarily
   * Invariants: Only PDF files accepted, 5MB limit
   * RAG_Keywords: multer upload, pdf file handling, payslip documents
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_multer_pdf_config_001
   */
  const payslipUpload = multer({
    dest: 'uploads/payslips/',
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf'
      ];
      const allowedExtensions = ['.pdf'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
      }
    }
  });

  /**
   * POST /api/payroll/:id/payslip/upload - Upload PDF payslip for payroll record
   * DomainMeaning: Upload and store PDF payslip document for specific payroll record
   * MisleadingNames: None
   * SideEffects: Stores PDF file, creates document record in database
   * Invariants: Only Admin can upload, validates payroll record exists
   * RAG_Keywords: pdf upload, payslip document, file storage, admin permissions
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_payslip_upload_001
   */
  router.post('/:id/payslip/upload', requireAuth, requirePermission('payroll:manage'), validateObjectId,
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

        // Clean up any previous payslip for this payroll record
        // (Optional: keep history or replace - for now we'll keep history)

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
        const fs = require('fs');
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
   * GET /api/payroll/:id/payslip - Download PDF payslip for payroll record
   * DomainMeaning: Download PDF payslip document with access control and audit logging
   * MisleadingNames: None
   * SideEffects: Logs download access, streams file content
   * Invariants: Users can only download their own payslips, Admin can download any
   * RAG_Keywords: pdf download, payslip access, file streaming, access control
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_payslip_download_001
   */
  router.get('/:id/payslip', requireAuth, requirePermission('payroll:view'), validateObjectId,
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
        const fs = require('fs');
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
   * DELETE /api/payroll/:id/payslip - Delete PDF payslip for payroll record
   * DomainMeaning: Delete PDF payslip document with audit logging (Admin only)
   * MisleadingNames: None
   * SideEffects: Deletes document record, removes physical file, logs deletion
   * Invariants: Only Admin can delete, validates payroll record exists
   * RAG_Keywords: pdf delete, payslip removal, admin permissions, audit logging
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_delete_payslip_001
   */
  router.delete('/:id/payslip', requireAuth, requirePermission('payroll:manage'), validateObjectId,
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
        const fs = require('fs');
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
          deletedAt: new Date(),
          deletedBy: req.user.name
        });

        console.log(`✅ Payslip deleted: ${document.fileName} for ${user?.name || 'Unknown'} (${payrollRecord.year}-${payrollRecord.month}) by ${req.user.name}`);

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

module.exports = createPayrollRoutes;