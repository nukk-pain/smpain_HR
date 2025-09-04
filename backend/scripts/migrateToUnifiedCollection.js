/**
 * AI-HEADER
 * Intent: Migrate 3 separate document collections to unified collection
 * Domain Meaning: Data consolidation and schema normalization
 * Misleading Names: None
 * Data Contracts: Transforms legacy schemas to unified schema v2.0
 * PII: Migrates all user document data
 * Invariants: No data loss, preserve all fields, handle duplicates
 * RAG Keywords: migration, unified collection, data transformation
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu',
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 100,
  CHECKPOINT_INTERVAL: parseInt(process.env.CHECKPOINT_INTERVAL) || 50,
  DRY_RUN: process.env.DRY_RUN === 'true',
  VERBOSE: process.env.VERBOSE === 'true',
  REORGANIZE_FILES: process.env.REORGANIZE_FILES === 'true',
  LOG_DIR: path.join(__dirname, '../../migration_logs')
};

/**
 * Migration tracker for statistics and checkpoints
 */
class MigrationTracker {
  constructor() {
    this.stats = {
      payslips: { total: 0, migrated: 0, duplicates: 0, errors: 0, missing_files: 0 },
      payroll_documents: { total: 0, migrated: 0, duplicates: 0, errors: 0, missing_files: 0 },
      documents: { total: 0, migrated: 0, duplicates: 0, errors: 0, missing_files: 0 },
      overall: { startTime: Date.now(), checkpoints: [] }
    };
    this.errors = [];
    this.duplicateMap = new Map();
  }

  async saveCheckpoint(collection, lastId) {
    const checkpoint = {
      collection,
      lastId,
      timestamp: new Date(),
      stats: { ...this.stats }
    };
    this.stats.overall.checkpoints.push(checkpoint);
    
    // Save checkpoint to file
    const checkpointPath = path.join(CONFIG.LOG_DIR, `checkpoint_${Date.now()}.json`);
    await fs.mkdir(CONFIG.LOG_DIR, { recursive: true });
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
    
    if (CONFIG.VERBOSE) {
      console.log(`  💾 Checkpoint saved: ${checkpointPath}`);
    }
  }

  logError(collection, docId, error) {
    this.errors.push({
      collection,
      documentId: docId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
    this.stats[collection].errors++;
  }
}

/**
 * Transform payslips collection document to unified schema
 */
async function transformPayslipToUnified(doc, userMap) {
  const user = userMap.get(doc.userId?.toString()) || {};
  const fileHash = doc.fileName ? 
    crypto.createHash('sha256').update(doc.fileName).digest('hex') : null;
  
  return {
    // Preserve original ID if desired
    userId: doc.userId,
    documentType: 'payslip',
    documentCategory: '급여명세서',
    
    file: {
      uniqueId: doc.uniqueFileName || uuidv4(),
      systemName: doc.fileName || `payslip_${doc.year}_${doc.month}.pdf`,
      originalName: doc.originalFilename || doc.fileName || 'payslip.pdf',
      displayName: `${doc.year}년 ${doc.month}월 급여명세서`,
      path: doc.filePath || path.join('/uploads/payslips/', doc.fileName || 'unknown.pdf'),
      size: doc.fileSize || 0,
      mimeType: 'application/pdf',
      hash: fileHash,
      encoding: doc.encoding || 'UTF-8',
      isEncrypted: false
    },
    
    temporal: {
      year: doc.year,
      month: doc.month,
      yearMonth: doc.yearMonth || `${doc.year}-${String(doc.month).padStart(2, '0')}`,
      documentDate: doc.paymentDate || new Date(doc.year, doc.month - 1, 25),
      period: {
        start: new Date(doc.year, doc.month - 1, 1),
        end: new Date(doc.year, doc.month, 0)
      }
    },
    
    userInfo: {
      name: user.name || doc.userName || 'Unknown',
      employeeId: user.employeeId || doc.employeeId,
      department: user.department || doc.department,
      position: user.position,
      email: user.email,
      companyName: doc.companyName || 'SM Entertainment',
      employmentType: user.employmentType || '정규직'
    },
    
    status: {
      current: doc.deleted ? 'deleted' : 'active',
      isDeleted: doc.deleted || false,
      deletedAt: doc.deletedAt,
      deletedBy: doc.deletedBy,
      deleteReason: doc.deleteReason
    },
    
    audit: {
      createdAt: doc.createdAt || doc.uploadedAt || new Date(),
      createdBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt || doc.createdAt || new Date(),
      uploadedBy: doc.uploadedBy,
      lastModifiedAt: doc.updatedAt || doc.uploadedAt || new Date(),
      version: 1
    },
    
    metadata: {
      payroll: {
        payrollId: doc.payrollId,
        paymentDate: doc.paymentDate
      },
      parsed: {
        employeeName: doc.parsedEmployeeName,
        company: doc.parsedCompany,
        yearMonth: doc.parsedYearMonth
      }
    },
    
    history: doc.modificationHistory || [{
      version: 1,
      action: 'migrated',
      performedAt: new Date(),
      reason: 'Migrated from payslips collection'
    }],
    
    permissions: {
      owner: doc.userId,
      visibility: 'private',
      roles: {
        viewer: ['Admin', 'Supervisor'],
        editor: ['Admin'],
        admin: ['Admin']
      }
    },
    
    migration: {
      source: 'payslips',
      originalId: doc._id,
      migratedAt: new Date(),
      migratedBy: 'migration_script_v2',
      dataVersion: 1
    },
    
    search: {
      fullText: `${user.name} ${user.employeeId} ${doc.year} ${doc.month} 급여명세서`,
      sortKey: `${doc.year}${String(doc.month).padStart(2, '0')}_${user.employeeId}_payslip`
    },
    
    system: {
      schemaVersion: 2,
      dataQuality: {
        completeness: calculateCompleteness(doc),
        validated: false
      }
    }
  };
}

/**
 * Transform payroll_documents collection document to unified schema
 */
async function transformPayrollDocToUnified(doc, userMap) {
  const user = userMap.get(doc.userId?.toString()) || {};
  
  return {
    userId: doc.userId,
    documentType: doc.documentType || 'payslip',
    documentCategory: doc.category || '급여명세서',
    
    file: {
      uniqueId: doc.uniqueId || uuidv4(),
      systemName: doc.fileName,
      originalName: doc.originalFileName || doc.fileName,
      displayName: doc.displayName || `${doc.year}년 ${doc.month}월 급여명세서`,
      path: doc.filePath,
      size: doc.fileSize || 0,
      mimeType: doc.mimeType || 'application/pdf',
      hash: doc.fileHash,
      encoding: doc.encoding || 'UTF-8',
      isEncrypted: doc.isSecure || false
    },
    
    temporal: {
      year: doc.year,
      month: doc.month,
      yearMonth: doc.yearMonth,
      documentDate: doc.documentDate || doc.uploadedAt
    },
    
    userInfo: {
      name: user.name || doc.userName,
      employeeId: user.employeeId || doc.employeeId,
      department: user.department || doc.department,
      position: user.position,
      email: user.email
    },
    
    status: {
      current: doc.status || 'active',
      isDeleted: doc.status === 'deleted',
      deletedAt: doc.deletedAt,
      deletedBy: doc.deletedBy
    },
    
    audit: {
      createdAt: doc.createdAt || new Date(),
      uploadedAt: doc.uploadedAt || new Date(),
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName,
      lastModifiedAt: doc.updatedAt || doc.uploadedAt || new Date(),
      version: 1
    },
    
    metadata: doc.metadata || {},
    
    accessCount: {
      views: doc.accessCount || 0,
      downloads: 0,
      lastAccessedAt: doc.lastAccessedAt
    },
    
    history: [{
      version: 1,
      action: 'migrated',
      performedAt: new Date(),
      reason: 'Migrated from payroll_documents collection'
    }],
    
    migration: {
      source: 'payroll_documents',
      originalId: doc._id,
      migratedAt: new Date(),
      migratedBy: 'migration_script_v2',
      dataVersion: 1
    },
    
    system: {
      schemaVersion: 2,
      dataQuality: {
        completeness: calculateCompleteness(doc),
        validated: false
      }
    }
  };
}

/**
 * Transform documents collection document to unified schema
 */
async function transformDocumentToUnified(doc, userMap) {
  const user = userMap.get(doc.userId?.toString()) || {};
  
  return {
    userId: doc.userId,
    documentType: doc.type || doc.documentType || 'other',
    documentCategory: doc.category || doc.documentCategory || '기타',
    
    file: {
      uniqueId: doc.uniqueId || uuidv4(),
      systemName: doc.fileName,
      originalName: doc.originalFileName || doc.fileName,
      displayName: doc.displayName || doc.title || doc.fileName,
      path: doc.filePath || path.join('/uploads/documents/', doc.fileName || 'unknown'),
      size: doc.fileSize || 0,
      mimeType: doc.mimeType || 'application/pdf'
    },
    
    temporal: {
      year: doc.year,
      month: doc.month,
      documentDate: doc.date || doc.createdAt || new Date()
    },
    
    userInfo: {
      name: user.name,
      employeeId: user.employeeId,
      department: user.department
    },
    
    status: {
      current: doc.status || 'active',
      isDeleted: doc.deleted || false
    },
    
    audit: {
      createdAt: doc.createdAt || new Date(),
      uploadedAt: doc.uploadedAt || doc.createdAt || new Date(),
      lastModifiedAt: doc.updatedAt || new Date(),
      version: 1
    },
    
    metadata: doc.metadata || {},
    
    history: [{
      version: 1,
      action: 'migrated',
      performedAt: new Date(),
      reason: 'Migrated from documents collection'
    }],
    
    migration: {
      source: 'documents',
      originalId: doc._id,
      migratedAt: new Date(),
      migratedBy: 'migration_script_v2',
      dataVersion: 1
    },
    
    system: {
      schemaVersion: 2
    }
  };
}

/**
 * Check for duplicate documents
 */
async function findDuplicate(db, doc) {
  // For payslips, check userId + year + month combination
  if (doc.documentType === 'payslip' && doc.temporal) {
    return await db.collection('unified_documents').findOne({
      userId: doc.userId,
      'temporal.year': doc.temporal.year,
      'temporal.month': doc.temporal.month,
      documentType: 'payslip'
    });
  }
  
  // For other documents, check by file hash if available
  if (doc.file?.hash) {
    return await db.collection('unified_documents').findOne({
      'file.hash': doc.file.hash
    });
  }
  
  return null;
}

/**
 * Validate and check file existence
 */
async function validateFile(doc) {
  if (!doc.file?.path) {
    return doc;
  }
  
  const fullPath = path.join(__dirname, '../..', doc.file.path);
  
  try {
    await fs.access(fullPath);
    doc.file.fileExists = true;
  } catch (err) {
    doc.file.fileExists = false;
    doc.system = doc.system || {};
    doc.system.dataQuality = doc.system.dataQuality || {};
    doc.system.dataQuality.validationErrors = doc.system.dataQuality.validationErrors || [];
    doc.system.dataQuality.validationErrors.push('FILE_NOT_FOUND');
  }
  
  return doc;
}

/**
 * Calculate document completeness score
 */
function calculateCompleteness(doc) {
  const requiredFields = ['userId', 'year', 'month'];
  const optionalFields = ['fileName', 'employeeId', 'department', 'fileSize'];
  
  let score = 0;
  let total = 0;
  
  requiredFields.forEach(field => {
    total += 2;
    if (doc[field]) score += 2;
  });
  
  optionalFields.forEach(field => {
    total += 1;
    if (doc[field]) score += 1;
  });
  
  return Math.round((score / total) * 100);
}

/**
 * Migrate a single collection
 */
async function migrateCollection(db, collectionName, transformer, tracker, userMap) {
  console.log(`\n📦 Migrating ${collectionName}...`);
  
  const collection = db.collection(collectionName);
  const targetCollection = db.collection('unified_documents');
  
  // Get total count
  const totalCount = await collection.countDocuments({});
  tracker.stats[collectionName].total = totalCount;
  
  console.log(`  Found ${totalCount} documents`);
  
  if (totalCount === 0) {
    console.log(`  ✅ No documents to migrate`);
    return;
  }
  
  let processed = 0;
  let lastId = null;
  
  while (processed < totalCount) {
    // Fetch batch
    const query = lastId ? { _id: { $gt: lastId } } : {};
    const batch = await collection
      .find(query)
      .sort({ _id: 1 })
      .limit(CONFIG.BATCH_SIZE)
      .toArray();
    
    if (batch.length === 0) break;
    
    const bulkOps = [];
    
    for (const doc of batch) {
      try {
        // Transform document
        let unified = await transformer(doc, userMap);
        
        // Validate file
        unified = await validateFile(unified);
        if (!unified.file?.fileExists) {
          tracker.stats[collectionName].missing_files++;
        }
        
        // Check for duplicates
        const duplicate = await findDuplicate(db, unified);
        if (duplicate) {
          tracker.stats[collectionName].duplicates++;
          tracker.duplicateMap.set(
            `${unified.userId}_${unified.temporal?.year}_${unified.temporal?.month}`,
            { original: duplicate._id, new: doc._id }
          );
          
          if (CONFIG.VERBOSE) {
            console.log(`  ⚠️ Duplicate found: ${doc._id}`);
          }
          continue;
        }
        
        // Add to bulk operations
        if (!CONFIG.DRY_RUN) {
          bulkOps.push({
            insertOne: { document: unified }
          });
        }
        
        tracker.stats[collectionName].migrated++;
        
      } catch (error) {
        tracker.logError(collectionName, doc._id, error);
        console.error(`  ❌ Error processing ${doc._id}: ${error.message}`);
      }
      
      processed++;
      lastId = doc._id;
      
      // Progress update
      if (processed % 10 === 0 || processed === totalCount) {
        const progress = Math.round((processed / totalCount) * 100);
        console.log(`  Progress: ${progress}% (${processed}/${totalCount})`);
      }
      
      // Save checkpoint
      if (processed % CONFIG.CHECKPOINT_INTERVAL === 0) {
        await tracker.saveCheckpoint(collectionName, lastId);
      }
    }
    
    // Execute bulk operations
    if (bulkOps.length > 0 && !CONFIG.DRY_RUN) {
      try {
        const result = await targetCollection.bulkWrite(bulkOps);
        if (CONFIG.VERBOSE) {
          console.log(`  Inserted ${result.insertedCount} documents`);
        }
      } catch (error) {
        console.error('  ❌ Bulk write error:', error.message);
        throw error;
      }
    }
  }
  
  console.log(`  ✅ Completed: ${tracker.stats[collectionName].migrated} migrated, ${tracker.stats[collectionName].duplicates} duplicates skipped`);
}

/**
 * Print final statistics
 */
function printFinalStats(tracker) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  const collections = ['payslips', 'payroll_documents', 'documents'];
  let totalOriginal = 0;
  let totalMigrated = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  let totalMissingFiles = 0;
  
  collections.forEach(col => {
    const stats = tracker.stats[col];
    console.log(`\n${col.toUpperCase()}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated} ✅`);
    console.log(`  Duplicates: ${stats.duplicates} ⚠️`);
    console.log(`  Errors: ${stats.errors} ❌`);
    console.log(`  Missing Files: ${stats.missing_files} 📁`);
    
    totalOriginal += stats.total;
    totalMigrated += stats.migrated;
    totalDuplicates += stats.duplicates;
    totalErrors += stats.errors;
    totalMissingFiles += stats.missing_files;
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log('TOTAL:');
  console.log(`  Original Documents: ${totalOriginal}`);
  console.log(`  Successfully Migrated: ${totalMigrated}`);
  console.log(`  Duplicates Skipped: ${totalDuplicates}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Missing Files: ${totalMissingFiles}`);
  
  const duration = Date.now() - tracker.stats.overall.startTime;
  console.log(`\n⏱️ Total Time: ${Math.round(duration / 1000)}s`);
  console.log('='.repeat(60));
}

/**
 * Main migration function
 */
async function migrate() {
  const client = new MongoClient(CONFIG.MONGODB_URI);
  const tracker = new MigrationTracker();
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🚀 Starting Unified Collection Migration');
    console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Batch Size: ${CONFIG.BATCH_SIZE}`);
    console.log(`MongoDB: ${CONFIG.MONGODB_URI}`);
    
    // Load user map for denormalization
    console.log('\n📚 Loading user data...');
    const users = await db.collection('users').find({}).toArray();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    console.log(`  Loaded ${users.length} users`);
    
    // Migrate each collection
    await migrateCollection(db, 'payslips', transformPayslipToUnified, tracker, userMap);
    await migrateCollection(db, 'payroll_documents', transformPayrollDocToUnified, tracker, userMap);
    await migrateCollection(db, 'documents', transformDocumentToUnified, tracker, userMap);
    
    // Print final statistics
    printFinalStats(tracker);
    
    // Save error log if any errors occurred
    if (tracker.errors.length > 0) {
      const errorLogPath = path.join(CONFIG.LOG_DIR, `migration_errors_${Date.now()}.json`);
      await fs.mkdir(CONFIG.LOG_DIR, { recursive: true });
      await fs.writeFile(errorLogPath, JSON.stringify(tracker.errors, null, 2));
      console.log(`\n⚠️ Error log saved: ${errorLogPath}`);
    }
    
    if (CONFIG.DRY_RUN) {
      console.log('\n🔍 DRY RUN COMPLETED - No actual changes were made');
    } else {
      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  args.forEach(arg => {
    if (arg === '--dry-run') CONFIG.DRY_RUN = true;
    if (arg === '--verbose') CONFIG.VERBOSE = true;
    if (arg === '--reorganize-files') CONFIG.REORGANIZE_FILES = true;
    if (arg.startsWith('--batch-size=')) {
      CONFIG.BATCH_SIZE = parseInt(arg.split('=')[1]);
    }
  });
  
  migrate()
    .then(() => {
      console.log('\n🎉 Migration process completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate, transformPayslipToUnified, transformPayrollDocToUnified };