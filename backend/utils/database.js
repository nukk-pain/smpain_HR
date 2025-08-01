const { MongoClient } = require('mongodb');
const session = require('express-session');
const MongoStore = require('connect-mongo');

let client = null;
let db = null;
let sessionStore = null;

const connectToDatabase = async () => {
  if (db) return { client, db };

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'SM_nomu';
    
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    console.log('Connected to MongoDB');

    db = client.db(dbName);

    client.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    client.on('close', () => {
      console.log('MongoDB connection closed');
      db = null;
      client = null;
    });

    process.on('SIGINT', async () => {
      await closeDatabaseConnection();
      process.exit(0);
    });

    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

const getDatabase = async () => {
  if (!db) {
    await connectToDatabase();
  }
  return db;
};

const getClient = () => {
  if (!client) {
    throw new Error('Database client not initialized. Call connectToDatabase first.');
  }
  return client;
};

const closeDatabaseConnection = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
    client = null;
    db = null;
    sessionStore = null;
  }
};

const createSessionStore = () => {
  if (sessionStore) return sessionStore;

  if (!client) {
    throw new Error('Database client not initialized. Call connectToDatabase first.');
  }

  sessionStore = MongoStore.create({
    client: client,
    dbName: process.env.DB_NAME || 'SM_nomu',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
    autoRemove: 'native',
    touchAfter: 24 * 3600, // 24 hours
  });

  return sessionStore;
};

const withTransaction = async (callback) => {
  const session = client.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      return await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  connectToDatabase,
  getDatabase,
  getClient,
  closeDatabaseConnection,
  createSessionStore,
  withTransaction
};