/**
 * Migration script to change role from 'manager' to 'supervisor'
 * This script updates all users with 'manager' role to 'supervisor'
 * 
 * Usage: node scripts/migrate-manager-to-supervisor.js [--dry-run]
 */

const path = require('path');

// Change working directory to backend to access node_modules
process.chdir(path.join(__dirname, '..', 'backend'));

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

const isDryRun = process.argv.includes('--dry-run');

async function migrateManagerToSupervisor() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    
    // Count existing managers
    const managerCount = await db.collection('users').countDocuments({ role: 'manager' });
    console.log(`\n📊 Found ${managerCount} users with 'manager' role`);

    if (managerCount === 0) {
      console.log('✅ No managers to migrate');
      return;
    }

    // Find all managers
    const managers = await db.collection('users').find({ role: 'manager' }).toArray();
    
    console.log('\n👥 Users to be migrated:');
    managers.forEach(user => {
      console.log(`  - ${user.name} (${user.username}) - Department: ${user.department}`);
    });

    // Count fields to be renamed
    const usersWithManagerId = await db.collection('users').countDocuments({ managerId: { $exists: true } });
    const deptsWithManagerId = await db.collection('departments').countDocuments({ managerId: { $exists: true } });
    
    console.log(`\n📊 Fields to be renamed:`);
    console.log(`  - ${usersWithManagerId} user records with managerId field`);
    console.log(`  - ${deptsWithManagerId} department records with managerId field`);

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes will be made');
      console.log('\n🔄 Changes that would be made:');
      console.log('  1. Update user roles: manager → supervisor');
      console.log('  2. Rename user managerId → supervisorId');
      console.log('  3. Rename department managerId → supervisorId');
      return;
    }

    // Perform migration
    console.log('\n🔄 Starting migration...');
    
    // Step 1: Update role names
    const roleResult = await db.collection('users').updateMany(
      { role: 'manager' },
      { $set: { role: 'supervisor' } }
    );

    // Step 2: Rename managerId field to supervisorId in users collection
    const userFieldResult = await db.collection('users').updateMany(
      { managerId: { $exists: true } },
      { $rename: { managerId: 'supervisorId' } }
    );

    // Step 3: Rename managerId field to supervisorId in departments collection
    const deptFieldResult = await db.collection('departments').updateMany(
      { managerId: { $exists: true } },
      { $rename: { managerId: 'supervisorId' } }
    );

    console.log(`\n✅ Migration completed:`);
    console.log(`  - ${roleResult.matchedCount} users role updated`);
    console.log(`  - ${roleResult.modifiedCount} users role modified`);
    console.log(`  - ${userFieldResult.matchedCount} user managerId fields renamed`);
    console.log(`  - ${userFieldResult.modifiedCount} user managerId fields modified`);
    console.log(`  - ${deptFieldResult.matchedCount} department managerId fields renamed`);
    console.log(`  - ${deptFieldResult.modifiedCount} department managerId fields modified`);

    // Verify migration
    const remainingManagers = await db.collection('users').countDocuments({ role: 'manager' });
    const newSupervisors = await db.collection('users').countDocuments({ role: 'supervisor' });
    const remainingUserManagerIds = await db.collection('users').countDocuments({ managerId: { $exists: true } });
    const remainingDeptManagerIds = await db.collection('departments').countDocuments({ managerId: { $exists: true } });
    const newUserSupervisorIds = await db.collection('users').countDocuments({ supervisorId: { $exists: true } });
    const newDeptSupervisorIds = await db.collection('departments').countDocuments({ supervisorId: { $exists: true } });
    
    console.log('\n📈 Final counts:');
    console.log(`  - Remaining managers: ${remainingManagers}`);
    console.log(`  - Supervisors: ${newSupervisors}`);
    console.log(`  - Remaining user managerId fields: ${remainingUserManagerIds}`);
    console.log(`  - Remaining department managerId fields: ${remainingDeptManagerIds}`);
    console.log(`  - New user supervisorId fields: ${newUserSupervisorIds}`);
    console.log(`  - New department supervisorId fields: ${newDeptSupervisorIds}`);

    if (remainingManagers > 0 || remainingUserManagerIds > 0 || remainingDeptManagerIds > 0) {
      console.error('\n❌ Warning: Some migration steps were not completed!');
    } else {
      console.log('\n✅ All managers successfully migrated to supervisors');
      console.log('✅ All managerId fields successfully renamed to supervisorId');
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run migration
console.log('🚀 Manager to Supervisor Role Migration Script');
console.log('='.repeat(50));

if (isDryRun) {
  console.log('Running in DRY RUN mode - no changes will be made');
  console.log('Remove --dry-run flag to perform actual migration\n');
}

migrateManagerToSupervisor()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });