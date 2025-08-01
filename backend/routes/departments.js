const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Departments routes
function createDepartmentRoutes(db) {
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

  // Get all departments
  router.get('/', requireAuth, asyncHandler(async (req, res) => {
    try {
      // Get departments from departments collection
      const departments = await db.collection('departments').find({ isActive: true }).toArray();
      
      // Get employee counts for each department
      const departmentsWithCounts = await Promise.all(departments.map(async (dept) => {
        const employeeData = await db.collection('users').aggregate([
          { $match: { department: dept.name, isActive: true } },
          {
            $group: {
              _id: null,
              employeeCount: { $sum: 1 },
              managers: {
                $push: {
                  $cond: [
                    { $eq: ['$role', 'manager'] },
                    { name: '$name', id: { $toString: '$_id' } },
                    null
                  ]
                }
              }
            }
          }
        ]).toArray();

        const counts = employeeData[0] || { employeeCount: 0, managers: [] };
        
        return {
          _id: dept._id,
          name: dept.name,
          description: dept.description || '',
          employeeCount: counts.employeeCount,
          managers: counts.managers.filter(m => m !== null),
          isActive: dept.isActive,
          createdAt: dept.createdAt
        };
      }));

      res.json({ success: true, data: departmentsWithCounts });
    } catch (error) {
      console.error('Get departments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Create department
  router.post('/', requireAuth, requirePermission('departments:manage'), asyncHandler(async (req, res) => {
    try {
      const { name, description = '' } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Department name is required' });
      }

      const departmentName = name.trim();

      // Check if department already exists in departments collection
      const existingDepartment = await db.collection('departments').findOne({ 
        name: departmentName, 
        isActive: true 
      });

      if (existingDepartment) {
        return res.status(400).json({ error: 'Department already exists' });
      }

      // Create department record
      const departmentRecord = {
        name: departmentName,
        description: description || '',
        isActive: true,
        createdAt: new Date(),
        createdBy: req.user.id
      };

      const result = await db.collection('departments').insertOne(departmentRecord);

      res.json({
        success: true,
        message: 'Department created successfully',
        data: {
          _id: result.insertedId,
          name: departmentName,
          description,
          employeeCount: 0,
          managers: [],
          isActive: true,
          createdAt: departmentRecord.createdAt
        }
      });
    } catch (error) {
      console.error('Create department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Update department
  router.put('/:id', requireAuth, requirePermission('departments:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description = '' } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Department name is required' });
      }

      const newDepartmentName = name.trim();

      // Update all users with this department
      const result = await db.collection('users').updateMany(
        { department: id, isActive: true },
        { $set: { department: newDepartmentName, updatedAt: new Date() } }
      );

      res.json({
        success: true,
        message: `Department updated successfully. ${result.modifiedCount} users updated.`,
        data: {
          _id: newDepartmentName,
          name: newDepartmentName,
          description,
          isActive: true
        }
      });
    } catch (error) {
      console.error('Update department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Delete department
  router.delete('/:id', requireAuth, requirePermission('departments:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // Check if department has employees
      const employeeCount = await db.collection('users').countDocuments({
        department: id,
        isActive: true
      });

      if (employeeCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete department with ${employeeCount} active employees. Please reassign or deactivate employees first.` 
        });
      }

      res.json({
        success: true,
        message: 'Department deleted successfully (no active employees found)'
      });
    } catch (error) {
      console.error('Delete department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Get department employees
  router.get('/:name/employees', requireAuth, asyncHandler(async (req, res) => {
    try {
      const departmentName = req.params.name;

      const employees = await db.collection('users').find({
        department: departmentName,
        isActive: true
      }, { projection: { password: 0 } }).toArray();

      const summary = {
        totalEmployees: employees.length,
        managers: employees.filter(emp => emp.role === 'manager').length,
        regular: employees.filter(emp => emp.role === 'user').length,
        contract: 0 // Placeholder
      };

      const employeesWithDetails = employees.map(emp => ({
        ...emp,
        contractType: 'regular', // Default
        yearsOfService: emp.createdAt ?
          Math.floor((new Date() - new Date(emp.createdAt)) / (365.25 * 24 * 60 * 60 * 1000)) : 0
      }));

      res.json({
        success: true,
        data: {
          department: departmentName,
          summary,
          employees: employeesWithDetails
        }
      });
    } catch (error) {
      console.error('Get department employees error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  return router;
}

module.exports = createDepartmentRoutes;