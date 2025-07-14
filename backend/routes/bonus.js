const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Bonus routes
function createBonusRoutes(db) {
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

  // Get bonuses by year_month
  router.get('/:year_month', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;
      const userRole = req.session.user.role;
      const userId = req.session.user.id;

      let matchCondition = { yearMonth: year_month };

      // If not admin/manager, only show own data
      if (userRole === 'user') {
        matchCondition.userId = new ObjectId(userId);
      }

      const bonusData = await db.collection('bonuses').aggregate([
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
            bonus_type: '$bonusType',
            amount: '$amount',
            reason: '$reason',
            approved_by: '$approvedBy',
            approved_at: '$approvedAt',
            created_at: '$createdAt'
          }
        },
        { $sort: { created_at: -1 } }
      ]).toArray();

      res.json({ success: true, data: bonusData });

    } catch (error) {
      console.error('Get bonus data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Create bonus
  router.post('/', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { userId, yearMonth, bonusType, amount, reason } = req.body;

      if (!userId || !yearMonth || !bonusType || amount === undefined) {
        return res.status(400).json({ 
          error: 'User ID, year month, bonus type, and amount are required' 
        });
      }

      if (amount < 0) {
        return res.status(400).json({ error: 'Amount cannot be negative' });
      }

      // Verify user exists
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const bonusRecord = {
        userId: new ObjectId(userId),
        yearMonth,
        bonusType,
        amount: Number(amount),
        reason: reason || '',
        approvedBy: req.session.user.id,
        approvedAt: new Date(),
        createdAt: new Date(),
        createdBy: req.session.user.id
      };

      const result = await db.collection('bonuses').insertOne(bonusRecord);

      res.json({
        success: true,
        message: 'Bonus created successfully',
        data: { id: result.insertedId, ...bonusRecord }
      });

    } catch (error) {
      console.error('Create bonus error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Update bonus
  router.put('/:id', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { bonusType, amount, reason } = req.body;

      const updateData = {
        updatedAt: new Date(),
        updatedBy: req.session.user.id
      };

      if (bonusType !== undefined) updateData.bonusType = bonusType;
      if (amount !== undefined) {
        if (amount < 0) {
          return res.status(400).json({ error: 'Amount cannot be negative' });
        }
        updateData.amount = Number(amount);
      }
      if (reason !== undefined) updateData.reason = reason;

      const result = await db.collection('bonuses').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Bonus record not found' });
      }

      res.json({
        success: true,
        message: 'Bonus updated successfully'
      });

    } catch (error) {
      console.error('Update bonus error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Delete bonus
  router.delete('/:id', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.collection('bonuses').deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Bonus record not found' });
      }

      res.json({
        success: true,
        message: 'Bonus deleted successfully'
      });

    } catch (error) {
      console.error('Delete bonus error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get bonus summary by user
  router.get('/user/:userId', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.session.user;

      // Check permissions - users can only see their own data
      if (currentUser.role === 'user' && currentUser.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const bonusSummary = await db.collection('bonuses').aggregate([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: '$yearMonth',
            totalAmount: { $sum: '$amount' },
            bonusCount: { $sum: 1 },
            bonuses: {
              $push: {
                id: '$_id',
                bonusType: '$bonusType',
                amount: '$amount',
                reason: '$reason',
                createdAt: '$createdAt'
              }
            }
          }
        },
        { $sort: { _id: -1 } }
      ]).toArray();

      res.json({ success: true, data: bonusSummary });

    } catch (error) {
      console.error('Get bonus summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  return router;
}

module.exports = createBonusRoutes;