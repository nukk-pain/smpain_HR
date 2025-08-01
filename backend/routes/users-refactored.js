// Refactored users route demonstrating new utilities
const express = require('express');
const { ObjectId } = require('mongodb');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  requireAuth, 
  requirePermission, 
  requireAdmin,
  requireOwnership,
  addPermissionInfo 
} = require('../middleware/permissions');
const { 
  successResponse, 
  errorResponse, 
  notFoundError, 
  validationError,
  serverError 
} = require('../utils/responses');
const { userRepository } = require('../repositories');
const { userSchemas, validate, validateObjectId } = require('../validation/schemas');
const { calculateAnnualLeaveEntitlement, calculateYearsOfService } = require('../utils/leaveUtils');
const { formatDateForDisplay } = require('../utils/dateUtils');

const router = express.Router();

// Add permission info to all requests
router.use(addPermissionInfo);

/**
 * GET /users - Get all users with pagination and filtering
 */
router.get('/', 
  requireAuth,
  requirePermission('user:view'),
  validate.query(userSchemas.query || {}),
  asyncHandler(async (req, res) => {
    try {
      const { page, limit, department, position, isActive, search } = req.query;
      
      // Build query filters
      const filters = {};
      if (department) filters.department = department;
      if (position) filters.position = position;
      if (typeof isActive === 'boolean') filters.isActive = isActive;
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } }
        ];
      }

      // Use repository with pagination
      const result = page 
        ? await userRepository.paginate(filters, { page, limit, sort: { createdAt: -1 } })
        : await userRepository.findAll(filters, { sort: { createdAt: -1 } });

      // Add calculated fields
      const processUser = (user) => ({
        ...user,
        password: undefined, // Remove password from response
        yearsOfService: user.hireDate ? calculateYearsOfService(user.hireDate) : 0,
        annualLeaveEntitlement: user.hireDate ? calculateAnnualLeaveEntitlement(user.hireDate) : 0,
        hireDateFormatted: user.hireDate ? formatDateForDisplay(user.hireDate) : null,
      });

      if (page) {
        result.documents = result.documents.map(processUser);
      } else {
        const processedUsers = result.map(processUser);
        return successResponse(res, processedUsers, 'Users retrieved successfully');
      }

      successResponse(res, result, 'Users retrieved successfully');
    } catch (error) {
      console.error('Get users error:', error);
      serverError(res, error, 'Failed to retrieve users');
    }
  })
);

/**
 * GET /users/:id - Get user by ID
 */
router.get('/:id',
  requireAuth,
  requirePermission('user:view'),
  validateObjectId,
  requireOwnership('id'), // Users can only view their own profile unless they have admin rights
  asyncHandler(async (req, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      
      if (!user) {
        return notFoundError(res, 'User');
      }

      // Add calculated fields
      const userData = {
        ...user,
        password: undefined,
        yearsOfService: user.hireDate ? calculateYearsOfService(user.hireDate) : 0,
        annualLeaveEntitlement: user.hireDate ? calculateAnnualLeaveEntitlement(user.hireDate) : 0,
        hireDateFormatted: user.hireDate ? formatDateForDisplay(user.hireDate) : null,
      };

      successResponse(res, userData, 'User retrieved successfully');
    } catch (error) {
      console.error('Get user error:', error);
      serverError(res, error, 'Failed to retrieve user');
    }
  })
);

/**
 * POST /users - Create new user
 */
router.post('/',
  requireAuth,
  requirePermission('user:create'),
  validate.body(userSchemas.create),
  asyncHandler(async (req, res) => {
    try {
      // Check if username already exists
      const existingUser = await userRepository.findByUsername(req.body.username);
      if (existingUser) {
        return validationError(res, [{ field: 'username', message: 'Username already exists' }]);
      }

      // Calculate initial leave balance
      const hireDate = req.body.hireDate ? new Date(req.body.hireDate) : new Date();
      const initialLeaveBalance = calculateAnnualLeaveEntitlement(hireDate);

      // Create user with repository
      const userData = {
        ...req.body,
        leaveBalance: initialLeaveBalance,
        hireDate: hireDate,
      };

      const newUser = await userRepository.createUser(userData);

      // Remove password from response
      const { password, ...userResponse } = newUser;

      successResponse(res, userResponse, 'User created successfully');
    } catch (error) {
      console.error('Create user error:', error);
      serverError(res, error, 'Failed to create user');
    }
  })
);

/**
 * PUT /users/:id - Update user
 */
router.put('/:id',
  requireAuth,
  requirePermission('user:edit'),
  validateObjectId,
  validate.body(userSchemas.update),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Check if user exists
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        return notFoundError(res, 'User');
      }

      // If username is being changed, check for conflicts
      if (req.body.username && req.body.username !== existingUser.username) {
        const usernameExists = await userRepository.findByUsername(req.body.username);
        if (usernameExists) {
          return validationError(res, [{ field: 'username', message: 'Username already exists' }]);
        }
      }

      // Update user
      const updatedUser = await userRepository.updateUser(userId, req.body);

      // Remove password from response
      const { password, ...userResponse } = updatedUser;

      successResponse(res, userResponse, 'User updated successfully');
    } catch (error) {
      console.error('Update user error:', error);
      serverError(res, error, 'Failed to update user');
    }
  })
);

/**
 * PUT /users/profile/:id - Update user profile (limited fields)
 */
router.put('/profile/:id',
  requireAuth,
  validateObjectId,
  requireOwnership('id'), // Users can only edit their own profile
  validate.body(userSchemas.profileUpdate),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.params.id;
      
      const updatedUser = await userRepository.updateUser(userId, req.body);
      
      if (!updatedUser) {
        return notFoundError(res, 'User');
      }

      // Remove password from response
      const { password, ...userResponse } = updatedUser;

      successResponse(res, userResponse, 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      serverError(res, error, 'Failed to update profile');
    }
  })
);

/**
 * DELETE /users/:id - Delete/deactivate user
 */
router.delete('/:id',
  requireAuth,
  requirePermission('user:delete'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const userId = req.params.id;
      const { permanent = false } = req.body;

      const user = await userRepository.findById(userId);
      if (!user) {
        return notFoundError(res, 'User');
      }

      if (permanent && req.user.role !== 'Admin') {
        return errorResponse(res, 403, 'Only administrators can permanently delete users');
      }

      if (permanent) {
        await userRepository.delete(userId);
        successResponse(res, null, 'User permanently deleted');
      } else {
        await userRepository.deactivateUser(userId);
        successResponse(res, null, 'User deactivated');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      serverError(res, error, 'Failed to delete user');
    }
  })
);

/**
 * POST /users/:id/activate - Reactivate user
 */
router.post('/:id/activate',
  requireAuth,
  requirePermission('user:edit'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const userId = req.params.id;
      
      const user = await userRepository.reactivateUser(userId);
      if (!user) {
        return notFoundError(res, 'User');
      }

      successResponse(res, user, 'User activated successfully');
    } catch (error) {
      console.error('Activate user error:', error);
      serverError(res, error, 'Failed to activate user');
    }
  })
);

/**
 * GET /users/:id/permissions - Get user permissions
 */
router.get('/:id/permissions',
  requireAuth,
  requirePermission('admin:permissions'),
  validateObjectId,
  asyncHandler(async (req, res) => {
    try {
      const user = await userRepository.findById(req.params.id);
      if (!user) {
        return notFoundError(res, 'User');
      }

      const { getUserPermissions } = require('../middleware/permissions');
      const effectivePermissions = await getUserPermissions(user);

      successResponse(res, {
        userId: user._id,
        username: user.username,
        role: user.role,
        explicitPermissions: user.permissions || [],
        effectivePermissions
      }, 'User permissions retrieved successfully');
    } catch (error) {
      console.error('Get user permissions error:', error);
      serverError(res, error, 'Failed to retrieve user permissions');
    }
  })
);

/**
 * PUT /users/:id/permissions - Update user permissions
 */
router.put('/:id/permissions',
  requireAuth,
  requireAdmin,
  validateObjectId,
  validate.body({
    permissions: require('joi').array().items(require('joi').string()).required()
  }),
  asyncHandler(async (req, res) => {
    try {
      const userId = req.params.id;
      const { permissions } = req.body;

      const user = await userRepository.updateUser(userId, { permissions });
      if (!user) {
        return notFoundError(res, 'User');
      }

      successResponse(res, {
        userId: user._id,
        username: user.username,
        permissions: user.permissions
      }, 'User permissions updated successfully');
    } catch (error) {
      console.error('Update user permissions error:', error);
      serverError(res, error, 'Failed to update user permissions');
    }
  })
);

/**
 * GET /users/stats/overview - Get user statistics
 */
router.get('/stats/overview',
  requireAuth,
  requirePermission('user:view'),
  asyncHandler(async (req, res) => {
    try {
      const stats = await userRepository.getUserStats();
      
      successResponse(res, stats, 'User statistics retrieved successfully');
    } catch (error) {
      console.error('Get user stats error:', error);
      serverError(res, error, 'Failed to retrieve user statistics');
    }
  })
);

/**
 * POST /users/bulk-import - Bulk import users
 */
router.post('/bulk-import',
  requireAuth,
  requirePermission('user:create'),
  validate.body(userSchemas.bulkImport),
  asyncHandler(async (req, res) => {
    try {
      const { users } = req.body;
      const results = {
        created: 0,
        errors: [],
        duplicates: []
      };

      for (let i = 0; i < users.length; i++) {
        try {
          const userData = users[i];
          
          // Check for existing username
          const existing = await userRepository.findByUsername(userData.username);
          if (existing) {
            results.duplicates.push({
              index: i,
              username: userData.username,
              error: 'Username already exists'
            });
            continue;
          }

          // Calculate leave balance
          const hireDate = userData.hireDate ? new Date(userData.hireDate) : new Date();
          userData.leaveBalance = calculateAnnualLeaveEntitlement(hireDate);

          await userRepository.createUser(userData);
          results.created++;
        } catch (error) {
          results.errors.push({
            index: i,
            username: users[i].username,
            error: error.message
          });
        }
      }

      successResponse(res, results, `Bulk import completed. Created: ${results.created}, Errors: ${results.errors.length}`);
    } catch (error) {
      console.error('Bulk import error:', error);
      serverError(res, error, 'Failed to import users');
    }
  })
);

module.exports = router;