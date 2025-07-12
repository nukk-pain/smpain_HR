const express = require('express');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// User management routes
function createUserRoutes(db) {
  const PERMISSIONS = {
    USERS_VIEW: 'users:view',
    USERS_MANAGE: 'users:manage',
    ADMIN_PERMISSIONS: 'admin:permissions'
  };

  // Make requirePermission available to this module
  const requirePermission = (permission) => {
    return (req, res, next) => {
      if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const userPermissions = req.session.user.permissions || [];
      const hasPermission = userPermissions.includes(permission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  };

  // Generate sequential employeeId
  async function generateEmployeeId() {
    try {
      const lastUser = await db.collection('users').findOne(
        { employeeId: { $exists: true, $ne: null } },
        { sort: { employeeId: -1 } }
      );
      
      if (!lastUser || !lastUser.employeeId) {
        return 'EMP001';
      }
      
      const lastNumber = parseInt(lastUser.employeeId.replace('EMP', ''));
      const nextNumber = lastNumber + 1;
      return `EMP${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating employee ID:', error);
      return 'EMP001';
    }
  }

  // Get all users
  router.get('/', requireAuth, requirePermission(PERMISSIONS.USERS_VIEW), asyncHandler(async (req, res) => {
    const users = await db.collection('users').find({}).toArray();
    
    const usersWithCalculatedFields = users.map(user => {
      const hireDate = user.hireDate ? new Date(user.hireDate) : null;
      const terminationDate = user.terminationDate ? new Date(user.terminationDate) : null;
      const yearsOfService = hireDate ? Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
      const annualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
      
      return {
        ...user,
        password: undefined,
        yearsOfService,
        annualLeave,
        hireDateFormatted: hireDate ? hireDate.toLocaleDateString() : null,
        terminationDateFormatted: terminationDate ? terminationDate.toLocaleDateString() : null
      };
    });
    
    res.json({
      success: true,
      data: usersWithCalculatedFields
    });
  }));

  // Get user by ID
  router.get('/:id', requireAuth, requirePermission(PERMISSIONS.USERS_VIEW), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const hireDate = user.hireDate ? new Date(user.hireDate) : null;
    const terminationDate = user.terminationDate ? new Date(user.terminationDate) : null;
    const yearsOfService = hireDate ? Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
    const annualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
    
    const userWithCalculatedFields = {
      ...user,
      password: undefined,
      yearsOfService,
      annualLeave,
      hireDateFormatted: hireDate ? hireDate.toLocaleDateString() : null,
      terminationDateFormatted: terminationDate ? terminationDate.toLocaleDateString() : null
    };
    
    res.json({
      success: true,
      data: userWithCalculatedFields
    });
  }));

  // Create new user
  router.post('/', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), asyncHandler(async (req, res) => {
    const { username, password, name, role, hireDate, department, position, accountNumber, managerId, contractType, baseSalary, incentiveFormula } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Username, password, name, and role are required' });
    }
    
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const employeeId = await generateEmployeeId();
    
    const DEFAULT_PERMISSIONS = {
      user: ['leave:view'],
      manager: ['leave:view', 'leave:manage', 'users:view'],
      admin: ['leave:view', 'leave:manage', 'users:view', 'users:manage', 'payroll:view', 'payroll:manage', 'reports:view', 'files:view', 'files:manage', 'departments:view', 'departments:manage', 'admin:permissions']
    };
    
    const newUser = {
      username,
      password: hashedPassword,
      name,
      role,
      hireDate: hireDate || null,
      department: department || null,
      position: position || null,
      employeeId,
      accountNumber: accountNumber || null,
      managerId: managerId ? new ObjectId(managerId) : null,
      contractType: contractType || 'regular',
      baseSalary: baseSalary || 0,
      incentiveFormula: incentiveFormula || null,
      isActive: true,
      permissions: DEFAULT_PERMISSIONS[role] || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    res.json({
      success: true,
      data: { id: result.insertedId, ...newUser, password: undefined }
    });
  }));

  // Update user
  router.put('/:id', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, name, role, hireDate, department, position, accountNumber, managerId, contractType, baseSalary, incentiveFormula, isActive } = req.body;
    
    const updateData = {
      username,
      name,
      role,
      hireDate: hireDate || null,
      department: department || null,
      position: position || null,
      accountNumber: accountNumber || null,
      managerId: managerId ? new ObjectId(managerId) : null,
      contractType: contractType || 'regular',
      baseSalary: baseSalary || 0,
      incentiveFormula: incentiveFormula || null,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
  }));

  // Delete user
  router.delete('/:id', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  }));

  // Get user permissions
  router.get('/:id/permissions', requireAuth, requirePermission(PERMISSIONS.ADMIN_PERMISSIONS), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      permissions: user.permissions || []
    });
  }));

  // Update user permissions
  router.put('/:id/permissions', requireAuth, requirePermission(PERMISSIONS.ADMIN_PERMISSIONS), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { permissions, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'Permissions updated successfully'
    });
  }));

  // Get user statistics
  router.get('/stats/overview', requireAuth, asyncHandler(async (req, res) => {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().substring(0, 7);
    
    const totalUsers = await db.collection('users').countDocuments({ role: { $ne: 'admin' } });
    const activeUsers = await db.collection('users').countDocuments({ isActive: true, role: { $ne: 'admin' } });
    
    const usersByDepartment = await db.collection('users').aggregate([
      { $match: { isActive: true, role: { $ne: 'admin' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    const byDepartment = {};
    usersByDepartment.forEach(dept => {
      byDepartment[dept._id || 'Unassigned'] = dept.count;
    });
    
    const usersByRole = await db.collection('users').aggregate([
      { $match: { isActive: true, role: { $ne: 'admin' } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).toArray();
    
    const byRole = {};
    usersByRole.forEach(role => {
      byRole[role._id] = role.count;
    });
    
    const newThisMonth = await db.collection('users').countDocuments({
      createdAt: { $gte: new Date(currentMonth + '-01') },
      role: { $ne: 'admin' }
    });
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        byDepartment,
        byRole,
        newThisMonth
      }
    });
  }));

  return router;
}

module.exports = createUserRoutes;