// Refactored leave routes using new utilities
const express = require('express');
const { ObjectId } = require('mongodb');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  requireAuth, 
  requirePermission, 
  requireOwnership,
  requireManagerOrAdmin,
  addPermissionInfo 
} = require('../middleware/permissions');
const { 
  successResponse, 
  errorResponse, 
  notFoundError, 
  validationError,
  serverError 
} = require('../utils/responses');
const { leaveRepository, userRepository } = require('../repositories');
const { leaveSchemas, validate, validateObjectId } = require('../validation/schemas');
const { 
  calculateLeaveDays,
  validateLeaveDates,
  checkLeaveBalance,
  checkLeaveConflicts,
  getLeaveStatusInfo,
  calculateCarryOverLeave
} = require('../utils/leaveUtils');
const { formatDateForDisplay, getYearMonth } = require('../utils/dateUtils');

const router = express.Router();

// Add permission info to all requests
router.use(addPermissionInfo);

/**
 * GET /leave - Get leave requests with filtering and pagination
 */
router.get('/',
  requireAuth,
  requirePermission('leave:view'),
  validate.query(leaveSchemas.query || {}),
  asyncHandler(async (req, res) => {
    try {
      const { user_id, status, startDate, endDate, month, page, limit } = req.query;
      const currentUser = req.user;

      // Build query filters
      const filters = {};
      
      // Non-admin users can only see their own requests
      if (currentUser.role !== 'admin') {
        filters.userId = new ObjectId(user_id || currentUser.id);
      } else if (user_id) {
        filters.userId = new ObjectId(user_id);
      }

      if (status) filters.status = status;
      
      if (startDate && endDate) {
        filters.startDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else if (month) {
        const [year, monthNum] = month.split('-');
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0);
        filters.startDate = { $gte: startOfMonth, $lte: endOfMonth };
      }

      // Use repository with pagination
      const result = page 
        ? await leaveRepository.paginate(filters, { 
            page, 
            limit, 
            sort: { createdAt: -1 } 
          })
        : await leaveRepository.findAll(filters, { sort: { createdAt: -1 } });

      // Enrich with user data and formatting
      const enrichLeaveRequest = async (request) => {
        const user = await userRepository.findById(request.userId);
        const approver = request.approverId 
          ? await userRepository.findById(request.approverId)
          : null;

        return {
          ...request,
          user: user ? {
            _id: user._id,
            name: user.name,
            department: user.department,
            employeeId: user.employeeId
          } : null,
          approver: approver ? {
            _id: approver._id,
            name: approver.name
          } : null,
          startDateFormatted: formatDateForDisplay(request.startDate),
          endDateFormatted: formatDateForDisplay(request.endDate),
          statusInfo: getLeaveStatusInfo(request.status)
        };
      };

      if (page) {
        result.documents = await Promise.all(result.documents.map(enrichLeaveRequest));
      } else {
        const enrichedRequests = await Promise.all(result.map(enrichLeaveRequest));
        return successResponse(res, enrichedRequests, 'Leave requests retrieved successfully');
      }

      successResponse(res, result, 'Leave requests retrieved successfully');
    } catch (error) {
      console.error('Get leave requests error:', error);
      serverError(res, error, 'Failed to retrieve leave requests');
    }
  })
);

/**
 * GET /leave/:id - Get leave request by ID
 */
router.get('/:id',
  requireAuth,
  requirePermission('leave:view'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const leaveRequest = await leaveRepository.findById(req.params.id);
      
      if (!leaveRequest) {
        return notFoundError(res, 'Leave request');
      }

      // Check if user can view this request
      const currentUser = req.user;
      if (currentUser.role !== 'Admin' && 
          currentUser.role !== 'Manager' && 
          leaveRequest.userId.toString() !== currentUser._id) {
        return errorResponse(res, 403, 'You can only view your own leave requests');
      }

      // Enrich with user data
      const user = await userRepository.findById(leaveRequest.userId);
      const approver = leaveRequest.approverId 
        ? await userRepository.findById(leaveRequest.approverId)
        : null;

      const enrichedRequest = {
        ...leaveRequest,
        user: user ? {
          _id: user._id,
          name: user.name,
          department: user.department,
          employeeId: user.employeeId,
          leaveBalance: user.leaveBalance
        } : null,
        approver: approver ? {
          _id: approver._id,
          name: approver.name
        } : null,
        startDateFormatted: formatDateForDisplay(leaveRequest.startDate),
        endDateFormatted: formatDateForDisplay(leaveRequest.endDate),
        statusInfo: getLeaveStatusInfo(leaveRequest.status)
      };

      successResponse(res, enrichedRequest, 'Leave request retrieved successfully');
    } catch (error) {
      console.error('Get leave request error:', error);
      serverError(res, error, 'Failed to retrieve leave request');
    }
  })
);

/**
 * POST /leave - Create new leave request
 */
router.post('/',
  requireAuth,
  requirePermission('leave:create'),
  validate.body(leaveSchemas.create),
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate, reason, daysCount } = req.body;
      const userId = req.user._id;

      // Validate dates
      const dateValidation = validateLeaveDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return validationError(res, [{ 
          field: 'dates', 
          message: dateValidation.error 
        }]);
      }

      // Get user data
      const user = await userRepository.findById(userId);
      if (!user) {
        return notFoundError(res, 'User');
      }

      // Calculate actual leave days
      const actualDays = calculateLeaveDays(startDate, endDate);
      
      // Check leave balance
      const balanceCheck = checkLeaveBalance(user.leaveBalance || 0, actualDays);
      if (!balanceCheck.isValid) {
        return validationError(res, [{ 
          field: 'daysCount', 
          message: balanceCheck.error 
        }]);
      }

      // Check for conflicting requests
      const existingRequests = await leaveRepository.findByUserId(userId);
      const conflictCheck = checkLeaveConflicts(startDate, endDate, existingRequests);
      if (conflictCheck.hasConflicts) {
        return validationError(res, [{ 
          field: 'dates', 
          message: `Conflicts with ${conflictCheck.conflictCount} existing request(s)` 
        }]);
      }

      // Check for multiple pending requests
      const pendingRequests = await leaveRepository.findUserPendingRequests(userId);
      if (pendingRequests.length > 0) {
        return validationError(res, [{ 
          field: 'status', 
          message: 'You already have a pending leave request. Please wait for approval or cancel it first.' 
        }]);
      }

      // Create leave request
      const leaveRequestData = {
        userId: new ObjectId(userId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        daysCount: actualDays,
        status: 'pending',
        isAdvanceUsage: balanceCheck.isAdvanceUsage || false,
        advanceDays: balanceCheck.advanceDays || 0
      };

      const newRequest = await leaveRepository.create(leaveRequestData);

      successResponse(res, {
        ...newRequest,
        user: {
          _id: user._id,
          name: user.name,
          department: user.department
        },
        startDateFormatted: formatDateForDisplay(newRequest.startDate),
        endDateFormatted: formatDateForDisplay(newRequest.endDate),
        statusInfo: getLeaveStatusInfo(newRequest.status)
      }, 'Leave request created successfully');
    } catch (error) {
      console.error('Create leave request error:', error);
      serverError(res, error, 'Failed to create leave request');
    }
  })
);

/**
 * PUT /leave/:id - Update leave request (only pending requests)
 */
router.put('/:id',
  requireAuth,
  requirePermission('leave:edit'),
  validateObjectId,
  validate.body(leaveSchemas.update),
  asyncHandler(async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user._id;

      const existingRequest = await leaveRepository.findById(requestId);
      if (!existingRequest) {
        return notFoundError(res, 'Leave request');
      }

      // Only user who created the request can edit it
      if (existingRequest.userId.toString() !== userId) {
        return errorResponse(res, 403, 'You can only edit your own leave requests');
      }

      // Only pending requests can be edited
      if (existingRequest.status !== 'pending') {
        return errorResponse(res, 400, 'Only pending leave requests can be edited');
      }

      // Validate new dates if provided
      const startDate = req.body.startDate || existingRequest.startDate;
      const endDate = req.body.endDate || existingRequest.endDate;

      const dateValidation = validateLeaveDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return validationError(res, [{ 
          field: 'dates', 
          message: dateValidation.error 
        }]);
      }

      // Recalculate days if dates changed
      let actualDays = existingRequest.daysCount;
      if (req.body.startDate || req.body.endDate) {
        actualDays = calculateLeaveDays(startDate, endDate);
        req.body.daysCount = actualDays;
      }

      // Check balance with new days
      const user = await userRepository.findById(userId);
      const balanceCheck = checkLeaveBalance(user.leaveBalance || 0, actualDays);
      if (!balanceCheck.isValid) {
        return validationError(res, [{ 
          field: 'daysCount', 
          message: balanceCheck.error 
        }]);
      }

      // Check for conflicts (excluding current request)
      const existingRequests = await leaveRepository.findByUserId(userId);
      const otherRequests = existingRequests.filter(req => req._id.toString() !== requestId);
      const conflictCheck = checkLeaveConflicts(startDate, endDate, otherRequests);
      if (conflictCheck.hasConflicts) {
        return validationError(res, [{ 
          field: 'dates', 
          message: `Conflicts with ${conflictCheck.conflictCount} existing request(s)` 
        }]);
      }

      const updatedRequest = await leaveRepository.update(requestId, req.body);

      successResponse(res, {
        ...updatedRequest,
        user: {
          _id: user._id,
          name: user.name,
          department: user.department
        },
        startDateFormatted: formatDateForDisplay(updatedRequest.startDate),
        endDateFormatted: formatDateForDisplay(updatedRequest.endDate),
        statusInfo: getLeaveStatusInfo(updatedRequest.status)
      }, 'Leave request updated successfully');
    } catch (error) {
      console.error('Update leave request error:', error);
      serverError(res, error, 'Failed to update leave request');
    }
  })
);

/**
 * DELETE /leave/:id - Delete leave request (only pending requests)
 */
router.delete('/:id',
  requireAuth,
  requirePermission('leave:delete'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user._id;

      const leaveRequest = await leaveRepository.findById(requestId);
      if (!leaveRequest) {
        return notFoundError(res, 'Leave request');
      }

      // Only user who created the request can delete it (or admin)
      if (leaveRequest.userId.toString() !== userId && req.user.role !== 'Admin') {
        return errorResponse(res, 403, 'You can only delete your own leave requests');
      }

      // Only pending requests can be deleted
      if (leaveRequest.status !== 'pending') {
        return errorResponse(res, 400, 'Only pending leave requests can be deleted');
      }

      await leaveRepository.delete(requestId);
      successResponse(res, null, 'Leave request deleted successfully');
    } catch (error) {
      console.error('Delete leave request error:', error);
      serverError(res, error, 'Failed to delete leave request');
    }
  })
);

/**
 * POST /leave/:id/approve - Approve or reject leave request
 */
router.post('/:id/approve',
  requireAuth,
  requirePermission('leave:approve'),
  validateObjectId,
  validate.body(leaveSchemas.approval),
  asyncHandler(async (req, res) => {
    try {
      const requestId = req.params.id;
      const { approved, note, rejectionReason } = req.body;
      const approverId = req.user._id;

      const leaveRequest = await leaveRepository.findById(requestId);
      if (!leaveRequest) {
        return notFoundError(res, 'Leave request');
      }

      if (leaveRequest.status !== 'pending') {
        return errorResponse(res, 400, 'Only pending requests can be approved or rejected');
      }

      // Get user data for balance update
      const user = await userRepository.findById(leaveRequest.userId);
      if (!user) {
        return notFoundError(res, 'User not found for leave request');
      }

      let updatedRequest;
      
      if (approved) {
        // Approve the request
        updatedRequest = await leaveRepository.approveLeaveRequest(
          requestId, 
          approverId, 
          note
        );

        // Deduct from user's leave balance
        const newBalance = (user.leaveBalance || 0) - leaveRequest.daysCount;
        await userRepository.updateLeaveBalance(user._id, newBalance);

        successResponse(res, {
          ...updatedRequest,
          user: {
            _id: user._id,
            name: user.name,
            newLeaveBalance: newBalance
          }
        }, 'Leave request approved successfully');
      } else {
        // Reject the request
        updatedRequest = await leaveRepository.rejectLeaveRequest(
          requestId, 
          approverId, 
          rejectionReason
        );

        successResponse(res, {
          ...updatedRequest,
          user: {
            _id: user._id,
            name: user.name
          }
        }, 'Leave request rejected');
      }
    } catch (error) {
      console.error('Approve leave request error:', error);
      serverError(res, error, 'Failed to process leave request approval');
    }
  })
);

/**
 * GET /leave/pending - Get all pending leave requests
 */
router.get('/pending',
  requireAuth,
  requireManagerOrAdmin,
  asyncHandler(async (req, res) => {
    try {
      const pendingRequests = await leaveRepository.findPendingRequests();

      // Enrich with user data
      const enrichedRequests = await Promise.all(
        pendingRequests.map(async (request) => {
          const user = await userRepository.findById(request.userId);
          return {
            ...request,
            user: user ? {
              _id: user._id,
              name: user.name,
              department: user.department,
              employeeId: user.employeeId,
              leaveBalance: user.leaveBalance
            } : null,
            startDateFormatted: formatDateForDisplay(request.startDate),
            endDateFormatted: formatDateForDisplay(request.endDate),
            daysSinceRequest: Math.floor(
              (new Date() - new Date(request.createdAt)) / (1000 * 60 * 60 * 24)
            )
          };
        })
      );

      // Sort by creation date (oldest first for priority)
      enrichedRequests.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      successResponse(res, enrichedRequests, 'Pending leave requests retrieved successfully');
    } catch (error) {
      console.error('Get pending requests error:', error);
      serverError(res, error, 'Failed to retrieve pending leave requests');
    }
  })
);

/**
 * GET /leave/balance - Get user's leave balance
 */
router.get('/balance',
  requireAuth,
  requirePermission('leave:view'),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.query.user_id || req.user._id;

      // Non-admin users can only view their own balance
      if (req.user.role !== 'Admin' && userId !== req.user._id) {
        return errorResponse(res, 403, 'You can only view your own leave balance');
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        return notFoundError(res, 'User');
      }

      // Get current year's usage
      const currentYear = new Date().getFullYear();
      const usedDays = await leaveRepository.getTotalUsedLeave(userId, currentYear);
      
      // Get pending requests
      const pendingRequests = await leaveRepository.findUserPendingRequests(userId);
      const pendingDays = pendingRequests.reduce((sum, req) => sum + req.daysCount, 0);

      // Calculate entitlement
      const totalEntitlement = user.hireDate 
        ? require('../utils/leaveUtils').calculateAnnualLeaveEntitlement(user.hireDate)
        : 0;

      const balanceInfo = {
        userId: user._id,
        userName: user.name,
        currentBalance: user.leaveBalance || 0,
        totalEntitlement,
        usedDays,
        pendingDays,
        availableBalance: (user.leaveBalance || 0) - pendingDays,
        year: currentYear
      };

      successResponse(res, balanceInfo, 'Leave balance retrieved successfully');
    } catch (error) {
      console.error('Get leave balance error:', error);
      serverError(res, error, 'Failed to retrieve leave balance');
    }
  })
);

module.exports = router;