const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/**
 * Create multer storage configuration for payslip uploads
 * Handles Korean filenames by using unique IDs for physical storage
 * while preserving original names in metadata
 */
const createPayslipStorage = () => {
  return multer.diskStorage({
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
  });
};

/**
 * Create multer configuration for bulk payslip upload
 * @param {number} maxFiles - Maximum number of files (default: 50)
 * @param {number} maxFileSize - Maximum file size in MB (default: 10)
 */
const createBulkPayslipUpload = (maxFiles = 50, maxFileSize = 10) => {
  return multer({
    storage: createPayslipStorage(),
    limits: {
      fileSize: maxFileSize * 1024 * 1024, // Convert MB to bytes
      files: maxFiles
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
};

module.exports = {
  createPayslipStorage,
  createBulkPayslipUpload
};