// Test MongoDB Connection
const { MongoClient } = require('mongodb');

// Test configurations
const configs = [
  {
    name: "Docker hostname",
    url: "mongodb://mongo-hr-primary:27017/SM_nomu"
  },
  {
    name: "Localhost single",
    url: "mongodb://localhost:27017/SM_nomu"
  },
  {
    name: "Localhost primary only",
    url: "mongodb://localhost:27018/SM_nomu"
  },
  {
    name: "Replica set without auth",
    url: "mongodb://localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp"
  },
  {
    name: "Replica set with auth",
    url: "mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu"
  }
];

async function testConnection(config) {
  console.log(`\nTesting: ${config.name}`);
  console.log(`URL: ${config.url.replace(/:[^:@]+@/, ':****@')}`); // Hide password
  
  const client = new MongoClient(config.url, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000
  });
  
  try {
    await client.connect();
    console.log("✓ Connected successfully");
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`✓ Found ${collections.length} collections`);
    
    await client.close();
    return true;
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=== MongoDB Connection Tester ===");
  
  let workingConfig = null;
  
  for (const config of configs) {
    const success = await testConnection(config);
    if (success && !workingConfig) {
      workingConfig = config;
    }
  }
  
  if (workingConfig) {
    console.log("\n=== Working Configuration Found ===");
    console.log(`Use this in your .env or ecosystem.config.js:`);
    console.log(`MONGODB_URL=${workingConfig.url}`);
  } else {
    console.log("\n=== No Working Configuration Found ===");
    console.log("Please check:");
    console.log("1. MongoDB containers are running");
    console.log("2. User credentials are correct");
    console.log("3. Network connectivity between host and containers");
  }
}

main().catch(console.error);