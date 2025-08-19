#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/SM_nomu';

async function cleanupTestData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🧹 Cleaning up test data from unified_documents collection...\n');
    
    // Find test documents (those without migration.source)
    const testDocs = await db.collection('unified_documents').find({
      'migration.source': { $exists: false }
    }).toArray();
    
    console.log(`Found ${testDocs.length} test documents without migration tracking:`);
    
    // Show sample of what will be deleted
    testDocs.slice(0, 5).forEach(doc => {
      console.log(`  - ${doc._id} (${doc.documentType})`);
    });
    
    if (testDocs.length > 5) {
      console.log(`  ... and ${testDocs.length - 5} more`);
    }
    
    if (testDocs.length > 0) {
      // Delete test documents
      const result = await db.collection('unified_documents').deleteMany({
        'migration.source': { $exists: false }
      });
      
      console.log(`\n✅ Deleted ${result.deletedCount} test documents`);
    } else {
      console.log('\n✅ No test documents to clean up');
    }
    
    // Show final status
    const remaining = await db.collection('unified_documents').countDocuments();
    const migrated = await db.collection('unified_documents').countDocuments({
      'migration.source': { $exists: true }
    });
    
    console.log('\n📊 Final Status:');
    console.log(`  Total documents: ${remaining}`);
    console.log(`  Properly migrated: ${migrated}`);
    console.log(`  Test documents: ${remaining - migrated}`);
    
    if (remaining === migrated) {
      console.log('\n✅ All documents in unified collection are properly migrated!');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run cleanup
cleanupTestData();