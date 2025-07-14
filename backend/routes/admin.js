const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Admin advanced routes
function createAdminRoutes(db) {
  // Permission middleware
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const userPermissions = req.session.user.permissions || [];
      const hasPermission = userPermissions.includes(permission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  };

  // Admin role check
  const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // Get leave overview for admin
  router.get('/leave/overview', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().substring(0, 7);

      // Get leave statistics
      const leaveStats = await db.collection('leaveRequests').aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalDays: { $sum: '$totalDays' }
          }
        }
      ]).toArray();

      // Get monthly leave trends (last 6 months)
      const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
      
      const monthlyTrends = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            startDate: { $gte: sixMonthsAgo },
            status: 'approved'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$startDate' },
              month: { $month: '$startDate' }
            },
            totalRequests: { $sum: 1 },
            totalDays: { $sum: '$totalDays' }
          }
        },
        {
          $project: {
            yearMonth: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { 
                  $cond: {
                    if: { $lt: ['$_id.month', 10] },
                    then: { $concat: ['0', { $toString: '$_id.month' }] },
                    else: { $toString: '$_id.month' }
                  }
                }
              ]
            },
            totalRequests: 1,
            totalDays: 1
          }
        },
        { $sort: { yearMonth: 1 } }
      ]).toArray();

      // Get department-wise leave usage
      const departmentStats = await db.collection('leaveRequests').aggregate([
        {
          $match: { status: 'approved' }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $group: {
            _id: { $arrayElemAt: ['$user.department', 0] },
            totalRequests: { $sum: 1 },
            totalDays: { $sum: '$totalDays' },
            employees: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            department: '$_id',
            totalRequests: 1,
            totalDays: 1,
            employeeCount: { $size: '$employees' },
            avgDaysPerEmployee: {
              $round: [{ $divide: ['$totalDays', { $size: '$employees' }] }, 1]
            }
          }
        },
        { $sort: { totalDays: -1 } }
      ]).toArray();

      // Get pending requests that need attention
      const pendingRequests = await db.collection('leaveRequests').aggregate([
        { $match: { status: 'pending' } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            employeeName: { $arrayElemAt: ['$user.name', 0] },
            department: { $arrayElemAt: ['$user.department', 0] },
            leaveType: 1,
            startDate: 1,
            endDate: 1,
            totalDays: 1,
            submittedAt: 1,
            daysSinceSubmission: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$submittedAt'] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        },
        { $sort: { submittedAt: 1 } }
      ]).toArray();

      res.json({
        success: true,
        data: {
          leaveStatistics: leaveStats,
          monthlyTrends,
          departmentStatistics: departmentStats,
          pendingRequests,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Get leave overview error:', error);
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
        adjustedBy: req.session.user.id,
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

      // Calculate annual leave entitlement
      let annualLeaveEntitlement;
      if (yearsOfService === 0) {
        annualLeaveEntitlement = 11; // First year
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

  return router;
}

module.exports = createAdminRoutes;