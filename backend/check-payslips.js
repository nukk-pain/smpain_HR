const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function checkPayslips() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('SM_nomu');
    
    console.log('=== Checking Payslip Uploads ===\n');
    
    // 1. Check database records
    console.log('1. Database Records (payroll_documents collection):');
    console.log('------------------------------------------------');
    const documents = await db.collection('payroll_documents')
      .find({ documentType: 'payslip' })
      .sort({ uploadedAt: -1 })
      .limit(10)
      .toArray();
    
    if (documents.length === 0) {
      console.log('❌ No payslip documents found in database\n');
    } else {
      console.log(`✅ Found ${documents.length} payslip(s) in database:\n`);
      
      for (const doc of documents) {
        // Get user info
        const user = await db.collection('users').findOne({ _id: doc.userId });
        
        console.log(`  📄 ${doc.originalFileName || doc.fileName}`);
        console.log(`     - User: ${user ? user.name : 'Unknown'}`);
        console.log(`     - Year/Month: ${doc.year}/${doc.month}`);
        console.log(`     - Uploaded: ${doc.uploadedAt}`);
        console.log(`     - File Path: ${doc.filePath}`);
        console.log(`     - File Exists: ${fs.existsSync(doc.filePath) ? '✅' : '❌'}`);
        console.log('');
      }
    }
    
    // 2. Check file system
    console.log('2. File System (uploads/payslips directory):');
    console.log('--------------------------------------------');
    const uploadsDir = path.join(__dirname, 'uploads/payslips');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      
      if (files.length === 0) {
        console.log('❌ No files found in uploads/payslips directory\n');
      } else {
        console.log(`✅ Found ${files.length} file(s) in uploads/payslips:\n`);
        files.forEach(file => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  📁 ${file}`);
          console.log(`     - Size: ${(stats.size / 1024).toFixed(2)} KB`);
          console.log(`     - Modified: ${stats.mtime}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Directory uploads/payslips does not exist\n');
    }
    
    // 3. Check for orphaned files (files without DB records)
    console.log('3. Data Integrity Check:');
    console.log('------------------------');
    if (documents.length > 0) {
      let orphanedCount = 0;
      let missingCount = 0;
      
      for (const doc of documents) {
        if (!fs.existsSync(doc.filePath)) {
          missingCount++;
          console.log(`⚠️  Missing file for DB record: ${doc.originalFileName}`);
        }
      }
      
      if (missingCount === 0 && orphanedCount === 0) {
        console.log('✅ All database records have corresponding files');
      }
    } else {
      console.log('No records to check');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkPayslips();