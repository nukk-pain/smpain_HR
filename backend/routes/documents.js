const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

function createDocumentsRoutes(db) {
  // Permission check middleware
  const requireDocumentPermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRole = req.user.role;
      
      // Admin has all permissions
      if (userRole === 'admin' || userRole === 'Admin') {
        return next();
      }
      
      // Regular users can only view their own documents
      if (permission === 'documents:view:own') {
        return next();
      }
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    };
  };

  // GET /api/documents - Get my documents list
  router.get('/', 
    requireAuth, 
    requireDocumentPermission('documents:view:own'),
    asyncHandler(async (req, res) => {
      const userId = req.user.id;
      const { type, year, month, category } = req.query;
      
      // Build query conditions
      let query = { userId: new ObjectId(userId) };
      if (type) query.type = type;
      if (year) query.year = parseInt(year);
      if (month) query.month = parseInt(month);
      if (category) query.category = category;

      // Get data from existing payslips collection (backward compatibility)
      const payslipsCollection = db.collection('payslips');
      const payslips = await payslipsCollection.find({
        userId: new ObjectId(userId),
        deleted: { $ne: true }  // Exclude soft deleted documents
      }).toArray();

      // Convert payslips to Document format
      const payslipDocuments = payslips.map(p => ({
        _id: p._id,
        type: 'payslip',
        category: '급여명세서',
        title: `${p.year}년 ${p.month}월 급여명세서`,
        fileName: p.originalFilename || p.fileName || 'payslip.pdf',
        fileSize: p.fileSize || 0,
        mimeType: 'application/pdf',
        date: p.uploadedAt || p.createdAt || new Date(),
        year: p.year,
        month: p.month,
        status: 'available',
        canDownload: true,
        canView: true,
        metadata: {
          yearMonth: p.yearMonth,
          payrollId: p.payrollId
        }
      }));

      // Get data from new documents collection (for future expansion)
      const documentsCollection = db.collection('documents');
      const otherDocuments = await documentsCollection.find(query).toArray();

      // Merge and sort
      const allDocuments = [...payslipDocuments, ...otherDocuments]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply type filter if specified
      let filteredDocuments = allDocuments;
      if (type) {
        filteredDocuments = allDocuments.filter(doc => doc.type === type);
      }
      if (year) {
        filteredDocuments = filteredDocuments.filter(doc => doc.year === parseInt(year));
      }
      if (month) {
        filteredDocuments = filteredDocuments.filter(doc => doc.month === parseInt(month));
      }

      res.json({ success: true, data: filteredDocuments });
    })
  );

  // GET /api/documents/:id/download - Download document
  router.get('/:id/download',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;

      // Check payslips collection
      const payslipsCollection = db.collection('payslips');
      const payslip = await payslipsCollection.findOne({
        _id: new ObjectId(id)
      });

      if (payslip) {
        // Permission check - own document or Admin
        if (payslip.userId.toString() !== userId && req.user.role !== 'Admin') {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Build file path
        const fileName = payslip.uniqueFileName || payslip.fileName;
        if (!fileName) {
          return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(__dirname, '../uploads/payslips/', fileName);
        
        try {
          await fs.access(filePath);
          
          // UTF-8 encoding for original filename
          const originalFilename = payslip.originalFilename || 'payslip.pdf';
          const encodedFilename = encodeURIComponent(originalFilename);
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
          res.setHeader('Content-Type', 'application/pdf');
          
          res.sendFile(filePath);
        } catch (error) {
          console.error('File access error:', error);
          res.status(404).json({ error: 'File not found' });
        }
      } else {
        // Check documents collection (for future expansion)
        const documentsCollection = db.collection('documents');
        const document = await documentsCollection.findOne({
          _id: new ObjectId(id)
        });

        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // Permission check
        if (document.userId.toString() !== userId && req.user.role !== 'Admin') {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Handle by document type
        if (document.type === 'certificate') {
          // Certificates are generated in real-time
          // TODO: Implement PDF generation logic
          res.status(501).json({ error: 'Certificate generation not implemented yet' });
        } else {
          // File download
          const filePath = path.join(__dirname, '../uploads/documents/', document.fileName);
          try {
            await fs.access(filePath);
            res.sendFile(filePath);
          } catch (error) {
            res.status(404).json({ error: 'File not found' });
          }
        }
      }
    })
  );

  // POST /api/documents/certificate/generate - Generate certificate (Phase 2)
  router.post('/certificate/generate',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { type, purpose, language = 'ko' } = req.body;
      const userId = req.user.id;

      // Get user information
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({
        _id: new ObjectId(userId)
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // TODO: Implement certificate generation logic
      // 1. Load template
      // 2. Bind data
      // 3. Generate PDF
      // 4. Save to documents collection
      
      res.status(501).json({ 
        error: 'Certificate generation not implemented yet',
        message: 'This feature will be available in Phase 2'
      });
    })
  );

  // PUT /api/documents/:id/replace - Replace document (Admin)
  router.put('/:id/replace',
    requireAuth,
    requirePermission('admin:permissions'),
    multer({ dest: 'uploads/temp/' }).single('document'),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Find existing document
      const payslipsCollection = db.collection('payslips');
      const existingPayslip = await payslipsCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!existingPayslip) {
        // Delete temporary file
        await fs.unlink(file.path);
        return res.status(404).json({ error: 'Document not found' });
      }

      // Backup old file (soft delete)
      const backupDir = path.join(__dirname, '../uploads/payslips/backup/');
      await fs.mkdir(backupDir, { recursive: true });
      
      const oldFilePath = path.join(__dirname, '../uploads/payslips/', existingPayslip.uniqueFileName || existingPayslip.fileName);
      const backupFilePath = path.join(backupDir, `${Date.now()}_${existingPayslip.uniqueFileName || existingPayslip.fileName}`);
      
      try {
        await fs.rename(oldFilePath, backupFilePath);
      } catch (error) {
        console.error('Failed to backup old file:', error);
      }

      // Replace with new file
      const newFileName = `payslip_${Date.now()}_${file.originalname}`;
      const newFilePath = path.join(__dirname, '../uploads/payslips/', newFileName);
      await fs.rename(file.path, newFilePath);

      // Update DB with audit trail
      await payslipsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            uniqueFileName: newFileName,
            originalFilename: file.originalname,
            fileSize: file.size,
            updatedAt: new Date(),
            updatedBy: new ObjectId(req.user.id)
          },
          $push: {
            modificationHistory: {
              action: 'replaced',
              performedBy: new ObjectId(req.user.id),
              performedAt: new Date(),
              oldFileName: existingPayslip.uniqueFileName || existingPayslip.fileName,
              reason: req.body.reason || 'File replacement'
            }
          }
        }
      );

      res.json({ success: true, message: 'Document replaced successfully' });
    })
  );

  // DELETE /api/documents/:id - Delete document (Admin)
  router.delete('/:id',
    requireAuth,
    requirePermission('admin:permissions'),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { reason } = req.body;

      const payslipsCollection = db.collection('payslips');
      const payslip = await payslipsCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!payslip) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Soft delete - actual file deleted after 30 days
      await payslipsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: new ObjectId(req.user.id),
            deleteReason: reason || 'Admin deletion'
          }
        }
      );

      res.json({ success: true, message: 'Document deleted successfully' });
    })
  );

  // GET /api/admin/documents - Get all documents (Admin)
  router.get('/admin/all',
    requireAuth,
    requirePermission('admin:permissions'),
    asyncHandler(async (req, res) => {
      const { userId, type, includeDeleted } = req.query;
      
      // Build query
      let query = {};
      if (userId) query.userId = new ObjectId(userId);
      if (type) query.type = type;
      if (!includeDeleted || includeDeleted === 'false') {
        query.deleted = { $ne: true };
      }

      // Get all payslips
      const payslipsCollection = db.collection('payslips');
      const payslips = await payslipsCollection.find(query).toArray();

      // Get user information for each payslip
      const usersCollection = db.collection('users');
      const userIds = [...new Set(payslips.map(p => p.userId.toString()))];
      const users = await usersCollection.find({
        _id: { $in: userIds.map(id => new ObjectId(id)) }
      }).toArray();
      
      const userMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {});

      // Convert payslips to Document format with user info
      const payslipDocuments = payslips.map(p => ({
        _id: p._id,
        userId: p.userId,
        userName: userMap[p.userId.toString()]?.name || 'Unknown',
        userEmployeeId: userMap[p.userId.toString()]?.employeeId || 'Unknown',
        type: 'payslip',
        category: '급여명세서',
        title: `${p.year}년 ${p.month}월 급여명세서`,
        fileName: p.originalFilename || p.fileName || 'payslip.pdf',
        fileSize: p.fileSize || 0,
        mimeType: 'application/pdf',
        date: p.uploadedAt || p.createdAt || new Date(),
        year: p.year,
        month: p.month,
        status: p.deleted ? 'deleted' : 'available',
        deleted: p.deleted,
        deletedAt: p.deletedAt,
        deletedBy: p.deletedBy,
        deleteReason: p.deleteReason,
        modificationHistory: p.modificationHistory || [],
      }));

      // Get documents from documents collection
      const documentsCollection = db.collection('documents');
      const otherDocuments = await documentsCollection.find(query).toArray();

      // Merge and sort
      const allDocuments = [...payslipDocuments, ...otherDocuments]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      res.json({ success: true, data: allDocuments });
    })
  );

  // GET /api/admin/payslips - Get all payslips (Admin) - fallback for frontend
  router.get('/admin/payslips',
    requireAuth,
    requirePermission('admin:permissions'),
    asyncHandler(async (req, res) => {
      const payslipsCollection = db.collection('payslips');
      const payslips = await payslipsCollection.find({}).toArray();
      
      // Get user information
      const usersCollection = db.collection('users');
      const userIds = [...new Set(payslips.map(p => p.userId.toString()))];
      const users = await usersCollection.find({
        _id: { $in: userIds.map(id => new ObjectId(id)) }
      }).toArray();
      
      const userMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {});

      // Add user info to payslips
      const payslipsWithUserInfo = payslips.map(p => ({
        ...p,
        userName: userMap[p.userId.toString()]?.name || 'Unknown',
        employeeId: userMap[p.userId.toString()]?.employeeId || 'Unknown',
      }));

      res.json({ success: true, data: payslipsWithUserInfo });
    })
  );

  // PUT /api/documents/:id/restore - Restore deleted document (Admin)
  router.put('/:id/restore',
    requireAuth,
    requirePermission('admin:permissions'),
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const payslipsCollection = db.collection('payslips');
      const result = await payslipsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            deleted: false,
            restoredAt: new Date(),
            restoredBy: new ObjectId(req.user.id)
          },
          $push: {
            modificationHistory: {
              action: 'restored',
              performedBy: new ObjectId(req.user.id),
              performedAt: new Date(),
              reason: 'Document restored from trash'
            }
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json({ success: true, message: 'Document restored successfully' });
    })
  );

  return router;
}

module.exports = createDocumentsRoutes;