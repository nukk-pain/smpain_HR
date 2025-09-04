/**
 * AI-HEADER
 * Intent: Create optimized indexes for unified_documents collection
 * Domain Meaning: Performance optimization for document queries
 * Misleading Names: None
 * Data Contracts: Follows unified schema v2.0 field structure
 * PII: No PII in indexes, only field names
 * Invariants: Indexes must match common query patterns
 * RAG Keywords: mongodb, indexes, unified documents, performance
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu';

/**
 * Create indexes for unified_documents collection
 * DomainMeaning: Database performance optimization for unified documents
 * MisleadingNames: None
 * SideEffects: Creates indexes on MongoDB collection
 * Invariants: Only creates indexes if they don't already exist
 * RAG_Keywords: mongodb, createIndex, performance optimization
 * DuplicatePolicy: canonical
 * FunctionIdentity: sha256(create_unified_indexes)
 */
async function createUnifiedIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('unified_documents');
    
    console.log('🔧 Creating indexes for unified_documents collection...\n');
    
    // Define all indexes
    const indexes = [
      // === Primary Query Indexes ===
      {
        key: { userId: 1, 'temporal.year': -1, 'temporal.month': -1, documentType: 1 },
        name: 'user_documents_by_date',
        description: 'User documents sorted by date and type'
      },
      
      // === Unique Constraint for Payslips ===
      {
        key: { userId: 1, 'temporal.year': 1, 'temporal.month': 1 },
        name: 'unique_payslip_per_month',
        options: { 
          unique: true, 
          partialFilterExpression: { documentType: 'payslip' } 
        },
        description: 'Ensures one payslip per user per month'
      },
      
      // === Search and Filter Indexes ===
      {
        key: { 'userInfo.employeeId': 1, 'temporal.yearMonth': -1 },
        name: 'employee_documents_by_date',
        description: 'Employee ID based document search'
      },
      
      {
        key: { documentType: 1, 'status.current': 1, 'audit.createdAt': -1 },
        name: 'documents_by_type_and_status',
        description: 'Filter documents by type and status'
      },
      
      // === Admin Query Indexes ===
      {
        key: { 'status.isDeleted': 1, 'audit.createdAt': -1 },
        name: 'deleted_documents',
        description: 'Find deleted documents for admin'
      },
      
      {
        key: { 'file.hash': 1 },
        name: 'file_hash_duplicate_check',
        description: 'Check for duplicate files by hash'
      },
      
      // === Temporal Indexes ===
      {
        key: { 'temporal.year': -1, 'temporal.month': -1 },
        name: 'documents_by_period',
        description: 'Documents by year and month'
      },
      
      {
        key: { 'audit.uploadedAt': -1 },
        name: 'recent_uploads',
        description: 'Recently uploaded documents'
      },
      
      // === Full Text Search Index ===
      {
        key: { 'search.fullText': 'text' },
        name: 'fulltext_search',
        description: 'Full text search on document content'
      },
      
      // === Sort Optimization Index ===
      {
        key: { 'search.sortKey': 1 },
        name: 'sort_key',
        description: 'Optimized sorting key'
      },
      
      // === Migration Tracking Index ===
      {
        key: { 'migration.source': 1, 'migration.originalId': 1 },
        name: 'migration_tracking',
        description: 'Track migrated documents'
      },
      
      // === Access Pattern Index ===
      {
        key: { userId: 1, 'status.current': 1 },
        name: 'user_active_documents',
        options: {
          partialFilterExpression: { 'status.current': 'active' }
        },
        description: 'Active documents per user'
      }
    ];
    
    // Create each index
    let created = 0;
    let existing = 0;
    let failed = 0;
    
    for (const indexDef of indexes) {
      try {
        const { key, name, options = {}, description } = indexDef;
        
        // Check if index already exists
        const existingIndexes = await collection.listIndexes().toArray();
        const indexExists = existingIndexes.some(idx => idx.name === name);
        
        if (indexExists) {
          console.log(`⏭️  Index already exists: ${name}`);
          existing++;
          continue;
        }
        
        // Create index
        await collection.createIndex(key, { name, ...options });
        console.log(`✅ Created index: ${name}`);
        console.log(`   Description: ${description}`);
        console.log(`   Fields: ${JSON.stringify(key)}`);
        if (Object.keys(options).length > 0) {
          console.log(`   Options: ${JSON.stringify(options)}`);
        }
        console.log('');
        created++;
        
      } catch (error) {
        console.error(`❌ Failed to create index ${indexDef.name}: ${error.message}`);
        failed++;
      }
    }
    
    // List all indexes for verification
    console.log('\n' + '='.repeat(60));
    console.log('📋 CURRENT INDEXES ON unified_documents:');
    console.log('='.repeat(60));
    
    const allIndexes = await collection.listIndexes().toArray();
    allIndexes.forEach((index, i) => {
      console.log(`\n${i + 1}. ${index.name}`);
      console.log(`   Key: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log(`   Unique: true`);
      if (index.partialFilterExpression) {
        console.log(`   Partial: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 INDEX CREATION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${created}`);
    console.log(`⏭️  Existing: ${existing}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total Indexes: ${allIndexes.length}`);
    console.log('='.repeat(60));
    
    // Get collection stats
    const stats = await db.command({ collStats: 'unified_documents' });
    console.log('\n📈 Collection Statistics:');
    console.log(`   Documents: ${stats.count}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      created,
      existing,
      failed,
      total: allIndexes.length
    };
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  createUnifiedIndexes()
    .then(() => {
      console.log('\n🎉 Index creation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Index creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createUnifiedIndexes };