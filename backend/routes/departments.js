const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Departments routes
function createDepartmentRoutes(db) {
  // Using requirePermission from middleware/permissions.js

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
                    { $eq: ['$role', 'supervisor'] },
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

      // Check if department already exists (case insensitive)
      const existingDepartment = await db.collection('departments').findOne({ 
        name: { $regex: new RegExp(`^${departmentName}$`, 'i') }, 
        isActive: true 
      });

      if (existingDepartment) {
        return res.status(409).json({ 
          success: false,
          error: '이미 존재하는 부서명입니다.' 
        });
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
      
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: '이미 존재하는 부서명입니다.'
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: '부서 생성 중 오류가 발생했습니다.' 
      });
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

      // Check for duplicate department name (exclude current department)
      const existingDepartment = await db.collection('departments').findOne({ 
        _id: { $ne: new ObjectId(id) },
        name: { $regex: new RegExp(`^${newDepartmentName}$`, 'i') }, 
        isActive: true 
      });

      if (existingDepartment) {
        return res.status(409).json({ 
          success: false,
          error: '이미 존재하는 부서명입니다.' 
        });
      }

      // Update department record first
      const updateResult = await db.collection('departments').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            name: newDepartmentName, 
            description: description || '', 
            updatedAt: new Date() 
          } 
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ 
          success: false,
          error: '부서를 찾을 수 없습니다.' 
        });
      }

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
      
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: '이미 존재하는 부서명입니다.'
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: '부서 수정 중 오류가 발생했습니다.' 
      });
    }
  }));

  // Delete department
  router.delete('/:id', requireAuth, requirePermission('departments:manage'), asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // First get the department to check its name
      const department = await db.collection('departments').findOne({
        _id: new ObjectId(id),
        isActive: true
      });

      if (!department) {
        return res.status(404).json({ 
          error: 'Department not found' 
        });
      }

      // Check if department has employees using the department name
      const employeeCount = await db.collection('users').countDocuments({
        department: department.name,
        isActive: true
      });

      if (employeeCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete department with ${employeeCount} active employees. Please reassign or deactivate employees first.` 
        });
      }

      // Actually delete the department (soft delete)
      const deleteResult = await db.collection('departments').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            isActive: false, 
            deletedAt: new Date(),
            deletedBy: req.user.id
          } 
        }
      );

      if (deleteResult.matchedCount === 0) {
        return res.status(404).json({ 
          error: 'Department not found' 
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
        supervisors: employees.filter(emp => emp.role === 'supervisor').length,
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