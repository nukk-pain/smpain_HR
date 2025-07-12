const { MongoClient } = require('mongodb');

async function checkDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('SM_nomu');
    
    // Check users collection
    console.log('\n📊 Users Collection:');
    const users = await db.collection('users').find({}, {
      projection: { password: 0 } // Exclude password for security
    }).toArray();
    
    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name} (${user.username})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Department: ${user.department || 'N/A'}`);
      console.log(`   Position: ${user.position || 'N/A'}`);
      console.log(`   Employee ID: ${user.employeeId || 'N/A'}`);
      console.log(`   Hire Date: ${user.hireDate ? new Date(user.hireDate).toLocaleDateString('ko-KR') : 'N/A'}`);
      console.log(`   Contract Type: ${user.contractType || 'N/A'}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Base Salary: ${user.baseSalary ? user.baseSalary.toLocaleString() : 'N/A'}`);
      console.log(`   Incentive Formula: ${user.incentiveFormula || 'N/A'}`);
    });
    
    // Check other collections
    console.log('\n📊 Database Collections:');
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count} documents`);
    }
    
    // Check sample monthly payments
    console.log('\n📊 Sample Monthly Payments:');
    const payments = await db.collection('monthlyPayments').find({}).limit(3).toArray();
    payments.forEach((payment, index) => {
      console.log(`\n${index + 1}. Year-Month: ${payment.yearMonth}`);
      console.log(`   Base Salary: ${payment.baseSalary?.toLocaleString() || 'N/A'}`);
      console.log(`   Incentive: ${payment.incentive?.toLocaleString() || 'N/A'}`);
      console.log(`   Total Input: ${payment.totalInput?.toLocaleString() || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await client.close();
  }
}

checkDatabase();