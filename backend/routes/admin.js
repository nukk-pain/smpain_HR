const express = require('express');

/**
 * Main admin router that integrates all admin sub-modules
 * 
 * File structure after refactoring:
 * - admin.js (this file) - Router integration
 * - admin/leaveAdmin.js - Leave management routes
 * - admin/systemAdmin.js - System and policy management
 * - admin/capacityAdmin.js - Capacity and temp data management
 * - admin/logsAdmin.js - Logging system routes
 * - admin/shared/adminMiddleware.js - Shared middleware functions
 */
function createAdminRoutes(db) {
  const router = express.Router();

  // Import sub-route modules
  const createLeaveAdminRoutes = require('./admin/leaveAdmin');
  const createSystemAdminRoutes = require('./admin/systemAdmin');
  const createCapacityAdminRoutes = require('./admin/capacityAdmin');
  const createLogsAdminRoutes = require('./admin/logsAdmin');

  // Mount Leave Admin routes at /leave/*
  // Routes: /overview, /adjust, /employee/:id, /bulk-pending, /bulk-approve
  const leaveAdminRouter = createLeaveAdminRoutes(db);
  router.use('/leave', leaveAdminRouter);

  // Mount System Admin routes at root level
  // Routes: /stats/system, /policy, /policy/history, /migrate-users-isactive
  const systemAdminRouter = createSystemAdminRoutes(db);
  router.use('/', systemAdminRouter);

  // Mount Capacity Admin routes at root level
  // Routes: /debug/temp-uploads, /dashboard/temp-data, /capacity/*
  const capacityAdminRouter = createCapacityAdminRoutes(db);
  router.use('/', capacityAdminRouter);

  // Mount Logs Admin routes at /logs/*
  // Routes: /query, /stats, /export, /cleanup
  const logsAdminRouter = createLogsAdminRoutes(db);
  router.use('/logs', logsAdminRouter);

  return router;
}

module.exports = createAdminRoutes;