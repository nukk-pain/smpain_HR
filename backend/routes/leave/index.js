const express = require('express');

const router = express.Router();

// Import all leave module routers
const leaveRequestsRouter = require('./leaveRequests');
const leaveBalanceRouter = require('./leaveBalance');
const leaveApprovalRouter = require('./leaveApproval');
const leaveCancellationRouter = require('./leaveCancellation');
const leaveCalendarRouter = require('./leaveCalendar');
const leaveExceptionsRouter = require('./leaveExceptions');

// Set up middleware to provide database access to all sub-routes
router.use((req, res, next) => {
  // Database is already available at req.app.locals.db from server.js
  if (!req.app.locals.db) {
    return res.status(500).json({ error: 'Database connection not available' });
  }
  next();
});

// Mount sub-routers - ORDER MATTERS: more specific routes first

// Exception management routes (must be before /:id routes)
router.use('/exceptions', leaveExceptionsRouter);

// Balance and carry-over routes
router.use('/balance', leaveBalanceRouter);
router.use('/carry-over', leaveBalanceRouter);

// Approval and pending routes  
router.use('/pending', leaveApprovalRouter);

// Cancellation routes
router.use('/cancellations', leaveCancellationRouter);

// Calendar and team status routes
router.use('/calendar', leaveCalendarRouter);
router.use('/team-calendar', leaveCalendarRouter);
router.use('/team-status', leaveCalendarRouter);
router.use('/employee', leaveCalendarRouter);

// Approval and cancellation routes with ID parameter
router.use('/:id/approve', leaveApprovalRouter);
router.use('/:id/cancel', leaveCancellationRouter);

// Main CRUD operations (must be last due to /:id conflict)
router.use('/', leaveRequestsRouter);

module.exports = router;