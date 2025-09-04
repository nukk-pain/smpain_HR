const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('SM_nomu');
    
    // Hash new password
    const newPassword = 'test123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update supervisor password
    const result = await db.collection('users').updateOne(
      { username: '임정수' },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password reset result:', result);
    
    // Also check if we have other supervisors
    const supervisors = await db.collection('users')
      .find({ role: { $regex: /supervisor/i } })
      .project({ username: 1, name: 1, role: 1 })
      .toArray();
    
    console.log('All supervisors:', supervisors);
    
  } finally {
    await client.close();
  }
}

resetPassword().catch(console.error);