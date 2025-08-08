const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Admin advanced routes
function createAdminRoutes(db) {
  // Permission middleware with role-based fallback
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userPermissions = req.user.permissions || [];
      const userRole = req.user.role;
      
      // Admin role has all permissions
      if (userRole === 'admin' || userRole === 'Admin') {
        return next();
      }
      
      // Check specific permission in user's permissions array
      if (userPermissions.includes(permission)) {
        return next();
      }

      // If user doesn't have explicit permission, check if their role should have it
      const roleBasedPermissions = {
        user: ['leave:view'],
        manager: ['leave:view', 'leave:manage', 'users:view'],
        supervisor: ['leave:view', 'leave:manage', 'users:view'],
        admin: ['users:view', 'users:manage', 'users:create', 'users:edit', 'users:delete',
                 'leave:view', 'leave:manage', 'payroll:view', 'payroll:manage',
                 'reports:view', 'files:view', 'files:manage', 'departments:view',
                 'departments:manage', 'admin:permissions']
      };

      const rolePermissions = roleBasedPermissions[userRole.toLowerCase()] || [];
      if (rolePermissions.includes(permission)) {
        return next();
      }
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    };
  };

  // Admin role check
  const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // Get leave overview for admin
  router.get('/leave/overview', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get all employees (excluding admin)
      const employees = await db.collection('users').find({
        isActive: true,
        role: { $ne: 'admin' }
      }).toArray();
      
      // Calculate leave overview for each employee
      const employeeLeaveOverview = await Promise.all(
        employees.map(async (employee) => {
          const userId = employee._id;
          
          // Calculate years of service
          const hireDate = employee.hireDate ? new Date(employee.hireDate) : new Date(employee.createdAt);
          const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
          
          // Calculate annual leave entitlement using correct logic
          let totalAnnualLeave;
          if (yearsOfService === 0) {
            // For employees with less than 1 year: 1 day per completed month from hire date
            let monthsPassed = 0;
            let checkDate = new Date(hireDate);
            const now = new Date();
            
            // Count completed months from hire date
            while (true) {
              // Move to the same day next month
              checkDate.setMonth(checkDate.getMonth() + 1);
              
              // If this date hasn't passed yet, break
              if (checkDate > now) {
                break;
              }
              
              monthsPassed++;
            }
            
            totalAnnualLeave = Math.min(monthsPassed, 11); // Maximum 11 days in first year
          } else {
            totalAnnualLeave = Math.min(15 + (yearsOfService - 1), 25);
          }
          
          // Calculate used annual leave
          const usedLeave = await db.collection('leaveRequests').aggregate([
            {
              $match: {
                userId: userId,
                leaveType: 'annual',
                status: 'approved',
                startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
              }
            },
            {
              $group: {
                _id: null,
                totalDays: { $sum: '$totalDays' }
              }
            }
          ]).toArray();
          
          const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
          
          // Calculate pending annual leave
          const pendingLeave = await db.collection('leaveRequests').aggregate([
            {
              $match: {
                userId: userId,
                leaveType: 'annual',
                status: 'pending',
                startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
              }
            },
            {
              $group: {
                _id: null,
                totalDays: { $sum: '$totalDays' }
              }
            }
          ]).toArray();
          
          const pendingAnnualLeave = pendingLeave.length > 0 ? pendingLeave[0].totalDays : 0;
          const remainingAnnualLeave = totalAnnualLeave - usedAnnualLeave;
          const usageRate = Math.round((usedAnnualLeave / totalAnnualLeave) * 100);
          
          // Calculate risk level (based on unused leave)
          let riskLevel = 'low';
          if (usageRate < 30) riskLevel = 'high';
          else if (usageRate < 60) riskLevel = 'medium';
          
          return {
            employeeId: employee._id,
            name: employee.name,
            department: employee.department || '미분류',
            position: employee.position || '직원',
            totalAnnualLeave,
            usedAnnualLeave,
            pendingAnnualLeave,
            remainingAnnualLeave,
            usageRate,
            riskLevel,
            yearsOfService
          };
        })
      );
      
      // Calculate overall statistics
      const totalEmployees = employeeLeaveOverview.length;
      const averageUsageRate = totalEmployees > 0 ? Math.round(
        employeeLeaveOverview.reduce((sum, emp) => sum + emp.usageRate, 0) / totalEmployees
      ) : 0;
      const highRiskCount = employeeLeaveOverview.filter(emp => emp.riskLevel === 'high').length;
      
      res.json({
        success: true,
        data: {
          statistics: {
            totalEmployees,
            averageUsageRate,
            highRiskCount
          },
          employees: employeeLeaveOverview
        }
      });
      
    } catch (error) {
      console.error('Get admin leave overview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Adjust employee leave balance
  router.post('/leave/adjust', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const { employeeId, type, amount, reason } = req.body;

      if (!employeeId || !type || !amount || !reason) {
        return res.status(400).json({ 
          error: 'Employee ID, adjustment type, amount, and reason are required' 
        });
      }

      if (!['add', 'subtract', 'carry_over', 'cancel_usage'].includes(type)) {
        return res.status(400).json({ 
          error: 'Invalid adjustment type. Must be: add, subtract, carry_over, or cancel_usage' 
        });
      }

      // Verify employee exists
      const employee = await db.collection('users').findOne({ _id: new ObjectId(employeeId) });
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Create leave adjustment record
      const adjustment = {
        employeeId: new ObjectId(employeeId),
        type,
        amount: Number(amount),
        reason,
        adjustedBy: req.user.id,
        adjustedAt: new Date(),
        previousBalance: employee.leaveBalance || 0
      };

      // Calculate new balance based on type
      let newBalance = employee.leaveBalance || 0;
      switch (type) {
        case 'add':
        case 'carry_over':
          newBalance += Number(amount);
          break;
        case 'subtract':
        case 'cancel_usage':
          newBalance -= Number(amount);
          break;
      }

      // Ensure balance doesn't go negative
      if (newBalance < 0) {
        return res.status(400).json({ 
          error: 'Adjustment would result in negative leave balance' 
        });
      }

      adjustment.newBalance = newBalance;

      // Insert adjustment record
      await db.collection('leaveAdjustments').insertOne(adjustment);

      // Update employee's leave balance
      await db.collection('users').updateOne(
        { _id: new ObjectId(employeeId) },
        { 
          $set: { 
            leaveBalance: newBalance,
            updatedAt: new Date()
          } 
        }
      );

      res.json({
        success: true,
        message: 'Leave balance adjusted successfully',
        data: {
          employeeName: employee.name,
          previousBalance: adjustment.previousBalance,
          adjustment: {
            type,
            amount: Number(amount)
          },
          newBalance
        }
      });

    } catch (error) {
      console.error('Adjust leave balance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get detailed employee leave information
  router.get('/leave/employee/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // Get employee info
      const employee = await db.collection('users').findOne({ _id: new ObjectId(id) });
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Get leave history
      const leaveHistory = await db.collection('leaveRequests').find({
        userId: new ObjectId(id)
      }).sort({ submittedAt: -1 }).toArray();

      // Get leave adjustments
      const adjustments = await db.collection('leaveAdjustments').find({
        employeeId: new ObjectId(id)
      }).sort({ adjustedAt: -1 }).toArray();

      // Calculate leave usage by year
      const currentYear = new Date().getFullYear();
      const yearlyUsage = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            userId: new ObjectId(id),
            status: 'approved',
            startDate: {
              $gte: new Date(currentYear, 0, 1),
              $lt: new Date(currentYear + 1, 0, 1)
            }
          }
        },
        {
          $group: {
            _id: '$leaveType',
            totalDays: { $sum: '$totalDays' },
            requestCount: { $sum: 1 }
          }
        }
      ]).toArray();

      // Calculate years of service
      const yearsOfService = employee.createdAt ? 
        Math.floor((new Date() - new Date(employee.createdAt)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

      // Calculate annual leave entitlement using correct logic
      let annualLeaveEntitlement;
      if (yearsOfService === 0) {
        // For employees with less than 1 year: 1 day per completed month from hire date
        let monthsPassed = 0;
        let checkDate = new Date(employee.hireDate || employee.createdAt);
        const now = new Date();
        
        // Count completed months from hire date
        while (true) {
          // Move to the same day next month
          checkDate.setMonth(checkDate.getMonth() + 1);
          
          // If this date hasn't passed yet, break
          if (checkDate > now) {
            break;
          }
          
          monthsPassed++;
        }
        
        annualLeaveEntitlement = Math.min(monthsPassed, 11); // Maximum 11 days in first year
      } else {
        annualLeaveEntitlement = Math.min(15 + (yearsOfService - 1), 25); // Max 25 days
      }

      res.json({
        success: true,
        data: {
          employee: {
            id: employee._id,
            name: employee.name,
            employeeId: employee.employeeId,
            department: employee.department,
            position: employee.position,
            joinDate: employee.createdAt,
            yearsOfService
          },
          leaveInfo: {
            currentBalance: employee.leaveBalance || 0,
            annualEntitlement: annualLeaveEntitlement,
            yearlyUsage,
            totalUsedThisYear: yearlyUsage.reduce((sum, usage) => sum + usage.totalDays, 0)
          },
          leaveHistory,
          adjustments,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Get employee leave details error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get system statistics
  router.get('/stats/system', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().substring(0, 7);

      // Get user statistics
      const userStats = await db.collection('users').aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Get monthly activity stats
      const activityStats = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            submittedAt: {
              $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Get payroll summary for current month
      const payrollSummary = await db.collection('monthlyPayments').aggregate([
        { $match: { yearMonth: currentMonth } },
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            totalPayroll: { $sum: '$actualPayment' },
            totalIncentive: { $sum: '$incentive' },
            totalBonus: { $sum: '$bonus' },
            avgSalary: { $avg: '$actualPayment' }
          }
        }
      ]).toArray();

      res.json({
        success: true,
        data: {
          userStatistics: userStats,
          monthlyActivity: activityStats,
          payrollSummary: payrollSummary[0] || {
            totalEmployees: 0,
            totalPayroll: 0,
            totalIncentive: 0,
            totalBonus: 0,
            avgSalary: 0
          },
          systemHealth: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
          },
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Leave Policy Management
  // Get current leave policy
  router.get('/policy', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const policy = await db.collection('leavePolicy').findOne(
        { isActive: true },
        { sort: { createdAt: -1 } }
      );

      if (!policy) {
        // Return default policy if none exists
        const defaultPolicy = {
          policyId: 'policy_default',
          annualLeaveRules: {
            firstYear: 11,
            baseSecondYear: 15,
            maxAnnualLeave: 25,
            monthlyProration: true
          },
          specialRules: {
            saturdayLeave: 0.5,
            sundayLeave: 0,
            holidayLeave: 0
          },
          leaveTypes: {
            annual: {
              advanceNotice: 3,
              maxConsecutive: 15
            },
            family: {
              managerApproval: true,
              documentRequired: true
            },
            personal: {
              yearlyLimit: 3,
              paid: false
            }
          },
          businessRules: {
            minAdvanceDays: 3,
            maxConcurrentRequests: 1
          },
          carryOverRules: {
            maxCarryOverDays: 5,
            carryOverDeadline: '02-28'
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'system'
        };

        res.json({
          success: true,
          data: defaultPolicy
        });
      } else {
        res.json({
          success: true,
          data: policy
        });
      }
    } catch (error) {
      console.error('Error fetching leave policy:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch leave policy' 
      });
    }
  }));

  // Update leave policy
  router.put('/policy', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        annualLeaveRules,
        specialRules,
        leaveTypes,
        businessRules,
        carryOverRules
      } = req.body;

      // Validate required fields
      if (!annualLeaveRules || !specialRules || !leaveTypes || !businessRules || !carryOverRules) {
        return res.status(400).json({
          success: false,
          error: 'Missing required policy fields'
        });
      }

      // Validate numeric ranges
      const validations = [
        { field: 'annualLeaveRules.firstYear', value: annualLeaveRules.firstYear, min: 1, max: 30 },
        { field: 'annualLeaveRules.baseSecondYear', value: annualLeaveRules.baseSecondYear, min: 1, max: 30 },
        { field: 'annualLeaveRules.maxAnnualLeave', value: annualLeaveRules.maxAnnualLeave, min: 1, max: 50 },
        { field: 'specialRules.saturdayLeave', value: specialRules.saturdayLeave, min: 0, max: 1 },
        { field: 'specialRules.sundayLeave', value: specialRules.sundayLeave, min: 0, max: 1 },
        { field: 'specialRules.holidayLeave', value: specialRules.holidayLeave, min: 0, max: 1 },
        { field: 'businessRules.minAdvanceDays', value: businessRules.minAdvanceDays, min: 0, max: 30 },
        { field: 'businessRules.maxConcurrentRequests', value: businessRules.maxConcurrentRequests, min: 1, max: 10 },
        { field: 'carryOverRules.maxCarryOverDays', value: carryOverRules.maxCarryOverDays, min: 0, max: 30 }
      ];

      for (const validation of validations) {
        if (typeof validation.value !== 'number' || validation.value < validation.min || validation.value > validation.max) {
          return res.status(400).json({
            success: false,
            error: `Invalid value for ${validation.field}. Must be between ${validation.min} and ${validation.max}`
          });
        }
      }

      // Validate carryOverDeadline format (MM-DD)
      const deadlinePattern = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
      if (!deadlinePattern.test(carryOverRules.carryOverDeadline)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid carryOverDeadline format. Use MM-DD format (e.g., 02-28)'
        });
      }

      // Deactivate current policy
      await db.collection('leavePolicy').updateMany(
        { isActive: true },
        { 
          $set: { 
            isActive: false,
            deactivatedAt: new Date()
          }
        }
      );

      // Create new policy
      const newPolicy = {
        policyId: `policy_${Date.now()}`,
        annualLeaveRules,
        specialRules,
        leaveTypes,
        businessRules,
        carryOverRules,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: req.user.username || req.user.name
      };

      const result = await db.collection('leavePolicy').insertOne(newPolicy);

      // Log policy change
      await db.collection('policyChangeLogs').insertOne({
        policyId: newPolicy.policyId,
        changeType: 'policy_update',
        changedBy: req.user.username || req.user.name,
        changedAt: new Date(),
        changes: {
          annualLeaveRules,
          specialRules,
          leaveTypes,
          businessRules,
          carryOverRules
        }
      });

      res.json({
        success: true,
        message: 'Leave policy updated successfully',
        data: {
          policyId: newPolicy.policyId,
          updatedAt: newPolicy.updatedAt,
          updatedBy: newPolicy.updatedBy
        }
      });
    } catch (error) {
      console.error('Error updating leave policy:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update leave policy' 
      });
    }
  }));

  // Get policy change history
  router.get('/policy/history', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const [history, total] = await Promise.all([
        db.collection('policyChangeLogs')
          .find({})
          .sort({ changedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        db.collection('policyChangeLogs').countDocuments({})
      ]);

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalRecords: total
          }
        }
      });
    } catch (error) {
      console.error('Error fetching policy history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch policy history' 
      });
    }
  }));

  // Bulk Leave Management
  // Get pending leave requests for bulk approval
  router.get('/leave/bulk-pending', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const { department, leaveType, startDate, endDate } = req.query;
      
      const filter = { status: 'pending' };
      
      if (department && department !== 'all') {
        filter['user.department'] = department;
      }
      
      if (leaveType && leaveType !== 'all') {
        filter.leaveType = leaveType;
      }
      
      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = new Date(startDate);
        if (endDate) filter.startDate.$lte = new Date(endDate);
      }

      const pendingRequests = await db.collection('leaveRequests').aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $match: filter
        },
        {
          $project: {
            _id: 1,
            leaveType: 1,
            startDate: 1,
            endDate: 1,
            daysCount: 1,
            reason: 1,
            requestedAt: 1,
            'user.name': 1,
            'user.department': 1,
            'user.position': 1
          }
        },
        {
          $sort: { requestedAt: 1 }
        }
      ]).toArray();

      res.json({
        success: true,
        data: pendingRequests
      });
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch pending requests' 
      });
    }
  }));

  // Bulk approve/reject leave requests
  router.post('/leave/bulk-approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const { requestIds, action, comment } = req.body;

      if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Request IDs array is required'
        });
      }

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Action must be either "approve" or "reject"'
        });
      }

      const results = {
        successful: [],
        failed: []
      };

      // Process each request
      for (const requestId of requestIds) {
        try {
          const objectId = new ObjectId(requestId);
          
          // Get the leave request
          const leaveRequest = await db.collection('leaveRequests').findOne({ _id: objectId });
          
          if (!leaveRequest) {
            results.failed.push({
              requestId,
              error: 'Leave request not found'
            });
            continue;
          }

          if (leaveRequest.status !== 'pending') {
            results.failed.push({
              requestId,
              error: 'Leave request is not pending'
            });
            continue;
          }

          // Update the leave request
          const updateData = {
            status: action === 'approve' ? 'approved' : 'rejected',
            approvedBy: req.user._id,
            approvedAt: new Date(),
            approvalComment: comment || `Bulk ${action}d by admin`
          };

          await db.collection('leaveRequests').updateOne(
            { _id: objectId },
            { $set: updateData }
          );

          results.successful.push({
            requestId,
            employeeName: leaveRequest.user?.name || 'Unknown',
            leaveType: leaveRequest.leaveType,
            startDate: leaveRequest.startDate,
            endDate: leaveRequest.endDate,
            action
          });

        } catch (error) {
          results.failed.push({
            requestId,
            error: error.message
          });
        }
      }

      // Log bulk action
      await db.collection('bulkActionLogs').insertOne({
        actionType: 'bulk_leave_approval',
        performedBy: req.user._id,
        performedAt: new Date(),
        action,
        comment,
        requestCount: requestIds.length,
        successCount: results.successful.length,
        failureCount: results.failed.length,
        results
      });

      res.json({
        success: true,
        message: `Bulk ${action} completed`,
        data: {
          totalRequests: requestIds.length,
          successful: results.successful.length,
          failed: results.failed.length,
          results
        }
      });
    } catch (error) {
      console.error('Error in bulk approval:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process bulk approval' 
      });
    }
  }));

  // User Migration Endpoints
  // Migrate existing users to have isActive field set to true
  router.post('/migrate-users-isactive', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      // Find users without isActive field or with undefined/null isActive
      const usersWithoutIsActive = await db.collection('users').find({
        $or: [
          { isActive: { $exists: false } },
          { isActive: null },
          { isActive: undefined }
        ]
      }).toArray();

      if (usersWithoutIsActive.length === 0) {
        return res.json({
          success: true,
          migratedCount: 0,
          message: 'No users found requiring isActive field migration'
        });
      }

      // Update users to set isActive: true
      const updateResult = await db.collection('users').updateMany(
        {
          $or: [
            { isActive: { $exists: false } },
            { isActive: null },
            { isActive: undefined }
          ]
        },
        {
          $set: { isActive: true }
        }
      );

      res.json({
        success: true,
        migratedCount: updateResult.modifiedCount,
        message: `Successfully migrated ${updateResult.modifiedCount} users with isActive: true`
      });

    } catch (error) {
      console.error('User migration error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to migrate user isActive fields',
        details: error.message 
      });
    }
  }));

  return router;
}

module.exports = createAdminRoutes;