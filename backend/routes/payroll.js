const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin, requirePasswordVerification } = require('../middleware/permissions');
const PayrollRepository = require('../repositories/PayrollRepository');
const { payrollSchemas, validate, validateObjectId } = require('../validation/schemas');
const {
  payrollRateLimiter,
  strictRateLimiter,
  sanitizePayrollInput,
  addSecurityHeaders,
  preventNoSQLInjection
} = require('../middleware/payrollSecurity');
const {
  generateCsrfToken,
  CSRF_CONFIG
} = require('../utils/payrollUtils');

const router = express.Router();

// Apply security headers to all routes
router.use(addSecurityHeaders);

// Payroll routes
function createPayrollRoutes(db) {
  const payrollRepo = new PayrollRepository();
  
  // Permission middleware
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

  // Get monthly payroll data (queries both collections)
  router.get('/monthly/:year_month', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Parse year and month from year_month string (e.g., "2025-06")
      const [yearStr, monthStr] = year_month.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      let matchCondition = { yearMonth: year_month };
      let newMatchCondition = { year, month };

      // If not admin/manager, only show own data
      if (userRole === 'user') {
        matchCondition.userId = new ObjectId(userId);
        newMatchCondition.userId = new ObjectId(userId);
      }

      // Query monthlyPayments collection (old system)
      const monthlyPayrollData = await db.collection('monthlyPayments').aggregate([
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
            _id: '$_id',
            user_id: '$userId',
            employee: {
              full_name: { $arrayElemAt: ['$user.name', 0] },
              username: { $arrayElemAt: ['$user.username', 0] },
              department: { $arrayElemAt: ['$user.department', 0] },
              employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
              position: { $arrayElemAt: ['$user.position', 0] }
            },
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
        { $sort: { 'employee.full_name': 1 } }
      ]).toArray();
      
      // Query payroll collection (new system from Excel uploads)
      const newPayrollData = await db.collection('payroll').aggregate([
        { $match: newMatchCondition },
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
            _id: '$_id',
            user_id: '$userId',
            employee: {
              full_name: { $arrayElemAt: ['$user.name', 0] },
              username: { $arrayElemAt: ['$user.username', 0] },
              department: { $arrayElemAt: ['$user.department', 0] },
              employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
              position: { $arrayElemAt: ['$user.position', 0] }
            },
            year_month: { $literal: year_month }, // Convert to string format for consistency
            base_salary: '$baseSalary',
            incentive: { $ifNull: ['$allowances.incentive', 0] },
            bonus: { $literal: 0 }, // Not in new schema
            award: { $literal: 0 }, // Not in new schema
            // Add detailed allowances object
            allowances: {
              incentive: { $ifNull: ['$allowances.incentive', 0] },
              meal: { $ifNull: ['$allowances.meal', 0] },
              transportation: { $ifNull: ['$allowances.transportation', 0] },
              childCare: { $ifNull: ['$allowances.childCare', 0] },
              overtime: { $ifNull: ['$allowances.overtime', 0] },
              nightShift: { $ifNull: ['$allowances.nightShift', 0] },
              holidayWork: { $ifNull: ['$allowances.holidayWork', 0] },
              other: { $ifNull: ['$allowances.other', 0] }
            },
            // Add detailed deductions object
            deductions: {
              nationalPension: { $ifNull: ['$deductions.nationalPension', 0] },
              healthInsurance: { $ifNull: ['$deductions.healthInsurance', 0] },
              employmentInsurance: { $ifNull: ['$deductions.employmentInsurance', 0] },
              incomeTax: { $ifNull: ['$deductions.incomeTax', 0] },
              localIncomeTax: { $ifNull: ['$deductions.localIncomeTax', 0] }
            },
            // Calculate total allowances
            total_allowances: {
              $add: [
                { $ifNull: ['$allowances.incentive', 0] },
                { $ifNull: ['$allowances.meal', 0] },
                { $ifNull: ['$allowances.transportation', 0] },
                { $ifNull: ['$allowances.childCare', 0] },
                { $ifNull: ['$allowances.overtime', 0] },
                { $ifNull: ['$allowances.nightShift', 0] },
                { $ifNull: ['$allowances.holidayWork', 0] },
                { $ifNull: ['$allowances.other', 0] }
              ]
            },
            // Calculate total deductions
            total_deductions: {
              $add: [
                { $ifNull: ['$deductions.nationalPension', 0] },
                { $ifNull: ['$deductions.healthInsurance', 0] },
                { $ifNull: ['$deductions.employmentInsurance', 0] },
                { $ifNull: ['$deductions.incomeTax', 0] },
                { $ifNull: ['$deductions.localIncomeTax', 0] }
              ]
            },
            total_input: {
              $add: [
                '$baseSalary',
                { $ifNull: ['$allowances.incentive', 0] },
                { $ifNull: ['$allowances.meal', 0] },
                { $ifNull: ['$allowances.transportation', 0] },
                { $ifNull: ['$allowances.childCare', 0] },
                { $ifNull: ['$allowances.overtime', 0] },
                { $ifNull: ['$allowances.nightShift', 0] },
                { $ifNull: ['$allowances.holidayWork', 0] },
                { $ifNull: ['$allowances.other', 0] }
              ]
            },
            actual_payment: '$netSalary',
            difference: { $subtract: ['$netSalary', '$baseSalary'] },
            incentive_formula: { $arrayElemAt: ['$user.incentiveFormula', 0] },
            sales_amount: { $literal: 0 } // Not tracked in new system
          }
        },
        { $sort: { 'employee.full_name': 1 } }
      ]).toArray();
      
      // Combine results from both collections
      const combinedPayrollData = [...monthlyPayrollData, ...newPayrollData];

      res.json({ success: true, data: combinedPayrollData });

    } catch (error) {
      console.error('Get monthly payroll error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Export monthly payroll data to Excel
  router.get('/monthly/:year_month/export', requireAuth, asyncHandler(async (req, res) => {
    try {
      const { year_month } = req.params;
      const XLSX = require('xlsx');
      
      // Parse year and month from year_month string (e.g., "2025-06")
      const [yearStr, monthStr] = year_month.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      
      // Query data from monthlyPayments collection (old system)
      const monthlyPaymentsDb = db.collection('monthlyPayments');
      const monthlyPayrollData = await monthlyPaymentsDb.aggregate([
        {
          $match: {
            year_month: year_month
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'employee_id',
            foreignField: '_id',
            as: 'employee_data'
          }
        },
        {
          $project: {
            employee_id: 1,
            employee: { $arrayElemAt: ['$employee_data', 0] },
            base_salary: 1,
            incentive: 1,
            bonus: 1,
            award: 1,
            total_input: 1,
            actual_payment: 1,
            difference: 1,
            incentive_formula: 1,
            sales_amount: 1
          }
        },
        { $sort: { 'employee.full_name': 1 } }
      ]).toArray();

      // Query data from payroll collection (new system)
      const payrollDb = db.collection('payroll');
      const newPayrollData = await payrollDb.aggregate([
        {
          $match: {
            year: year,
            month: month
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            employee_id: '$employeeId',
            employee: {
              _id: { $arrayElemAt: ['$user._id', 0] },
              full_name: { $arrayElemAt: ['$user.full_name', 0] },
              username: { $arrayElemAt: ['$user.username', 0] },
              department: { $arrayElemAt: ['$user.department', 0] },
              employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
              position: { $arrayElemAt: ['$user.position', 0] }
            },
            base_salary: '$baseSalary',
            
            // Individual allowances for Excel export
            meal_allowance: { $ifNull: ['$allowances.meal', 0] },
            transportation_allowance: { $ifNull: ['$allowances.transportation', 0] },
            childcare_allowance: { $ifNull: ['$allowances.childCare', 0] },
            overtime_allowance: { $ifNull: ['$allowances.overtime', 0] },
            nightshift_allowance: { $ifNull: ['$allowances.nightShift', 0] },
            holiday_allowance: { $ifNull: ['$allowances.holidayWork', 0] },
            other_allowance: { $ifNull: ['$allowances.other', 0] },
            incentive: { $ifNull: ['$allowances.incentive', 0] },
            
            // Deductions
            national_pension: { $ifNull: ['$deductions.nationalPension', 0] },
            health_insurance: { $ifNull: ['$deductions.healthInsurance', 0] },
            employment_insurance: { $ifNull: ['$deductions.employmentInsurance', 0] },
            income_tax: { $ifNull: ['$deductions.incomeTax', 0] },
            local_income_tax: { $ifNull: ['$deductions.localIncomeTax', 0] },
            
            bonus: { $ifNull: ['$bonuses', 0] },
            award: { $ifNull: ['$awards', 0] },
            total_input: '$grossSalary',
            actual_payment: '$netSalary'
          }
        },
        { $sort: { 'employee.full_name': 1 } }
      ]).toArray();
      
      // Combine results from both collections
      const combinedPayrollData = [...monthlyPayrollData, ...newPayrollData];
      
      // Transform data for Excel export
      const excelData = combinedPayrollData.map(record => ({
        '직원명': record.employee?.full_name || '',
        '직원ID': record.employee?.employeeId || record.employee_id || '',
        '부서': record.employee?.department || '',
        '직급': record.employee?.position || '',
        '기본급': record.base_salary || 0,
        
        // Allowances
        '인센티브': record.incentive || 0,
        '식대': record.meal_allowance || 0,
        '교통비': record.transportation_allowance || 0,
        '보육수당': record.childcare_allowance || 0,
        '연장근무수당': record.overtime_allowance || 0,
        '야간근무수당': record.nightshift_allowance || 0,
        '휴일근무수당': record.holiday_allowance || 0,
        '기타수당': record.other_allowance || 0,
        
        // Deductions
        '국민연금': record.national_pension || 0,
        '건강보험': record.health_insurance || 0,
        '고용보험': record.employment_insurance || 0,
        '소득세': record.income_tax || 0,
        '지방소득세': record.local_income_tax || 0,
        
        // Bonuses
        '상여금': record.bonus || 0,
        '포상금': record.award || 0,
        
        // Totals
        '지급총액': record.total_input || 0,
        '실지급액': record.actual_payment || 0
      }));
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-fit column widths
      const columnWidths = [];
      Object.keys(excelData[0] || {}).forEach((key, index) => {
        const maxLength = Math.max(
          key.length,
          ...excelData.map(row => String(row[key]).length)
        );
        columnWidths[index] = { wch: Math.min(maxLength + 2, 20) };
      });
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, `급여현황_${year_month}`);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=payroll_${year_month}.xlsx`);
      
      // Send the Excel file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error('Export payroll Excel error:', error);
      res.status(500).json({ error: 'Excel export failed' });
    }
  }));

  // Create monthly payroll
  router.post('/monthly', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
    try {
      const { userId, yearMonth, baseSalary, actualPayment, updateReason } = req.body;
      const { mode = 'create' } = req.query; // 'create', 'upsert', 'overwrite'

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

      // Handle different modes
      if (existingPayroll) {
        if (mode === 'create') {
          return res.status(400).json({ error: 'Payroll for this month already exists' });
        } else if (mode === 'upsert' || mode === 'overwrite') {
          // Continue with update logic below
        }
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

      // Handle upsert mode
      if ((mode === 'upsert' || mode === 'overwrite') && existingPayroll) {
        const updateData = {
          baseSalary: baseSalary || 0,
          incentive,
          bonus: totalBonus,
          award: 0,
          totalInput,
          actualPayment: actualPayment || 0,
          difference,
          updatedAt: new Date(),
          updatedBy: req.user.id,
          updateReason: updateReason || 'Data correction'
        };

        const result = await db.collection('monthlyPayments').findOneAndUpdate(
          { 
            userId: new ObjectId(userId), 
            yearMonth: yearMonth 
          },
          { 
            $set: updateData,
            $setOnInsert: {
              createdAt: new Date(),
              createdBy: req.user.id
            }
          },
          { 
            upsert: true, 
            returnDocument: 'after' 
          }
        );

        return res.json({
          success: true,
          action: 'updated',
          message: `Payroll updated successfully${updateReason ? ': ' + updateReason : ''}`,
          data: result.value
        });
      }

      // Normal create mode
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
        action: 'created',
        message: 'Payroll created successfully',
        data: { id: result.insertedId, ...payrollRecord }
      });

    } catch (error) {
      console.error('Create payroll error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Update monthly payroll - Admin only with password verification
  router.put('/monthly/:id', requireAuth, requireAdmin, requirePasswordVerification, asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { baseSalary, incentive, bonus, award, actualPayment } = req.body;

      // Get original record for audit logging
      const originalRecord = await db.collection('monthlyPayments').findOne({ _id: new ObjectId(id) });
      if (!originalRecord) {
        return res.status(404).json({ error: 'Payroll record not found' });
      }

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
      const totalInput = (updateData.baseSalary || originalRecord.baseSalary || 0) +
                        (updateData.incentive || originalRecord.incentive || 0) +
                        (updateData.bonus || originalRecord.bonus || 0) +
                        (updateData.award || originalRecord.award || 0);

      updateData.totalInput = totalInput;
      updateData.difference = (updateData.actualPayment || originalRecord.actualPayment || 0) - totalInput;

      // Log the edit action using ErrorLoggingMonitoringService
      if (global.errorLoggingService) {
        await global.errorLoggingService.logAuditTrail({
          action: 'payroll_edit',
          category: 'payroll',
          userId: req.user.id,
          userName: req.user.username,
          targetId: id,
          previousData: originalRecord,
          newData: updateData,
          verificationToken: req.verificationToken,
          verifiedAt: req.verifiedAt,
          metadata: {
            ip: req.ip,
            userAgent: req.headers['user-agent']
          }
        });
      }

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


  // Get payroll statistics (queries both collections)
  router.get('/stats/:yearMonth', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const { yearMonth } = req.params;
      
      // Parse year and month from yearMonth string (e.g., "2025-06")
      const [yearStr, monthStr] = yearMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      // Get daily worker salaries for this month
      const dailyWorkerStats = await db.collection('daily_workers').aggregate([
        { $match: { yearMonth } },
        {
          $group: {
            _id: null,
            totalDailyWorkers: { $sum: 1 },
            totalDailyWorkerSalary: { $sum: '$salary' }
          }
        }
      ]).toArray();

      const dailyWorkerData = dailyWorkerStats[0] || { totalDailyWorkers: 0, totalDailyWorkerSalary: 0 };

      // Query monthlyPayments collection (old system)
      const monthlyStats = await db.collection('monthlyPayments').aggregate([
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
      
      // Query payroll collection (new system from Excel uploads)
      const payrollStats = await db.collection('payroll').aggregate([
        { $match: { year, month } },
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            totalBaseSalary: { $sum: '$baseSalary' },
            // Extract incentive from allowances object
            totalIncentive: { $sum: '$allowances.incentive' },
            totalBonus: { $sum: 0 }, // Not in new schema
            totalAward: { $sum: 0 }, // Not in new schema
            // Calculate total input from baseSalary + all allowances
            totalInput: { 
              $sum: {
                $add: [
                  '$baseSalary',
                  { $ifNull: ['$allowances.incentive', 0] },
                  { $ifNull: ['$allowances.meal', 0] },
                  { $ifNull: ['$allowances.transportation', 0] },
                  { $ifNull: ['$allowances.childCare', 0] },
                  { $ifNull: ['$allowances.overtime', 0] },
                  { $ifNull: ['$allowances.nightShift', 0] },
                  { $ifNull: ['$allowances.holidayWork', 0] },
                  { $ifNull: ['$allowances.other', 0] }
                ]
              }
            },
            totalActualPayment: { $sum: '$netSalary' }, // netSalary is the actual payment
            avgSalary: { $avg: '$netSalary' },
            maxSalary: { $max: '$netSalary' },
            minSalary: { $min: '$netSalary' }
          }
        }
      ]).toArray();

      // Merge results from both collections
      const monthlyResult = monthlyStats[0] || {
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
      
      const payrollResult = payrollStats[0] || {
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
      
      // Combine stats from both collections and include daily workers
      const combinedResult = {
        totalEmployees: monthlyResult.totalEmployees + payrollResult.totalEmployees + dailyWorkerData.totalDailyWorkers,
        totalBaseSalary: monthlyResult.totalBaseSalary + payrollResult.totalBaseSalary,
        totalIncentive: monthlyResult.totalIncentive + payrollResult.totalIncentive,
        totalBonus: monthlyResult.totalBonus + payrollResult.totalBonus,
        totalAward: monthlyResult.totalAward + payrollResult.totalAward,
        totalInput: monthlyResult.totalInput + payrollResult.totalInput,
        totalActualPayment: monthlyResult.totalActualPayment + payrollResult.totalActualPayment + dailyWorkerData.totalDailyWorkerSalary,
        // For averages, calculate weighted average if both collections have data
        avgSalary: monthlyResult.totalEmployees + payrollResult.totalEmployees > 0
          ? (monthlyResult.totalActualPayment + payrollResult.totalActualPayment) / 
            (monthlyResult.totalEmployees + payrollResult.totalEmployees)
          : 0,
        maxSalary: Math.max(monthlyResult.maxSalary || 0, payrollResult.maxSalary || 0),
        minSalary: monthlyResult.totalEmployees + payrollResult.totalEmployees > 0
          ? Math.min(
              monthlyResult.minSalary || Number.MAX_VALUE,
              payrollResult.minSalary || Number.MAX_VALUE
            )
          : 0,
        // Add daily worker specific stats
        dailyWorkerCount: dailyWorkerData.totalDailyWorkers,
        dailyWorkerSalary: dailyWorkerData.totalDailyWorkerSalary,
        regularEmployeeCount: monthlyResult.totalEmployees + payrollResult.totalEmployees,
        regularSalary: monthlyResult.totalActualPayment + payrollResult.totalActualPayment
      };

      res.json({ success: true, data: combinedResult });

    } catch (error) {
      console.error('Get payroll stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));





  return router;
}

module.exports = createPayrollRoutes;