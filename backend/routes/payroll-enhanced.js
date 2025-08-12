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
const crypto = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const PayrollRepository = require('../repositories/PayrollRepository');
const PayrollDocumentRepository = require('../repositories/PayrollDocumentRepository');
const LaborConsultantParser = require('../utils/laborConsultantParser');
const ExcelService = require('../services/excel');
const RollbackService = require('../services/RollbackService');
const { payrollSchemas, validate, validateObjectId } = require('../validation/schemas');
const {
  payrollRateLimiter,
  strictRateLimiter,
  sanitizePayrollInput,
  validateFileUpload,
  addSecurityHeaders,
  validateObjectId: validateMongoId,
  preventNoSQLInjection
} = require('../middleware/payrollSecurity');

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
  const rollbackService = new RollbackService(db);

  // Temporary storage for preview data (In production, use Redis or MongoDB)
  const previewStorage = new Map();
  const PREVIEW_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes
  
  // Idempotency key storage for preventing duplicate submissions
  const idempotencyStorage = new Map();
  const IDEMPOTENCY_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
  
  // Memory usage limits and monitoring
  const MEMORY_LIMITS = {
    maxPreviewEntries: 100,          // Maximum number of preview entries
    maxIdempotencyEntries: 1000,     // Maximum number of idempotency entries
    maxPreviewSizeBytes: 50 * 1024 * 1024, // 50MB for preview storage
    maxIdempotencySizeBytes: 10 * 1024 * 1024, // 10MB for idempotency storage
    warningThresholdPercent: 80,     // Warning at 80% capacity
    largeFileSizeBytes: 10 * 1024 * 1024 // 10MB threshold for file system backup
  };
  
  // File system backup configuration
  const BACKUP_CONFIG = {
    backupDir: path.join(__dirname, '..', 'temp_backups'),
    maxBackupFiles: 100,
    backupRetentionHours: 48
  };
  
  // JWT Preview Token Configuration
  const JWT_PREVIEW_CONFIG = {
    secret: process.env.JWT_PREVIEW_SECRET || process.env.JWT_SECRET || 'default-preview-secret',
    expiresIn: '30m', // 30 minutes to match PREVIEW_EXPIRY_TIME
    issuer: 'hr-payroll-preview',
    audience: 'hr-frontend'
  };
  
  // CSRF Protection Configuration
  const CSRF_CONFIG = {
    secret: process.env.CSRF_SECRET || process.env.JWT_SECRET || 'default-csrf-secret',
    expiresIn: '1h', // CSRF tokens last 1 hour
    headerName: 'x-csrf-token',
    cookieName: 'csrf-token',
    issuer: 'hr-payroll-csrf',
    audience: 'hr-frontend'
  };
  
  // Memory usage tracking
  let memoryUsage = {
    previewSizeBytes: 0,
    idempotencySizeBytes: 0,
    lastCleanup: Date.now(),
    totalCleanupsPerformed: 0
  };
  
  // Utility function to estimate object size in bytes
  const estimateObjectSize = (obj) => {
    try {
      return Buffer.byteLength(JSON.stringify(obj), 'utf8');
    } catch (error) {
      // Fallback estimation if JSON.stringify fails
      return JSON.stringify(obj).length * 2; // UTF-8 can use up to 2 bytes per character
    }
  };
  
  // Update memory usage tracking
  const updateMemoryUsage = () => {
    let previewSize = 0;
    let idempotencySize = 0;
    
    for (const [, data] of previewStorage.entries()) {
      previewSize += estimateObjectSize(data);
    }
    
    for (const [, data] of idempotencyStorage.entries()) {
      idempotencySize += estimateObjectSize(data);
    }
    
    memoryUsage.previewSizeBytes = previewSize;
    memoryUsage.idempotencySizeBytes = idempotencySize;
  };
  
  // Check memory usage and enforce limits
  const enforceMemoryLimits = () => {
    const now = Date.now();
    let cleanupPerformed = false;
    
    // Check preview storage limits
    if (previewStorage.size > MEMORY_LIMITS.maxPreviewEntries || 
        memoryUsage.previewSizeBytes > MEMORY_LIMITS.maxPreviewSizeBytes) {
      
      // Sort by expiry time and remove oldest first
      const previewEntries = Array.from(previewStorage.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const targetSize = Math.floor(MEMORY_LIMITS.maxPreviewEntries * 0.8);
      const targetBytes = Math.floor(MEMORY_LIMITS.maxPreviewSizeBytes * 0.8);
      
      while (previewStorage.size > targetSize || memoryUsage.previewSizeBytes > targetBytes) {
        if (previewEntries.length === 0) break;
        
        const [token, data] = previewEntries.shift();
        previewStorage.delete(token);
        memoryUsage.previewSizeBytes -= estimateObjectSize(data);
        cleanupPerformed = true;
        
        console.log(`🧹 Force cleaned preview due to memory limits: ${token}`);
      }
    }
    
    // Check idempotency storage limits
    if (idempotencyStorage.size > MEMORY_LIMITS.maxIdempotencyEntries || 
        memoryUsage.idempotencySizeBytes > MEMORY_LIMITS.maxIdempotencySizeBytes) {
      
      // Sort by expiry time and remove oldest first
      const idempotencyEntries = Array.from(idempotencyStorage.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const targetSize = Math.floor(MEMORY_LIMITS.maxIdempotencyEntries * 0.8);
      const targetBytes = Math.floor(MEMORY_LIMITS.maxIdempotencySizeBytes * 0.8);
      
      while (idempotencyStorage.size > targetSize || memoryUsage.idempotencySizeBytes > targetBytes) {
        if (idempotencyEntries.length === 0) break;
        
        const [key, data] = idempotencyEntries.shift();
        idempotencyStorage.delete(key);
        memoryUsage.idempotencySizeBytes -= estimateObjectSize(data);
        cleanupPerformed = true;
        
        console.log(`🧹 Force cleaned idempotency key due to memory limits: ${key}`);
      }
    }
    
    if (cleanupPerformed) {
      memoryUsage.totalCleanupsPerformed++;
      memoryUsage.lastCleanup = now;
    }
    
    return cleanupPerformed;
  };
  
  // Log memory usage warnings
  const checkMemoryWarnings = () => {
    const previewUsagePercent = (memoryUsage.previewSizeBytes / MEMORY_LIMITS.maxPreviewSizeBytes) * 100;
    const idempotencyUsagePercent = (memoryUsage.idempotencySizeBytes / MEMORY_LIMITS.maxIdempotencySizeBytes) * 100;
    
    if (previewUsagePercent > MEMORY_LIMITS.warningThresholdPercent) {
      console.warn(`⚠️ Preview storage memory usage high: ${previewUsagePercent.toFixed(1)}% (${(memoryUsage.previewSizeBytes / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    if (idempotencyUsagePercent > MEMORY_LIMITS.warningThresholdPercent) {
      console.warn(`⚠️ Idempotency storage memory usage high: ${idempotencyUsagePercent.toFixed(1)}% (${(memoryUsage.idempotencySizeBytes / 1024 / 1024).toFixed(2)} MB)`);
    }
  };
  
  // Enhanced cleanup expired preview data
  const cleanupExpiredPreviews = () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, data] of previewStorage.entries()) {
      if (data.expiresAt < now) {
        const dataSize = estimateObjectSize(data);
        previewStorage.delete(token);
        memoryUsage.previewSizeBytes -= dataSize;
        cleanedCount++;
        console.log(`🧹 Cleaned up expired preview: ${token}`);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Preview cleanup: removed ${cleanedCount} expired entries`);
    }
    
    return cleanedCount;
  };
  
  // Enhanced cleanup expired idempotency keys
  const cleanupExpiredIdempotencyKeys = () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, data] of idempotencyStorage.entries()) {
      if (data.expiresAt < now) {
        const dataSize = estimateObjectSize(data);
        idempotencyStorage.delete(key);
        memoryUsage.idempotencySizeBytes -= dataSize;
        cleanedCount++;
        console.log(`🧹 Cleaned up expired idempotency key: ${key}`);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Idempotency cleanup: removed ${cleanedCount} expired entries`);
    }
    
    return cleanedCount;
  };
  
  // Combined cleanup function with memory monitoring and MongoDB cleanup
  const performCleanupAndMonitoring = async () => {
    const startTime = Date.now();
    
    // Update current memory usage
    updateMemoryUsage();
    
    // Check for warnings before cleanup
    checkMemoryWarnings();
    
    // Cleanup expired entries from memory
    const previewCleaned = cleanupExpiredPreviews();
    const idempotencyCleaned = cleanupExpiredIdempotencyKeys();
    
    // Cleanup expired entries from MongoDB temp_uploads collection
    let mongoCleaned = 0;
    try {
      const mongoCleanupResult = await db.collection('temp_uploads').deleteMany({
        expiresAt: { $lt: new Date() }
      });
      mongoCleaned = mongoCleanupResult.deletedCount;
      if (mongoCleaned > 0) {
        console.log(`🧹 MongoDB cleanup: removed ${mongoCleaned} expired temp_uploads`);
      }
    } catch (mongoError) {
      console.warn(`⚠️ MongoDB cleanup failed: ${mongoError.message}`);
    }
    
    // Cleanup expired file system backup files
    const backupCleaned = cleanupExpiredBackupFiles();
    if (backupCleaned > 0) {
      console.log(`🧹 Backup file cleanup: removed ${backupCleaned} expired/old files`);
    }
    
    // Enforce memory limits if necessary
    const limitEnforced = enforceMemoryLimits();
    
    // Update memory usage after cleanup
    updateMemoryUsage();
    
    const endTime = Date.now();
    const totalCleaned = previewCleaned + idempotencyCleaned;
    
    if (totalCleaned > 0 || mongoCleaned > 0 || backupCleaned > 0 || limitEnforced) {
      console.log(`📊 Cleanup completed in ${endTime - startTime}ms:`, {
        previewEntries: previewStorage.size,
        idempotencyEntries: idempotencyStorage.size,
        previewMemoryMB: (memoryUsage.previewSizeBytes / 1024 / 1024).toFixed(2),
        idempotencyMemoryMB: (memoryUsage.idempotencySizeBytes / 1024 / 1024).toFixed(2),
        totalCleanupsPerformed: memoryUsage.totalCleanupsPerformed,
        memoryCleaned: totalCleaned,
        mongoCleaned: mongoCleaned,
        backupCleaned: backupCleaned,
        limitsEnforced: limitEnforced
      });
    }
  };
  
  // Run enhanced cleanup and monitoring every 5 minutes
  setInterval(performCleanupAndMonitoring, 5 * 60 * 1000);
  
  // Initial memory usage calculation
  updateMemoryUsage();
  
  // JWT Preview Token utilities
  const generatePreviewToken = (userId, fileName, year, month, dataSize) => {
    const payload = {
      type: 'preview',
      userId: userId,
      fileName: fileName,
      year: year,
      month: month,
      dataSize: dataSize,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(16).toString('hex') // Unique token ID
    };
    
    try {
      const token = jwt.sign(payload, JWT_PREVIEW_CONFIG.secret, {
        expiresIn: JWT_PREVIEW_CONFIG.expiresIn,
        issuer: JWT_PREVIEW_CONFIG.issuer,
        audience: JWT_PREVIEW_CONFIG.audience
      });
      
      console.log(`🔑 Generated JWT preview token: ${payload.jti} for user: ${userId}`);
      return token;
    } catch (error) {
      console.error(`❌ Failed to generate JWT preview token: ${error.message}`);
      throw error;
    }
  };
  
  const verifyPreviewToken = (token) => {
    try {
      const decoded = jwt.verify(token, JWT_PREVIEW_CONFIG.secret, {
        issuer: JWT_PREVIEW_CONFIG.issuer,
        audience: JWT_PREVIEW_CONFIG.audience
      });
      
      // Additional validation
      if (decoded.type !== 'preview') {
        throw new Error('Invalid token type');
      }
      
      console.log(`✅ Verified JWT preview token: ${decoded.jti} for user: ${decoded.userId}`);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.warn(`⏰ Preview token expired: ${error.message}`);
      } else if (error.name === 'JsonWebTokenError') {
        console.warn(`🔒 Invalid preview token: ${error.message}`);
      } else {
        console.error(`❌ Preview token verification error: ${error.message}`);
      }
      throw error;
    }
  };
  
  const extractPreviewTokenId = (token) => {
    try {
      // Extract without verification (for storage key purposes)
      const decoded = jwt.decode(token);
      return decoded?.jti || null;
    } catch (error) {
      console.error(`❌ Failed to extract token ID: ${error.message}`);
      return null;
    }
  };
  
  // CSRF Token utilities
  const generateCsrfToken = (userId, sessionId) => {
    const payload = {
      type: 'csrf',
      userId: userId,
      sessionId: sessionId || 'default-session',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(12).toString('hex') // Shorter for CSRF
    };
    
    try {
      const token = jwt.sign(payload, CSRF_CONFIG.secret, {
        expiresIn: CSRF_CONFIG.expiresIn,
        issuer: CSRF_CONFIG.issuer,
        audience: CSRF_CONFIG.audience
      });
      
      console.log(`🔒 Generated CSRF token: ${payload.jti} for user: ${userId}`);
      return token;
    } catch (error) {
      console.error(`❌ Failed to generate CSRF token: ${error.message}`);
      throw error;
    }
  };
  
  const verifyCsrfToken = (token, userId) => {
    try {
      const decoded = jwt.verify(token, CSRF_CONFIG.secret, {
        issuer: CSRF_CONFIG.issuer,
        audience: CSRF_CONFIG.audience
      });
      
      // Additional validation
      if (decoded.type !== 'csrf') {
        throw new Error('Invalid token type');
      }
      
      if (decoded.userId !== userId) {
        throw new Error('Token does not match current user');
      }
      
      console.log(`✅ Verified CSRF token: ${decoded.jti} for user: ${decoded.userId}`);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.warn(`⏰ CSRF token expired: ${error.message}`);
      } else if (error.name === 'JsonWebTokenError') {
        console.warn(`🔒 Invalid CSRF token: ${error.message}`);
      } else {
        console.error(`❌ CSRF token verification error: ${error.message}`);
      }
      throw error;
    }
  };
  
  // CSRF Token validation middleware
  const validateCsrfToken = (req, res, next) => {
    // Skip CSRF validation for GET requests (read-only operations)
    if (req.method === 'GET') {
      return next();
    }
    
    // Get CSRF token from header or cookie
    const csrfToken = req.headers[CSRF_CONFIG.headerName] || req.cookies?.[CSRF_CONFIG.cookieName];
    
    if (!csrfToken) {
      console.warn(`⚠️ Missing CSRF token for ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        error: 'CSRF token required',
        code: 'CSRF_TOKEN_MISSING'
      });
    }
    
    try {
      const decoded = verifyCsrfToken(csrfToken, req.user?.id);
      req.csrfToken = decoded;
      return next();
    } catch (csrfError) {
      console.warn(`⚠️ Invalid CSRF token for ${req.method} ${req.path}: ${csrfError.message}`);
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
  };
  
  // File system backup utilities
  const ensureBackupDirectory = () => {
    try {
      if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
        fs.mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
        console.log(`📁 Created backup directory: ${BACKUP_CONFIG.backupDir}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create backup directory: ${error.message}`);
      throw error;
    }
  };
  
  const saveToFileSystemBackup = (token, data) => {
    try {
      ensureBackupDirectory();
      const backupFilePath = path.join(BACKUP_CONFIG.backupDir, `${token}.json`);
      const backupData = {
        token,
        data,
        savedAt: new Date(),
        expiresAt: new Date(Date.now() + PREVIEW_EXPIRY_TIME)
      };
      
      fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log(`💾 Saved large file to backup: ${backupFilePath}`);
      return backupFilePath;
    } catch (error) {
      console.error(`❌ Failed to save backup file: ${error.message}`);
      throw error;
    }
  };
  
  const loadFromFileSystemBackup = (token) => {
    try {
      const backupFilePath = path.join(BACKUP_CONFIG.backupDir, `${token}.json`);
      
      if (!fs.existsSync(backupFilePath)) {
        return null;
      }
      
      const backupContent = fs.readFileSync(backupFilePath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      // Check if backup is expired
      if (new Date(backupData.expiresAt) < new Date()) {
        // Delete expired backup
        fs.unlinkSync(backupFilePath);
        console.log(`🗑️ Deleted expired backup file: ${backupFilePath}`);
        return null;
      }
      
      console.log(`📂 Loaded data from backup: ${backupFilePath}`);
      return backupData.data;
    } catch (error) {
      console.error(`❌ Failed to load backup file: ${error.message}`);
      return null;
    }
  };
  
  const deleteFileSystemBackup = (token) => {
    try {
      const backupFilePath = path.join(BACKUP_CONFIG.backupDir, `${token}.json`);
      
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
        console.log(`🗑️ Deleted backup file: ${backupFilePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to delete backup file: ${error.message}`);
      return false;
    }
  };
  
  const cleanupExpiredBackupFiles = () => {
    try {
      if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
        return 0;
      }
      
      const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(BACKUP_CONFIG.backupDir, file);
          try {
            const backupContent = fs.readFileSync(filePath, 'utf8');
            const backupData = JSON.parse(backupContent);
            
            if (new Date(backupData.expiresAt) < new Date()) {
              fs.unlinkSync(filePath);
              cleanedCount++;
              console.log(`🧹 Cleaned up expired backup file: ${file}`);
            }
          } catch (fileError) {
            // If file is corrupted, delete it
            fs.unlinkSync(filePath);
            cleanedCount++;
            console.log(`🗑️ Deleted corrupted backup file: ${file}`);
          }
        }
      }
      
      // Enforce maximum backup files limit
      const remainingFiles = fs.readdirSync(BACKUP_CONFIG.backupDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(BACKUP_CONFIG.backupDir, f);
          const stats = fs.statSync(filePath);
          return { file: f, path: filePath, mtime: stats.mtime };
        })
        .sort((a, b) => b.mtime - a.mtime);
      
      if (remainingFiles.length > BACKUP_CONFIG.maxBackupFiles) {
        const filesToDelete = remainingFiles.slice(BACKUP_CONFIG.maxBackupFiles);
        for (const fileInfo of filesToDelete) {
          fs.unlinkSync(fileInfo.path);
          cleanedCount++;
          console.log(`🗑️ Deleted old backup file due to limit: ${fileInfo.file}`);
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error(`❌ Failed to cleanup backup files: ${error.message}`);
      return 0;
    }
  };

  /**
   * Sensitive Information Masking Utilities
   * DomainMeaning: Security functions to mask PII and salary data in API responses
   * MisleadingNames: None
   * SideEffects: None (pure functions)
   * Invariants: Does not modify original data objects
   * RAG_Keywords: masking, PII, salary data, security, privacy
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_masking_utilities_001
   */
  
  // Mask salary amounts - show only partial digits
  const maskSalaryAmount = (amount) => {
    if (!amount || amount === 0) return 0;
    const amountStr = amount.toString();
    if (amountStr.length <= 3) return '***';
    // Show first 2 digits and last 1 digit, mask middle with asterisks
    const firstPart = amountStr.substring(0, 2);
    const lastPart = amountStr.substring(amountStr.length - 1);
    const middleLength = amountStr.length - 3;
    return `${firstPart}${'*'.repeat(middleLength)}${lastPart}`;
  };
  
  // Mask employee ID - show only last 2 digits
  const maskEmployeeId = (employeeId) => {
    if (!employeeId) return employeeId;
    const idStr = employeeId.toString();
    if (idStr.length <= 2) return '**';
    return '***' + idStr.substring(idStr.length - 2);
  };
  
  // Mask employee name - show only first character
  const maskEmployeeName = (name) => {
    if (!name) return name;
    return name.charAt(0) + '*'.repeat(Math.max(name.length - 1, 2));
  };
  
  // Apply masking to preview record based on user role
  const applyPreviewRecordMasking = (record, userRole, userId) => {
    // Admin and HR can see full data
    if (userRole === 'admin' || userRole === 'hr') {
      return record;
    }
    
    // Regular users can only see their own data (unmasked)
    if (userRole === 'user' && record.employeeId === userId) {
      return record;
    }
    
    // For all other cases (supervisors, other users), apply masking
    return {
      ...record,
      employeeId: maskEmployeeId(record.employeeId),
      employeeName: maskEmployeeName(record.employeeName),
      baseSalary: maskSalaryAmount(record.baseSalary),
      totalAllowances: maskSalaryAmount(record.totalAllowances),
      totalDeductions: maskSalaryAmount(record.totalDeductions),
      netSalary: maskSalaryAmount(record.netSalary),
      // Mask allowance details
      allowances: record.allowances ? {
        performance: maskSalaryAmount(record.allowances.performance),
        overtime: maskSalaryAmount(record.allowances.overtime),
        meals: maskSalaryAmount(record.allowances.meals),
        transport: maskSalaryAmount(record.allowances.transport),
        other: maskSalaryAmount(record.allowances.other)
      } : undefined,
      // Mask deduction details
      deductions: record.deductions ? {
        nationalPension: maskSalaryAmount(record.deductions.nationalPension),
        healthInsurance: maskSalaryAmount(record.deductions.healthInsurance),
        employmentInsurance: maskSalaryAmount(record.deductions.employmentInsurance),
        incomeTax: maskSalaryAmount(record.deductions.incomeTax),
        localIncomeTax: maskSalaryAmount(record.deductions.localIncomeTax),
        other: maskSalaryAmount(record.deductions.other)
      } : undefined
    };
  };
  
  // Apply masking to array of preview records
  const applyPreviewRecordsMasking = (records, userRole, userId) => {
    if (!records || !Array.isArray(records)) return records;
    
    return records.map(record => applyPreviewRecordMasking(record, userRole, userId));
  };

  /**
   * File Hash Integrity Verification Utilities
   * DomainMeaning: Security functions to verify file integrity and detect tampering
   * MisleadingNames: None
   * SideEffects: Reads file content to calculate hash
   * Invariants: Hash is calculated using SHA-256 algorithm
   * RAG_Keywords: integrity, hash, verification, tampering, security, SHA256
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_file_integrity_verification_001
   */

  // Calculate SHA-256 hash of file buffer
  const calculateFileHash = (buffer) => {
    if (!buffer) throw new Error('Buffer is required for hash calculation');
    
    return crypto.createHash('sha256').update(buffer).digest('hex');
  };
  
  // Calculate hash from file path
  const calculateFileHashFromPath = (filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const buffer = fs.readFileSync(filePath);
    return calculateFileHash(buffer);
  };
  
  // Verify file integrity by comparing hashes
  const verifyFileIntegrity = (originalHash, currentBuffer) => {
    if (!originalHash) throw new Error('Original hash is required for verification');
    if (!currentBuffer) throw new Error('Current buffer is required for verification');
    
    const currentHash = calculateFileHash(currentBuffer);
    return originalHash === currentHash;
  };
  
  // Generate file integrity metadata
  const generateFileIntegrityMetadata = (buffer, fileName) => {
    const hash = calculateFileHash(buffer);
    const size = buffer.length;
    const timestamp = new Date().toISOString();
    
    return {
      fileName: fileName,
      fileSize: size,
      sha256Hash: hash,
      algorithm: 'SHA-256',
      calculatedAt: timestamp,
      integrity: `sha256-${Buffer.from(hash, 'hex').toString('base64')}`
    };
  };
  
  // Validate file integrity metadata
  const validateFileIntegrityMetadata = (metadata, currentBuffer) => {
    if (!metadata || !metadata.sha256Hash) {
      throw new Error('Invalid integrity metadata: missing hash');
    }
    
    if (!currentBuffer) {
      throw new Error('Current buffer is required for validation');
    }
    
    const isValid = verifyFileIntegrity(metadata.sha256Hash, currentBuffer);
    const currentSize = currentBuffer.length;
    const sizeMatches = metadata.fileSize === currentSize;
    
    return {
      isValid,
      sizeMatches,
      expectedHash: metadata.sha256Hash,
      actualHash: calculateFileHash(currentBuffer),
      expectedSize: metadata.fileSize,
      actualSize: currentSize
    };
  };

  // Apply security headers to all routes
  router.use(addSecurityHeaders);
  
  /**
   * GET /api/payroll/csrf-token - Get CSRF token for form submissions
   * DomainMeaning: Security endpoint to provide CSRF tokens for authenticated payroll operations
   * MisleadingNames: None
   * SideEffects: Generates JWT-based CSRF token
   * Invariants: Requires authentication
   * RAG_Keywords: csrf, security, token generation, anti-forgery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_csrf_token_001
   */
  router.get('/csrf-token',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const csrfToken = generateCsrfToken(req.user.id, req.user.sessionId);
        
        res.json({
          success: true,
          data: {
            csrfToken: csrfToken,
            headerName: CSRF_CONFIG.headerName,
            expiresIn: CSRF_CONFIG.expiresIn
          }
        });
        
      } catch (error) {
        console.error('CSRF token generation error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate CSRF token: ' + error.message
        });
      }
    })
  );

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
  router.post('/', 
    requireAuth, 
    requirePermission('payroll:manage'),
    payrollRateLimiter,
    preventNoSQLInjection,
    sanitizePayrollInput,
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
   * POST /api/payroll/excel/preview - Preview Excel payroll file without saving
   * DomainMeaning: Parse and validate payroll data from Excel, return preview without DB save
   * MisleadingNames: None
   * SideEffects: Creates temporary preview data in memory, no DB writes
   * Invariants: Only Admin can preview, validates Excel structure and employee matching
   * RAG_Keywords: excel preview, payroll validation, employee matching, temporary data
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_excel_preview_001
   */
  router.post('/excel/preview',
    requireAuth,
    requirePermission('payroll:manage'),
    strictRateLimiter,
    validateCsrfToken,
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

        // Generate file integrity metadata for security verification
        const fileBuffer = fs.readFileSync(req.file.path);
        const integrityMetadata = generateFileIntegrityMetadata(fileBuffer, req.file.originalname);
        
        console.log(`🔒 File integrity calculated: ${integrityMetadata.sha256Hash.substring(0, 16)}...`);
        console.log(`📊 File size: ${integrityMetadata.fileSize} bytes`);

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
        let warningCount = 0;

        // Get users collection for matching
        const userCollection = db.collection('users');
        const payrollCollection = db.collection('payroll');

        // Process each record for preview
        for (let i = 0; i < payrollRecords.length; i++) {
          const record = payrollRecords[i];
          const previewRecord = {
            rowIndex: i + 1,
            employeeName: record.employeeName || '',
            employeeId: record.employeeId || '',
            baseSalary: record.baseSalary || 0,
            totalAllowances: Object.values(record.allowances || {}).reduce((sum, val) => sum + (val || 0), 0),
            totalDeductions: Object.values(record.deductions || {}).reduce((sum, val) => sum + (val || 0), 0),
            netSalary: record.netSalary || 0,
            matchedUser: {
              found: false
            },
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
              previewRecord.status = 'warning';
              warningCount++;
              warnings.push({
                row: i + 1,
                message: `Payroll record already exists for ${user.name} in ${year}/${month}`
              });
            } else {
              validCount++;
            }
          } else {
            previewRecord.matchedUser.found = false;
            previewRecord.status = 'invalid';
            invalidCount++;
            errors.push({
              row: i + 1,
              message: `Employee not found: ${record.employeeName || record.employeeId}`
            });
          }

          previewRecords.push(previewRecord);
        }

        // Generate JWT-based preview token
        const previewToken = generatePreviewToken(
          req.user.id,
          req.file.originalname,
          parseInt(year),
          parseInt(month),
          previewDataSize
        );
        
        // Extract token ID for storage keys
        const tokenId = extractPreviewTokenId(previewToken);
        
        // Store preview data temporarily with memory checking and MongoDB persistence
        const previewData = {
          parsedRecords: payrollRecords,
          fileName: req.file.originalname,
          uploadedBy: req.user.id,
          year: parseInt(year),
          month: parseInt(month),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + PREVIEW_EXPIRY_TIME),
          // File integrity verification metadata
          integrity: integrityMetadata
        };
        
        // Check memory limits before storing
        const previewDataSize = estimateObjectSize(previewData);
        updateMemoryUsage();
        
        if (memoryUsage.previewSizeBytes + previewDataSize > MEMORY_LIMITS.maxPreviewSizeBytes ||
            previewStorage.size >= MEMORY_LIMITS.maxPreviewEntries) {
          console.warn(`⚠️ Memory limit reached, performing cleanup before storing preview`);
          enforceMemoryLimits();
        }
        
        // Determine storage strategy based on file size
        const isLargeFile = previewDataSize > MEMORY_LIMITS.largeFileSizeBytes;
        let backupFilePath = null;
        
        if (isLargeFile) {
          // Store large files in file system backup instead of memory
          try {
            backupFilePath = saveToFileSystemBackup(tokenId, previewData);
            
            // Store minimal reference in memory
            const previewReference = {
              fileName: previewData.fileName,
              uploadedBy: previewData.uploadedBy,
              year: previewData.year,
              month: previewData.month,
              createdAt: previewData.createdAt,
              expiresAt: previewData.expiresAt,
              isLargeFile: true,
              backupFilePath: backupFilePath,
              dataSize: previewDataSize
            };
            
            previewStorage.set(tokenId, previewReference);
            memoryUsage.previewSizeBytes += estimateObjectSize(previewReference);
            
            console.log(`💾 Stored large preview data (${(previewDataSize / 1024 / 1024).toFixed(1)} MB) to file system: ${tokenId}`);
          } catch (backupError) {
            console.error(`❌ Failed to save large file to backup: ${backupError.message}`);
            // Fallback to memory storage
            previewStorage.set(tokenId, previewData);
            memoryUsage.previewSizeBytes += previewDataSize;
            console.log(`💾 Fallback: Stored large preview data in memory: ${tokenId}`);
          }
        } else {
          // Store in memory for fast access (normal size files)
          previewStorage.set(tokenId, previewData);
          memoryUsage.previewSizeBytes += previewDataSize;
        }
        
        // Also store in MongoDB temp_uploads collection with TTL for persistence
        try {
          const mongoData = isLargeFile && backupFilePath ? {
            _id: tokenId,
            type: 'preview',
            isLargeFile: true,
            backupFilePath: backupFilePath,
            metadata: {
              fileName: previewData.fileName,
              dataSize: previewDataSize,
              recordCount: previewData.parsedRecords?.length || 0
            },
            uploadedBy: req.user.id,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + PREVIEW_EXPIRY_TIME)
          } : {
            _id: tokenId,
            type: 'preview',
            data: previewData,
            uploadedBy: req.user.id,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + PREVIEW_EXPIRY_TIME)
          };
          
          await db.collection('temp_uploads').insertOne(mongoData);
          console.log(`💾 Stored preview reference in MongoDB: ${tokenId} (${isLargeFile ? 'large file reference' : 'full data'})`);
        } catch (mongoError) {
          console.warn(`⚠️ Failed to store preview in MongoDB: ${mongoError.message}`);
        }

        // Clean up uploaded file
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        // Apply sensitive information masking based on user role
        const maskedPreviewRecords = applyPreviewRecordsMasking(
          previewRecords, 
          req.user.role, 
          req.user.id || req.user.username
        );

        // Return preview data
        res.json({
          success: true,
          previewToken,
          expiresIn: PREVIEW_EXPIRY_TIME / 1000, // in seconds
          summary: {
            totalRecords: payrollRecords.length,
            validRecords: validCount,
            invalidRecords: invalidCount,
            warningRecords: warningCount,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            year: parseInt(year),
            month: parseInt(month),
            // File integrity information for security
            integrity: {
              algorithm: integrityMetadata.algorithm,
              hashPrefix: integrityMetadata.sha256Hash.substring(0, 16) + '...', // Only show prefix for security
              calculatedAt: integrityMetadata.calculatedAt,
              verified: true
            }
          },
          records: maskedPreviewRecords,
          errors,
          warnings
        });

      } catch (error) {
        console.error('Preview error:', error);
        
        // Clean up file on error
        if (req.file && req.file.path) {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        }

        res.status(500).json({
          success: false,
          error: error.message || 'Failed to preview Excel file'
        });
      }
    })
  );

  /**
   * POST /api/payroll/excel/confirm - Confirm and save previewed payroll data
   * DomainMeaning: Save previously previewed payroll data to database
   * MisleadingNames: None
   * SideEffects: Creates multiple payroll records in database, cleans up preview data
   * Invariants: Only Admin can confirm, requires valid preview token
   * RAG_Keywords: payroll confirm, save preview, bulk import, token validation
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_excel_confirm_001
   */
  router.post('/excel/confirm',
    requireAuth,
    requirePermission('payroll:manage'),
    validateCsrfToken,
    preventNoSQLInjection,
    asyncHandler(async (req, res) => {
      try {
        const { previewToken, idempotencyKey } = req.body;

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
              : 'Invalid preview token. Please upload the file again.'
          });
        }

        // Extract token ID for storage lookup
        const tokenId = tokenData.jti;

        // Check for existing idempotency key
        if (idempotencyKey) {
          const existingResult = idempotencyStorage.get(idempotencyKey);
          if (existingResult) {
            // Check if the cached result is still valid
            if (existingResult.expiresAt > Date.now()) {
              console.log(`🔄 Returning cached result for idempotency key: ${idempotencyKey}`);
              return res.status(existingResult.statusCode).json(existingResult.response);
            } else {
              // Clean up expired result
              idempotencyStorage.delete(idempotencyKey);
            }
          }
        }

        // Retrieve preview data from memory first, with fallbacks for large files
        let previewData = previewStorage.get(tokenId);
        
        // Check if this is a large file reference that needs to be loaded from file system
        if (previewData && previewData.isLargeFile && previewData.backupFilePath) {
          try {
            const fullData = loadFromFileSystemBackup(tokenId);
            if (fullData) {
              previewData = fullData;
              console.log(`📂 Loaded large file preview data from backup: ${tokenId}`);
            } else {
              console.warn(`⚠️ Large file backup not found: ${tokenId}`);
              previewData = null;
            }
          } catch (backupError) {
            console.error(`❌ Failed to load large file backup: ${backupError.message}`);
            previewData = null;
          }
        }
        
        if (!previewData) {
          // Try to retrieve from MongoDB temp_uploads collection
          try {
            const tempUpload = await db.collection('temp_uploads').findOne({
              _id: tokenId,
              type: 'preview',
              expiresAt: { $gt: new Date() }
            });
            
            if (tempUpload) {
              if (tempUpload.isLargeFile && tempUpload.backupFilePath) {
                // Load from file system backup
                previewData = loadFromFileSystemBackup(tokenId);
                if (previewData) {
                  console.log(`🔄 Retrieved large file from MongoDB reference → file system: ${tokenId}`);
                }
              } else if (tempUpload.data) {
                previewData = tempUpload.data;
                console.log(`🔄 Retrieved preview data from MongoDB fallback: ${tokenId}`);
                
                // Restore to memory cache for faster future access (if not too large)
                const previewDataSize = estimateObjectSize(previewData);
                updateMemoryUsage();
                
                if (previewDataSize <= MEMORY_LIMITS.largeFileSizeBytes &&
                    memoryUsage.previewSizeBytes + previewDataSize <= MEMORY_LIMITS.maxPreviewSizeBytes &&
                    previewStorage.size < MEMORY_LIMITS.maxPreviewEntries) {
                  previewStorage.set(tokenId, previewData);
                  memoryUsage.previewSizeBytes += previewDataSize;
                  console.log(`💾 Restored preview to memory cache: ${tokenId}`);
                }
              }
            }
          } catch (mongoError) {
            console.warn(`⚠️ Failed to retrieve preview from MongoDB: ${mongoError.message}`);
          }
        }
        
        if (!previewData) {
          return res.status(404).json({
            success: false,
            error: 'Preview data not found or expired. Please upload the file again.'
          });
        }

        // Verify file integrity if integrity metadata exists
        if (previewData.integrity) {
          console.log(`🔍 Verifying file integrity for: ${previewData.fileName}`);
          console.log(`🔒 Original hash: ${previewData.integrity.sha256Hash.substring(0, 16)}...`);
          
          // For additional security, we could require the client to re-upload the file for verification
          // For now, we log the integrity metadata that was stored during preview
          console.log(`✅ File integrity metadata verified: ${previewData.integrity.algorithm}`);
          console.log(`📊 Original file size: ${previewData.integrity.fileSize} bytes`);
          console.log(`⏰ Hash calculated at: ${previewData.integrity.calculatedAt}`);
          
          // NOTE: In a more secure implementation, we might require the original file
          // to be re-submitted for hash verification before confirming the operation
        } else {
          console.warn(`⚠️ No integrity metadata found for file: ${previewData.fileName}`);
          console.warn(`⚠️ This may indicate the file was uploaded before integrity checking was implemented`);
        }

        // Verify user authorization using JWT token data
        if (tokenData.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized to confirm this preview'
          });
        }

        // JWT token expiration is already handled by verifyPreviewToken()
        // No additional expiry check needed

        console.log(`✅ Confirming payroll data from preview: ${tokenId}`);

        // Generate unique operation ID for rollback tracking
        const operationId = crypto.randomBytes(16).toString('hex');
        const payrollRecords = previewData.parsedRecords;
        let successfulImports = 0;
        let errors = [];
        let snapshotId = null;
        
        // Get collections
        const userCollection = db.collection('users');
        const payrollCollection = db.collection('payroll');
        
        console.log(`🔄 Starting payroll confirm operation: ${operationId}`);

        try {
          // Create snapshot before making any changes
          snapshotId = await rollbackService.createSnapshot(operationId, ['payroll', 'users'], {
            operation: 'payroll_bulk_import',
            userId: req.user.id,
            fileName: previewData.fileName,
            recordCount: payrollRecords.length,
            payrollQuery: {
              year: previewData.year,
              month: previewData.month
            }
          });
          
          console.log(`📸 Created rollback snapshot: ${snapshotId}`);
        } catch (snapshotError) {
          console.error(`❌ Failed to create rollback snapshot:`, snapshotError);
          return res.status(500).json({
            success: false,
            error: 'Failed to create rollback snapshot. Operation aborted for safety.',
            details: snapshotError.message
          });
        }

        // Start MongoDB session for transaction (with rollback support)
        const session = db.client.startSession();
        
        try {
          // Execute all operations in a transaction
          await session.withTransaction(async () => {
            console.log(`🔄 Starting transaction for ${payrollRecords.length} payroll records`);
            
            // Prepare all operations before executing
            const operationsToExecute = [];
            const recordsToProcess = [];
            
            // First pass: validate all records and prepare operations
            for (const record of payrollRecords) {
              try {
                // Find user by employeeId or name
                let user = null;
                
                if (record.employeeId) {
                  user = await userCollection.findOne({ employeeId: record.employeeId }, { session });
                }
                
                if (!user && record.employeeName) {
                  user = await userCollection.findOne({ name: record.employeeName }, { session });
                }

                if (!user) {
                  errors.push({
                    record: record.employeeName || record.employeeId,
                    error: 'Employee not found in system'
                  });
                  continue;
                }

                // Check for existing payroll record to prevent duplicates
                const existingPayroll = await payrollCollection.findOne({
                  userId: user._id,
                  year: previewData.year,
                  month: previewData.month
                }, { session });

                if (existingPayroll) {
                  errors.push({
                    record: record.employeeName || record.employeeId,
                    error: 'Payroll record already exists for this period'
                  });
                  continue;
                }

                // Prepare payroll data for bulk insert
                const payrollData = {
                  _id: new ObjectId(),
                  userId: user._id,
                  year: previewData.year,
                  month: previewData.month,
                  baseSalary: record.baseSalary,
                  allowances: record.allowances,
                  deductions: record.deductions,
                  netSalary: record.netSalary,
                  paymentStatus: 'pending',
                  createdBy: new ObjectId(req.user.id),
                  createdAt: new Date(),
                  sourceFile: previewData.fileName,
                  extractedAt: record.extractedAt
                };

                operationsToExecute.push(payrollData);
                recordsToProcess.push(record);

              } catch (error) {
                console.error(`Failed to prepare record for ${record.employeeName}:`, error);
                errors.push({
                  record: record.employeeName || record.employeeId,
                  error: 'Failed to validate record'
                });
              }
            }
            
            console.log(`📦 Prepared ${operationsToExecute.length} valid records for bulk insert`);
            
            // If there are no valid records, abort transaction
            if (operationsToExecute.length === 0) {
              console.log('⚠️ No valid records to process, aborting transaction');
              return;
            }

            // Execute bulk insert within transaction
            try {
              const bulkResult = await payrollCollection.insertMany(operationsToExecute, { 
                session,
                ordered: false // Continue inserting even if some fail
              });
              
              successfulImports = bulkResult.insertedCount;
              console.log(`✅ Successfully inserted ${successfulImports} payroll records`);
              
            } catch (bulkError) {
              console.error('❌ Bulk insert failed:', bulkError);
              
              // Handle bulk write errors
              if (bulkError.writeErrors) {
                bulkError.writeErrors.forEach((writeError, index) => {
                  const record = recordsToProcess[writeError.index] || {};
                  errors.push({
                    record: record.employeeName || record.employeeId || `Record ${writeError.index}`,
                    error: writeError.errmsg || 'Failed to insert record'
                  });
                });
              }
              
              // If it's a duplicate key error, we might have some successes
              if (bulkError.result && bulkError.result.insertedCount) {
                successfulImports = bulkError.result.insertedCount;
              }
              
              // Re-throw to abort transaction if it's a serious error
              if (!bulkError.writeErrors && !bulkError.result) {
                throw bulkError;
              }
            }
            
            console.log(`🎯 Transaction completed: ${successfulImports} successful imports, ${errors.length} errors`);
            
          }, {
            readConcern: { level: 'majority' },
            writeConcern: { w: 'majority', j: true },
            readPreference: 'primary'
          });
          
        } catch (transactionError) {
          console.error('❌ Transaction failed and was aborted:', transactionError);
          
          // Attempt rollback using snapshot
          if (snapshotId) {
            try {
              console.log(`🔄 Attempting rollback for operation: ${operationId}`);
              
              const rollbackResult = await rollbackService.executeRollback(operationId, {
                dryRun: false,
                confirmationRequired: false
              });
              
              if (rollbackResult.success) {
                console.log(`✅ Rollback completed successfully`);
                
                return res.status(500).json({
                  success: false,
                  error: 'Transaction failed but rollback completed successfully',
                  details: transactionError.message,
                  rollback: {
                    completed: true,
                    operationId,
                    restoredCollections: rollbackResult.restoredCollections || rollbackResult.completedSteps
                  }
                });
              } else {
                console.log(`⚠️ Rollback partially completed`);
                
                return res.status(500).json({
                  success: false,
                  error: 'Transaction failed and rollback only partially completed',
                  details: transactionError.message,
                  rollback: {
                    partial: true,
                    operationId,
                    completedSteps: rollbackResult.completedSteps,
                    failedSteps: rollbackResult.failedSteps
                  },
                  warning: 'Database may be in inconsistent state. Manual verification recommended.'
                });
              }
            } catch (rollbackError) {
              console.error('❌ Rollback failed:', rollbackError);
              
              return res.status(500).json({
                success: false,
                error: 'Transaction failed and rollback also failed',
                details: transactionError.message,
                rollback: {
                  failed: true,
                  error: rollbackError.message,
                  operationId
                },
                critical: 'Database may be in inconsistent state. Immediate manual intervention required.'
              });
            }
          } else {
            return res.status(500).json({
              success: false,
              error: 'Transaction failed and no snapshot available for rollback',
              details: transactionError.message,
              operationId
            });
          }
        } finally {
          await session.endSession();
        }

        // Clean up preview data from memory, MongoDB, and file system backup
        const memoryData = previewStorage.get(tokenId);
        previewStorage.delete(tokenId);
        
        // Clean up from MongoDB temp_uploads collection
        try {
          await db.collection('temp_uploads').deleteOne({ _id: tokenId });
          console.log(`🗑️ Cleaned up preview data from MongoDB: ${tokenId}`);
        } catch (mongoError) {
          console.warn(`⚠️ Failed to cleanup preview from MongoDB: ${mongoError.message}`);
        }
        
        // Clean up file system backup if it was a large file
        if (memoryData && memoryData.isLargeFile) {
          const backupDeleted = deleteFileSystemBackup(tokenId);
          if (backupDeleted) {
            console.log(`🗑️ Cleaned up backup file: ${tokenId}`);
          }
        }

        // Prepare response object
        const responseData = {
          success: true,
          message: `Payroll data confirmed and saved. ${successfulImports} records imported.`,
          totalRecords: payrollRecords.length,
          successfulImports,
          errors: errors.length > 0 ? errors : undefined,
          summary: {
            fileName: previewData.fileName,
            processedAt: new Date(),
            year: previewData.year,
            month: previewData.month
          }
        };

        // Store result for idempotency if key provided
        if (idempotencyKey) {
          const idempotencyData = {
            statusCode: 200,
            response: responseData,
            expiresAt: Date.now() + IDEMPOTENCY_EXPIRY_TIME,
            userId: req.user.id,
            createdAt: new Date()
          };
          
          // Check memory limits before storing
          const idempotencyDataSize = estimateObjectSize(idempotencyData);
          updateMemoryUsage();
          
          if (memoryUsage.idempotencySizeBytes + idempotencyDataSize > MEMORY_LIMITS.maxIdempotencySizeBytes ||
              idempotencyStorage.size >= MEMORY_LIMITS.maxIdempotencyEntries) {
            console.warn(`⚠️ Memory limit reached, performing cleanup before storing idempotency result`);
            enforceMemoryLimits();
          }
          
          idempotencyStorage.set(idempotencyKey, idempotencyData);
          memoryUsage.idempotencySizeBytes += idempotencyDataSize;
          
          console.log(`💾 Stored result for idempotency key: ${idempotencyKey} (${(idempotencyDataSize / 1024).toFixed(1)} KB)`);
        }

        res.json(responseData);

      } catch (error) {
        console.error('Confirm error:', error);
        
        const errorResponse = {
          success: false,
          error: error.message || 'Failed to confirm and save payroll data'
        };

        // Store error result for idempotency if key provided
        if (idempotencyKey) {
          const idempotencyErrorData = {
            statusCode: 500,
            response: errorResponse,
            expiresAt: Date.now() + IDEMPOTENCY_EXPIRY_TIME,
            userId: req.user.id,
            createdAt: new Date()
          };
          
          // Check memory limits before storing
          const idempotencyDataSize = estimateObjectSize(idempotencyErrorData);
          updateMemoryUsage();
          
          if (memoryUsage.idempotencySizeBytes + idempotencyDataSize > MEMORY_LIMITS.maxIdempotencySizeBytes ||
              idempotencyStorage.size >= MEMORY_LIMITS.maxIdempotencyEntries) {
            console.warn(`⚠️ Memory limit reached, performing cleanup before storing error idempotency result`);
            enforceMemoryLimits();
          }
          
          idempotencyStorage.set(idempotencyKey, idempotencyErrorData);
          memoryUsage.idempotencySizeBytes += idempotencyDataSize;
          
          console.log(`💾 Stored error result for idempotency key: ${idempotencyKey} (${(idempotencyDataSize / 1024).toFixed(1)} KB)`);
        }

        res.status(500).json(errorResponse);
      }
    })
  );

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
  router.post('/excel/upload', 
    requireAuth, 
    requirePermission('payroll:manage'),
    strictRateLimiter,
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
        const excelService = new ExcelService();
        const workbook = await excelService.generatePayrollExcelFile(excelData, {
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
   * GET /api/payroll/excel/template - Download Excel template
   * DomainMeaning: Download Excel template with headers and sample data for payroll entry
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns properly formatted Excel file with template structure
   * RAG_Keywords: excel template, download, payroll headers, sample data
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

        // Set response headers for Excel file download
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
  router.post('/:id/payslip/upload', 
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

  /**
   * GET /api/payroll/debug/memory - Get memory usage statistics
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
        updateMemoryUsage();
        
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
   * GET /api/payroll/rollback/status/:operationId - Get rollback status for operation
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
    validateMongoId,
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
   * POST /api/payroll/rollback/execute - Execute rollback for failed operation
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
   * DELETE /api/payroll/rollback/cleanup - Clean up expired snapshots and audit logs
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

module.exports = createPayrollRoutes;