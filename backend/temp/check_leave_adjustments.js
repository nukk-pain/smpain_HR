const { MongoClient } = require('mongodb');

async function checkLeaveAdjustments() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('SM_nomu');
    
    console.log('=== Leave Adjustments Collection ===');
    const adjustments = await db.collection('leaveAdjustments').find({}).toArray();
    console.log('Total adjustments:', adjustments.length);
    adjustments.forEach((adj, index) => {
      console.log(`\n${index + 1}. Adjustment:`);
      console.log('   Type:', adj.type);
      console.log('   Amount:', adj.amount);
      console.log('   Employee ID:', adj.employeeId);
      console.log('   Reason:', adj.reason);
      console.log('   Date:', adj.adjustedAt);
      console.log('   Previous Balance:', adj.previousBalance);
      console.log('   New Balance:', adj.newBalance);
    });
    
    console.log('\n=== Users leaveBalance field check ===');
    const usersWithBalance = await db.collection('users').find({}, {
      projection: { name: 1, leaveBalance: 1, employeeId: 1 }
    }).toArray();
    usersWithBalance.forEach(user => {
      console.log(`${user.name} (${user.employeeId}): leaveBalance = ${user.leaveBalance || 'undefined'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkLeaveAdjustments();