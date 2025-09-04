/**
 * Test app setup - creates an Express app instance for testing
 * without starting the actual server
 */
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const createAuthRoutes = require('../../routes/auth');
const createUserRoutes = require('../../routes/users');
const createLeaveRoutes = require('../../routes/leave');
const createPayrollRoutes = require('../../routes/payroll');
const createDepartmentRoutes = require('../../routes/departments');
const createDocumentRoutes = require('../../routes/documents');
const createReportsRoutes = require('../../routes/reports');
const { errorHandler } = require('../../middleware/errorHandler');

let db;
let client;

async function createTestApp() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Connect to test database if not connected
  if (!db) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'hr_test';
    
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(dbName);
  }
  
  // Routes
  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/users', createUserRoutes(db));
  app.use('/api/leave', createLeaveRoutes(db));
  app.use('/api/payroll', createPayrollRoutes(db));
  app.use('/api/departments', createDepartmentRoutes(db));
  app.use('/api/documents', createDocumentRoutes(db));
  app.use('/api/reports', createReportsRoutes(db));
  
  // Error handling
  app.use(errorHandler);
  
  return app;
}

async function closeTestApp() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { createTestApp, closeTestApp };