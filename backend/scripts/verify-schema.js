#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * 
 * Verifies that the database schema is consistent after migration
 */

require('dotenv').config({ path: '.env.development' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu';

async function verifySchema() {
  let client;
  
  try {
    console.log('🔍 Verifying database schema consistency...');
    console.log(`📍 Database: ${MONGODB_URI}/${DB_NAME}`);
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Check departments collection
    console.log('\n📋 Departments Collection:');
    const deptSample = await db.collection('departments').findOne({});
    if (deptSample) {
      console.log('   Sample document fields:', Object.keys(deptSample));
      console.log('   Has managerId:', 'managerId' in deptSample ? '❌' : '✅');
      console.log('   Has manager_id:', 'manager_id' in deptSample ? '❌' : '✅'); 
      console.log('   Has supervisorId:', 'supervisorId' in deptSample ? '✅' : '⚠️');
    } else {
      console.log('   No departments found');
    }
    
    // Check users collection
    console.log('\n👥 Users Collection:');
    const userSample = await db.collection('users').findOne({});
    if (userSample) {
      console.log('   Sample document fields:', Object.keys(userSample));
      console.log('   Has email:', 'email' in userSample ? '❌' : '✅');
      console.log('   Has role:', 'role' in userSample ? '✅' : '⚠️');
    } else {
      console.log('   No users found');
    }
    
    // Check for any remaining problematic fields
    const problematicDepts = await db.collection('departments').countDocuments({
      $or: [
        { managerId: { $exists: true } },
        { manager_id: { $exists: true } }
      ]
    });
    
    const problematicUsers = await db.collection('users').countDocuments({
      email: { $exists: true }
    });
    
    console.log('\n📊 Consistency Check:');
    console.log('   Departments with problematic fields:', problematicDepts);
    console.log('   Users with problematic fields:', problematicUsers);
    
    // Check indexes
    console.log('\n🔍 Index Analysis:');
    const deptIndexes = await db.collection('departments').listIndexes().toArray();
    const managerIndexes = deptIndexes.filter(idx => 
      idx.name && idx.name.toLowerCase().includes('manager')
    );
    console.log('   Total department indexes:', deptIndexes.length);
    console.log('   Manager-related indexes:', managerIndexes.length);
    if (managerIndexes.length > 0) {
      console.log('   ❌ Found manager indexes:', managerIndexes.map(idx => idx.name));
    }
    
    // Overall assessment
    const isConsistent = problematicDepts === 0 && 
                        problematicUsers === 0 && 
                        managerIndexes.length === 0;
    
    console.log('\n🎯 Overall Assessment:');
    if (isConsistent) {
      console.log('✅ Database schema is fully consistent!');
      console.log('   ✅ No managerId fields in departments');
      console.log('   ✅ No email fields in users');
      console.log('   ✅ No manager-related indexes');
    } else {
      console.log('❌ Schema inconsistencies detected:');
      if (problematicDepts > 0) console.log(`   - ${problematicDepts} departments with old fields`);
      if (problematicUsers > 0) console.log(`   - ${problematicUsers} users with email fields`);
      if (managerIndexes.length > 0) console.log(`   - ${managerIndexes.length} manager indexes remain`);
    }
    
    return isConsistent;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run verification if executed directly
if (require.main === module) {
  verifySchema().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifySchema };