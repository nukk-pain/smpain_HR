#!/usr/bin/env node

/**
 * Database Migration Script - HR System
 * 
 * This script migrates the database schema to:
 * 1. Rename managerId to supervisorId in departments collection
 * 2. Remove email fields from users collection  
 * 3. Drop unnecessary managerId indexes
 * 
 * Usage: node scripts/migrate-database-schema.js
 */

require('dotenv').config({ path: '.env.development' });
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu';

async function connectToDatabase() {
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB');
  return client;
}

async function backupCollections(db) {
  console.log('\n📦 Creating backups before migration...');
  
  // Backup departments collection
  const departments = await db.collection('departments').find({}).toArray();
  if (departments.length > 0) {
    await db.collection('departments_backup_' + Date.now()).insertMany(departments);
    console.log(`✅ Backed up ${departments.length} departments`);
  }
  
  // Backup users collection
  const users = await db.collection('users').find({}).toArray();
  if (users.length > 0) {
    await db.collection('users_backup_' + Date.now()).insertMany(users);
    console.log(`✅ Backed up ${users.length} users`);
  }
}

async function migrateDepartmentsCollection(db) {
  console.log('\n🔄 Migrating departments collection...');
  
  const departmentsCollection = db.collection('departments');
  
  // Find documents with managerId field
  const docsWithManagerId = await departmentsCollection.find({ 
    managerId: { $exists: true } 
  }).toArray();
  
  console.log(`Found ${docsWithManagerId.length} departments with managerId field`);
  
  if (docsWithManagerId.length === 0) {
    console.log('✅ No managerId fields found in departments collection');
    return;
  }
  
  // Migrate each document
  for (const doc of docsWithManagerId) {
    const updateOperations = {};
    
    // Rename managerId to supervisorId if it doesn't already exist
    if (doc.managerId && !doc.supervisorId) {
      updateOperations.$set = { supervisorId: doc.managerId };
    }
    
    // Remove managerId field
    updateOperations.$unset = { managerId: "" };
    
    // Also remove old manager_id field if it exists
    if (doc.manager_id) {
      updateOperations.$unset.manager_id = "";
    }
    
    await departmentsCollection.updateOne(
      { _id: doc._id },
      updateOperations
    );
    
    console.log(`✅ Migrated department: ${doc.name || doc._id}`);
  }
  
  console.log(`✅ Successfully migrated ${docsWithManagerId.length} departments`);
}

async function migrateUsersCollection(db) {
  console.log('\n🔄 Migrating users collection...');
  
  const usersCollection = db.collection('users');
  
  // Find documents with email field
  const docsWithEmail = await usersCollection.find({ 
    email: { $exists: true } 
  }).toArray();
  
  console.log(`Found ${docsWithEmail.length} users with email field`);
  
  if (docsWithEmail.length === 0) {
    console.log('✅ No email fields found in users collection');
    return;
  }
  
  // Remove email field from all documents
  const result = await usersCollection.updateMany(
    { email: { $exists: true } },
    { $unset: { email: "" } }
  );
  
  console.log(`✅ Removed email field from ${result.modifiedCount} users`);
}

async function dropUnnecessaryIndexes(db) {
  console.log('\n🗑️ Dropping unnecessary indexes...');
  
  const departmentsCollection = db.collection('departments');
  
  try {
    // Get list of existing indexes
    const indexes = await departmentsCollection.listIndexes().toArray();
    const managerIndexes = indexes.filter(index => 
      index.name && (
        index.name.includes('manager') || 
        index.name.includes('managerId') ||
        index.name === 'idx_manager'
      )
    );
    
    console.log(`Found ${managerIndexes.length} manager-related indexes to drop`);
    
    for (const index of managerIndexes) {
      try {
        await departmentsCollection.dropIndex(index.name);
        console.log(`✅ Dropped index: ${index.name}`);
      } catch (error) {
        if (error.code === 27) { // IndexNotFound
          console.log(`⚠️ Index ${index.name} not found (already dropped)`);
        } else {
          console.log(`❌ Error dropping index ${index.name}: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`⚠️ Error checking indexes: ${error.message}`);
  }
}

async function verifyMigration(db) {
  console.log('\n🔍 Verifying migration...');
  
  // Check departments collection
  const departmentsWithManagerId = await db.collection('departments').countDocuments({ 
    managerId: { $exists: true } 
  });
  const departmentsWithManagerIdField = await db.collection('departments').countDocuments({ 
    manager_id: { $exists: true } 
  });
  
  // Check users collection
  const usersWithEmail = await db.collection('users').countDocuments({ 
    email: { $exists: true } 
  });
  
  console.log('📊 Migration Results:');
  console.log(`   Departments with managerId: ${departmentsWithManagerId}`);
  console.log(`   Departments with manager_id: ${departmentsWithManagerIdField}`);
  console.log(`   Users with email: ${usersWithEmail}`);
  
  const success = departmentsWithManagerId === 0 && 
                 departmentsWithManagerIdField === 0 && 
                 usersWithEmail === 0;
  
  if (success) {
    console.log('✅ Migration completed successfully!');
  } else {
    console.log('❌ Migration incomplete - some fields still exist');
    throw new Error('Migration verification failed');
  }
  
  return success;
}

async function main() {
  let client;
  
  try {
    console.log('🚀 Starting database schema migration...');
    console.log(`📍 Database: ${MONGODB_URI}/${DB_NAME}`);
    
    client = await connectToDatabase();
    const db = client.db(DB_NAME);
    
    // Step 1: Create backups
    await backupCollections(db);
    
    // Step 2: Migrate departments collection
    await migrateDepartmentsCollection(db);
    
    // Step 3: Migrate users collection  
    await migrateUsersCollection(db);
    
    // Step 4: Drop unnecessary indexes
    await dropUnnecessaryIndexes(db);
    
    // Step 5: Verify migration
    await verifyMigration(db);
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Renamed managerId → supervisorId in departments');
    console.log('   ✅ Removed email fields from users');
    console.log('   ✅ Dropped unnecessary managerId indexes');
    console.log('   ✅ Created backups of original data');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('💡 Restore from backup if needed');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };