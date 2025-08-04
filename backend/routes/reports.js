const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Reports routes
function createReportsRoutes(db) {
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
        manager: ['leave:view', 'leave:manage', 'users:view', 'reports:view', 'reports:export'],
        supervisor: ['leave:view', 'leave:manage', 'users:view', 'reports:view', 'reports:export'],
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

  // Generate payroll report data
  router.get('/payroll/:year_month', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;

      const payrollReport = await db.collection('monthlyPayments').aggregate([
        { $match: { yearMonth: year_month } },
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
          $lookup: {
            from: 'bonuses',
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
            as: 'bonuses'
          }
        },
        {
          $project: {
            employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
            name: { $arrayElemAt: ['$user.name', 0] },
            department: { $arrayElemAt: ['$user.department', 0] },
            position: { $arrayElemAt: ['$user.position', 0] },
            yearMonth: '$yearMonth',
            baseSalary: '$baseSalary',
            incentive: '$incentive',
            bonus: '$bonus',
            award: '$award',
            totalInput: '$totalInput',
            actualPayment: '$actualPayment',
            difference: '$difference',
            salesAmount: { $arrayElemAt: ['$salesData.salesAmount', 0] },
            bonusDetails: '$bonuses'
          }
        },
        { $sort: { name: 1 } }
      ]).toArray();

      // Calculate summary statistics
      const summary = {
        totalEmployees: payrollReport.length,
        totalBaseSalary: payrollReport.reduce((sum, p) => sum + (p.baseSalary || 0), 0),
        totalIncentive: payrollReport.reduce((sum, p) => sum + (p.incentive || 0), 0),
        totalBonus: payrollReport.reduce((sum, p) => sum + (p.bonus || 0), 0),
        totalAward: payrollReport.reduce((sum, p) => sum + (p.award || 0), 0),
        totalPayroll: payrollReport.reduce((sum, p) => sum + (p.actualPayment || 0), 0),
        avgSalary: payrollReport.length > 0 ? 
          Math.round(payrollReport.reduce((sum, p) => sum + (p.actualPayment || 0), 0) / payrollReport.length) : 0
      };

      res.json({
        success: true,
        data: {
          reportData: payrollReport,
          summary,
          generatedAt: new Date(),
          generatedBy: req.user.name,
          yearMonth: year_month
        }
      });

    } catch (error) {
      console.error('Generate payroll report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Download payroll report as Excel (mock implementation)
  router.get('/payroll/:year_month/excel', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;

      // In a real implementation, you would generate an actual Excel file here
      // For now, we'll return a mock response
      const mockExcelData = Buffer.from('Mock Excel Data for ' + year_month);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payroll_${year_month}.xlsx"`,
        'Content-Length': mockExcelData.length
      });

      res.send(mockExcelData);

    } catch (error) {
      console.error('Download payroll report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Download comparison report
  router.get('/comparison/:upload_id/:year_month/excel', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { upload_id, year_month } = req.params;

      // Get upload data
      const upload = await db.collection('payrollUploads').findOne({ _id: new ObjectId(upload_id) });
      
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      // Mock comparison Excel file
      const mockExcelData = Buffer.from(`Mock Comparison Report: Upload ${upload_id} vs ${year_month}`);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="comparison_${upload_id}_${year_month}.xlsx"`,
        'Content-Length': mockExcelData.length
      });

      res.send(mockExcelData);

    } catch (error) {
      console.error('Download comparison report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Download payslip for individual employee
  router.get('/payslip/:userId/:year_month/excel', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { userId, year_month } = req.params;
      const currentUser = req.user;

      // Check permissions - users can only download their own payslip
      if (currentUser.role === 'user' && currentUser.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get employee payroll data
      const payrollData = await db.collection('monthlyPayments').findOne({
        userId: new ObjectId(userId),
        yearMonth: year_month
      });

      if (!payrollData) {
        return res.status(404).json({ error: 'Payroll data not found' });
      }

      // Get employee info
      const employee = await db.collection('users').findOne({ _id: new ObjectId(userId) });

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Mock payslip Excel file
      const mockExcelData = Buffer.from(`Mock Payslip for ${employee.name} - ${year_month}`);

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payslip_${employee.name}_${year_month}.xlsx"`,
        'Content-Length': mockExcelData.length
      });

      res.send(mockExcelData);

    } catch (error) {
      console.error('Download payslip error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Download payroll template
  router.get('/template/payroll', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      // Mock template Excel file
      const mockTemplateData = Buffer.from('Mock Payroll Template');

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="payroll_template.xlsx"',
        'Content-Length': mockTemplateData.length
      });

      res.send(mockTemplateData);

    } catch (error) {
      console.error('Download template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Leave report
  router.get('/leave/:year_month', requireAuth, requirePermission('reports:view'), asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;

      const leaveReport = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            $expr: {
              $eq: [
                { $dateToString: { format: '%Y-%m', date: '$startDate' } },
                year_month
              ]
            }
          }
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
          $project: {
            employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
            name: { $arrayElemAt: ['$user.name', 0] },
            department: { $arrayElemAt: ['$user.department', 0] },
            leaveType: '$leaveType',
            startDate: '$startDate',
            endDate: '$endDate',
            totalDays: '$totalDays',
            status: '$status',
            reason: '$reason',
            submittedAt: '$submittedAt'
          }
        },
        { $sort: { submittedAt: -1 } }
      ]).toArray();

      // Calculate leave statistics
      const stats = {
        totalRequests: leaveReport.length,
        approvedRequests: leaveReport.filter(r => r.status === 'approved').length,
        pendingRequests: leaveReport.filter(r => r.status === 'pending').length,
        rejectedRequests: leaveReport.filter(r => r.status === 'rejected').length,
        totalDaysTaken: leaveReport
          .filter(r => r.status === 'approved')
          .reduce((sum, r) => sum + (r.totalDays || 0), 0),
        leaveTypeBreakdown: leaveReport.reduce((acc, r) => {
          acc[r.leaveType] = (acc[r.leaveType] || 0) + 1;
          return acc;
        }, {})
      };

      res.json({
        success: true,
        data: {
          reportData: leaveReport,
          statistics: stats,
          generatedAt: new Date(),
          yearMonth: year_month
        }
      });

    } catch (error) {
      console.error('Generate leave report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  return router;
}

module.exports = createReportsRoutes;