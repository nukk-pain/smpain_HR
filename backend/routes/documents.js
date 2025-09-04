const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/permissions');
const UnifiedDocumentRepository = require('../repositories/UnifiedDocumentRepository');
const { createBulkPayslipUpload } = require('../config/multerConfig');
const { parseEmployeeFromFilename, extractYearMonth } = require('../utils/filenameParser');

const router = express.Router();
const unifiedRepo = new UnifiedDocumentRepository();

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
      
      // Use UnifiedDocumentRepository to get all user documents
      const options = {
        documentType: type,
        year: year ? parseInt(year) : undefined,
        month: month ? parseInt(month) : undefined,
        includeDeleted: false
      };
      
      // Get documents from unified collection
      const unifiedDocuments = await unifiedRepo.findUserDocuments(userId, options);
      
      // Transform to frontend expected format for backward compatibility
      const formattedDocuments = unifiedDocuments.map(doc => ({
        _id: doc._id,
        type: doc.documentType,
        category: doc.documentCategory || '기타',
        title: doc.file?.displayName || `${doc.temporal?.year}년 ${doc.temporal?.month}월 ${doc.documentType}`,
        fileName: doc.file?.originalName || doc.file?.systemName || 'document.pdf',
        fileSize: doc.file?.size || 0,
        mimeType: doc.file?.mimeType || 'application/pdf',
        date: doc.audit?.uploadedAt || doc.audit?.createdAt || new Date(),
        year: doc.temporal?.year,
        month: doc.temporal?.month,
        status: doc.status?.current || 'available',
        canDownload: true,
        canView: true,
        metadata: {
          yearMonth: doc.temporal?.yearMonth,
          payrollId: doc.metadata?.payroll?.payrollId,
          ...doc.metadata
        }
      }));

      // Apply category filter if specified
      let filteredDocuments = formattedDocuments;
      if (category) {
        filteredDocuments = formattedDocuments.filter(doc => doc.category === category);
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

      // Get document from unified collection
      const document = await unifiedRepo.findById(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Permission check - own document or Admin
      if (document.userId.toString() !== userId && req.user.role !== 'Admin' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if file exists
      if (!document.file?.path && !document.file?.systemName) {
        return res.status(404).json({ error: 'File path not found' });
      }

      // Build file path - handle both absolute and relative paths
      let filePath;
      if (document.file.path?.startsWith('/')) {
        // Relative path from project root
        filePath = path.join(__dirname, '../..', document.file.path);
      } else {
        // Try to construct path based on document type
        const fileName = document.file.uniqueId || document.file.systemName || document.file.originalName;
        if (document.documentType === 'payslip') {
          filePath = path.join(__dirname, '../uploads/payslips/', fileName);
        } else {
          filePath = path.join(__dirname, '../uploads/documents/', fileName);
        }
      }
      
      try {
        await fs.access(filePath);
        
        // Log access
        await unifiedRepo.logAccess(id, userId, 'download', {
          userName: req.user.name,
          ipAddress: req.ip
        });
        
        // UTF-8 encoding for original filename
        const originalFilename = document.file.originalName || document.file.displayName || 'document.pdf';
        const encodedFilename = encodeURIComponent(originalFilename);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Content-Type', document.file.mimeType || 'application/pdf');
        
        res.sendFile(filePath);
      } catch (error) {
        console.error('File access error:', error);
        res.status(404).json({ error: 'File not found' });
      }
    })
  );

  // POST /api/documents/payslip/match-employees - Match employees by file names for bulk payslip upload
  router.post('/payslip/match-employees',
    requireAuth,
    requireDocumentPermission('documents:manage'),
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

  // POST /api/documents/payslip/bulk-upload - Bulk upload payslips with unique ID system
  const bulkPayslipUpload = createBulkPayslipUpload();
  
  router.post('/payslip/bulk-upload',
    requireAuth,
    requireDocumentPermission('documents:manage'),
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
              await fs.unlink(file.path);
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
                await fs.unlink(file.path);
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

              // Check for existing payslip for the same user and month in unified collection
              const existingPayslip = await db.collection('unified_documents').findOne({
                userId: new ObjectId(mapping.userId),
                'temporal.year': year,
                'temporal.month': month,
                documentType: 'payslip',
                'status.isDeleted': { $ne: true }
              });

              if (existingPayslip) {
                // Mark as duplicate but continue with other files
                errorCount++;
                
                // Clean up the uploaded file
                try {
                  await fs.unlink(file.path);
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
              await fs.mkdir(destinationDir, { recursive: true });
              
              const destinationPath = path.join(destinationDir, uniqueFileName);

              // Move file to permanent location
              await fs.rename(file.path, destinationPath);

              // Parse employee info from original filename
              const parsedInfo = parseEmployeeFromFilename(originalFilename);
              
              // Create document in unified collection using repository
              const documentData = {
                userId: new ObjectId(mapping.userId),
                documentType: 'payslip',
                documentCategory: '급여명세서',
                file: {
                  uniqueId: uniqueFileName,
                  systemName: uniqueFileName,
                  originalName: originalFilename,
                  displayName: originalFilename,
                  path: `/uploads/payslips/${uniqueFileName}`,
                  size: file.size,
                  mimeType: metadata.mimetype || file.mimetype || 'application/pdf'
                },
                temporal: {
                  year,
                  month,
                  yearMonth: `${year}${String(month).padStart(2, '0')}`
                },
                userInfo: {
                  name: user.name,
                  employeeId: user.employeeId,
                  department: user.department
                },
                metadata: {
                  encoding: metadata.encoding,
                  parsedEmployeeName: parsedInfo.name,
                  parsedCompany: parsedInfo.company,
                  parsedEmploymentType: parsedInfo.employmentType,
                  parsedYearMonth: parsedInfo.yearMonth
                },
                audit: {
                  uploadedAt: new Date(),
                  uploadedBy: new ObjectId(req.user.id || req.user._id),
                  uploadedByName: req.user.username || req.user.name,
                  createdAt: new Date(),
                  createdBy: new ObjectId(req.user.id || req.user._id)
                },
                status: {
                  current: 'available',
                  isDeleted: false
                }
              };

              await unifiedRepo.createDocument(documentData);

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
                await fs.unlink(file.path);
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
              await fs.unlink(file.path);
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
        return res.status(400).json({ 
          success: false,
          error: 'No file provided',
          message: 'Please select a file to upload'
        });
      }

      // Find existing document in unified collection
      const existingDoc = await unifiedRepo.findById(id);

      if (!existingDoc) {
        // Delete temporary file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to delete temp file:', unlinkError);
        }
        return res.status(404).json({ 
          success: false,
          error: 'Document not found',
          message: 'The document you are trying to replace does not exist'
        });
      }

      // Determine upload directory based on document type
      const uploadDir = existingDoc.documentType === 'payslip' ? 
        path.join(__dirname, '../uploads/payslips/') : 
        path.join(__dirname, '../uploads/documents/');
      const backupDir = path.join(uploadDir, 'backup/');
      await fs.mkdir(backupDir, { recursive: true });
      
      // Backup old file
      const oldFileName = existingDoc.file?.systemName || existingDoc.file?.uniqueId || 'unknown';
      const oldFilePath = path.join(uploadDir, oldFileName);
      const backupFilePath = path.join(backupDir, `${Date.now()}_${oldFileName}`);
      
      try {
        await fs.access(oldFilePath);
        await fs.rename(oldFilePath, backupFilePath);
      } catch (error) {
        console.error('Failed to backup old file:', error);
      }

      // Move new file to proper location
      const newFileName = `${existingDoc.documentType}_${Date.now()}_${file.originalname}`;
      const newFilePath = path.join(uploadDir, newFileName);
      await fs.rename(file.path, newFilePath);

      // Update document in unified collection
      const updateData = {
        'file.systemName': newFileName,
        'file.originalName': file.originalname,
        'file.size': file.size,
        'file.mimeType': file.mimetype || 'application/pdf',
        'audit.lastModifiedAt': new Date(),
        'audit.lastModifiedBy': new ObjectId(req.user.id)
      };

      const historyEntry = {
        action: 'replaced',
        performedBy: new ObjectId(req.user.id),
        performedAt: new Date(),
        oldFileName: oldFileName,
        newFileName: newFileName,
        reason: req.body.reason || 'File replacement'
      };

      await unifiedRepo.updateDocument(id, updateData, historyEntry);

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

      // Soft delete using UnifiedDocumentRepository
      const result = await unifiedRepo.softDelete(
        id,
        req.user.id,
        reason || 'Admin deletion'
      );

      if (!result) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json({ success: true, message: 'Document deleted successfully' });
    })
  );

  // GET /api/admin/documents - Get all documents (Admin)
  router.get('/admin/all',
    requireAuth,
    requirePermission('admin:permissions'),
    asyncHandler(async (req, res) => {
      const { userId, type, includeDeleted } = req.query;
      
      // Build query for unified collection
      const query = {
        ...(userId && { userId: new ObjectId(userId) }),
        ...(type && { documentType: type }),
        ...(!includeDeleted || includeDeleted === 'false' ? { 'status.isDeleted': { $ne: true } } : {})
      };

      // Get all documents from unified collection
      const unifiedCollection = db.collection('unified_documents');
      const allDocuments = await unifiedCollection.find(query).toArray();

      // Get user information for documents
      const usersCollection = db.collection('users');
      const userIds = [...new Set(allDocuments.map(doc => doc.userId?.toString()).filter(Boolean))];
      const users = await usersCollection.find({
        _id: { $in: userIds.map(id => new ObjectId(id)) }
      }).toArray();
      
      const userMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {});

      // Format documents for admin view with user info
      const formattedDocuments = allDocuments.map(doc => ({
        _id: doc._id,
        userId: doc.userId,
        userName: doc.userInfo?.name || userMap[doc.userId?.toString()]?.name || 'Unknown',
        userEmployeeId: doc.userInfo?.employeeId || userMap[doc.userId?.toString()]?.employeeId || 'Unknown',
        type: doc.documentType,
        category: doc.documentCategory || '기타',
        title: doc.file?.displayName || `${doc.temporal?.year}년 ${doc.temporal?.month}월 ${doc.documentType}`,
        fileName: doc.file?.originalName || doc.file?.systemName || 'document.pdf',
        fileSize: doc.file?.size || 0,
        mimeType: doc.file?.mimeType || 'application/pdf',
        date: doc.audit?.uploadedAt || doc.audit?.createdAt || new Date(),
        year: doc.temporal?.year,
        month: doc.temporal?.month,
        status: doc.status?.isDeleted ? 'deleted' : (doc.status?.current || 'available'),
        deleted: doc.status?.isDeleted,
        deletedAt: doc.status?.deletedAt,
        deletedBy: doc.status?.deletedBy,
        deleteReason: doc.status?.deleteReason,
        modificationHistory: doc.history || [],
      }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      res.json({ success: true, data: formattedDocuments });
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

      // Restore using UnifiedDocumentRepository
      const result = await unifiedRepo.restoreDocument(
        id,
        req.user.id
      );

      if (!result) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json({ success: true, message: 'Document restored successfully' });
    })
  );

  return router;
}

module.exports = createDocumentsRoutes;