/*
 * AI-HEADER
 * Intent: Implement comprehensive payroll CRUD API with enhanced schema support
 * Domain Meaning: Employee payroll management with allowances and deductions
 * Misleading Names: payroll vs monthlyPayments - payroll uses new enhanced schema
 * Data Contracts: Uses PayrollRepository with allowances/deductions objects
 * PII: Contains sensitive salary data - requires Admin/HR permissions
 * Invariants: netSalary = baseSalary + totalAllowances - totalDeductions
 * RAG Keywords: payroll, salary, allowances, deductions, CRUD API, validation
 */

const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const PayrollRepository = require('../repositories/PayrollRepository');
const { payrollSchemas, validate, validateObjectId } = require('../validation/schemas');

const router = express.Router();

/**
 * Create payroll routes with enhanced PayrollRepository
 * DomainMeaning: Factory function to create payroll API routes with database dependency injection
 * MisleadingNames: None
 * SideEffects: Creates Express router with database connection
 * Invariants: Database connection must be provided
 * RAG_Keywords: express router factory, database injection
 * DuplicatePolicy: canonical - primary payroll routes factory
 * FunctionIdentity: hash_payroll_routes_enhanced_001
 */
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

      // Role-based permissions fallback
      const roleBasedPermissions = {
        user: ['payroll:view'],
        manager: ['payroll:view', 'payroll:manage'],
        supervisor: ['payroll:view', 'payroll:manage'],
        admin: ['payroll:view', 'payroll:manage', 'payroll:create', 'payroll:delete']
      };

      const rolePermissions = roleBasedPermissions[userRole.toLowerCase()] || [];
      if (rolePermissions.includes(permission)) {
        return next();
      }
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    };
  };

  /**
   * POST /api/payroll - Create new payroll record
   * DomainMeaning: Create new employee payroll entry with allowances and deductions
   * MisleadingNames: None
   * SideEffects: Inserts payroll record into database
   * Invariants: Requires Admin permissions, validates duplicate entries
   * RAG_Keywords: payroll create, allowances deductions, validation
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_post_payroll_create_001
   */
  router.post('/', requireAuth, requirePermission('payroll:manage'), 
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
            position: req.body.allowances?.position || 0,
            meal: req.body.allowances?.meal || 0,
            transportation: req.body.allowances?.transportation || 0,
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
          paymentStatus: 'pending',
          createdBy: new ObjectId(req.user.id)
        };

        const result = await payrollRepo.createPayroll(payrollData);

        res.status(201).json({
          success: true,
          message: 'Payroll record created successfully',
          data: result
        });

      } catch (error) {
        console.error('Create payroll error:', error);
        
        if (error.message.includes('already exists')) {
          return res.status(400).json({ 
            success: false,
            error: 'Payroll record already exists for this user and period' 
          });
        }
        
        res.status(500).json({ 
          success: false,
          error: 'Failed to create payroll record' 
        });
      }
    })
  );

  /**
   * GET /api/payroll - Get payroll records with pagination and filters
   * DomainMeaning: Retrieve payroll records with role-based access control
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Users can only see their own records, Admin/HR can see all
   * RAG_Keywords: payroll list, pagination, filtering, access control
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_payroll_list_001
   */
  router.get('/', requireAuth, requirePermission('payroll:view'),
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
        const skip = (page - 1) * limit;

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
        console.error('Get payroll records error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to retrieve payroll records' 
        });
      }
    })
  );

  /**
   * GET /api/payroll/:id - Get specific payroll record
   * DomainMeaning: Retrieve detailed payroll information for a specific record
   * MisleadingNames: None
   * SideEffects: None - read-only operation
   * Invariants: Users can only access their own records
   * RAG_Keywords: payroll detail, access control, user data
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_payroll_detail_001
   */
  router.get('/:id', requireAuth, requirePermission('payroll:view'), validateObjectId,
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        const payrollRecord = await payrollRepo.findById(id);
        
        if (!payrollRecord) {
          return res.status(404).json({ 
            success: false,
            error: 'Payroll record not found' 
          });
        }

        // Check permissions - users can only see their own records
        if ((userRole === 'user' || userRole === 'User') && 
            payrollRecord.userId.toString() !== currentUserId) {
          return res.status(403).json({ 
            success: false,
            error: 'Access denied' 
          });
        }

        // Get user information
        const collection = await payrollRepo.getCollection();
        const [detailRecord] = await collection.aggregate([
          { $match: { _id: new ObjectId(id) } },
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
              createdBy: 1,
              approvedBy: 1,
              'user.name': 1,
              'user.employeeId': 1,
              'user.department': 1,
              'user.position': 1
            }
          }
        ]).toArray();

        res.json({
          success: true,
          data: detailRecord
        });

      } catch (error) {
        console.error('Get payroll detail error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to retrieve payroll record' 
        });
      }
    })
  );

  /**
   * PUT /api/payroll/:id - Update payroll record
   * DomainMeaning: Modify existing payroll data with recalculation of totals
   * MisleadingNames: None
   * SideEffects: Updates payroll record, recalculates netSalary
   * Invariants: Only Admin/HR can update, maintains data integrity
   * RAG_Keywords: payroll update, calculation, admin permissions
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_put_payroll_update_001
   */
  router.put('/:id', requireAuth, requirePermission('payroll:manage'), validateObjectId,
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
          updatedAt: new Date(),
          updatedBy: new ObjectId(req.user.id)
        };

        // Update fields if provided
        if (req.body.baseSalary !== undefined) updateData.baseSalary = req.body.baseSalary;
        
        // Update allowances
        if (req.body.allowances) {
          updateData.allowances = {
            ...existingRecord.allowances,
            ...req.body.allowances
          };
        }

        // Update deductions
        if (req.body.deductions) {
          updateData.deductions = {
            ...existingRecord.deductions,
            ...req.body.deductions
          };
        }

        if (req.body.paymentStatus) updateData.paymentStatus = req.body.paymentStatus;

        // Recalculate totals
        const allowances = updateData.allowances || existingRecord.allowances;
        const deductions = updateData.deductions || existingRecord.deductions;
        
        updateData.totalAllowances = Object.values(allowances || {}).reduce((sum, val) => sum + (val || 0), 0);
        updateData.totalDeductions = Object.values(deductions || {}).reduce((sum, val) => sum + (val || 0), 0);
        updateData.netSalary = (updateData.baseSalary || existingRecord.baseSalary) + updateData.totalAllowances - updateData.totalDeductions;

        const result = await payrollRepo.update(id, updateData);

        res.json({
          success: true,
          message: 'Payroll record updated successfully',
          data: result
        });

      } catch (error) {
        console.error('Update payroll error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to update payroll record' 
        });
      }
    })
  );

  /**
   * DELETE /api/payroll/:id - Delete payroll record (soft delete)
   * DomainMeaning: Remove payroll record with audit trail preservation
   * MisleadingNames: DELETE vs soft delete - actually marks as deleted
   * SideEffects: Marks record as deleted, preserves audit trail
   * Invariants: Only Admin can delete, maintains data integrity
   * RAG_Keywords: payroll delete, soft delete, admin permissions
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_delete_payroll_001
   */
  router.delete('/:id', requireAuth, requirePermission('payroll:manage'), validateObjectId,
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

        // Soft delete - mark as deleted but preserve record
        const updateData = {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: new ObjectId(req.user.id),
          paymentStatus: 'cancelled'
        };

        await payrollRepo.update(id, updateData);

        res.json({
          success: true,
          message: 'Payroll record deleted successfully'
        });

      } catch (error) {
        console.error('Delete payroll error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to delete payroll record' 
        });
      }
    })
  );

  return router;
}

module.exports = createPayrollRoutes;