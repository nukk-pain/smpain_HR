const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { requireAdmin } = require('./shared/adminMiddleware');

function createLeaveAdminRoutes(db) {
  const router = express.Router();

  // Get leave overview for admin
  router.get('/overview', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
  router.post('/adjust', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
  router.get('/employee/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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

  // Get bulk pending leave requests
  router.get('/bulk-pending', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
  router.post('/bulk-approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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

  return router;
}

module.exports = createLeaveAdminRoutes;