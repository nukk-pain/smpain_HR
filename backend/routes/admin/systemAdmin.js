const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requireAdmin } = require('./shared/adminMiddleware');

function createSystemAdminRoutes(db) {
  const router = express.Router();

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

module.exports = createSystemAdminRoutes;