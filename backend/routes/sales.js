const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

// Sales routes
function createSalesRoutes(db) {
  const router = express.Router();
  console.log('🔥 Creating sales routes...');
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

  // Get company sales by yearMonth
  console.log('🔥 Adding GET /company/:yearMonth route');
  router.get('/company/:yearMonth', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const { yearMonth } = req.params;
      
      const companySales = await db.collection('companySales').findOne({ yearMonth });
      
      if (!companySales) {
        return res.json({ success: true, data: null });
      }

      res.json({ 
        success: true, 
        data: {
          totalAmount: companySales.totalAmount,
          notes: companySales.notes,
          yearMonth: companySales.yearMonth,
          createdAt: companySales.createdAt,
          updatedAt: companySales.updatedAt
        }
      });

    } catch (error) {
      console.error('Get company sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get individual sales by yearMonth
  router.get('/individual/:yearMonth', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const { yearMonth } = req.params;
      
      const individualSales = await db.collection('salesData').aggregate([
        { $match: { yearMonth } },
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
            userId: 1,
            userName: { $arrayElemAt: ['$user.name', 0] },
            individualSales: 1,
            contributionRate: 1,
            notes: 1,
            yearMonth: 1,
            createdAt: 1,
            updatedAt: 1
          }
        },
        { $sort: { userName: 1 } }
      ]).toArray();

      res.json({ success: true, data: individualSales });

    } catch (error) {
      console.error('Get individual sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Bulk save sales data (company + individual)
  router.post('/bulk', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    // MongoDB session for transaction - get client from db.s.client
    const client = db.s ? db.s.client : db.client;
    const session = client.startSession();
    
    try {
      const { yearMonth, companySales, individualSales } = req.body;

      // Validation
      if (!yearMonth || !companySales || !companySales.total_amount) {
        return res.status(400).json({ 
          error: 'Year month and company total sales are required' 
        });
      }

      if (!individualSales || individualSales.length === 0) {
        return res.status(400).json({ 
          error: 'At least one individual sales record is required' 
        });
      }

      let savedCount = 0;
      let individualTotal = 0;

      await session.withTransaction(async () => {
        // Save or update company sales
        await db.collection('companySales').replaceOne(
          { yearMonth },
          {
            yearMonth,
            totalAmount: Number(companySales.total_amount),
            notes: companySales.notes || '',
            createdAt: new Date(),
            createdBy: req.user.id,
            updatedAt: new Date(),
            updatedBy: req.user.id
          },
          { upsert: true, session }
        );

        // Delete existing individual sales for this month
        await db.collection('salesData').deleteMany(
          { yearMonth },
          { session }
        );

        // Insert new individual sales
        const salesDataToInsert = [];
        for (const sale of individualSales) {
          if (!sale.user_id || !sale.individual_sales) continue;

          const contributionRate = companySales.total_amount > 0
            ? (Number(sale.individual_sales) / Number(companySales.total_amount)) * 100
            : 0;

          salesDataToInsert.push({
            userId: new ObjectId(sale.user_id),
            yearMonth,
            individualSales: Number(sale.individual_sales),
            contributionRate: contributionRate,
            notes: sale.notes || '',
            category: 'general',
            createdAt: new Date(),
            createdBy: req.user.id,
            updatedAt: new Date(),
            updatedBy: req.user.id
          });

          individualTotal += Number(sale.individual_sales);
          savedCount++;
        }

        if (salesDataToInsert.length > 0) {
          await db.collection('salesData').insertMany(salesDataToInsert, { session });
        }
      });

      const coverageRate = companySales.total_amount > 0
        ? (individualTotal / Number(companySales.total_amount)) * 100
        : 0;

      res.json({
        success: true,
        message: `전체 매출 및 ${savedCount}명의 개인 매출 데이터가 저장되었습니다`,
        summary: {
          company_total: Number(companySales.total_amount),
          individual_total: individualTotal,
          contribution_coverage: coverageRate,
          total_saved: savedCount
        }
      });

    } catch (error) {
      console.error('Bulk save sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      await session.endSession();
    }
  }));

  // Get sales statistics for a month
  router.get('/stats/:yearMonth', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const { yearMonth } = req.params;

      // Get company sales
      const companySales = await db.collection('companySales').findOne({ yearMonth });
      
      // Get individual sales stats
      const individualStats = await db.collection('salesData').aggregate([
        { $match: { yearMonth } },
        {
          $group: {
            _id: null,
            totalIndividualSales: { $sum: '$individualSales' },
            employeeCount: { $sum: 1 },
            avgIndividualSales: { $avg: '$individualSales' },
            maxIndividualSales: { $max: '$individualSales' },
            minIndividualSales: { $min: '$individualSales' }
          }
        }
      ]).toArray();

      const stats = individualStats[0] || {
        totalIndividualSales: 0,
        employeeCount: 0,
        avgIndividualSales: 0,
        maxIndividualSales: 0,
        minIndividualSales: 0
      };

      const result = {
        companyTotal: companySales ? companySales.totalAmount : 0,
        individualTotal: stats.totalIndividualSales,
        employeeCount: stats.employeeCount,
        avgIndividualSales: Math.round(stats.avgIndividualSales),
        maxIndividualSales: stats.maxIndividualSales,
        minIndividualSales: stats.minIndividualSales,
        contributionCoverage: companySales && companySales.totalAmount > 0
          ? ((stats.totalIndividualSales / companySales.totalAmount) * 100).toFixed(1)
          : 0
      };

      res.json({ success: true, data: result });

    } catch (error) {
      console.error('Get sales stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Delete sales data for a month (both company and individual)
  router.delete('/month/:yearMonth', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    // MongoDB session for transaction - get client from db.s.client
    const client = db.s ? db.s.client : db.client;
    const session = client.startSession();
    
    try {
      const { yearMonth } = req.params;

      await session.withTransaction(async () => {
        // Delete company sales
        await db.collection('companySales').deleteOne(
          { yearMonth },
          { session }
        );

        // Delete individual sales
        const result = await db.collection('salesData').deleteMany(
          { yearMonth },
          { session }
        );

        res.json({
          success: true,
          message: `${yearMonth} 매출 데이터가 삭제되었습니다 (${result.deletedCount}개 개인 매출 기록)`
        });
      });

    } catch (error) {
      console.error('Delete month sales error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      await session.endSession();
    }
  }));

  return router;
}

module.exports = createSalesRoutes;