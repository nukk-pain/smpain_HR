/**
 * Express Application Configuration
 * Separated from server.js to enable testing
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const { MongoClient } = require('mongodb');

// Import routes
const createAuthRoutes = require('./routes/auth');
const createUserRoutes = require('./routes/users');
const createDepartmentRoutes = require('./routes/departments');
const createLeaveRoutes = require('./routes/leave');
const createPayrollRoutes = require('./routes/payroll');
const createDocumentRoutes = require('./routes/documents');
const createReportsRoutes = require('./routes/reports');
const createAdminRoutes = require('./routes/admin');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { securityMiddleware } = require('./middleware/security');

// Create Express app factory
async function createApp(options = {}) {
  const app = express();
  
  // Get configuration from options or environment
  const {
    mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName = process.env.DB_NAME || 'SM_nomu',
    enableMonitoring = process.env.NODE_ENV !== 'test',
    enableSwagger = process.env.NODE_ENV !== 'test',
    corsOrigin = process.env.CORS_ORIGIN || '*'
  } = options;
  
  // Connect to MongoDB
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  
  // Store database connection for cleanup
  app.locals.mongoClient = client;
  app.locals.db = db;
  
  // Apply middleware
  app.use(compression());
  app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(mongoSanitize());
  
  // Security middleware
  if (process.env.NODE_ENV !== 'test') {
    app.use(securityMiddleware);
  }
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV,
      database: db.databaseName
    });
  });
  
  // API Routes
  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/users', createUserRoutes(db));
  app.use('/api/departments', createDepartmentRoutes(db));
  app.use('/api/leave', createLeaveRoutes(db));
  app.use('/api/payroll', createPayrollRoutes(db));
  app.use('/api/documents', createDocumentRoutes(db));
  app.use('/api/reports', createReportsRoutes(db));
  app.use('/api/admin', createAdminRoutes(db));
  
  // Swagger documentation (only in non-test environments)
  if (enableSwagger) {
    try {
      const swaggerConfig = require('./config/swagger');
      const { swaggerUi, swaggerSpec } = swaggerConfig(app);
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    } catch (error) {
      console.log('Swagger setup skipped:', error.message);
    }
  }
  
  // Error handling middleware (must be last)
  app.use(errorHandler);
  
  // Cleanup function
  app.cleanup = async () => {
    if (client) {
      await client.close();
    }
  };
  
  return app;
}

module.exports = createApp;