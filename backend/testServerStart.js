// Quick test to check server startup
require('dotenv').config({ path: './.env.development' });

console.log('Environment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@'));
console.log('PORT:', process.env.PORT);

const { MongoClient } = require('mongodb');

async function testConnection() {
  const MONGO_URL = process.env.MONGODB_URI || process.env.MONGODB_URL;
  console.log('\nTesting connection to:', MONGO_URL?.replace(/:[^:]*@/, ':****@'));
  
  const client = new MongoClient(MONGO_URL, {
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    console.log('✅ Connection successful!');
    
    const db = client.db('SM_nomu');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();