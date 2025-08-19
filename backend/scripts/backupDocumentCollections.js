/**
 * AI-HEADER
 * Intent: Backup all document collections before migration
 * Domain Meaning: Safety backup for rollback capability
 * Misleading Names: None
 * Data Contracts: Backs up payslips, payroll_documents, documents collections
 * PII: Contains all document data including user information
 * Invariants: Must complete all backups or fail entirely
 * RAG Keywords: backup, collections, migration, safety, rollback
 */

const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const COLLECTIONS_TO_BACKUP = ['payslips', 'payroll_documents', 'documents'];

/**
 * Create backup of document collections
 * DomainMeaning: Safety backup before migration
 * MisleadingNames: None
 * SideEffects: Creates backup files on filesystem
 * Invariants: All collections must be backed up successfully
 * RAG_Keywords: backup, mongodump, collections
 * DuplicatePolicy: canonical
 * FunctionIdentity: sha256(backup_document_collections)
 */
async function backupCollections() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);
  
  console.log('🔒 Starting Document Collections Backup');
  console.log(`📁 Backup directory: ${backupPath}`);
  
  // Create backup directory
  await fs.mkdir(backupPath, { recursive: true });
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Get collection statistics
    const stats = {
      timestamp,
      collections: {},
      totalDocuments: 0,
      totalSize: 0
    };
    
    // Backup each collection
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      console.log(`\n📦 Backing up ${collectionName}...`);
      
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      console.log(`  Documents to backup: ${count}`);
      
      // Get collection stats
      const collStats = await db.command({ collStats: collectionName });
      stats.collections[collectionName] = {
        count,
        size: collStats.size,
        storageSize: collStats.storageSize,
        avgObjSize: collStats.avgObjSize
      };
      stats.totalDocuments += count;
      stats.totalSize += collStats.size;
      
      // Export collection to JSON
      const documents = await collection.find({}).toArray();
      const filePath = path.join(backupPath, `${collectionName}.json`);
      
      await fs.writeFile(
        filePath,
        JSON.stringify(documents, null, 2),
        'utf8'
      );
      
      console.log(`  ✅ Backed up to: ${filePath}`);
      
      // Also create BSON backup using mongodump if available
      try {
        const dumpCommand = `mongodump --uri="${MONGODB_URI}" --collection=${collectionName} --out="${backupPath}/bson"`;
        await execAsync(dumpCommand);
        console.log(`  ✅ BSON backup created`);
      } catch (error) {
        console.warn(`  ⚠️ BSON backup failed (mongodump not available): ${error.message}`);
      }
    }
    
    // Save backup metadata
    const metadataPath = path.join(backupPath, 'backup_metadata.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(stats, null, 2),
      'utf8'
    );
    
    // Create verification script
    const verifyScriptPath = path.join(backupPath, 'verify_backup.js');
    await fs.writeFile(verifyScriptPath, getVerificationScript(backupPath), 'utf8');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`📊 Backup Statistics:`);
    console.log(`  Total Collections: ${COLLECTIONS_TO_BACKUP.length}`);
    console.log(`  Total Documents: ${stats.totalDocuments.toLocaleString()}`);
    console.log(`  Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Backup Location: ${backupPath}`);
    console.log(`  Verification Script: ${verifyScriptPath}`);
    console.log('='.repeat(60));
    
    return {
      success: true,
      backupPath,
      stats
    };
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Generate verification script for backup
 */
function getVerificationScript(backupPath) {
  return `#!/usr/bin/env node
/**
 * Backup Verification Script
 * Generated: ${new Date().toISOString()}
 * Backup Path: ${backupPath}
 */

const fs = require('fs');
const path = require('path');

async function verifyBackup() {
  console.log('🔍 Verifying backup integrity...');
  
  const collections = ${JSON.stringify(COLLECTIONS_TO_BACKUP)};
  const errors = [];
  
  // Check metadata file
  const metadataPath = path.join('${backupPath}', 'backup_metadata.json');
  if (!fs.existsSync(metadataPath)) {
    errors.push('Missing backup_metadata.json');
  }
  
  // Check each collection file
  for (const collection of collections) {
    const filePath = path.join('${backupPath}', \`\${collection}.json\`);
    
    if (!fs.existsSync(filePath)) {
      errors.push(\`Missing \${collection}.json\`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      console.log(\`  ✓ \${collection}: \${data.length} documents\`);
    } catch (error) {
      errors.push(\`Invalid JSON in \${collection}.json: \${error.message}\`);
    }
  }
  
  if (errors.length > 0) {
    console.error('\\n❌ Verification failed:');
    errors.forEach(err => console.error(\`  - \${err}\`));
    process.exit(1);
  } else {
    console.log('\\n✅ Backup verification successful!');
  }
}

verifyBackup().catch(console.error);
`;
}

/**
 * Restore collections from backup
 * DomainMeaning: Restore collections from backup files
 * MisleadingNames: None
 * SideEffects: Overwrites existing collections
 * Invariants: All collections must be restored successfully
 * RAG_Keywords: restore, backup, rollback
 * DuplicatePolicy: canonical
 * FunctionIdentity: sha256(restore_collections_from_backup)
 */
async function restoreFromBackup(backupPath) {
  console.log('🔄 Starting Collection Restore');
  console.log(`📁 Restore from: ${backupPath}`);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Read backup metadata
    const metadataPath = path.join(backupPath, 'backup_metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    
    console.log(`\n📊 Backup Information:`);
    console.log(`  Backup Date: ${metadata.timestamp}`);
    console.log(`  Total Documents: ${metadata.totalDocuments}`);
    
    // Restore each collection
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      console.log(`\n📦 Restoring ${collectionName}...`);
      
      const filePath = path.join(backupPath, `${collectionName}.json`);
      const documents = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      console.log(`  Documents to restore: ${documents.length}`);
      
      // Drop existing collection
      try {
        await db.collection(collectionName).drop();
        console.log(`  Dropped existing collection`);
      } catch (error) {
        // Collection might not exist
      }
      
      // Restore documents
      if (documents.length > 0) {
        // Convert string IDs back to ObjectId
        const processedDocs = documents.map(doc => {
          if (doc._id && typeof doc._id === 'string') {
            const { ObjectId } = require('mongodb');
            doc._id = new ObjectId(doc._id);
          }
          return doc;
        });
        
        const result = await db.collection(collectionName).insertMany(processedDocs);
        console.log(`  ✅ Restored ${result.insertedCount} documents`);
      }
    }
    
    console.log('\n✅ Restore completed successfully!');
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  const backupPath = process.argv[3];
  
  if (command === 'backup') {
    backupCollections()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Backup failed:', err);
        process.exit(1);
      });
  } else if (command === 'restore' && backupPath) {
    restoreFromBackup(backupPath)
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Restore failed:', err);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node backupDocumentCollections.js backup');
    console.log('  node backupDocumentCollections.js restore <backup-path>');
    process.exit(1);
  }
}

module.exports = {
  backupCollections,
  restoreFromBackup
};