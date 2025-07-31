const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env.development' });

async function testConnection() {
  console.log('Testing MongoDB Atlas connection...');
  const connectionString = process.env.MONGODB_URI || process.env.MONGODB_URL;
  console.log('Connection string:', connectionString?.replace(/:[^:]*@/, ':****@'));
  
  const client = new MongoClient(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Get database
    const db = client.db(process.env.DB_NAME || 'SM_nomu');
    
    // Test database operations
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:', collections.map(c => c.name));
    
    // Test write operation
    const testCollection = db.collection('test_connection');
    const testDoc = await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Atlas connection test successful'
    });
    console.log('\n✅ Write test successful:', testDoc.insertedId);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: testDoc.insertedId });
    console.log('✅ Cleanup successful');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\nPlease check:');
      console.error('1. Username and password are correct');
      console.error('2. User has been created in Atlas');
      console.error('3. Database name in connection string');
    }
    if (error.message.includes('connect')) {
      console.error('\nPlease check:');
      console.error('1. IP whitelist includes your current IP (0.0.0.0/0 for dev)');
      console.error('2. Cluster is active and not paused');
      console.error('3. Network connectivity to Atlas');
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB Atlas');
  }
}

testConnection();