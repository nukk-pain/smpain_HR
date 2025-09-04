/**
 * Database Manager
 * Singleton pattern for MongoDB connection management
 */

const { MongoClient } = require('mongodb');

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.connectionPromise = null;
    this.client = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }
  
  /**
   * Get MongoDB connection
   */
  async getConnection() {
    // If already connected, return the connection
    if (this.connection && this.client && this.client.topology && this.client.topology.isConnected()) {
      return this.connection;
    }
    
    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    // Start new connection
    this.connectionPromise = this.connect();
    this.connection = await this.connectionPromise;
    this.connectionPromise = null;
    
    return this.connection;
  }
  
  /**
   * Connect to MongoDB
   */
  async connect() {
    if (this.isConnecting) {
      throw new Error('Connection already in progress');
    }
    
    this.isConnecting = true;
    
    try {
      // Get connection string from environment or config
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.DB_NAME || 'SM_nomu';
      
      console.log(`Connecting to MongoDB at ${uri.replace(/\/\/.*@/, '//<credentials>@')}...`);
      
      // Connection options
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 10000,
        waitQueueTimeoutMS: 10000
      };
      
      // Create client and connect
      this.client = new MongoClient(uri, options);
      await this.client.connect();
      
      // Get database
      const db = this.client.db(dbName);
      
      // Test the connection
      await db.admin().ping();
      
      console.log(`Successfully connected to MongoDB database: ${dbName}`);
      
      // Setup connection event handlers
      this.setupEventHandlers();
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      return db;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.connectionPromise = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }
  
  /**
   * Setup MongoDB event handlers
   */
  setupEventHandlers() {
    if (!this.client) return;
    
    // Handle topology events
    this.client.on('error', (error) => {
      console.error('MongoDB client error:', error);
      this.handleConnectionError();
    });
    
    this.client.on('serverHeartbeatFailed', (event) => {
      console.warn('MongoDB server heartbeat failed:', event.connectionId);
    });
    
    this.client.on('close', () => {
      console.warn('MongoDB connection closed');
      this.connection = null;
    });
    
    // Monitor topology changes
    this.client.on('topologyChanged', (event) => {
      console.log('MongoDB topology changed:', event.topologyType);
    });
  }
  
  /**
   * Handle connection errors with reconnection logic
   */
  async handleConnectionError() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      this.connection = null;
      this.client = null;
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
        this.handleConnectionError();
      }
    }, this.reconnectDelay);
  }
  
  /**
   * Reconnect to MongoDB
   */
  async reconnect() {
    // Close existing client if any
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing existing client:', error);
      }
    }
    
    this.connection = null;
    this.client = null;
    this.connectionPromise = null;
    
    // Attempt new connection
    return this.getConnection();
  }
  
  /**
   * Close MongoDB connection
   */
  async close() {
    if (this.client) {
      try {
        await this.client.close();
        console.log('MongoDB connection closed successfully');
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
      } finally {
        this.connection = null;
        this.client = null;
        this.connectionPromise = null;
      }
    }
  }
  
  /**
   * Check if connected
   */
  isConnected() {
    return !!(this.client && this.client.topology && this.client.topology.isConnected());
  }
  
  /**
   * Get connection statistics
   */
  getStats() {
    if (!this.isConnected()) {
      return { connected: false };
    }
    
    return {
      connected: true,
      reconnectAttempts: this.reconnectAttempts,
      poolSize: this.client.options.maxPoolSize,
      serverInfo: this.client.topology.description
    };
  }
  
  /**
   * Execute operation with automatic reconnection
   */
  async withConnection(operation) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const db = await this.getConnection();
        return await operation(db);
      } catch (error) {
        attempts++;
        
        if (error.name === 'MongoNetworkError' && attempts < maxAttempts) {
          console.warn(`Database operation failed (attempt ${attempts}/${maxAttempts}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          continue;
        }
        
        throw error;
      }
    }
  }
}

// Export singleton instance
module.exports = new DatabaseManager();