const { MongoClient } = require('mongodb');

async function countPayslips() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('SM_nomu');
    
    const count = await db.collection('payroll_documents').countDocuments({ documentType: 'payslip' });
    console.log(`Total payslip documents: ${count}`);
    
    // Also check recent documents of any type
    const allDocs = await db.collection('payroll_documents').find().sort({ _id: -1 }).limit(5).toArray();
    console.log(`\nRecent documents (any type): ${allDocs.length}`);
    allDocs.forEach(doc => {
      console.log(`- Type: ${doc.documentType}, File: ${doc.originalFileName || doc.fileName}, Date: ${doc.uploadedAt || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

countPayslips();