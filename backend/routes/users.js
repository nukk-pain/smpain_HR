const express = require('express');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, requirePermission, requireAdmin } = require('../middleware/permissions');
const { successResponse, errorResponse, notFoundError, serverError } = require('../utils/responses');
const { userRepository } = require('../repositories');
const { userSchemas, validate } = require('../validation/schemas');
const { formatDateForDisplay, calculateAge } = require('../utils/dateUtils');
const { 
  createDeactivationData, 
  createReactivationData, 
  validateDeactivation, 
  validateReactivation,
  QueryFilters 
} = require('../utils/userDeactivation');

// Import shared utility function
const { calculateAnnualLeaveEntitlement } = require('../utils/leaveUtils');

const router = express.Router();

// User management routes
function createUserRoutes(db) {
  const PERMISSIONS = {
    USERS_VIEW: 'users:view',
    USERS_MANAGE: 'users:manage',
    ADMIN_PERMISSIONS: 'admin:permissions'
  };

  // Make requirePermission available to this module with role-based fallback
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
        supervisor: ['leave:view', 'leave:manage', 'users:view'],
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

  // Generate sequential employeeId based on hire date year
  async function generateEmployeeId(hireDate) {
    try {
      const year = new Date(hireDate).getFullYear();
      const yearPrefix = year.toString();
      
      // Get all users with employeeIds starting with the same year
      const users = await db.collection('users').find({
        employeeId: { $regex: new RegExp(`^${yearPrefix}\\d{4}$`) }
      }).toArray();
      
      if (users.length === 0) {
        return `${yearPrefix}0001`;
      }
      
      // Extract sequence numbers and find the highest
      const numbers = users.map(user => {
        const match = user.employeeId.match(new RegExp(`^${yearPrefix}(\\d{4})$`));
        return match ? parseInt(match[1]) : 0;
      }).filter(num => !isNaN(num));
      
      const maxNumber = Math.max(...numbers, 0);
      const nextNumber = maxNumber + 1;
      return `${yearPrefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating employee ID:', error);
      // Fallback: use current year and random number
      const currentYear = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 9999) + 1;
      return `${currentYear}${randomNum.toString().padStart(4, '0')}`;
    }
  }

  // Debug endpoints - only available in development
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    // Debug endpoint to check MongoDB connection info
    router.get('/debug/db-info', asyncHandler(async (req, res) => {
      try {
        const mongoUri = process.env.MONGODB_URI || 'Not set';
        const dbName = db.databaseName;
        const collections = await db.listCollections().toArray();
        
        res.json({
          success: true,
          data: {
            mongoUri: mongoUri.replace(/:[^:]*@/, ':****@'), // Hide password
            databaseName: dbName,
            collectionsCount: collections.length,
            environment: process.env.NODE_ENV,
            isCloudRun: !!process.env.K_SERVICE
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }));

    // Debug endpoint to check current user permissions
    router.get('/debug/permissions', requireAuth, asyncHandler(async (req, res) => {
    try {
      let currentUser = null;
      
      // Try to find user by ObjectId first
      if (ObjectId.isValid(req.user.id)) {
        currentUser = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
      }
      
      // If not found, try to find by username
      if (!currentUser) {
        currentUser = await db.collection('users').findOne({ username: req.user.username || req.user.id });
      }
      
      res.json({
        success: true,
        data: {
          sessionUser: req.user,
          dbUser: currentUser,
          hasUsersManage: (req.user.permissions || []).includes('users:create'),
          hasUsersView: (req.user.permissions || []).includes(PERMISSIONS.USERS_VIEW),
          permissions: req.user.permissions || []
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
      req.user = {
        id: adminUser._id,
        username: adminUser.username,
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminPermissions
      };
      
      res.json({
        success: true,
        message: 'Emergency admin login successful',
        user: req.user
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

  // Fix leave balances based on correct calculation
  router.post('/debug/fix-leave-balances', asyncHandler(async (req, res) => {
    try {
      const allUsers = await db.collection('users').find({}).toArray();
      const results = [];

      for (const user of allUsers) {
        const hireDate = user.hireDate ? new Date(user.hireDate) : null;
        const correctAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
        const correctYearsOfService = hireDate ? Math.floor((new Date() - new Date(hireDate)) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
        
        // Update if values are different
        const needsUpdate = user.leaveBalance === undefined || 
                           user.leaveBalance === null ||
                           isNaN(user.leaveBalance);

        if (needsUpdate || correctAnnualLeave !== (user.annualLeave || 0)) {
          // Set initial leave balance to calculated annual leave if not set properly
          const newLeaveBalance = needsUpdate ? correctAnnualLeave : user.leaveBalance;
          
          await db.collection('users').updateOne(
            { _id: user._id },
            { 
              $set: { 
                leaveBalance: newLeaveBalance,
                // Don't store annualLeave in DB - calculate dynamically
                updatedAt: new Date()
              }
            }
          );
          
          results.push({
            userId: user._id,
            username: user.username,
            name: user.name,
            hireDate: user.hireDate,
            oldLeaveBalance: user.leaveBalance,
            newLeaveBalance: newLeaveBalance,
            calculatedAnnualLeave: correctAnnualLeave,
            yearsOfService: correctYearsOfService
          });
        }
      }

      res.json({
        success: true,
        message: `Fixed ${results.length} users' leave balances`,
        results: results
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }));
  } // End of debug endpoints protection

  // Get all users with filtering support
  router.get('/', requireAuth, requirePermission(PERMISSIONS.USERS_VIEW), asyncHandler(async (req, res) => {
    const { includeInactive, status } = req.query;
    
    // Build filter query using utility function
    const filter = QueryFilters.byStatus(status, includeInactive === 'true');
    
    const users = await db.collection('users').find(filter).toArray();
    
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
      data: usersWithCalculatedFields,
      meta: {
        total: usersWithCalculatedFields.length,
        filter: {
          includeInactive: includeInactive === 'true',
          status: status || 'active_only',
          appliedFilter: filter
        }
      }
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
    const { username, password, name, role, hireDate, department, position, accountNumber, managerId, contractType, baseSalary, incentiveFormula, birthDate, phoneNumber, visibleTeams } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Username, password, name, and role are required' });
    }

    // Validate role values
    console.log('Received role value:', role, 'Type:', typeof role);
    const validRoles = ['admin', 'supervisor', 'user'];
    const normalizedRole = role?.trim().toLowerCase();
    
    if (!validRoles.includes(normalizedRole)) {
      console.log('Role validation failed. Valid roles:', validRoles);
      return res.status(400).json({ 
        error: `Invalid role '${role}'. Must be one of: ${validRoles.join(', ')}` 
      });
    }
    
    // Validate username format (support Korean characters)
    const usernamePattern = /^[a-zA-Z0-9가-힣_-]{2,30}$/;
    if (!usernamePattern.test(username)) {
      return res.status(400).json({ 
        error: 'Username can only contain letters, numbers, Korean characters, underscore, and hyphen (2-30 characters)' 
      });
    }
    
    // Check for username conflicts (case-insensitive)
    const existingUser = await db.collection('users').findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Username already exists',
        conflict: {
          field: 'username',
          value: username,
          existingUser: existingUser.username
        }
      });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    // Generate employeeId based on hire date (use today if not provided)
    const hireDateString = hireDate || new Date().toISOString().split('T')[0];
    const employeeId = await generateEmployeeId(hireDateString);
    
    const DEFAULT_PERMISSIONS = {
      user: ['leave:view'],
      supervisor: ['leave:view', 'leave:manage'],
      admin: ['leave:view', 'leave:manage', 'users:view', 'users:manage', 'payroll:view', 'payroll:manage', 'reports:view', 'files:view', 'files:manage', 'departments:view', 'departments:manage', 'admin:permissions']
    };
    
    // Calculate initial leave balance for new user
    const hireDateObj = hireDate ? new Date(hireDate) : new Date();
    const initialLeaveBalance = calculateAnnualLeaveEntitlement(hireDateObj);
    
    const newUser = {
      username,
      password: hashedPassword,
      name,
      role: normalizedRole,
      hireDate: hireDateString,
      department: department || null,
      position: position || null,
      employeeId,
      accountNumber: accountNumber || null,
      managerId: managerId ? new ObjectId(managerId) : null,
      contractType: contractType || 'fulltime',
      baseSalary: baseSalary || 0,
      incentiveFormula: incentiveFormula || null,
      birthDate: birthDate || null,
      phoneNumber: phoneNumber || null,
      isActive: true,
      permissions: DEFAULT_PERMISSIONS[normalizedRole] || [],
      visibleTeams: (req.user.role === 'admin' && visibleTeams && Array.isArray(visibleTeams)) 
        ? visibleTeams.map(team => ({
            departmentId: team.departmentId ? new ObjectId(team.departmentId) : null,
            departmentName: team.departmentName || ''
          }))
        : [], // Empty by default - only admins can set initial visibleTeams
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
    if (req.user.id !== id) {
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

  // Update user (admin function)
  router.put('/:id', requireAuth, requirePermission('users:edit'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, name, role, hireDate, department, position, accountNumber, managerId, contractType, baseSalary, incentiveFormula, isActive, birthDate, phoneNumber, visibleTeams } = req.body;
    
    // Validate role values if role is being updated
    if (role) {
      const validRoles = ['admin', 'supervisor', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        });
      }
    }
    
    const updateData = {
      username,
      name,
      role,
      hireDate: hireDate || null,
      department: department || null,
      position: position || null,
      accountNumber: accountNumber || null,
      managerId: managerId ? new ObjectId(managerId) : null,
      contractType: contractType || 'fulltime',
      baseSalary: baseSalary || 0,
      incentiveFormula: incentiveFormula || null,
      birthDate: birthDate || null,
      phoneNumber: phoneNumber || null,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    };
    
    // Only admins can modify visibleTeams
    if (req.user.role === 'admin' && visibleTeams !== undefined) {
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
    const { confirmed } = req.body;
    
    // Validate ObjectId format first
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    // Check if user exists before requiring confirmation
    const existingUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Require explicit confirmation for user deletion
    if (!confirmed) {
      return res.status(400).json({
        error: 'Deletion requires confirmation',
        requiresConfirmation: true,
        userInfo: {
          id: id,
          name: existingUser.name,
          email: existingUser.email,
          message: `This action will permanently delete user "${existingUser.name}". Please confirm.`
        }
      });
    }
    
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

  // Deactivate user
  router.put('/:id/deactivate', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Validate ObjectId format first
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    // Check if user exists
    const existingUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate deactivation using utility function
    const validation = validateDeactivation(existingUser, req.user.id || req.user.userId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Create deactivation data using utility function
    const updateData = createDeactivationData(req.user.id || req.user.userId, reason);
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return the updated user data
    const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        ...updatedUser,
        password: undefined // Remove password from response
      }
    });
  }));

  // Reactivate user
  router.put('/:id/reactivate', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate ObjectId format first
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    // Check if user exists
    const existingUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate reactivation using utility function
    const validation = validateReactivation(existingUser);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Create reactivation data using utility function
    const updateData = createReactivationData();
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return the updated user data
    const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: {
        ...updatedUser,
        password: undefined // Remove password from response
      }
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