// Enhanced database connection with replica set support
const { MongoClient } = require('mongodb');
const MongoStore = require('connect-mongo');

// Connection configuration
const DEFAULT_CONFIG = {
  // Replica set configuration (for production with MongoDB replica set)
  replicaSet: {
    enabled: process.env.MONGODB_REPLICA_SET === 'true' || false,
    name: process.env.MONGODB_REPLICA_SET_NAME || 'hrapp',
    
    // Multiple connection points for replica set
    hosts: process.env.MONGODB_REPLICA_HOSTS 
      ? process.env.MONGODB_REPLICA_HOSTS.split(',')
      : ['localhost:27018', 'localhost:27019', 'localhost:27020'],
    
    // Authentication
    username: process.env.MONGODB_USERNAME || 'hr_app_user',
    password: process.env.MONGODB_PASSWORD || 'Hr2025Secure',
    authSource: process.env.MONGODB_AUTH_SOURCE || 'SM_nomu'
  },
  
  // Single instance configuration (for development)
  singleInstance: {
    host: process.env.MONGODB_HOST || 'localhost',
    port: process.env.MONGODB_PORT || 27017,
    username: process.env.MONGODB_USERNAME || null,
    password: process.env.MONGODB_PASSWORD || null
  },
  
  // Database and connection options
  database: process.env.MONGODB_DATABASE || 'SM_nomu',
  options: {
    // Connection pool settings optimized for HR application load
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 2,
    maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 10000,
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000,
    heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY) || 10000,
    
    // Read preferences for replica set
    readPreference: process.env.MONGODB_READ_PREFERENCE || 'primaryPreferred',
    readConcern: { level: process.env.MONGODB_READ_CONCERN || 'majority' },
    writeConcern: { 
      w: process.env.MONGODB_WRITE_CONCERN || 'majority',
      j: true, // Enable journaling
      wtimeout: parseInt(process.env.MONGODB_WRITE_TIMEOUT) || 5000
    },
    
    // Retry configuration
    retryWrites: true,
    retryReads: true,
    
    // Compression (if supported)
    compressors: ['snappy', 'zlib'],
    
    // Other options
    bufferMaxEntries: 0, // Fail fast on connection issues
    useUnifiedTopology: true,
    useNewUrlParser: true
  }
};

// Global connection state
let client = null;
let db = null;
let isConnecting = false;

/**
 * Build MongoDB connection URI based on configuration
 */
function buildConnectionURI() {
  const config = DEFAULT_CONFIG;
  
  if (config.replicaSet.enabled) {
    // Replica set connection string
    const hosts = config.replicaSet.hosts.join(',');
    const auth = config.replicaSet.username && config.replicaSet.password
      ? `${config.replicaSet.username}:${config.replicaSet.password}@`
      : '';
    
    const params = new URLSearchParams({
      replicaSet: config.replicaSet.name,
      authSource: config.replicaSet.authSource,
      readPreference: config.options.readPreference,
      retryWrites: 'true',
      w: config.options.writeConcern.w,
      journal: 'true'
    });
    
    return `mongodb://${auth}${hosts}/${config.database}?${params.toString()}`;
  } else {
    // Single instance connection string
    const auth = config.singleInstance.username && config.singleInstance.password
      ? `${config.singleInstance.username}:${config.singleInstance.password}@`
      : '';
    
    return `mongodb://${auth}${config.singleInstance.host}:${config.singleInstance.port}/${config.database}`;
  }
}

/**
 * Connect to MongoDB with enhanced error handling and retry logic
 */
async function connectToDatabase(maxRetries = 3, retryDelay = 5000) {
  // Return existing connection if available
  if (client && db) {
    try {
      // Test connection health
      await db.admin().ping();
      return { client, db };
    } catch (error) {
      console.warn('⚠️ Existing connection failed health check, reconnecting...');
      client = null;
      db = null;
    }
  }
  
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { client, db };
  }
  
  isConnecting = true;
  
  try {
    const uri = buildConnectionURI();
    console.log(`🔗 Connecting to MongoDB...`);
    console.log(`   Replica Set: ${DEFAULT_CONFIG.replicaSet.enabled ? 'Enabled' : 'Disabled'}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        client = new MongoClient(uri, DEFAULT_CONFIG.options);
        await client.connect();
        
        db = client.db(DEFAULT_CONFIG.database);
        
        // Test connection
        await db.admin().ping();
        
        console.log(`✅ Connected to MongoDB successfully`);
        console.log(`   Database: ${DEFAULT_CONFIG.database}`);
        
        if (DEFAULT_CONFIG.replicaSet.enabled) {
          // Log replica set status
          try {
            const status = await db.admin().replSetGetStatus();
            console.log(`   Replica Set: ${status.set}`);
            console.log(`   Primary: ${status.members.find(m => m.stateStr === 'PRIMARY')?.name || 'Unknown'}`);
          } catch (rsError) {
            console.warn('⚠️ Could not get replica set status:', rsError.message);
          }
        }
        
        // Set up connection event listeners
        setupConnectionEventListeners(client);
        
        isConnecting = false;
        return { client, db };
        
      } catch (error) {
        console.error(`❌ Connection attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            console.warn('Warning: Error closing failed connection:', closeError.message);
          }
          client = null;
          db = null;
        }
        
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying connection in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
    
  } catch (error) {
    isConnecting = false;
    console.error('💥 Fatal database connection error:', error);
    throw error;
  }
}

/**
 * Setup connection event listeners for monitoring
 */
function setupConnectionEventListeners(mongoClient) {
  mongoClient.on('connectionPoolCreated', (event) => {
    console.log('🏊 Connection pool created:', event.address);
  });
  
  mongoClient.on('connectionPoolClosed', (event) => {
    console.log('🏊 Connection pool closed:', event.address);
  });
  
  mongoClient.on('connectionCreated', (event) => {
    console.log('🔗 New connection created:', event.connectionId);
  });
  
  mongoClient.on('connectionClosed', (event) => {
    console.log('🔗 Connection closed:', event.connectionId);
  });
  
  mongoClient.on('serverOpening', (event) => {
    console.log('🖥️ Server connection opened:', event.address);
  });
  
  mongoClient.on('serverClosed', (event) => {
    console.log('🖥️ Server connection closed:', event.address);
  });
  
  mongoClient.on('topologyOpening', (event) => {
    console.log('🌐 Topology opening:', event.topologyId);
  });
  
  mongoClient.on('topologyClosed', (event) => {
    console.log('🌐 Topology closed:', event.topologyId);
  });
  
  // Replica set specific events
  if (DEFAULT_CONFIG.replicaSet.enabled) {
    mongoClient.on('serverDescriptionChanged', (event) => {
      if (event.newDescription.type === 'RSPrimary' || event.previousDescription.type === 'RSPrimary') {
        console.log('👑 Primary server changed:', {
          address: event.address,
          previousType: event.previousDescription.type,
          newType: event.newDescription.type
        });
      }
    });
  }
}

/**
 * Get database instance (lazy connection)
 */
async function getDatabase() {
  if (!db) {
    const connection = await connectToDatabase();
    return connection.db;
  }
  return db;
}

/**
 * Get client instance (lazy connection)
 */
async function getClient() {
  if (!client) {
    const connection = await connectToDatabase();
    return connection.client;
  }
  return client;
}

/**
 * Create optimized session store for Express sessions
 */
function createSessionStore() {
  return MongoStore.create({
    clientPromise: getClient(),
    dbName: DEFAULT_CONFIG.database,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 1 day in seconds
    autoRemove: 'native',
    
    // Optimized indexes for session store
    createIndexes: true,
    
    // Touch sessions to prevent premature expiration
    touchAfter: 24 * 3600, // Only update session once per day unless changed
    
    // Serialization options
    stringify: false,
    
    // Error handling
    errorHandler: (error) => {
      console.error('Session store error:', error);
    }
  });
}

/**
 * Start a MongoDB session (for transactions)
 */
async function startSession(options = {}) {
  const mongoClient = await getClient();
  return mongoClient.startSession({
    defaultTransactionOptions: {
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority', j: true },
      readPreference: 'primary'
    },
    ...options
  });
}

/**
 * Execute operation with transaction
 */
async function withTransaction(operation, sessionOptions = {}) {
  if (!DEFAULT_CONFIG.replicaSet.enabled) {
    // Transactions require replica set, execute without transaction
    console.warn('⚠️ Transactions require replica set. Executing without transaction.');
    return await operation();
  }
  
  const session = await startSession(sessionOptions);
  
  try {
    let result;
    
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Check database health and performance
 */
async function healthCheck() {
  try {
    const database = await getDatabase();
    const mongoClient = await getClient();
    
    // Basic connectivity
    const pingResult = await database.admin().ping();
    
    // Server status
    const serverStatus = await database.admin().serverStatus();
    
    // Database stats
    const dbStats = await database.stats();
    
    // Connection pool stats
    const poolStats = {
      current: mongoClient.topology?.s?.server?.pool?.generation || 0,
      available: mongoClient.topology?.s?.server?.pool?.availableCount || 0,
      created: mongoClient.topology?.s?.server?.pool?.totalConnectionCount || 0
    };
    
    // Replica set status (if enabled)
    let replicaSetStatus = null;
    if (DEFAULT_CONFIG.replicaSet.enabled) {
      try {
        replicaSetStatus = await database.admin().replSetGetStatus();
      } catch (error) {
        replicaSetStatus = { error: error.message };
      }
    }
    
    return {
      status: 'healthy',
      ping: pingResult,
      server: {
        version: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections
      },
      database: {
        name: database.databaseName,
        collections: dbStats.collections,
        dataSize: dbStats.dataSize,
        indexSize: dbStats.indexSize,
        storageSize: dbStats.storageSize
      },
      connectionPool: poolStats,
      replicaSet: replicaSetStatus,
      config: {
        replicaSetEnabled: DEFAULT_CONFIG.replicaSet.enabled,
        readPreference: DEFAULT_CONFIG.options.readPreference,
        writeConcern: DEFAULT_CONFIG.options.writeConcern.w
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gracefully close database connection
 */
async function closeConnection() {
  if (client) {
    console.log('🔌 Closing MongoDB connection...');
    await client.close();
    client = null;
    db = null;
    console.log('✅ MongoDB connection closed');
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('📝 Received SIGINT, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📝 Received SIGTERM, closing database connection...');
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectToDatabase,
  getDatabase,
  getClient,
  createSessionStore,
  startSession,
  withTransaction,
  healthCheck,
  closeConnection,
  buildConnectionURI
};