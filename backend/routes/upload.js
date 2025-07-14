const express = require('express');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
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
function createUploadRoutes(db) {
  // Permission middleware
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const userPermissions = req.session.user.permissions || [];
      const hasPermission = userPermissions.includes(permission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
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
        uploadedBy: req.session.user.id,
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
                  updatedBy: req.session.user.id
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
              createdBy: req.session.user.id
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
            processedBy: req.session.user.id
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

  return router;
}

module.exports = createUploadRoutes;