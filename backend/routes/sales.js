const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Sales routes
function createSalesRoutes(db) {
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
        manager: ['leave:view', 'leave:manage', 'users:view', 'payroll:view'],
        supervisor: ['leave:view', 'leave:manage', 'users:view', 'payroll:view'],
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

  // Get sales data by year_month
  router.get('/:year_month', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;

      let matchCondition = { yearMonth: year_month };

      // If not admin/manager, only show own data
      if (userRole === 'user') {
        matchCondition.userId = new ObjectId(userId);
      }

      const salesData = await db.collection('salesData').aggregate([
        { $match: matchCondition },
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
            id: '$_id',
            user_id: '$userId',
            user_name: { $arrayElemAt: ['$user.name', 0] },
            year_month: '$yearMonth',
            sales_amount: '$salesAmount',
            target_amount: '$targetAmount',
            achievement_rate: {
              $cond: {
                if: { $gt: ['$targetAmount', 0] },
                then: { $multiply: [{ $divide: ['$salesAmount', '$targetAmount'] }, 100] },
                else: 0
              }
            },
            category: '$category',
            notes: '$notes',
            created_at: '$createdAt',
            updated_at: '$updatedAt'
          }
        },
        { $sort: { user_name: 1 } }
      ]).toArray();

      res.json({ success: true, data: salesData });

    } catch (error) {
      console.error('Get sales data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Create sales record
  router.post('/', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { userId, yearMonth, salesAmount, targetAmount, category, notes } = req.body;

      if (!userId || !yearMonth || salesAmount === undefined) {
        return res.status(400).json({ 
          error: 'User ID, year month, and sales amount are required' 
        });
      }

      if (salesAmount < 0) {
        return res.status(400).json({ error: 'Sales amount cannot be negative' });
      }

      // Verify user exists
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if sales record already exists for this user and month
      const existingSales = await db.collection('salesData').findOne({
        userId: new ObjectId(userId),
        yearMonth
      });

      if (existingSales) {
        return res.status(400).json({ 
          error: 'Sales record for this user and month already exists. Use PUT to update.' 
        });
      }

      const salesRecord = {
        userId: new ObjectId(userId),
        yearMonth,
        salesAmount: Number(salesAmount),
        targetAmount: Number(targetAmount) || 0,
        category: category || 'general',
        notes: notes || '',
        createdAt: new Date(),
        createdBy: req.user.id,
        updatedAt: new Date()
      };

      const result = await db.collection('salesData').insertOne(salesRecord);

      res.json({
        success: true,
        message: 'Sales record created successfully',
        data: { id: result.insertedId, ...salesRecord }
      });

    } catch (error) {
      console.error('Create sales record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Update sales record
  router.put('/:id', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { salesAmount, targetAmount, category, notes } = req.body;

      const updateData = {
        updatedAt: new Date(),
        updatedBy: req.user.id
      };

      if (salesAmount !== undefined) {
        if (salesAmount < 0) {
          return res.status(400).json({ error: 'Sales amount cannot be negative' });
        }
        updateData.salesAmount = Number(salesAmount);
      }
      if (targetAmount !== undefined) updateData.targetAmount = Number(targetAmount);
      if (category !== undefined) updateData.category = category;
      if (notes !== undefined) updateData.notes = notes;

      const result = await db.collection('salesData').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Sales record not found' });
      }

      res.json({
        success: true,
        message: 'Sales record updated successfully'
      });

    } catch (error) {
      console.error('Update sales record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Delete sales record
  router.delete('/:id', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.collection('salesData').deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Sales record not found' });
      }

      res.json({
        success: true,
        message: 'Sales record deleted successfully'
      });

    } catch (error) {
      console.error('Delete sales record error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get sales summary for user
  router.get('/user/:userId', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      // Check permissions - users can only see their own data
      if (currentUser.role === 'user' && currentUser.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const salesSummary = await db.collection('salesData').aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: '$yearMonth',
            salesAmount: { $sum: '$salesAmount' },
            targetAmount: { $sum: '$targetAmount' },
            recordCount: { $sum: 1 }
          }
        },
        {
          $project: {
            yearMonth: '$_id',
            salesAmount: 1,
            targetAmount: 1,
            recordCount: 1,
            achievementRate: {
              $cond: {
                if: { $gt: ['$targetAmount', 0] },
                then: { $multiply: [{ $divide: ['$salesAmount', '$targetAmount'] }, 100] },
                else: 0
              }
            }
          }
        },
        { $sort: { yearMonth: -1 } }
      ]).toArray();

      res.json({ success: true, data: salesSummary });

    } catch (error) {
      console.error('Get sales summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get sales statistics for a month
  router.get('/stats/:yearMonth', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const { yearMonth } = req.params;

      const stats = await db.collection('salesData').aggregate([
        { $match: { yearMonth } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$salesAmount' },
            totalTarget: { $sum: '$targetAmount' },
            employeeCount: { $sum: 1 },
            avgSales: { $avg: '$salesAmount' },
            maxSales: { $max: '$salesAmount' },
            minSales: { $min: '$salesAmount' }
          }
        },
        {
          $project: {
            totalSales: 1,
            totalTarget: 1,
            employeeCount: 1,
            avgSales: { $round: ['$avgSales', 0] },
            maxSales: 1,
            minSales: 1,
            overallAchievementRate: {
              $cond: {
                if: { $gt: ['$totalTarget', 0] },
                then: { $round: [{ $multiply: [{ $divide: ['$totalSales', '$totalTarget'] }, 100] }, 2] },
                else: 0
              }
            }
          }
        }
      ]).toArray();

      const result = stats[0] || {
        totalSales: 0,
        totalTarget: 0,
        employeeCount: 0,
        avgSales: 0,
        maxSales: 0,
        minSales: 0,
        overallAchievementRate: 0
      };

      res.json({ success: true, data: result });

    } catch (error) {
      console.error('Get sales stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  return router;
}

module.exports = createSalesRoutes;