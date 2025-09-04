#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

const MONGODB_URI = 'mongodb://localhost:27017/SM_nomu';

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function verifyMigration() {
  const client = new MongoClient(MONGODB_URI);
  const issues = [];
  const stats = {
    total: 0,
    valid: 0,
    missingFiles: 0,
    missingUsers: 0,
    duplicates: 0,
    incompleteData: 0
  };

  try {
    await client.connect();
    const db = client.db();
    
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.blue}           MIGRATION VERIFICATION REPORT           ${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);

    // 1. Get all documents from unified collection
    const documents = await db.collection('unified_documents').find({}).toArray();
    stats.total = documents.length;
    
    console.log(`${colors.cyan}📊 Document Analysis:${colors.reset}`);
    console.log(`  Total documents: ${stats.total}\n`);

    // 2. Analyze document types
    const typeCount = {};
    documents.forEach(doc => {
      typeCount[doc.documentType] = (typeCount[doc.documentType] || 0) + 1;
    });
    
    console.log(`${colors.cyan}📁 Document Types:${colors.reset}`);
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('');

    // 3. Check data integrity
    console.log(`${colors.cyan}🔍 Data Integrity Check:${colors.reset}`);
    
    const userIds = new Set();
    const duplicateKeys = new Set();
    
    for (const doc of documents) {
      let hasIssue = false;
      
      // Check required fields
      if (!doc.userId) {
        issues.push({ id: doc._id, issue: 'Missing userId' });
        stats.missingUsers++;
        hasIssue = true;
      } else {
        userIds.add(doc.userId.toString());
      }
      
      if (!doc.documentType) {
        issues.push({ id: doc._id, issue: 'Missing documentType' });
        hasIssue = true;
      }
      
      if (!doc.file || !doc.file.systemName) {
        issues.push({ id: doc._id, issue: 'Missing file information' });
        hasIssue = true;
      }
      
      // Check file existence
      if (doc.file?.systemName) {
        const possiblePaths = [
          doc.file.path,
          path.join('/mnt/d/my_programs/HR/backend/uploads/payslips/', doc.file.systemName),
          path.join('/mnt/d/my_programs/HR/backend/uploads/documents/', doc.file.systemName),
          path.join(__dirname, 'uploads/payslips/', doc.file.systemName),
          path.join(__dirname, 'uploads/documents/', doc.file.systemName),
          path.join(__dirname, '../uploads/payslips/', doc.file.systemName),
          path.join(__dirname, '../uploads/documents/', doc.file.systemName)
        ].filter(p => p);
        
        let fileFound = false;
        for (const filePath of possiblePaths) {
          try {
            await fs.access(filePath);
            fileFound = true;
            break;
          } catch (e) {
            // File not found at this path
          }
        }
        
        if (!fileFound) {
          issues.push({ 
            id: doc._id, 
            issue: 'File not found',
            fileName: doc.file.systemName 
          });
          stats.missingFiles++;
          hasIssue = true;
        }
      }
      
      // Check for duplicates (same user, year, month for payslips)
      if (doc.documentType === 'payslip' && doc.temporal) {
        const key = `${doc.userId}_${doc.temporal.year}_${doc.temporal.month}`;
        if (duplicateKeys.has(key)) {
          issues.push({ 
            id: doc._id, 
            issue: 'Duplicate payslip',
            key: key 
          });
          stats.duplicates++;
          hasIssue = true;
        }
        duplicateKeys.add(key);
      }
      
      // Check data completeness
      if (!doc.audit || !doc.audit.createdAt) {
        issues.push({ id: doc._id, issue: 'Missing audit information' });
        stats.incompleteData++;
        hasIssue = true;
      }
      
      if (!hasIssue) {
        stats.valid++;
      }
    }
    
    // 4. Check user mapping
    console.log(`\n${colors.cyan}👥 User Mapping:${colors.reset}`);
    console.log(`  Unique users: ${userIds.size}`);
    
    // Get user details
    const { ObjectId } = require('mongodb');
    const users = await db.collection('users').find({
      _id: { $in: Array.from(userIds).map(id => new ObjectId(id)) }
    }).toArray();
    
    console.log(`  Users found in DB: ${users.length}`);
    console.log(`  Users missing: ${userIds.size - users.length}`);
    
    // 5. Check migration tracking
    console.log(`\n${colors.cyan}🔄 Migration Tracking:${colors.reset}`);
    const sources = {};
    documents.forEach(doc => {
      if (doc.migration?.source) {
        sources[doc.migration.source] = (sources[doc.migration.source] || 0) + 1;
      }
    });
    
    Object.entries(sources).forEach(([source, count]) => {
      console.log(`  From ${source}: ${count}`);
    });
    
    // 6. Performance check
    console.log(`\n${colors.cyan}⚡ Index Performance:${colors.reset}`);
    const indexes = await db.collection('unified_documents').listIndexes().toArray();
    console.log(`  Total indexes: ${indexes.length}`);
    
    const importantIndexes = [
      'user_documents_by_date',
      'documents_by_type_and_status',
      'employee_documents_by_date'
    ];
    
    importantIndexes.forEach(indexName => {
      const exists = indexes.some(idx => idx.name === indexName);
      if (exists) {
        console.log(`  ${colors.green}✅${colors.reset} ${indexName}`);
      } else {
        console.log(`  ${colors.red}❌${colors.reset} ${indexName} (missing)`);
      }
    });
    
    // 7. Summary
    console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.blue}                     SUMMARY                     ${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
    
    console.log(`${colors.cyan}Statistics:${colors.reset}`);
    console.log(`  Total documents: ${stats.total}`);
    console.log(`  Valid documents: ${colors.green}${stats.valid}${colors.reset}`);
    console.log(`  Missing files: ${stats.missingFiles > 0 ? colors.yellow : colors.green}${stats.missingFiles}${colors.reset}`);
    console.log(`  Missing users: ${stats.missingUsers > 0 ? colors.yellow : colors.green}${stats.missingUsers}${colors.reset}`);
    console.log(`  Duplicates: ${stats.duplicates > 0 ? colors.yellow : colors.green}${stats.duplicates}${colors.reset}`);
    console.log(`  Incomplete data: ${stats.incompleteData > 0 ? colors.yellow : colors.green}${stats.incompleteData}${colors.reset}`);
    
    const healthScore = (stats.valid / stats.total) * 100;
    console.log(`\n${colors.cyan}Health Score: ${healthScore >= 90 ? colors.green : healthScore >= 70 ? colors.yellow : colors.red}${healthScore.toFixed(1)}%${colors.reset}`);
    
    if (issues.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Issues Found (showing first 10):${colors.reset}`);
      issues.slice(0, 10).forEach(issue => {
        console.log(`  - Document ${issue.id}: ${issue.issue}`);
      });
      
      if (issues.length > 10) {
        console.log(`  ... and ${issues.length - 10} more issues`);
      }
    } else {
      console.log(`\n${colors.green}✅ No issues found!${colors.reset}`);
    }
    
    // 8. Recommendations
    console.log(`\n${colors.cyan}📋 Recommendations:${colors.reset}`);
    
    if (stats.missingFiles > 0) {
      console.log(`  ${colors.yellow}•${colors.reset} ${stats.missingFiles} files are missing - investigate file paths`);
    }
    
    if (stats.duplicates > 0) {
      console.log(`  ${colors.yellow}•${colors.reset} ${stats.duplicates} duplicate payslips found - consider deduplication`);
    }
    
    if (stats.incompleteData > 0) {
      console.log(`  ${colors.yellow}•${colors.reset} ${stats.incompleteData} documents have incomplete data - review and update`);
    }
    
    if (healthScore < 90) {
      console.log(`  ${colors.yellow}•${colors.reset} Health score below 90% - consider data cleanup`);
    } else {
      console.log(`  ${colors.green}•${colors.reset} Migration is healthy and ready for production`);
    }
    
    return healthScore >= 70; // Return true if health score is acceptable
    
  } catch (error) {
    console.error(`${colors.red}Error during verification: ${error.message}${colors.reset}`);
    return false;
  } finally {
    await client.close();
  }
}

// Run verification
verifyMigration().then(success => {
  process.exit(success ? 0 : 1);
});