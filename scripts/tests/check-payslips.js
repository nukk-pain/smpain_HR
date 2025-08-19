const { MongoClient } = require('mongodb');

async function checkPayslips() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('SM_nomu');
    
    // Check payslips collection
    const payslipsCount = await db.collection('payslips').countDocuments({});
    console.log(`Total payslips: ${payslipsCount}`);
    
    // Get sample data
    const samplePayslips = await db.collection('payslips').find({}).limit(3).toArray();
    console.log('\nSample payslips:');
    samplePayslips.forEach(p => {
      console.log({
        _id: p._id,
        userId: p.userId,
        year: p.year,
        month: p.month,
        fileName: p.fileName,
        originalFilename: p.originalFilename,
        deleted: p.deleted,
        uploadedAt: p.uploadedAt,
        createdAt: p.createdAt
      });
    });
    
    // Check non-deleted payslips
    const activePayslipsCount = await db.collection('payslips').countDocuments({ 
      $or: [
        { deleted: false },
        { deleted: { $exists: false } }
      ]
    });
    console.log(`\nActive (non-deleted) payslips: ${activePayslipsCount}`);
    
    // Check documents collection
    const documentsCount = await db.collection('documents').countDocuments({});
    console.log(`\nTotal documents: ${documentsCount}`);
    
  } finally {
    await client.close();
  }
}

checkPayslips().catch(console.error);