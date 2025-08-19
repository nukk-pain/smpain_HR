/**
 * AI-HEADER
 * @intent: Migrate existing incentiveFormula field to new incentiveConfig structure
 * @domain_meaning: One-time migration script for incentive configuration upgrade
 * @misleading_names: None
 * @data_contracts: Reads users collection, updates incentiveConfig field
 * @pii: No PII processing, only configuration data
 * @invariants: Preserves existing formulas, adds default config for missing ones
 * @rag_keywords: migration, incentive config, database upgrade
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// Database configuration
const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu';

/**
 * Map old incentive formula strings to new configuration
 * @DomainMeaning: Convert legacy format to new template-based structure
 */
const FORMULA_MAPPING = {
  // Personal sales percentages
  'personal_sales_15': {
    type: 'PERSONAL_PERCENT',
    parameters: { rate: 0.15 }
  },
  'personal_sales_10': {
    type: 'PERSONAL_PERCENT',
    parameters: { rate: 0.10 }
  },
  'personal_sales_5': {
    type: 'PERSONAL_PERCENT',
    parameters: { rate: 0.05 }
  },
  
  // Team sales percentages
  'team_sales_10': {
    type: 'TOTAL_PERCENT',
    parameters: { rate: 0.10 }
  },
  'team_sales_5': {
    type: 'TOTAL_PERCENT',
    parameters: { rate: 0.05 }
  },
  
  // Total sales percentage
  'total_sales_3': {
    type: 'TOTAL_PERCENT',
    parameters: { rate: 0.03 }
  },
  
  // Fixed bonus
  'fixed_bonus': {
    type: 'PERSONAL_PERCENT',
    parameters: { rate: 0.05 } // Default to 5% if not specified
  },
  
  // Performance based
  'performance_based': {
    type: 'PERSONAL_PERCENT',
    parameters: { rate: 0.08 } // Default to 8% if not specified
  }
  
  // Note: Empty string ('') is intentionally not mapped here
  // Users without formulas will get default inactive config
};

/**
 * Main migration function
 * @DomainMeaning: Convert all users from old to new incentive configuration
 * @SideEffects: Updates users collection in database
 */
async function migrateIncentiveConfig() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URL);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Get all users
    console.log('📊 Fetching users...');
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to process`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each user
    for (const user of users) {
      try {
        // Skip if already has new config
        if (user.incentiveConfig && user.incentiveConfig.type) {
          console.log(`⏭️  Skipping ${user.name} - already has incentiveConfig`);
          skippedCount++;
          continue;
        }
        
        // Determine new configuration
        let newConfig;
        const oldFormula = user.incentiveFormula || '';
        
        if (FORMULA_MAPPING[oldFormula]) {
          // Use mapped configuration
          newConfig = {
            ...FORMULA_MAPPING[oldFormula],
            isActive: true,
            effectiveDate: new Date(),
            lastModified: new Date(),
            modifiedBy: null // System migration
          };
        } else if (oldFormula && typeof oldFormula === 'string' && oldFormula.includes('*')) {
          // Custom formula detected
          console.log(`🔧 Custom formula detected for ${user.name}: ${oldFormula}`);
          newConfig = {
            type: 'CUSTOM',
            parameters: {},
            customFormula: oldFormula,
            isActive: true,
            effectiveDate: new Date(),
            lastModified: new Date(),
            modifiedBy: null
          };
        } else {
          // Default configuration - set inactive since they had no formula
          newConfig = {
            type: 'PERSONAL_PERCENT',
            parameters: { rate: 0.05 },
            customFormula: null,
            isActive: false, // Set inactive by default for users without formula
            effectiveDate: new Date(),
            lastModified: new Date(),
            modifiedBy: null
          };
        }
        
        // Update user document
        const updateResult = await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              incentiveConfig: newConfig,
              updatedAt: new Date()
            },
            $unset: { incentiveFormula: 1 } // Remove old field
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log(`✅ Migrated ${user.name} (${user.username}): ${oldFormula || 'none'} → ${newConfig.type}`);
          migratedCount++;
        } else {
          console.log(`⚠️  No changes for ${user.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating user ${user.name}:`, error.message);
        errorCount++;
      }
    }
    
    // Create index for performance
    console.log('\n📑 Creating indexes...');
    await usersCollection.createIndex({ 'incentiveConfig.isActive': 1 });
    await usersCollection.createIndex({ 'incentiveConfig.type': 1 });
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped (already migrated): ${skippedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📝 Total processed: ${users.length} users`);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const sampleUsers = await usersCollection
      .find({ 'incentiveConfig.type': { $exists: true } })
      .limit(5)
      .toArray();
    
    console.log('Sample migrated configurations:');
    sampleUsers.forEach(user => {
      console.log(`  - ${user.name}: ${user.incentiveConfig.type} (active: ${user.incentiveConfig.isActive})`);
    });
    
    // Check for any users still with old field
    const usersWithOldField = await usersCollection.countDocuments({
      incentiveFormula: { $exists: true }
    });
    
    if (usersWithOldField > 0) {
      console.log(`\n⚠️  Warning: ${usersWithOldField} users still have the old incentiveFormula field`);
    } else {
      console.log('\n✅ All users successfully migrated to new structure');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Database connection closed');
    }
  }
}

// Run migration with confirmation
async function run() {
  console.log('================================================');
  console.log('    INCENTIVE CONFIGURATION MIGRATION SCRIPT    ');
  console.log('================================================');
  console.log('');
  console.log('This script will:');
  console.log('1. Convert incentiveFormula field to new incentiveConfig structure');
  console.log('2. Map existing formulas to template types');
  console.log('3. Preserve custom formulas');
  console.log('4. Remove the old incentiveFormula field');
  console.log('');
  console.log(`Database: ${MONGO_URL}`);
  console.log(`Database Name: ${DB_NAME}`);
  console.log('');
  
  // Check for --force flag to skip confirmation
  const forceFlag = process.argv.includes('--force');
  
  if (!forceFlag) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise((resolve) => {
      readline.question('⚠️  This will modify the users collection. Continue? (yes/no): ', (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'yes') {
          console.log('Migration cancelled');
          process.exit(0);
        }
        resolve();
      });
    });
  }
  
  console.log('\n🚀 Starting migration...\n');
  await migrateIncentiveConfig();
  console.log('\n✅ Migration completed successfully');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  run().catch(console.error);
}

module.exports = { migrateIncentiveConfig, FORMULA_MAPPING };