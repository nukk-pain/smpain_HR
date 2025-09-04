#!/usr/bin/env node
/**
 * Backup Verification Script
 * Generated: 2025-08-19T03:21:38.395Z
 * Backup Path: /mnt/d/my_programs/HR/backups/backup_2025-08-19T03-21-38
 */

const fs = require('fs');
const path = require('path');

async function verifyBackup() {
  console.log('🔍 Verifying backup integrity...');
  
  const collections = ["payslips","payroll_documents","documents"];
  const errors = [];
  
  // Check metadata file
  const metadataPath = path.join('/mnt/d/my_programs/HR/backups/backup_2025-08-19T03-21-38', 'backup_metadata.json');
  if (!fs.existsSync(metadataPath)) {
    errors.push('Missing backup_metadata.json');
  }
  
  // Check each collection file
  for (const collection of collections) {
    const filePath = path.join('/mnt/d/my_programs/HR/backups/backup_2025-08-19T03-21-38', `${collection}.json`);
    
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing ${collection}.json`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      console.log(`  ✓ ${collection}: ${data.length} documents`);
    } catch (error) {
      errors.push(`Invalid JSON in ${collection}.json: ${error.message}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('\n❌ Verification failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  } else {
    console.log('\n✅ Backup verification successful!');
  }
}

verifyBackup().catch(console.error);
