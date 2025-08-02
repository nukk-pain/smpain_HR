const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Payroll routes
function createPayrollRoutes(db) {
  // Permission middleware
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const userPermissions = req.user.permissions || [];
      const hasPermission = userPermissions.includes(permission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  };

  // Get all payroll data (for current month by default)
  router.get('/', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Get current year-month
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      let matchCondition = { yearMonth: currentYearMonth };

      // If not admin/manager, only show own data
      if (userRole === 'user') {
        matchCondition.userId = new ObjectId(userId);
      }

      const payrollData = await db.collection('monthlyPayments').aggregate([
        { $match: matchCondition },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            userId: 1,
            yearMonth: 1,
            baseSalary: 1,
            totalIncentive: 1,
            totalDeductions: 1,
            netPay: 1,
            status: 1,
            'user.name': 1,
            'user.employeeId': 1,
            'user.department': 1,
            'user.position': 1,
            createdAt: 1,
            updatedAt: 1
          }
        },
        { $sort: { 'user.employeeId': 1 } }
      ]).toArray();

      res.json({
        success: true,
        data: payrollData,
        count: payrollData.length,
        yearMonth: currentYearMonth
      });
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      res.status(500).json({ error: 'Failed to fetch payroll data' });
    }
  }));

  // Get monthly payroll data
  router.get('/monthly/:year_month', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;

      let matchCondition = { yearMonth: year_month };

      // If not admin/manager, only show own data
      if (userRole === 'user') {
        matchCondition.userId = new ObjectId(userId);
      }

      const payrollData = await db.collection('monthlyPayments').aggregate([
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
          $lookup: {
            from: 'salesData',
            let: { userId: '$userId', yearMonth: '$yearMonth' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$yearMonth', '$$yearMonth'] }
                    ]
                  }
                }
              }
            ],
            as: 'salesData'
          }
        },
        {
          $project: {
            id: '$_id',
            user_id: '$userId',
            name: { $arrayElemAt: ['$user.name', 0] },
            username: { $arrayElemAt: ['$user.username', 0] },
            year_month: '$yearMonth',
            base_salary: '$baseSalary',
            incentive: '$incentive',
            bonus: '$bonus',
            award: '$award',
            total_input: '$totalInput',
            actual_payment: '$actualPayment',
            difference: '$difference',
            incentive_formula: { $arrayElemAt: ['$user.incentiveFormula', 0] },
            sales_amount: { $arrayElemAt: ['$salesData.salesAmount', 0] }
          }
        },
        { $sort: { name: 1 } }
      ]).toArray();

      res.json({ success: true, data: payrollData });

    } catch (error) {
      console.error('Get monthly payroll error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Create monthly payroll
  router.post('/monthly', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { userId, yearMonth, baseSalary, actualPayment } = req.body;

      if (!userId || !yearMonth) {
        return res.status(400).json({ error: 'User ID and year month are required' });
      }

      // Get user info
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if payroll already exists
      const existingPayroll = await db.collection('monthlyPayments').findOne({
        userId: new ObjectId(userId),
        yearMonth: yearMonth
      });

      if (existingPayroll) {
        return res.status(400).json({ error: 'Payroll for this month already exists' });
      }

      // Get sales data for incentive calculation
      const salesData = await db.collection('salesData').findOne({
        userId: new ObjectId(userId),
        yearMonth: yearMonth
      });

      // Calculate incentive (simplified)
      let incentive = 0;
      if (salesData && user.incentiveFormula) {
        // Basic incentive calculation based on sales
        incentive = Math.floor(salesData.salesAmount * (user.incentiveRate || 0.1));
      }

      // Get bonuses for this month
      const bonuses = await db.collection('bonuses').find({
        userId: new ObjectId(userId),
        yearMonth: yearMonth
      }).toArray();

      const totalBonus = bonuses.reduce((sum, bonus) => sum + (bonus.amount || 0), 0);

      const totalInput = (baseSalary || 0) + incentive + totalBonus;
      const difference = (actualPayment || 0) - totalInput;

      const payrollRecord = {
        userId: new ObjectId(userId),
        yearMonth,
        baseSalary: baseSalary || 0,
        incentive,
        bonus: totalBonus,
        award: 0,
        totalInput,
        actualPayment: actualPayment || 0,
        difference,
        createdAt: new Date(),
        createdBy: req.user.id
      };

      const result = await db.collection('monthlyPayments').insertOne(payrollRecord);

      res.json({
        success: true,
        message: 'Payroll created successfully',
        data: { id: result.insertedId, ...payrollRecord }
      });

    } catch (error) {
      console.error('Create payroll error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Update monthly payroll
  router.put('/monthly/:id', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { baseSalary, incentive, bonus, award, actualPayment } = req.body;

      const updateData = {
        updatedAt: new Date(),
        updatedBy: req.user.id
      };

      if (baseSalary !== undefined) updateData.baseSalary = baseSalary;
      if (incentive !== undefined) updateData.incentive = incentive;
      if (bonus !== undefined) updateData.bonus = bonus;
      if (award !== undefined) updateData.award = award;
      if (actualPayment !== undefined) updateData.actualPayment = actualPayment;

      // Recalculate totals
      const currentRecord = await db.collection('monthlyPayments').findOne({ _id: new ObjectId(id) });
      if (!currentRecord) {
        return res.status(404).json({ error: 'Payroll record not found' });
      }

      const totalInput = (updateData.baseSalary || currentRecord.baseSalary || 0) +
                        (updateData.incentive || currentRecord.incentive || 0) +
                        (updateData.bonus || currentRecord.bonus || 0) +
                        (updateData.award || currentRecord.award || 0);

      updateData.totalInput = totalInput;
      updateData.difference = (updateData.actualPayment || currentRecord.actualPayment || 0) - totalInput;

      const result = await db.collection('monthlyPayments').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Payroll record not found' });
      }

      res.json({
        success: true,
        message: 'Payroll updated successfully'
      });

    } catch (error) {
      console.error('Update payroll error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Delete monthly payroll
  router.delete('/monthly/:id', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.collection('monthlyPayments').deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Payroll record not found' });
      }

      res.json({
        success: true,
        message: 'Payroll deleted successfully'
      });

    } catch (error) {
      console.error('Delete payroll error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get employee payroll data
  router.get('/employee/:userId', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      // Check permissions - users can only see their own data
      if (currentUser.role === 'user' && currentUser.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const payrollData = await db.collection('monthlyPayments').aggregate([
        { $match: { userId: new ObjectId(userId) } },
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
            yearMonth: 1,
            baseSalary: 1,
            incentive: 1,
            bonus: 1,
            award: 1,
            totalInput: 1,
            actualPayment: 1,
            difference: 1,
            createdAt: 1,
            name: { $arrayElemAt: ['$user.name', 0] }
          }
        },
        { $sort: { yearMonth: -1 } }
      ]).toArray();

      res.json({ success: true, data: payrollData });

    } catch (error) {
      console.error('Get employee payroll error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get payroll statistics
  router.get('/stats/:yearMonth', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const { yearMonth } = req.params;

      const stats = await db.collection('monthlyPayments').aggregate([
        { $match: { yearMonth } },
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            totalBaseSalary: { $sum: '$baseSalary' },
            totalIncentive: { $sum: '$incentive' },
            totalBonus: { $sum: '$bonus' },
            totalAward: { $sum: '$award' },
            totalInput: { $sum: '$totalInput' },
            totalActualPayment: { $sum: '$actualPayment' },
            avgSalary: { $avg: '$actualPayment' },
            maxSalary: { $max: '$actualPayment' },
            minSalary: { $min: '$actualPayment' }
          }
        }
      ]).toArray();

      const result = stats[0] || {
        totalEmployees: 0,
        totalBaseSalary: 0,
        totalIncentive: 0,
        totalBonus: 0,
        totalAward: 0,
        totalInput: 0,
        totalActualPayment: 0,
        avgSalary: 0,
        maxSalary: 0,
        minSalary: 0
      };

      res.json({ success: true, data: result });

    } catch (error) {
      console.error('Get payroll stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  return router;
}

module.exports = createPayrollRoutes;