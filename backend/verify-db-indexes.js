const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu';

async function verifyIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  console.log('🔍 Database Index Verification');
  console.log('================================\n');
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Define required indexes
    const requiredIndexes = {
      users: [
        { key: { email: 1 }, options: { unique: true } },
        { key: { username: 1 }, options: { unique: true } },
        { key: { userId: 1 }, options: { unique: true } },
        { key: { employeeId: 1 }, options: { unique: true, sparse: true } },
        { key: { role: 1 } },
        { key: { department: 1 } },
        { key: { isActive: 1 } }
      ],
      leave_requests: [
        { key: { userId: 1, status: 1 } },
        { key: { status: 1 } },
        { key: { startDate: 1 } },
        { key: { createdAt: -1 } },
        { key: { approvedBy: 1 } }
      ],
      leave_balances: [
        { key: { userId: 1 }, options: { unique: true } },
        { key: { year: 1 } }
      ],
      payroll: [
        { key: { month: 1, userId: 1 }, options: { unique: true } },
        { key: { month: -1 } },
        { key: { userId: 1 } }
      ],
      dailyWorkers: [
        { key: { name: 1 } },
        { key: { isActive: 1 } },
        { key: { createdAt: -1 } }
      ],
      sales: [
        { key: { date: 1 } },
        { key: { userId: 1 } },
        { key: { teamId: 1 } }
      ],
      departments: [
        { key: { name: 1 }, options: { unique: true } }
      ],
      temp_uploads: [
        { key: { createdAt: 1 }, options: { expireAfterSeconds: 3600 } }  // TTL index
      ],
      error_logs: [
        { key: { timestamp: -1 } },
        { key: { level: 1 } },
        { key: { createdAt: 1 }, options: { expireAfterSeconds: 2592000 } }  // 30 days
      ],
      audit_trail: [
        { key: { userId: 1 } },
        { key: { action: 1 } },
        { key: { timestamp: -1 } },
        { key: { createdAt: 1 }, options: { expireAfterSeconds: 7776000 } }  // 90 days
      ]
    };
    
    // Check and create indexes
    for (const [collection, indexes] of Object.entries(requiredIndexes)) {
      console.log(`\n📊 Collection: ${collection}`);
      console.log('─'.repeat(40));
      
      // Get existing indexes
      try {
        const existingIndexes = await db.collection(collection).indexes();
        console.log(`  Existing indexes: ${existingIndexes.length}`);
        
        // Check each required index
        for (const indexDef of indexes) {
          const indexName = Object.keys(indexDef.key).map(k => `${k}_${indexDef.key[k]}`).join('_');
          const exists = existingIndexes.some(existing => {
            const existingKeys = Object.keys(existing.key || {});
            const requiredKeys = Object.keys(indexDef.key);
            return existingKeys.length === requiredKeys.length &&
                   existingKeys.every(k => existing.key[k] === indexDef.key[k]);
          });
          
          if (exists) {
            console.log(`  ✅ Index exists: ${indexName}`);
          } else {
            console.log(`  ⚠️  Creating index: ${indexName}`);
            try {
              await db.collection(collection).createIndex(indexDef.key, indexDef.options || {});
              console.log(`  ✅ Index created: ${indexName}`);
            } catch (error) {
              console.log(`  ❌ Failed to create index: ${error.message}`);
            }
          }
        }
      } catch (error) {
        if (error.codeName === 'NamespaceNotFound') {
          console.log(`  ⚠️  Collection does not exist yet`);
        } else {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }
    }
    
    // Summary
    console.log('\n\n📈 Index Verification Summary');
    console.log('════════════════════════════════');
    
    // Count total indexes
    let totalIndexes = 0;
    let totalCollections = 0;
    
    for (const collection of Object.keys(requiredIndexes)) {
      try {
        const indexes = await db.collection(collection).indexes();
        totalIndexes += indexes.length;
        totalCollections++;
        console.log(`${collection}: ${indexes.length} indexes`);
      } catch (error) {
        console.log(`${collection}: Not found`);
      }
    }
    
    console.log('\n📊 Statistics:');
    console.log(`Total collections: ${totalCollections}`);
    console.log(`Total indexes: ${totalIndexes}`);
    
    // Performance recommendations
    console.log('\n💡 Recommendations:');
    console.log('1. Monitor slow queries using: db.currentOp()');
    console.log('2. Use explain() to analyze query performance');
    console.log('3. Consider compound indexes for frequently used query combinations');
    console.log('4. Review and remove unused indexes periodically');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run verification
console.log('Starting database index verification...\n');
verifyIndexes().catch(console.error);