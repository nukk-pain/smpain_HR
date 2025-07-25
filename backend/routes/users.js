const express = require('express');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { userSchemas, createValidator } = require('../middleware/validation');

// Helper function to calculate annual leave entitlement (consistent with leave.js)
const calculateAnnualLeaveEntitlement = (hireDate) => {
  const now = new Date();
  const hire = new Date(hireDate);
  
  // Calculate years of service
  const yearsOfService = Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 365.25));
  
  if (yearsOfService === 0) {
    // For employees with less than 1 year: 1 day per completed month from hire date
    // 근로기준법: 1개월 개근 시 1일의 유급휴가
    let monthsPassed = 0;
    let checkDate = new Date(hire);
    
    // Count completed months from hire date
    while (true) {
      // Move to the same day next month
      checkDate.setMonth(checkDate.getMonth() + 1);
      
      // If this date hasn't passed yet, break
      if (checkDate > now) {
        break;
      }
      
      monthsPassed++;
    }
    
    return Math.min(monthsPassed, 11); // Maximum 11 days in first year
  } else {
    // For 1+ year employees: 15 + (years - 1), max 25 days
    return Math.min(15 + (yearsOfService - 1), 25);
  }
};

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
      // Get all users with valid EMP*** format employeeIds
      const users = await db.collection('users').find({
        employeeId: { $regex: /^EMP\d{3}$/ }
      }).toArray();
      
      if (users.length === 0) {
        return 'EMP001';
      }
      
      // Extract numbers and find the highest
      const numbers = users.map(user => {
        const match = user.employeeId.match(/^EMP(\d{3})$/);
        return match ? parseInt(match[1]) : 0;
      }).filter(num => !isNaN(num));
      
      const maxNumber = Math.max(...numbers, 0);
      const nextNumber = maxNumber + 1;
      return `EMP${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating employee ID:', error);
      // Fallback: generate random number to avoid collision
      const randomNum = Math.floor(Math.random() * 1000) + 1;
      return `EMP${randomNum.toString().padStart(3, '0')}`;
    }
  }

  // Debug endpoints - only available in development
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    // Debug endpoint to check current user permissions
    router.get('/debug/permissions', requireAuth, asyncHandler(async (req, res) => {
    try {
      let currentUser = null;
      
      // Try to find user by ObjectId first
      if (ObjectId.isValid(req.session.user.id)) {
        currentUser = await db.collection('users').findOne({ _id: new ObjectId(req.session.user.id) });
      }
      
      // If not found, try to find by username
      if (!currentUser) {
        currentUser = await db.collection('users').findOne({ username: req.session.user.username || req.session.user.id });
      }
      
      res.json({
        success: true,
        data: {
          sessionUser: req.session.user,
          dbUser: currentUser,
          hasUsersManage: (req.session.user.permissions || []).includes('users:create'),
          hasUsersView: (req.session.user.permissions || []).includes(PERMISSIONS.USERS_VIEW),
          permissions: req.session.user.permissions || []
        }
      });
    } catch (error) {
      console.error('Debug permissions error:', error);
      res.status(500).json({ error: error.message });
    }
  }));

  // Fix admin permissions endpoint (emergency fix)
  router.post('/debug/fix-admin', asyncHandler(async (req, res) => {
    const adminPermissions = [
      'leave:view', 'leave:manage', 'users:view', 'users:manage',
      'payroll:view', 'payroll:manage', 'reports:view', 'files:view',
      'files:manage', 'departments:view', 'departments:manage', 'admin:permissions'
    ];
    
    // Update all admin users in database
    await db.collection('users').updateMany(
      { role: 'admin' },
      { $set: { permissions: adminPermissions } }
    );
    
    res.json({
      success: true,
      message: 'All admin permissions fixed',
      permissions: adminPermissions
    });
  }));

  // Emergency admin login bypass
  router.post('/debug/login-admin', asyncHandler(async (req, res) => {
    const adminUser = await db.collection('users').findOne({ username: 'admin' });
    if (adminUser) {
      const adminPermissions = [
        'leave:view', 'leave:manage', 'users:view', 'users:manage',
        'payroll:view', 'payroll:manage', 'reports:view', 'files:view',
        'files:manage', 'departments:view', 'departments:manage', 'admin:permissions'
      ];
      
      // Update session with full admin permissions
      req.session.user = {
        id: adminUser._id,
        username: adminUser.username,
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminPermissions
      };
      
      res.json({
        success: true,
        message: 'Emergency admin login successful',
        user: req.session.user
      });
    } else {
      res.status(404).json({ error: 'Admin user not found' });
    }
  }));

  // Fix invalid employeeIds
  router.post('/debug/fix-employee-ids', asyncHandler(async (req, res) => {
    try {
      // Find users with invalid employeeIds
      const invalidUsers = await db.collection('users').find({
        $or: [
          { employeeId: { $regex: /NaN/ } },
          { employeeId: null },
          { employeeId: '' }
        ]
      }).toArray();

      const results = [];
      for (const user of invalidUsers) {
        const newEmployeeId = await generateEmployeeId();
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { employeeId: newEmployeeId } }
        );
        results.push({
          userId: user._id,
          username: user.username,
          oldEmployeeId: user.employeeId,
          newEmployeeId: newEmployeeId
        });
      }

      res.json({
        success: true,
        message: `Fixed ${results.length} invalid employee IDs`,
        results: results
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }));
  } // End of debug endpoints protection

  // Get all users
  router.get('/', requireAuth, requirePermission(PERMISSIONS.USERS_VIEW), asyncHandler(async (req, res) => {
    const users = await db.collection('users').find({}).toArray();
    
    const usersWithCalculatedFields = users.map(user => {
      const hireDate = user.hireDate ? new Date(user.hireDate) : null;
      const terminationDate = user.terminationDate ? new Date(user.terminationDate) : null;
      const yearsOfService = hireDate ? Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
      const annualLeave = calculateAnnualLeaveEntitlement(hireDate);
      
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
    const annualLeave = calculateAnnualLeaveEntitlement(hireDate);
    
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
  router.post('/', requireAuth, requirePermission('users:create'), asyncHandler(async (req, res) => {
    const { username, password, name, role, hireDate, department, position, accountNumber, managerId, contractType, baseSalary, incentiveFormula, birthDate, phoneNumber } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Username, password, name, and role are required' });
    }
    
    // Validate username format (support Korean characters)
    const usernamePattern = /^[a-zA-Z0-9가-힣_-]{2,30}$/;
    if (!usernamePattern.test(username)) {
      return res.status(400).json({ 
        error: 'Username can only contain letters, numbers, Korean characters, underscore, and hyphen (2-30 characters)' 
      });
    }
    
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const employeeId = await generateEmployeeId();
    
    const DEFAULT_PERMISSIONS = {
      user: ['leave:view'],
      manager: ['leave:view', 'leave:manage'],
      admin: ['leave:view', 'leave:manage', 'users:view', 'users:manage', 'payroll:view', 'payroll:manage', 'reports:view', 'files:view', 'files:manage', 'departments:view', 'departments:manage', 'admin:permissions']
    };
    
    // Calculate initial leave balance for new user
    const userHireDate = hireDate ? new Date(hireDate) : new Date();
    const initialLeaveBalance = calculateAnnualLeaveEntitlement(userHireDate);
    
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
      birthDate: birthDate || null,
      phoneNumber: phoneNumber || null,
      isActive: true,
      permissions: DEFAULT_PERMISSIONS[role] || [],
      visibleTeams: [], // Empty by default - managers need explicit permission
      leaveBalance: initialLeaveBalance, // Initialize with calculated leave balance
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    res.json({
      success: true,
      data: { id: result.insertedId, ...newUser, password: undefined }
    });
  }));

  // Update user profile (self-edit - only personal info)
  router.put('/profile/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, birthDate, phoneNumber } = req.body;
    
    // Ensure user can only update their own profile
    if (req.session.user.id !== id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    const updateData = {
      name,
      birthDate: birthDate || null,
      phoneNumber: phoneNumber || null,
      updatedAt: new Date()
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  }));

  // Update user (admin/manager function)
  router.put('/:id', requireAuth, requirePermission('users:edit'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, name, role, hireDate, department, position, accountNumber, managerId, contractType, baseSalary, incentiveFormula, isActive, birthDate, phoneNumber, visibleTeams } = req.body;
    
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
      birthDate: birthDate || null,
      phoneNumber: phoneNumber || null,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    };
    
    // Only admins can modify visibleTeams
    if (req.session.user.role === 'admin' && visibleTeams !== undefined) {
      // Validate visibleTeams structure
      if (Array.isArray(visibleTeams)) {
        updateData.visibleTeams = visibleTeams.map(team => ({
          departmentId: team.departmentId ? new ObjectId(team.departmentId) : null,
          departmentName: team.departmentName || ''
        }));
      }
    }
    
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
  router.delete('/:id', requireAuth, requirePermission('users:delete'), asyncHandler(async (req, res) => {
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

  // Activate user
  router.post('/:id/activate', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: true, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User activated successfully'
    });
  }));

  // Reset user password
  router.post('/:id/reset-password', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'Password reset successfully'
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