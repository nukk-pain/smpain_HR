// Refactored departments route using new utilities
const express = require('express');
const { ObjectId } = require('mongodb');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  requireAuth, 
  requirePermission, 
  requireAdmin,
  addPermissionInfo 
} = require('../middleware/permissions');
const { 
  successResponse, 
  errorResponse, 
  notFoundError, 
  validationError,
  serverError 
} = require('../utils/responses');
const { getDatabase } = require('../utils/database');
const { departmentSchemas, validate, validateObjectId } = require('../validation/schemas');

const router = express.Router();

// Add permission info to all requests
router.use(addPermissionInfo);

// Department Repository class
class DepartmentRepository {
  constructor() {
    this.collectionName = 'departments';
  }

  async getCollection() {
    const db = await getDatabase();
    return db.collection(this.collectionName);
  }

  async findAll(query = {}, options = {}) {
    const collection = await this.getCollection();
    let cursor = collection.find(query);

    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.limit) cursor = cursor.limit(options.limit);
    if (options.skip) cursor = cursor.skip(options.skip);

    return await cursor.toArray();
  }

  async findById(id) {
    const collection = await this.getCollection();
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  async findByName(name) {
    const collection = await this.getCollection();
    return await collection.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  }

  async create(data) {
    const collection = await this.getCollection();
    const document = {
      ...data,
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(document);
    return await this.findById(result.insertedId);
  }

  async update(id, data) {
    const collection = await this.getCollection();
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error('Department not found');
    }

    return await this.findById(id);
  }

  async delete(id) {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      throw new Error('Department not found');
    }

    return { deletedCount: result.deletedCount };
  }

  async getEmployeesByDepartment(departmentName) {
    const db = await getDatabase();
    return await db.collection('users').find({ 
      department: departmentName,
      isActive: { $ne: false }
    }).toArray();
  }

  async checkDepartmentInUse(departmentName) {
    const db = await getDatabase();
    const employeeCount = await db.collection('users').countDocuments({ 
      department: departmentName,
      isActive: { $ne: false }
    });
    return employeeCount > 0;
  }
}

const departmentRepository = new DepartmentRepository();

/**
 * GET /departments - Get all departments
 */
router.get('/',
  requireAuth,
  requirePermission('department:view'),
  asyncHandler(async (req, res) => {
    try {
      const departments = await departmentRepository.findAll(
        { isActive: { $ne: false } },
        { sort: { name: 1 } }
      );

      // Add employee count to each department
      const departmentsWithStats = await Promise.all(
        departments.map(async (dept) => {
          const employees = await departmentRepository.getEmployeesByDepartment(dept.name);
          return {
            ...dept,
            employeeCount: employees.length,
            employees: employees.map(emp => ({
              _id: emp._id,
              name: emp.name,
              position: emp.position,
              employeeId: emp.employeeId
            }))
          };
        })
      );

      successResponse(res, departmentsWithStats, 'Departments retrieved successfully');
    } catch (error) {
      console.error('Get departments error:', error);
      serverError(res, error, 'Failed to retrieve departments');
    }
  })
);

/**
 * GET /departments/:id - Get department by ID
 */
router.get('/:id',
  requireAuth,
  requirePermission('department:view'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const department = await departmentRepository.findById(req.params.id);
      
      if (!department) {
        return notFoundError(res, 'Department');
      }

      // Add employee details
      const employees = await departmentRepository.getEmployeesByDepartment(department.name);
      const departmentWithEmployees = {
        ...department,
        employees: employees.map(emp => ({
          _id: emp._id,
          name: emp.name,
          position: emp.position,
          employeeId: emp.employeeId,
          hireDate: emp.hireDate
        }))
      };

      successResponse(res, departmentWithEmployees, 'Department retrieved successfully');
    } catch (error) {
      console.error('Get department error:', error);
      serverError(res, error, 'Failed to retrieve department');
    }
  })
);

/**
 * POST /departments - Create new department
 */
router.post('/',
  requireAuth,
  requirePermission('department:create'),
  validate.body(departmentSchemas.create),
  asyncHandler(async (req, res) => {
    try {
      // Check if department name already exists
      const existingDepartment = await departmentRepository.findByName(req.body.name);
      if (existingDepartment) {
        return validationError(res, [{ 
          field: 'name', 
          message: 'Department name already exists' 
        }]);
      }

      // If managerId is provided, verify the manager exists
      if (req.body.managerId) {
        const db = await getDatabase();
        const manager = await db.collection('users').findOne({ 
          _id: new ObjectId(req.body.managerId) 
        });
        
        if (!manager) {
          return validationError(res, [{ 
            field: 'managerId', 
            message: 'Manager not found' 
          }]);
        }

        if (manager.role !== 'Manager' && manager.role !== 'Admin') {
          return validationError(res, [{ 
            field: 'managerId', 
            message: 'User must have Manager or Admin role' 
          }]);
        }
      }

      const newDepartment = await departmentRepository.create(req.body);
      successResponse(res, newDepartment, 'Department created successfully');
    } catch (error) {
      console.error('Create department error:', error);
      serverError(res, error, 'Failed to create department');
    }
  })
);

/**
 * PUT /departments/:id - Update department
 */
router.put('/:id',
  requireAuth,
  requirePermission('department:edit'),
  validateObjectId,
  validate.body(departmentSchemas.update),
  asyncHandler(async (req, res) => {
    try {
      const departmentId = req.params.id;
      const existingDepartment = await departmentRepository.findById(departmentId);
      
      if (!existingDepartment) {
        return notFoundError(res, 'Department');
      }

      // If name is being changed, check for conflicts
      if (req.body.name && req.body.name !== existingDepartment.name) {
        const nameConflict = await departmentRepository.findByName(req.body.name);
        if (nameConflict) {
          return validationError(res, [{ 
            field: 'name', 
            message: 'Department name already exists' 
          }]);
        }

        // Update all users with the old department name
        const db = await getDatabase();
        await db.collection('users').updateMany(
          { department: existingDepartment.name },
          { $set: { department: req.body.name, updatedAt: new Date() } }
        );
      }

      // Verify manager if provided
      if (req.body.managerId) {
        const db = await getDatabase();
        const manager = await db.collection('users').findOne({ 
          _id: new ObjectId(req.body.managerId) 
        });
        
        if (!manager) {
          return validationError(res, [{ 
            field: 'managerId', 
            message: 'Manager not found' 
          }]);
        }

        if (manager.role !== 'Manager' && manager.role !== 'Admin') {
          return validationError(res, [{ 
            field: 'managerId', 
            message: 'User must have Manager or Admin role' 
          }]);
        }
      }

      const updatedDepartment = await departmentRepository.update(departmentId, req.body);
      successResponse(res, updatedDepartment, 'Department updated successfully');
    } catch (error) {
      console.error('Update department error:', error);
      serverError(res, error, 'Failed to update department');
    }
  })
);

/**
 * DELETE /departments/:id - Delete department
 */
router.delete('/:id',
  requireAuth,
  requirePermission('department:delete'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const departmentId = req.params.id;
      const department = await departmentRepository.findById(departmentId);
      
      if (!department) {
        return notFoundError(res, 'Department');
      }

      // Check if department has active employees
      const hasEmployees = await departmentRepository.checkDepartmentInUse(department.name);
      if (hasEmployees) {
        return errorResponse(res, 400, 
          'Cannot delete department with active employees. Please reassign employees first.'
        );
      }

      await departmentRepository.delete(departmentId);
      successResponse(res, null, 'Department deleted successfully');
    } catch (error) {
      console.error('Delete department error:', error);
      serverError(res, error, 'Failed to delete department');
    }
  })
);

/**
 * GET /departments/:name/employees - Get employees by department name
 */
router.get('/:name/employees',
  requireAuth,
  requirePermission('department:view'),
  asyncHandler(async (req, res) => {
    try {
      const departmentName = decodeURIComponent(req.params.name);
      const employees = await departmentRepository.getEmployeesByDepartment(departmentName);

      const employeeDetails = employees.map(emp => ({
        _id: emp._id,
        name: emp.name,
        username: emp.username,
        position: emp.position,
        employeeId: emp.employeeId,
        hireDate: emp.hireDate,
        isActive: emp.isActive,
        leaveBalance: emp.leaveBalance
      }));

      successResponse(res, employeeDetails, `Employees in ${departmentName} retrieved successfully`);
    } catch (error) {
      console.error('Get department employees error:', error);
      serverError(res, error, 'Failed to retrieve department employees');
    }
  })
);

/**
 * POST /departments/:id/transfer-employees - Transfer employees to another department
 */
router.post('/:id/transfer-employees',
  requireAuth,
  requirePermission('department:edit'),
  validateObjectId,
  validate.body({
    targetDepartment: require('joi').string().required(),
    employeeIds: require('joi').array().items(
      require('joi').string().pattern(/^[0-9a-fA-F]{24}$/)
    ).optional()
  }),
  asyncHandler(async (req, res) => {
    try {
      const sourceDepartmentId = req.params.id;
      const { targetDepartment, employeeIds } = req.body;

      const sourceDepartment = await departmentRepository.findById(sourceDepartmentId);
      if (!sourceDepartment) {
        return notFoundError(res, 'Source department');
      }

      // Verify target department exists
      const targetDept = await departmentRepository.findByName(targetDepartment);
      if (!targetDept) {
        return validationError(res, [{ 
          field: 'targetDepartment', 
          message: 'Target department not found' 
        }]);
      }

      const db = await getDatabase();
      let query = { department: sourceDepartment.name };

      // If specific employees are provided, transfer only those
      if (employeeIds && employeeIds.length > 0) {
        query._id = { $in: employeeIds.map(id => new ObjectId(id)) };
      }

      const result = await db.collection('users').updateMany(
        query,
        { 
          $set: { 
            department: targetDepartment,
            updatedAt: new Date()
          }
        }
      );

      successResponse(res, {
        transferredCount: result.modifiedCount,
        sourceDepartment: sourceDepartment.name,
        targetDepartment
      }, `${result.modifiedCount} employees transferred successfully`);
    } catch (error) {
      console.error('Transfer employees error:', error);
      serverError(res, error, 'Failed to transfer employees');
    }
  })
);

/**
 * GET /departments/:id/stats - Get department statistics
 */
router.get('/:id/stats',
  requireAuth,
  requirePermission('department:view'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const department = await departmentRepository.findById(req.params.id);
      if (!department) {
        return notFoundError(res, 'Department');
      }

      const db = await getDatabase();
      
      // Get employee statistics
      const employees = await db.collection('users').find({
        department: department.name,
        isActive: { $ne: false }
      }).toArray();

      // Calculate statistics
      const stats = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter(emp => emp.isActive !== false).length,
        roleDistribution: employees.reduce((acc, emp) => {
          acc[emp.role] = (acc[emp.role] || 0) + 1;
          return acc;
        }, {}),
        averageLeaveBalance: employees.length > 0 
          ? employees.reduce((sum, emp) => sum + (emp.leaveBalance || 0), 0) / employees.length
          : 0,
        totalSalaryBudget: employees.reduce((sum, emp) => sum + (emp.baseSalary || 0), 0)
      };

      // Get recent leave requests for this department
      const recentLeaveRequests = await db.collection('leaveRequests').find({
        userId: { $in: employees.map(emp => emp._id) },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).sort({ createdAt: -1 }).limit(10).toArray();

      stats.recentLeaveRequests = recentLeaveRequests.length;

      successResponse(res, {
        department: department.name,
        ...stats
      }, 'Department statistics retrieved successfully');
    } catch (error) {
      console.error('Get department stats error:', error);
      serverError(res, error, 'Failed to retrieve department statistics');
    }
  })
);

module.exports = router;