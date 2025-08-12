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

  // Debug API Endpoints
  /**
   * GET /debug/temp-uploads - Get temporary upload storage status
   * DomainMeaning: Administrative debugging endpoint for temp uploads monitoring
   * MisleadingNames: None
   * SideEffects: Database read operations only
   * Invariants: Only admin users can access debug information  
   * RAG_Keywords: admin debug, temp uploads, system monitoring
   * DuplicatePolicy: canonical - primary debug endpoint
   * FunctionIdentity: hash_debug_temp_uploads_001
   */
  router.get('/debug/temp-uploads', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      // Get temp uploads statistics from MongoDB
      const tempUploadsStats = await db.collection('temp_uploads').aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalSizeBytes: { $sum: '$sizeBytes' },
            oldestEntry: { $min: '$createdAt' },
            newestEntry: { $max: '$createdAt' }
          }
        }
      ]).toArray();

      const stats = tempUploadsStats[0] || {
        totalEntries: 0,
        totalSizeBytes: 0,
        oldestEntry: null,
        newestEntry: null
      };

      res.json({
        success: true,
        data: stats,
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Debug temp uploads error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve debug information' 
      });
    }
  }));

  /**
   * GET /dashboard/temp-data - Get comprehensive temporary data monitoring dashboard
   * DomainMeaning: Administrative dashboard for monitoring temp uploads and storage health
   * MisleadingNames: None
   * SideEffects: Database read operations only, no modifications
   * Invariants: Only admin users can access dashboard data
   * RAG_Keywords: temp data dashboard, monitoring, storage metrics, system health
   * DuplicatePolicy: canonical - primary temp data dashboard endpoint
   * FunctionIdentity: hash_dashboard_temp_data_001
   */
  router.get('/dashboard/temp-data', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      // Get comprehensive temp uploads analytics from MongoDB
      const tempUploadsAnalytics = await db.collection('temp_uploads').aggregate([
        {
          $facet: {
            // Summary statistics
            summary: [
              {
                $group: {
                  _id: null,
                  totalEntries: { $sum: 1 },
                  totalSizeBytes: { $sum: '$sizeBytes' },
                  oldestEntry: { $min: '$createdAt' },
                  newestEntry: { $max: '$createdAt' },
                  avgSizeBytes: { $avg: '$sizeBytes' }
                }
              }
            ],
            // Size distribution analysis
            sizeDistribution: [
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        { case: { $lt: ['$sizeBytes', 1048576] }, then: 'small' }, // < 1MB
                        { case: { $lt: ['$sizeBytes', 10485760] }, then: 'medium' }, // 1-10MB
                        { case: { $gte: ['$sizeBytes', 10485760] }, then: 'large' } // >= 10MB
                      ],
                      default: 'unknown'
                    }
                  },
                  count: { $sum: 1 },
                  totalSize: { $sum: '$sizeBytes' }
                }
              }
            ],
            // Expiration analysis
            expirationAnalysis: [
              {
                $addFields: {
                  timeUntilExpiry: { $subtract: ['$expiresAt', '$$NOW'] },
                  isExpiring: { $lt: [{ $subtract: ['$expiresAt', '$$NOW'] }, 300000] }, // 5 minutes
                  isExpired: { $lt: ['$expiresAt', '$$NOW'] }
                }
              },
              {
                $group: {
                  _id: null,
                  expiringSoon: { $sum: { $cond: ['$isExpiring', 1, 0] } },
                  expiredCount: { $sum: { $cond: ['$isExpired', 1, 0] } },
                  averageRetentionTime: { $avg: { $subtract: ['$expiresAt', '$createdAt'] } }
                }
              }
            ],
            // Recent activity (last 10 entries)
            recentActivity: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  _id: 1,
                  type: 1,
                  uploadedBy: 1,
                  sizeBytes: 1,
                  createdAt: 1,
                  expiresAt: 1,
                  sizeMB: { $round: [{ $divide: ['$sizeBytes', 1048576] }, 2] }
                }
              }
            ]
          }
        }
      ]).toArray();

      const analytics = tempUploadsAnalytics[0] || {
        summary: [{ totalEntries: 0, totalSizeBytes: 0, oldestEntry: null, newestEntry: null, avgSizeBytes: 0 }],
        sizeDistribution: [],
        expirationAnalysis: [{ expiringSoon: 0, expiredCount: 0, averageRetentionTime: 0 }],
        recentActivity: []
      };

      // Process summary data
      const summaryData = analytics.summary[0] || { totalEntries: 0, totalSizeBytes: 0, oldestEntry: null, newestEntry: null };
      summaryData.totalSizeMB = Math.round((summaryData.totalSizeBytes / 1048576) * 100) / 100; // Convert to MB with 2 decimals

      // Process size distribution
      const sizeDistribution = {
        small: { count: 0, totalSize: 0 },
        medium: { count: 0, totalSize: 0 },
        large: { count: 0, totalSize: 0 }
      };
      
      analytics.sizeDistribution.forEach(item => {
        if (sizeDistribution[item._id]) {
          sizeDistribution[item._id] = {
            count: item.count,
            totalSize: item.totalSize,
            totalSizeMB: Math.round((item.totalSize / 1048576) * 100) / 100
          };
        }
      });

      // Process expiration analysis
      const expirationAnalysis = analytics.expirationAnalysis[0] || { expiringSoon: 0, expiredCount: 0, averageRetentionTime: 0 };
      expirationAnalysis.averageRetentionTimeMinutes = Math.round((expirationAnalysis.averageRetentionTime / 60000) * 100) / 100; // Convert to minutes

      // Mock storage metrics (in production, this would come from system monitoring)
      const storageMetrics = {
        memoryUsage: {
          heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
          external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100
        },
        diskUsage: {
          tempDataMB: summaryData.totalSizeMB,
          availableGB: 'N/A' // Would be calculated from fs.statSync in production
        },
        capacityStatus: summaryData.totalEntries > 80 ? 'warning' : summaryData.totalEntries > 50 ? 'caution' : 'normal'
      };

      res.json({
        success: true,
        data: {
          summary: summaryData,
          storageMetrics,
          expirationAnalysis,
          sizeDistribution,
          recentActivity: analytics.recentActivity
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Temp data dashboard error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve dashboard data' 
      });
    }
  }));

  // Capacity Management System Endpoints
  /**
   * GET /capacity/status - Get current storage capacity status
   * DomainMeaning: Administrative capacity monitoring for temp uploads system
   * MisleadingNames: None
   * SideEffects: Database read operations only for capacity analysis
   * Invariants: Only admin users can access capacity status
   * RAG_Keywords: capacity status, storage monitoring, system health, temp uploads
   * DuplicatePolicy: canonical - primary capacity status endpoint
   * FunctionIdentity: hash_capacity_status_001
   */
  router.get('/capacity/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      // Get current temp uploads usage statistics
      const currentUsageStats = await db.collection('temp_uploads').aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalSizeBytes: { $sum: '$sizeBytes' },
            avgSizeBytes: { $avg: '$sizeBytes' }
          }
        }
      ]).toArray();

      const usage = currentUsageStats[0] || { totalEntries: 0, totalSizeBytes: 0, avgSizeBytes: 0 };
      const totalSizeMB = Math.round((usage.totalSizeBytes / 1024 / 1024) * 100) / 100;

      // Get current memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;

      // Default capacity limits (can be configured via policy)
      const limits = {
        maxSizeMB: 100, // 100MB default limit
        maxEntries: 50, // 50 entries default limit
        warningThresholdPercent: 75,
        criticalThresholdPercent: 90
      };

      // Calculate utilization percentage
      const sizeUtilizationPercent = Math.round((totalSizeMB / limits.maxSizeMB) * 100);
      const entriesUtilizationPercent = Math.round((usage.totalEntries / limits.maxEntries) * 100);
      const maxUtilizationPercent = Math.max(sizeUtilizationPercent, entriesUtilizationPercent);

      // Determine health status
      let healthStatus;
      if (maxUtilizationPercent >= limits.criticalThresholdPercent) {
        healthStatus = {
          status: 'critical',
          message: 'Storage capacity critical - immediate cleanup required'
        };
      } else if (maxUtilizationPercent >= limits.warningThresholdPercent) {
        healthStatus = {
          status: 'warning',
          message: 'Storage capacity approaching limits - cleanup recommended'
        };
      } else {
        healthStatus = {
          status: 'healthy',
          message: 'Storage capacity within normal limits'
        };
      }

      // Generate recommendations based on current status
      const recommendations = [];
      if (maxUtilizationPercent >= limits.warningThresholdPercent) {
        recommendations.push('Run cleanup to remove expired entries');
        recommendations.push('Consider increasing storage limits if needed');
      }
      if (usage.totalEntries > limits.maxEntries * 0.8) {
        recommendations.push('Monitor upload frequency to prevent rapid capacity growth');
      }
      if (totalSizeMB > limits.maxSizeMB * 0.8) {
        recommendations.push('Review large file uploads and implement size restrictions if needed');
      }

      res.json({
        success: true,
        data: {
          currentUsage: {
            totalSizeMB,
            totalEntries: usage.totalEntries,
            memoryUsageMB,
            utilizationPercentage: maxUtilizationPercent
          },
          limits,
          healthStatus,
          recommendations
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Capacity status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve capacity status'
      });
    }
  }));

  /**
   * POST /capacity/cleanup - Execute manual capacity cleanup
   * DomainMeaning: Administrative cleanup operation for temp uploads storage
   * MisleadingNames: None
   * SideEffects: May delete expired or old temp upload data from database
   * Invariants: Only admin users can execute cleanup operations
   * RAG_Keywords: capacity cleanup, storage maintenance, temp uploads cleanup
   * DuplicatePolicy: canonical - primary capacity cleanup endpoint
   * FunctionIdentity: hash_capacity_cleanup_001
   */
  router.post('/capacity/cleanup', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const { policy = 'expired_only', dryRun = false } = req.body;

      // Get capacity status before cleanup
      const beforeStats = await db.collection('temp_uploads').aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalSizeBytes: { $sum: '$sizeBytes' }
          }
        }
      ]).toArray();

      const beforeCleanup = beforeStats[0] || { totalEntries: 0, totalSizeBytes: 0 };
      const startTime = Date.now();

      let cleanupFilter;
      switch (policy) {
        case 'expired_only':
          cleanupFilter = { expiresAt: { $lt: new Date() } };
          break;
        case 'older_than_4_hours':
          cleanupFilter = { createdAt: { $lt: new Date(Date.now() - 4 * 60 * 60 * 1000) } };
          break;
        case 'all_temp':
          cleanupFilter = {};
          break;
        default:
          cleanupFilter = { expiresAt: { $lt: new Date() } };
      }

      if (dryRun) {
        // Dry run: calculate what would be removed without actually removing
        const wouldRemoveStats = await db.collection('temp_uploads').aggregate([
          { $match: cleanupFilter },
          {
            $group: {
              _id: null,
              wouldRemoveEntries: { $sum: 1 },
              wouldFreeSizeBytes: { $sum: '$sizeBytes' }
            }
          }
        ]).toArray();

        const dryRunResults = wouldRemoveStats[0] || { wouldRemoveEntries: 0, wouldFreeSizeBytes: 0 };

        res.json({
          success: true,
          data: {
            dryRunResults: {
              wouldRemoveEntries: dryRunResults.wouldRemoveEntries,
              wouldFreeSpaceMB: Math.round((dryRunResults.wouldFreeSizeBytes / 1024 / 1024) * 100) / 100
            }
          },
          message: 'Dry run completed successfully'
        });
      } else {
        // Actual cleanup: remove matching entries
        const cleanupResult = await db.collection('temp_uploads').deleteMany(cleanupFilter);

        // Get capacity status after cleanup
        const afterStats = await db.collection('temp_uploads').aggregate([
          {
            $group: {
              _id: null,
              totalEntries: { $sum: 1 },
              totalSizeBytes: { $sum: '$sizeBytes' }
            }
          }
        ]).toArray();

        const afterCleanup = afterStats[0] || { totalEntries: 0, totalSizeBytes: 0 };
        const cleanupDurationMs = Date.now() - startTime;
        const freedSpaceBytes = beforeCleanup.totalSizeBytes - afterCleanup.totalSizeBytes;

        res.json({
          success: true,
          data: {
            cleanupResults: {
              removedEntries: cleanupResult.deletedCount,
              freedSpaceMB: Math.round((freedSpaceBytes / 1024 / 1024) * 100) / 100,
              cleanupDurationMs
            },
            summary: {
              beforeCleanup: {
                entries: beforeCleanup.totalEntries,
                sizeMB: Math.round((beforeCleanup.totalSizeBytes / 1024 / 1024) * 100) / 100
              },
              afterCleanup: {
                entries: afterCleanup.totalEntries,
                sizeMB: Math.round((afterCleanup.totalSizeBytes / 1024 / 1024) * 100) / 100
              }
            }
          },
          message: `Cleanup completed: ${cleanupResult.deletedCount} entries removed`
        });
      }

    } catch (error) {
      console.error('Capacity cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute capacity cleanup'
      });
    }
  }));

  /**
   * POST /capacity/policy - Configure capacity management policies
   * DomainMeaning: Administrative configuration for capacity management system
   * MisleadingNames: None
   * SideEffects: Creates or updates capacity policy configuration in database
   * Invariants: Only admin users can modify capacity policies
   * RAG_Keywords: capacity policy, storage configuration, system administration
   * DuplicatePolicy: canonical - primary capacity policy endpoint
   * FunctionIdentity: hash_capacity_policy_001
   */
  router.post('/capacity/policy', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        maxSizeMB,
        maxEntries,
        warningThresholdPercent,
        criticalThresholdPercent,
        autoCleanupEnabled,
        autoCleanupIntervalMinutes,
        cleanupPolicies
      } = req.body;

      // Validation
      const validationErrors = [];
      
      if (typeof maxSizeMB !== 'number' || maxSizeMB <= 0) {
        validationErrors.push('maxSizeMB must be a positive number');
      }
      if (typeof maxEntries !== 'number' || maxEntries <= 0) {
        validationErrors.push('maxEntries must be a positive number');
      }
      if (typeof warningThresholdPercent !== 'number' || warningThresholdPercent <= 0 || warningThresholdPercent > 100) {
        validationErrors.push('warningThresholdPercent must be between 1 and 100');
      }
      if (typeof criticalThresholdPercent !== 'number' || criticalThresholdPercent <= 0 || criticalThresholdPercent > 100) {
        validationErrors.push('criticalThresholdPercent must be between 1 and 100');
      }
      if (warningThresholdPercent >= criticalThresholdPercent) {
        validationErrors.push('criticalThresholdPercent must be greater than warningThresholdPercent');
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid policy values: ' + validationErrors.join(', ')
        });
      }

      // Create new capacity policy
      const newPolicy = {
        policyId: `capacity_policy_${Date.now()}`,
        maxSizeMB,
        maxEntries,
        warningThresholdPercent,
        criticalThresholdPercent,
        autoCleanupEnabled: autoCleanupEnabled || false,
        autoCleanupIntervalMinutes: autoCleanupIntervalMinutes || 30,
        cleanupPolicies: cleanupPolicies || {
          removeExpired: true,
          removeOldestWhenFull: false,
          maxAgeHours: 4
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user.username || req.user.name || 'admin'
      };

      // Deactivate existing policies
      await db.collection('capacity_policies').updateMany(
        { isActive: true },
        { $set: { isActive: false, deactivatedAt: new Date() } }
      );

      // Insert new policy
      await db.collection('capacity_policies').insertOne(newPolicy);

      res.json({
        success: true,
        data: {
          policyId: newPolicy.policyId,
          updatedAt: newPolicy.updatedAt
        },
        message: 'Capacity policy updated successfully'
      });

    } catch (error) {
      console.error('Capacity policy error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update capacity policy'
      });
    }
  }));

  // Detailed Logging System Endpoints
  /**
   * GET /logs/query - Query system logs with filters
   * DomainMeaning: Administrative log querying for audit and debugging
   * MisleadingNames: None
   * SideEffects: Database read operations only
   * Invariants: Only admin users can access system logs
   * RAG_Keywords: log query, audit trail, system monitoring, filtering
   * DuplicatePolicy: canonical - primary log query endpoint
   * FunctionIdentity: hash_logs_query_001
   */
  router.get('/logs/query', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        level,
        operation,
        source,
        userId,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = req.query;

      // Build query filter
      const filter = {};
      
      if (level) filter.level = level;
      if (operation) filter.operation = operation;
      if (source) filter.source = source;
      if (userId) filter.userId = userId;
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      // Query logs with pagination
      const logs = await db.collection('system_logs')
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .toArray();

      // Get total count for pagination
      const totalCount = await db.collection('system_logs').countDocuments(filter);

      res.json({
        success: true,
        data: {
          logs,
          totalCount,
          filters: {
            level,
            operation,
            source,
            userId,
            startDate,
            endDate
          },
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: totalCount > parseInt(offset) + parseInt(limit)
          }
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Log query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query logs'
      });
    }
  }));

  /**
   * GET /logs/stats - Get logging statistics and analytics
   * DomainMeaning: Administrative logging analytics for system health monitoring
   * MisleadingNames: None
   * SideEffects: Database read operations only
   * Invariants: Only admin users can access log statistics
   * RAG_Keywords: log statistics, analytics, system health, monitoring
   * DuplicatePolicy: canonical - primary log statistics endpoint
   * FunctionIdentity: hash_logs_stats_001
   */
  router.get('/logs/stats', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Get summary statistics
      const [totalLogs, errorCount, warningCount] = await Promise.all([
        db.collection('system_logs').countDocuments(),
        db.collection('system_logs').countDocuments({ level: 'error' }),
        db.collection('system_logs').countDocuments({ level: 'warning' })
      ]);

      // Get level distribution
      const levelDistribution = await db.collection('system_logs').aggregate([
        {
          $group: {
            _id: '$level',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const levelDist = {
        info: 0,
        warning: 0,
        error: 0,
        debug: 0
      };
      
      levelDistribution.forEach(item => {
        if (levelDist.hasOwnProperty(item._id)) {
          levelDist[item._id] = item.count;
        }
      });

      // Get operation frequency (top 10)
      const operationFrequency = await db.collection('system_logs').aggregate([
        {
          $group: {
            _id: '$operation',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();

      // Get recent errors (last 10)
      const recentErrors = await db.collection('system_logs')
        .find({ level: 'error' })
        .sort({ timestamp: -1 })
        .limit(10)
        .project({ timestamp: 1, operation: 1, message: 1, userId: 1 })
        .toArray();

      // Get hourly activity for last 24 hours
      const hourlyActivity = await db.collection('system_logs').aggregate([
        {
          $match: {
            timestamp: { $gte: last24Hours }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d %H:00',
                date: '$timestamp'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

      // Get unique operations and active users
      const [uniqueOps, activeUsers] = await Promise.all([
        db.collection('system_logs').distinct('operation'),
        db.collection('system_logs').distinct('userId', {
          timestamp: { $gte: last24Hours }
        })
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            totalLogs,
            errorCount,
            warningCount,
            uniqueOperations: uniqueOps.length,
            activeUsers: activeUsers.length
          },
          levelDistribution: levelDist,
          operationFrequency,
          recentErrors,
          hourlyActivity
        },
        generatedAt: new Date()
      });

    } catch (error) {
      console.error('Log stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve log statistics'
      });
    }
  }));

  /**
   * POST /logs/export - Export logs for external analysis
   * DomainMeaning: Administrative log export for archival and analysis
   * MisleadingNames: None
   * SideEffects: Creates export file, may consume significant resources
   * Invariants: Only admin users can export logs
   * RAG_Keywords: log export, data export, archival, analysis
   * DuplicatePolicy: canonical - primary log export endpoint
   * FunctionIdentity: hash_logs_export_001
   */
  router.post('/logs/export', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        format = 'json',
        filters = {},
        includeMetadata = false
      } = req.body;

      // Validate export format
      const validFormats = ['json', 'csv', 'txt'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
        });
      }

      // Build query filter
      const queryFilter = {};
      if (filters.level) queryFilter.level = filters.level;
      if (filters.operation) queryFilter.operation = filters.operation;
      if (filters.source) queryFilter.source = filters.source;
      if (filters.userId) queryFilter.userId = filters.userId;
      
      if (filters.startDate || filters.endDate) {
        queryFilter.timestamp = {};
        if (filters.startDate) queryFilter.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) queryFilter.timestamp.$lte = new Date(filters.endDate);
      }

      // Query logs for export
      const logsToExport = await db.collection('system_logs')
        .find(queryFilter)
        .sort({ timestamp: -1 })
        .toArray();

      // Generate export ID
      const exportId = `log_export_${Date.now()}`;

      // In production, this would save to file system or cloud storage
      // For now, we'll simulate the export process
      const exportData = {
        exportId,
        format,
        recordCount: logsToExport.length,
        filters,
        includeMetadata,
        exportedAt: new Date(),
        exportedBy: req.user.username || req.user.name || 'admin'
      };

      // Store export metadata
      await db.collection('log_exports').insertOne({
        ...exportData,
        status: 'completed',
        downloadUrl: `/api/admin/logs/download/${exportId}`
      });

      res.json({
        success: true,
        data: {
          exportId,
          format,
          recordCount: logsToExport.length,
          downloadUrl: `/api/admin/logs/download/${exportId}`
        },
        message: 'Log export ready for download'
      });

    } catch (error) {
      console.error('Log export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export logs'
      });
    }
  }));

  /**
   * POST /logs/cleanup - Cleanup old logs based on retention policy
   * DomainMeaning: Administrative log cleanup for storage management
   * MisleadingNames: None
   * SideEffects: Deletes old log entries from database
   * Invariants: Only admin users can cleanup logs
   * RAG_Keywords: log cleanup, retention policy, storage management
   * DuplicatePolicy: canonical - primary log cleanup endpoint
   * FunctionIdentity: hash_logs_cleanup_001
   */
  router.post('/logs/cleanup', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const {
        retentionDays = 90,
        dryRun = true
      } = req.body;

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Build cleanup filter
      const cleanupFilter = {
        timestamp: { $lt: cutoffDate }
      };

      if (dryRun) {
        // Dry run: count what would be deleted
        const wouldRemoveCount = await db.collection('system_logs').countDocuments(cleanupFilter);
        
        // Estimate freed space (rough calculation)
        const avgDocSize = 500; // bytes
        const freedSpaceKB = Math.round((wouldRemoveCount * avgDocSize) / 1024);

        res.json({
          success: true,
          data: {
            wouldRemoveCount,
            freedSpaceKB,
            cutoffDate,
            dryRun: true
          },
          message: `Dry run: Would remove ${wouldRemoveCount} logs older than ${cutoffDate.toISOString()}`
        });
      } else {
        // Actual cleanup
        const cleanupResult = await db.collection('system_logs').deleteMany(cleanupFilter);
        
        // Estimate freed space
        const avgDocSize = 500; // bytes
        const freedSpaceKB = Math.round((cleanupResult.deletedCount * avgDocSize) / 1024);

        // Log the cleanup operation itself
        await db.collection('system_logs').insertOne({
          timestamp: new Date(),
          level: 'info',
          source: 'system',
          operation: 'log_cleanup',
          userId: req.user.username || req.user.name || 'admin',
          message: `Cleaned up ${cleanupResult.deletedCount} logs older than ${retentionDays} days`,
          metadata: {
            removedCount: cleanupResult.deletedCount,
            freedSpaceKB,
            cutoffDate
          }
        });

        res.json({
          success: true,
          data: {
            removedCount: cleanupResult.deletedCount,
            freedSpaceKB,
            cutoffDate,
            dryRun: false
          },
          message: `Successfully removed ${cleanupResult.deletedCount} old logs`
        });
      }

    } catch (error) {
      console.error('Log cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup logs'
      });
    }
  }));

  return router;
}

module.exports = createAdminRoutes;