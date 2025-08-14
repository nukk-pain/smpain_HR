const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
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
              department: { $arrayElemAt: ['$user.department', 0] }
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
              department: { $arrayElemAt: ['$user.department', 0] }
            },
            year_month: { $literal: year_month }, // Convert to string format for consistency
            base_salary: '$baseSalary',
            incentive: { $ifNull: ['$allowances.incentive', 0] },
            bonus: { $literal: 0 }, // Not in new schema
            award: { $literal: 0 }, // Not in new schema
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

  // Get payroll statistics (queries both collections)
  router.get('/stats/:yearMonth', requireAuth, requirePermission('payroll:view'), asyncHandler(async (req, res) => {
    try {
      const { yearMonth } = req.params;
      
      // Parse year and month from yearMonth string (e.g., "2025-06")
      const [yearStr, monthStr] = yearMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

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
      
      // Combine stats from both collections
      const combinedResult = {
        totalEmployees: monthlyResult.totalEmployees + payrollResult.totalEmployees,
        totalBaseSalary: monthlyResult.totalBaseSalary + payrollResult.totalBaseSalary,
        totalIncentive: monthlyResult.totalIncentive + payrollResult.totalIncentive,
        totalBonus: monthlyResult.totalBonus + payrollResult.totalBonus,
        totalAward: monthlyResult.totalAward + payrollResult.totalAward,
        totalInput: monthlyResult.totalInput + payrollResult.totalInput,
        totalActualPayment: monthlyResult.totalActualPayment + payrollResult.totalActualPayment,
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
          : 0
      };

      res.json({ success: true, data: combinedResult });

    } catch (error) {
      console.error('Get payroll stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  /**
   * GET /api/payroll/csrf-token - Get CSRF token for form submissions
   * DomainMeaning: Security endpoint to provide CSRF tokens for authenticated payroll operations
   * MisleadingNames: None
   * SideEffects: Generates JWT-based CSRF token
   * Invariants: Requires authentication
   * RAG_Keywords: csrf, security, token generation, anti-forgery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_csrf_token_001
   */
  router.get('/csrf-token',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const csrfToken = generateCsrfToken(req.user.id, req.user.sessionId);
        
        res.json({
          success: true,
          data: {
            csrfToken: csrfToken,
            headerName: CSRF_CONFIG.headerName,
            expiresIn: CSRF_CONFIG.expiresIn
          }
        });
        
      } catch (error) {
        console.error('CSRF token generation error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate CSRF token: ' + error.message
        });
      }
    })
  );

  /**
   * Enhanced GET /api/payroll - Get payroll records with advanced filtering
   * DomainMeaning: Retrieve payroll records with pagination and filtering
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Users can only see their own records
   * RAG_Keywords: payroll list, pagination, filtering, access control
   * DuplicatePolicy: enhanced version
   * FunctionIdentity: hash_get_payroll_list_enhanced_001
   */
  router.get('/enhanced', 
    requireAuth, 
    requirePermission('payroll:view'),
    payrollRateLimiter,
    asyncHandler(async (req, res) => {
      try {
        const { year, month, userId, paymentStatus, page = 1, limit = 10 } = req.query;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        // Build filter based on role and query parameters
        let filter = {};
        
        // Role-based filtering
        if (userRole === 'user' || userRole === 'User') {
          filter.userId = new ObjectId(currentUserId);
        } else if (userId) {
          filter.userId = new ObjectId(userId);
        }

        // Period filtering
        if (year) filter.year = parseInt(year);
        if (month) filter.month = parseInt(month);
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        // Get payroll records with user information
        const collection = await payrollRepo.getCollection();
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const pipeline = [
          { $match: filter },
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
              year: 1,
              month: 1,
              baseSalary: 1,
              allowances: 1,
              deductions: 1,
              totalAllowances: 1,
              totalDeductions: 1,
              netSalary: 1,
              paymentStatus: 1,
              paymentDate: 1,
              createdAt: 1,
              updatedAt: 1,
              'user.name': 1,
              'user.employeeId': 1,
              'user.department': 1,
              'user.position': 1
            }
          },
          { $sort: { year: -1, month: -1, 'user.employeeId': 1 } },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ];

        const payrollRecords = await collection.aggregate(pipeline).toArray();
        
        // Get total count for pagination
        const totalCount = await collection.countDocuments(filter);

        res.json({
          success: true,
          data: payrollRecords,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        });

      } catch (error) {
        console.error('Get enhanced payroll records error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to retrieve payroll records' 
        });
      }
    })
  );

  /**
   * Enhanced POST /api/payroll - Create with validation
   * DomainMeaning: Create new payroll record with enhanced validation
   * MisleadingNames: None
   * SideEffects: Inserts payroll record into database
   * Invariants: Validates duplicate entries, requires admin permissions
   * RAG_Keywords: payroll create, validation, allowances, deductions
   * DuplicatePolicy: enhanced version
   * FunctionIdentity: hash_post_payroll_enhanced_001
   */
  router.post('/enhanced',
    requireAuth,
    requirePermission('payroll:manage'),
    payrollRateLimiter,
    preventNoSQLInjection,
    sanitizePayrollInput,
    validate.body(payrollSchemas.create),
    asyncHandler(async (req, res) => {
      try {
        const payrollData = {
          userId: new ObjectId(req.body.userId),
          year: req.body.year,
          month: req.body.month,
          baseSalary: req.body.baseSalary,
          allowances: {
            overtime: req.body.allowances?.overtime || 0,
            performance: req.body.allowances?.performance || 0,
            housing: req.body.allowances?.housing || 0,
            transport: req.body.allowances?.transport || 0,
            meals: req.body.allowances?.meals || 0,
            other: req.body.allowances?.other || 0
          },
          deductions: {
            nationalPension: req.body.deductions?.nationalPension || 0,
            healthInsurance: req.body.deductions?.healthInsurance || 0,
            employmentInsurance: req.body.deductions?.employmentInsurance || 0,
            incomeTax: req.body.deductions?.incomeTax || 0,
            localIncomeTax: req.body.deductions?.localIncomeTax || 0,
            other: req.body.deductions?.other || 0
          },
          paymentStatus: req.body.paymentStatus || 'pending',
          createdBy: new ObjectId(req.user.id)
        };

        // Check for duplicate
        const existing = await payrollRepo.findByUserAndPeriod(
          payrollData.userId,
          payrollData.year,
          payrollData.month
        );

        if (existing) {
          return res.status(409).json({
            success: false,
            error: 'Payroll record already exists for this period'
          });
        }

        const result = await payrollRepo.createPayroll(payrollData);

        res.status(201).json({
          success: true,
          message: 'Payroll record created successfully',
          data: result
        });

      } catch (error) {
        console.error('Create payroll error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create payroll record: ' + error.message
        });
      }
    })
  );

  /**
   * Enhanced PUT /api/payroll/:id - Update with validation
   * DomainMeaning: Update payroll record with recalculation
   * MisleadingNames: None
   * SideEffects: Updates database record, recalculates totals
   * Invariants: Maintains data integrity, requires admin permissions
   * RAG_Keywords: payroll update, validation, recalculation
   * DuplicatePolicy: enhanced version
   * FunctionIdentity: hash_put_payroll_enhanced_001
   */
  router.put('/enhanced/:id',
    requireAuth,
    requirePermission('payroll:manage'),
    validateObjectId,
    payrollRateLimiter,
    preventNoSQLInjection,
    sanitizePayrollInput,
    validate.body(payrollSchemas.update),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        
        const existingRecord = await payrollRepo.findById(id);
        if (!existingRecord) {
          return res.status(404).json({
            success: false,
            error: 'Payroll record not found'
          });
        }

        const updateData = {
          ...req.body,
          updatedBy: new ObjectId(req.user.id),
          updatedAt: new Date()
        };

        const result = await payrollRepo.updatePayroll(id, updateData);

        res.json({
          success: true,
          message: 'Payroll record updated successfully',
          data: result
        });

      } catch (error) {
        console.error('Update payroll error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update payroll record: ' + error.message
        });
      }
    })
  );

  /**
   * Enhanced DELETE /api/payroll/:id - Soft delete with audit trail
   * DomainMeaning: Mark payroll record as deleted with audit logging
   * MisleadingNames: None
   * SideEffects: Soft deletes record, creates audit log
   * Invariants: Requires admin permissions, maintains audit trail
   * RAG_Keywords: payroll delete, soft delete, audit trail
   * DuplicatePolicy: enhanced version
   * FunctionIdentity: hash_delete_payroll_enhanced_001
   */
  router.delete('/enhanced/:id',
    requireAuth,
    requirePermission('payroll:manage'),
    validateObjectId,
    strictRateLimiter,
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const { reason } = req.body;

        const existingRecord = await payrollRepo.findById(id);
        if (!existingRecord) {
          return res.status(404).json({
            success: false,
            error: 'Payroll record not found'
          });
        }

        // Soft delete with audit information
        const deleteData = {
          isDeleted: true,
          deletedBy: new ObjectId(req.user.id),
          deletedAt: new Date(),
          deleteReason: reason || 'No reason provided'
        };

        await payrollRepo.updatePayroll(id, deleteData);

        res.json({
          success: true,
          message: 'Payroll record deleted successfully',
          deletedRecord: {
            id: existingRecord._id,
            year: existingRecord.year,
            month: existingRecord.month,
            userId: existingRecord.userId
          }
        });

      } catch (error) {
        console.error('Delete payroll error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete payroll record: ' + error.message
        });
      }
    })
  );

  return router;
}

module.exports = createPayrollRoutes;