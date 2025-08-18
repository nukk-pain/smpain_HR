const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const uri = 'mongodb://localhost:27017/SM_nomu';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('SM_nomu');
    const usersCollection = db.collection('users');

    // Hash the password 'admin'
    const hashedPassword = await bcrypt.hash('admin', 10);
    console.log('Password hashed');

    // Update admin user password
    const result = await usersCollection.updateOne(
      { username: 'admin' },
      { 
        $set: { 
          password: hashedPassword,
          passwordLastChanged: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log('Admin user not found');
    } else if (result.modifiedCount === 0) {
      console.log('Admin password was already set to this value');
    } else {
      console.log('Admin password successfully updated to "admin"');
    }

    // Verify the update
    const adminUser = await usersCollection.findOne({ username: 'admin' });
    if (adminUser) {
      console.log('Admin user found:', {
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        passwordLastChanged: adminUser.passwordLastChanged
      });
      
      // Test password verification
      const isValid = await bcrypt.compare('admin', adminUser.password);
      console.log('Password verification test:', isValid ? 'SUCCESS' : 'FAILED');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

resetAdminPassword().catch(console.error);