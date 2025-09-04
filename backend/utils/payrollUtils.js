/**
 * AI-HEADER
 * intent: Shared utilities for payroll system operations
 * domain_meaning: Common functions and configurations used across payroll routes
 * misleading_names: None
 * data_contracts: JWT tokens, CSRF tokens, memory management, file backup utilities
 * PII: Contains functions to mask employee names and salary data
 * invariants: Memory limits enforced, backup retention period respected
 * rag_keywords: payroll utilities, memory management, token generation, CSRF protection, backup, masking
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
const updateMemoryUsage = (previewStorage, idempotencyStorage) => {
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
const enforceMemoryLimits = (previewStorage, idempotencyStorage) => {
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
const cleanupExpiredPreviews = (previewStorage) => {
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
const cleanupExpiredIdempotencyKeys = (idempotencyStorage) => {
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

const saveToFileSystemBackup = (token, data, expiryTime) => {
  try {
    ensureBackupDirectory();
    const backupFilePath = path.join(BACKUP_CONFIG.backupDir, `${token}.json`);
    const backupData = {
      token,
      data,
      savedAt: new Date(),
      expiresAt: new Date(Date.now() + expiryTime)
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

// Combined cleanup function with memory monitoring and MongoDB cleanup
const performCleanupAndMonitoring = async (previewStorage, idempotencyStorage, db) => {
  const startTime = Date.now();
  
  // Update current memory usage
  updateMemoryUsage(previewStorage, idempotencyStorage);
  
  // Check for warnings before cleanup
  checkMemoryWarnings();
  
  // Cleanup expired entries from memory
  const previewCleaned = cleanupExpiredPreviews(previewStorage);
  const idempotencyCleaned = cleanupExpiredIdempotencyKeys(idempotencyStorage);
  
  // Cleanup expired entries from MongoDB temp_uploads collection
  let mongoCleaned = 0;
  if (db) {
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
  }
  
  // Cleanup expired file system backup files
  const backupCleaned = cleanupExpiredBackupFiles();
  if (backupCleaned > 0) {
    console.log(`🧹 Backup file cleanup: removed ${backupCleaned} expired/old files`);
  }
  
  // Enforce memory limits if necessary
  const limitEnforced = enforceMemoryLimits(previewStorage, idempotencyStorage);
  
  // Update memory usage after cleanup
  updateMemoryUsage(previewStorage, idempotencyStorage);
  
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

module.exports = {
  // Configuration exports
  MEMORY_LIMITS,
  BACKUP_CONFIG,
  JWT_PREVIEW_CONFIG,
  CSRF_CONFIG,
  
  // Memory management functions
  estimateObjectSize,
  updateMemoryUsage,
  enforceMemoryLimits,
  checkMemoryWarnings,
  cleanupExpiredPreviews,
  cleanupExpiredIdempotencyKeys,
  performCleanupAndMonitoring,
  
  // JWT Preview Token utilities
  generatePreviewToken,
  verifyPreviewToken,
  extractPreviewTokenId,
  
  // CSRF Token utilities
  generateCsrfToken,
  verifyCsrfToken,
  validateCsrfToken,
  
  // File system backup utilities
  ensureBackupDirectory,
  saveToFileSystemBackup,
  loadFromFileSystemBackup,
  deleteFileSystemBackup,
  cleanupExpiredBackupFiles,
  
  // Masking utilities
  maskSalaryAmount,
  maskEmployeeId,
  maskEmployeeName,
  applyPreviewRecordMasking,
  applyPreviewRecordsMasking,
  
  // File integrity utilities
  calculateFileHash,
  calculateFileHashFromPath,
  verifyFileIntegrity,
  generateFileIntegrityMetadata,
  validateFileIntegrityMetadata,
  
  // Memory usage object (for monitoring)
  memoryUsage
};