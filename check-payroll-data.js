const { MongoClient } = require('mongodb');

async function checkPayrollData() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('SM_nomu');
    
    // Check payroll collection for 2025-06
    const count2025_06 = await db.collection('payroll').countDocuments({
      year: 2025,
      month: 6
    });
    
    console.log(`\n=== Payroll Records for 2025-06 ===`);
    console.log(`Count: ${count2025_06}`);
    
    if (count2025_06 > 0) {
      const records = await db.collection('payroll').find({
        year: 2025,
        month: 6
      }).limit(3).toArray();
      
      console.log('\nFirst few records:');
      records.forEach(record => {
        console.log(`- User: ${record.userId}, BaseSalary: ${record.baseSalary}, NetSalary: ${record.netSalary}`);
      });
    }
    
    // Check for any recent payroll records
    console.log(`\n=== Recent Payroll Records (any year/month) ===`);
    const recentRecords = await db.collection('payroll')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    if (recentRecords.length > 0) {
      console.log('Recent records:');
      recentRecords.forEach(record => {
        console.log(`- Year: ${record.year}, Month: ${record.month}, Created: ${record.createdAt}`);
      });
    } else {
      console.log('No records found in payroll collection');
    }
    
    // Check all unique year-month combinations
    const yearMonths = await db.collection('payroll').aggregate([
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]).toArray();
    
    console.log(`\n=== All Year-Month Combinations in Payroll ===`);
    yearMonths.forEach(item => {
      console.log(`- ${item._id.year}-${String(item._id.month).padStart(2, '0')}: ${item.count} records`);
    });
    
  } catch (error) {
    console.error('Error checking payroll data:', error);
  } finally {
    await client.close();
  }
}

checkPayrollData();