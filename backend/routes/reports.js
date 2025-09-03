const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/permissions');
const PayrollRepository = require('../repositories/PayrollRepository');

const router = express.Router();

// Reports routes
function createReportsRoutes(db) {
  const payrollRepo = new PayrollRepository();

  // Using requirePermission from middleware/permissions.js

  // GET /api/reports/payroll/:year_month - Generate payroll report for a specific month
  router.get('/payroll/:year_month', 
    requireAuth,
    requirePermission('payroll:view'),
    asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;
      
      // Validate year_month format (YYYYMM)
      if (!/^\d{6}$/.test(year_month)) {
        return res.status(400).json({ 
          error: 'Invalid year_month format. Expected YYYYMM' 
        });
      }

      const year = parseInt(year_month.substring(0, 4));
      const month = parseInt(year_month.substring(4, 6));

      // Validate month range
      if (month < 1 || month > 12) {
        return res.status(400).json({ 
          error: 'Invalid month. Must be between 1 and 12' 
        });
      }

      // Get payroll data from both legacy and new systems
      const payrollCollection = db.collection('payroll');
      const newPayrollCollection = db.collection('new_payroll');
      
      // Query legacy monthly_payroll collection
      const monthlyPayrollReport = await payrollCollection.aggregate([
        {
          $match: {
            yearMonth: year_month
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: '$userInfo'
        },
        {
          $project: {
            _id: 1,
            employeeId: '$userInfo.employeeId',
            name: '$userInfo.name',
            department: '$userInfo.department',
            position: '$userInfo.position',
            baseSalary: 1,
            incentive: 1,
            bonus: '$specialBonus',
            bonusDetails: 1,
            award: { $literal: 0 },
            actualPayment: '$netSalary',
            difference: { $subtract: ['$netSalary', '$baseSalary'] },
            salesAmount: '$salesAchievement',
            yearMonth: 1
          }
        },
        { $sort: { name: 1 } }
      ]).toArray();
      
      // Query new payroll system
      const newPayrollReport = await newPayrollCollection.aggregate([
        {
          $match: {
            year: year,
            month: month
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: '$userInfo'
        },
        {
          $project: {
            _id: 1,
            employeeId: '$userInfo.employeeId',
            name: '$userInfo.name',
            department: '$userInfo.department',
            position: '$userInfo.position',
            baseSalary: 1,
            incentive: 1,
            bonus: 1,
            award: 1,
            actualPayment: '$netSalary',
            difference: { $subtract: ['$netSalary', '$baseSalary'] },
            salesAmount: { $literal: 0 }, // Not tracked in new system
            bonusDetails: { $literal: [] }
          }
        },
        { $sort: { name: 1 } }
      ]).toArray();
      
      // Combine results from both collections
      const combinedPayrollReport = [...monthlyPayrollReport, ...newPayrollReport];
      
      // Calculate summary statistics
      const summary = {
        totalEmployees: combinedPayrollReport.length,
        totalBaseSalary: combinedPayrollReport.reduce((sum, p) => sum + (p.baseSalary || 0), 0),
        totalIncentive: combinedPayrollReport.reduce((sum, p) => sum + (p.incentive || 0), 0),
        totalBonus: combinedPayrollReport.reduce((sum, p) => sum + (p.bonus || 0), 0),
        totalAward: combinedPayrollReport.reduce((sum, p) => sum + (p.award || 0), 0),
        totalPayroll: combinedPayrollReport.reduce((sum, p) => sum + (p.actualPayment || 0), 0),
        avgSalary: combinedPayrollReport.length > 0 ? 
          Math.round(combinedPayrollReport.reduce((sum, p) => sum + (p.actualPayment || 0), 0) / combinedPayrollReport.length) : 0
      };

      res.json({
        success: true,
        data: {
          reportData: combinedPayrollReport,
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

  // Backward compatibility redirects (to be removed after 1 month)
  // These redirects ensure existing frontend code continues to work during migration
  router.post('/payslip/match-employees', (req, res) => {
    console.warn('Deprecated: Use /api/documents/payslip/match-employees instead');
    res.redirect(307, '/api/documents/payslip/match-employees');
  });

  router.post('/payslip/bulk-upload', (req, res) => {
    console.warn('Deprecated: Use /api/documents/payslip/bulk-upload instead');
    res.redirect(307, '/api/documents/payslip/bulk-upload');
  });

  router.get('/payslip/download/:documentId', (req, res) => {
    console.warn('Deprecated: Use /api/documents/:id/download instead');
    const { documentId } = req.params;
    res.redirect(307, `/api/documents/${documentId}/download`);
  });

  return router;
}

module.exports = createReportsRoutes;