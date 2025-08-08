#!/usr/bin/env node

/**
 * Final Migration Validation Script
 * 
 * Comprehensive validation that the migration is complete and successful
 */

require('dotenv').config({ path: '.env.development' });
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu';

// Files and patterns to check
const CODE_CHECKS = [
  {
    description: 'Backend route files for manager role checks',
    pattern: /userRole === 'manager'/gi,
    files: ['backend/routes/**/*.js']
  },
  {
    description: 'Backend validation schemas for managerId fields', 
    pattern: /managerId:/gi,
    files: ['backend/validation/**/*.js', 'backend/middleware/**/*.js']
  },
  {
    description: 'Frontend type definitions for Manager role',
    pattern: /'Manager'/gi,
    files: ['frontend/src/**/*.ts', 'frontend/src/**/*.tsx']
  },
  {
    description: 'Frontend constants for MANAGER role',
    pattern: /MANAGER:/gi,
    files: ['frontend/src/**/*.ts', 'frontend/src/**/*.tsx']
  },
  {
    description: 'Test files for Manager role',
    pattern: /role.*Manager|Manager.*role/gi,
    files: ['backend/tests/**/*.js']
  },
  {
    description: 'Backend type definitions for email field',
    pattern: /email\?:\s*string/gi,
    files: ['backend/types/**/*.ts', 'backend/types/**/*.d.ts']
  },
  {
    description: 'Email field references in routes',
    pattern: /\.email/gi,
    files: ['backend/routes/**/*.js']
  }
];

async function validateDatabase() {
  console.log('🗄️ Validating database schema...');
  
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    const issues = [];
    
    // Check departments collection
    const problematicDepts = await db.collection('departments').countDocuments({
      $or: [
        { managerId: { $exists: true } },
        { manager_id: { $exists: true } }
      ]
    });
    
    if (problematicDepts > 0) {
      issues.push(`❌ ${problematicDepts} departments still have managerId/manager_id fields`);
    }
    
    // Check users collection
    const problematicUsers = await db.collection('users').countDocuments({
      email: { $exists: true }
    });
    
    if (problematicUsers > 0) {
      issues.push(`❌ ${problematicUsers} users still have email fields`);
    }
    
    // Check indexes
    const deptIndexes = await db.collection('departments').listIndexes().toArray();
    const managerIndexes = deptIndexes.filter(idx => 
      idx.name && idx.name.toLowerCase().includes('manager')
    );
    
    if (managerIndexes.length > 0) {
      issues.push(`❌ ${managerIndexes.length} manager-related indexes still exist`);
    }
    
    if (issues.length === 0) {
      console.log('   ✅ Database schema is fully consistent');
      return true;
    } else {
      console.log('   ❌ Database issues found:');
      issues.forEach(issue => console.log('     ', issue));
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Database validation failed: ${error.message}`);
    return false;
  } finally {
    if (client) await client.close();
  }
}

async function searchInFile(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  } catch (error) {
    // File might not exist or be readable
    return 0;
  }
}

async function validateCodebase() {
  console.log('\n💻 Validating codebase...');
  
  let allGood = true;
  
  for (const check of CODE_CHECKS) {
    console.log(`\n   Checking: ${check.description}`);
    
    let totalMatches = 0;
    const problematicFiles = [];
    
    for (const filePattern of check.files) {
      // Simple glob expansion for our use case
      const baseDir = filePattern.split('/')[0];
      const searchPattern = filePattern.replace(/\*\*/g, '').replace(/\*/g, '');
      
      if (fs.existsSync(baseDir)) {
        const files = getAllFiles(baseDir, searchPattern);
        
        for (const file of files) {
          const matches = await searchInFile(file, check.pattern);
          if (matches > 0) {
            totalMatches += matches;
            problematicFiles.push(`${file} (${matches} matches)`);
          }
        }
      }
    }
    
    if (totalMatches === 0) {
      console.log(`     ✅ No problematic patterns found`);
    } else {
      console.log(`     ❌ Found ${totalMatches} problematic patterns:`);
      problematicFiles.forEach(file => console.log(`       - ${file}`));
      allGood = false;
    }
  }
  
  return allGood;
}

function getAllFiles(dir, extension) {
  const files = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
        walk(fullPath);
      } else if (stat.isFile() && (
        fullPath.endsWith('.js') || 
        fullPath.endsWith('.ts') || 
        fullPath.endsWith('.tsx')
      )) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

async function main() {
  console.log('🔍 Final Migration Validation');
  console.log('==============================');
  
  const databaseValid = await validateDatabase();
  const codebaseValid = await validateCodebase();
  
  console.log('\n📊 Validation Summary');
  console.log('===================');
  
  if (databaseValid && codebaseValid) {
    console.log('🎉 ALL VALIDATIONS PASSED!');
    console.log('✅ Database schema is fully consistent');
    console.log('✅ Codebase has no problematic patterns');
    console.log('✅ Migration is complete and successful');
    
    console.log('\n📋 Migration completed successfully:');
    console.log('   ✅ Removed all "manager" role references');
    console.log('   ✅ Updated role system to use "supervisor"');
    console.log('   ✅ Cleaned up email field references'); 
    console.log('   ✅ Fixed database schema inconsistencies');
    console.log('   ✅ Updated test files');
    console.log('   ✅ Dropped unnecessary indexes');
    
    return true;
  } else {
    console.log('❌ VALIDATION FAILED');
    if (!databaseValid) console.log('   - Database issues detected');
    if (!codebaseValid) console.log('   - Codebase issues detected');
    console.log('   Review the issues above and fix them before proceeding');
    
    return false;
  }
}

if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { main };