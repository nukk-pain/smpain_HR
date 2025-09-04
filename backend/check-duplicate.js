const { MongoClient, ObjectId } = require('mongodb');

async function checkDuplicates() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('SM_nomu');
  
  // Find users
  const users = await db.collection('users').find({
    name: { $in: ['경가영', '김채영'] }
  }).toArray();
  
  console.log('Users found:');
  users.forEach(u => {
    console.log(`- ${u.name} (${u.employeeId}): ${u._id}`);
  });
  
  // Check payroll_documents for 2025-06
  console.log('\nChecking payroll_documents for 2025년 6월:');
  
  for (const user of users) {
    const doc = await db.collection('payroll_documents').findOne({
      userId: user._id,
      year: 2025,
      month: 6,
      documentType: 'payslip'
    });
    
    if (doc) {
      console.log(`Found for ${user.name}:`, {
        _id: doc._id,
        year: doc.year,
        month: doc.month,
        deleted: doc.deleted
      });
    } else {
      console.log(`No payroll_document found for ${user.name} (2025-06)`);
    }
  }
  
  // Check payslips collection for 2025-06
  console.log('\nChecking payslips collection for 2025년 6월:');
  
  for (const user of users) {
    const doc = await db.collection('payslips').findOne({
      userId: user._id,
      year: 2025,
      month: 6
    });
    
    if (doc) {
      console.log(`Found for ${user.name}:`, {
        _id: doc._id,
        year: doc.year,
        month: doc.month,
        deleted: doc.deleted,
        fileName: doc.fileName
      });
    } else {
      console.log(`No payslip found for ${user.name} (2025-06)`);
    }
  }
  
  await client.close();
}

checkDuplicates().catch(console.error);