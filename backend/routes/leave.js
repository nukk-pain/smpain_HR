const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Helper function to get user ObjectId from session userId
const getUserObjectId = async (db, userId) => {
  if (ObjectId.isValid(userId)) {
    return new ObjectId(userId);
  } else {
    // If userId is not valid ObjectId, find user by name or username
    const user = await db.collection('users').findOne({ 
      $or: [
        { name: userId },
        { username: userId }
      ]
    });
    return user ? user._id : null;
  }
};

// Helper function to calculate annual leave entitlement based on hire date
const calculateAnnualLeaveEntitlement = (hireDate) => {
  const now = new Date();
  const hire = new Date(hireDate);
  
  // Calculate years of service
  const yearsOfService = Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 365.25));
  
  if (yearsOfService === 0) {
    // For 0-year employees: 1 day per month since hire date
    const monthsWorked = Math.floor((now - hire) / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
    return Math.min(monthsWorked, 11); // Maximum 11 days in first year
  } else {
    // For 1+ year employees: 15 + (years - 1), max 25 days
    return Math.min(15 + (yearsOfService - 1), 25);
  }
};

// Helper function to get carry-over leave from previous year
const getCarryOverLeave = async (db, userId, currentYear) => {
  try {
    // Get carry-over adjustments for current year
    const carryOverAdjustments = await db.collection('leaveAdjustments').aggregate([
      {
        $match: {
          userId: userId,
          year: currentYear,
          adjustmentType: 'carry_over'
        }
      },
      {
        $group: {
          _id: null,
          totalCarryOver: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const manualCarryOver = carryOverAdjustments.length > 0 ? carryOverAdjustments[0].totalCarryOver : 0;

    // Calculate automatic carry-over from previous year's unused leave
    const previousYear = currentYear - 1;
    
    // Get previous year's total leave entitlement
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) return manualCarryOver;
    
    const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
    const hireYear = hireDate.getFullYear();
    
    // If user was hired in current year or later, no carry-over
    if (hireYear >= currentYear) return manualCarryOver;
    
    // Calculate previous year's entitlement (use date from previous year for calculation)
    const previousYearDate = new Date(previousYear, 11, 31); // Dec 31 of previous year
    const previousYearHire = new Date(hireDate);
    const yearsOfServicePrevious = Math.floor((previousYearDate - previousYearHire) / (1000 * 60 * 60 * 24 * 365.25));
    
    let previousYearEntitlement;
    if (yearsOfServicePrevious === 0) {
      const monthsWorked = Math.floor((previousYearDate - previousYearHire) / (1000 * 60 * 60 * 24 * 30.44));
      previousYearEntitlement = Math.min(monthsWorked, 11);
    } else {
      previousYearEntitlement = Math.min(15 + (yearsOfServicePrevious - 1), 25);
    }

    // Get previous year's used leave
    const previousYearUsed = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: userId,
          leaveType: 'annual',
          status: 'approved',
          startDate: { 
            $gte: new Date(`${previousYear}-01-01`), 
            $lte: new Date(`${previousYear}-12-31`) 
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUsed: { $sum: '$daysCount' }
        }
      }
    ]).toArray();

    const previousYearUsedLeave = previousYearUsed.length > 0 ? previousYearUsed[0].totalUsed : 0;
    
    // Calculate unused leave from previous year
    const unusedFromPrevious = Math.max(0, previousYearEntitlement - previousYearUsedLeave);
    
    // Apply carry-over limit (maximum 15 days can be carried over)
    const autoCarryOver = Math.min(unusedFromPrevious, 15);
    
    return manualCarryOver + autoCarryOver;
  } catch (error) {
    console.error('Error calculating carry-over leave:', error);
    return 0;
  }
};

// Helper function to safely convert to ObjectId
const toObjectId = (id) => {
  if (ObjectId.isValid(id)) {
    return new ObjectId(id);
  } else {
    throw new Error('Invalid ID format');
  }
};

// Leave management routes
function createLeaveRoutes(db) {
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
  // CRUD endpoints for leave requests
  router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const { leaveType, startDate, endDate, reason, substituteEmployee } = req.body;
    const userId = req.session.user.id;
    
    // Get user info
    const userObjectId = await getUserObjectId(db, userId);
    if (!userObjectId) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = await db.collection('users').findOne({ _id: userObjectId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Calculate days count
    const start = new Date(startDate);
    const end = new Date(endDate);
    let daysCount = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0) { 
        // Sunday - 0 days
      } else if (dayOfWeek === 6) { 
        // Saturday - 0.5 days
        daysCount += 0.5;
      } else { 
        // Monday-Friday - 1 day
        daysCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const leaveRequest = {
      userId: userObjectId,
      userName: user.name,
      userDepartment: user.department,
      leaveType,
      startDate,
      endDate,
      daysCount,
      reason,
      substituteEmployee: substituteEmployee || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('leaveRequests').insertOne(leaveRequest);
    
    res.json({
      success: true,
      data: { id: result.insertedId, ...leaveRequest }
    });
  }));

  // Get leave requests
  router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    let query = {};
    
    // Regular users can only see their own requests
    if (userRole === 'user') {
      const userObjectId = await getUserObjectId(db, userId);
      if (!userObjectId) {
        return res.status(404).json({ error: 'User not found' });
      }
      query.userId = userObjectId;
    }
    
    const leaveRequests = await db.collection('leaveRequests').find(query).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: leaveRequests
    });
  }));

  // Get pending leave requests (for managers/admins)
  router.get('/pending', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const pendingRequests = await db.collection('leaveRequests').find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: pendingRequests
    });
  }));

  // Get leave balance
  router.get('/balance', requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const currentYear = new Date().getFullYear();
    
    // Handle case where userId might be a name instead of ObjectId
    let user;
    if (ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    } else {
      // If userId is not valid ObjectId, try to find by name or username
      user = await db.collection('users').findOne({ 
        $or: [
          { name: userId },
          { username: userId }
        ]
      });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Calculate annual leave entitlement including carry-over
    const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
    const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
    const carryOverLeave = await getCarryOverLeave(db, user._id, currentYear);
    const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
    
    // Get used annual leave using the actual user ObjectId
    const usedLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: user._id,
          leaveType: 'annual',
          status: 'approved',
          startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$daysCount' }
        }
      }
    ]).toArray();
    
    const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
    
    // Get pending annual leave using the actual user ObjectId
    const pendingLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: user._id,
          leaveType: 'annual',
          status: 'pending',
          startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$daysCount' }
        }
      }
    ]).toArray();
    
    const pendingAnnualLeave = pendingLeave.length > 0 ? pendingLeave[0].totalDays : 0;
    
    const leaveBalance = {
      userId: user._id,
      year: currentYear,
      baseAnnualLeave,
      carryOverLeave,
      totalAnnualLeave,
      usedAnnualLeave,
      pendingAnnualLeave,
      remainingAnnualLeave: totalAnnualLeave - usedAnnualLeave,
      breakdown: {
        annual: { 
          base: baseAnnualLeave,
          carryOver: carryOverLeave,
          total: totalAnnualLeave, 
          used: usedAnnualLeave, 
          remaining: totalAnnualLeave - usedAnnualLeave 
        },
        sick: { total: 12, used: 0, remaining: 12 },
        personal: { total: 3, used: 0, remaining: 3 },
        family: { total: 0, used: 0, remaining: 0 }
      }
    };
    
    res.json({
      success: true,
      data: leaveBalance
    });
  }));

  // Calendar endpoints
  router.get('/calendar/:month', requireAuth, asyncHandler(async (req, res) => {
    const { month } = req.params;
    const userId = req.session.user.id;
    
    const userObjectId = await getUserObjectId(db, userId);
    if (!userObjectId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const leaveRequests = await db.collection('leaveRequests').find({
      userId: userObjectId,
      $or: [
        { startDate: { $regex: `^${month}` } },
        { endDate: { $regex: `^${month}` } },
        {
          $and: [
            { startDate: { $lt: `${month}-32` } },
            { endDate: { $gt: `${month}-01` } }
          ]
        }
      ]
    }).toArray();
    
    const user = await db.collection('users').findOne({ _id: userObjectId });
    
    const calendarEvents = leaveRequests.map(request => ({
      id: request._id,
      userId: request.userId,
      userName: request.userName || user?.name || '알 수 없음',
      userDepartment: request.userDepartment || user?.department || '부서 없음',
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      daysCount: request.daysCount,
      status: request.status,
      reason: request.reason
    }));
    
    res.json({
      success: true,
      data: calendarEvents
    });
  }));

  router.get('/team-calendar/:month', requireAuth, asyncHandler(async (req, res) => {
    const { month } = req.params;
    const { department } = req.query;
    const userRole = req.session.user.role;
    
    let matchQuery = {
      $or: [
        { startDate: { $regex: `^${month}` } },
        { endDate: { $regex: `^${month}` } },
        {
          $and: [
            { startDate: { $lt: `${month}-32` } },
            { endDate: { $gt: `${month}-01` } }
          ]
        }
      ]
    };
    
    if (department && department !== 'all') {
      matchQuery.userDepartment = department;
    }
    
    if (userRole !== 'admin') {
      matchQuery.status = 'approved';
    }
    
    const leaveRequests = await db.collection('leaveRequests').find(matchQuery).toArray();
    
    const userIds = [...new Set(leaveRequests.map(req => req.userId))];
    const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user;
      return map;
    }, {});
    
    const calendarEvents = leaveRequests.map(request => {
      const user = userMap[request.userId?.toString()];
      return {
        id: request._id,
        userId: request.userId,
        userName: request.userName || user?.name || '알 수 없음',
        userDepartment: request.userDepartment || user?.department || '부서 없음',
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        daysCount: request.daysCount,
        status: request.status,
        reason: request.reason
      };
    });
    
    res.json({
      success: true,
      data: calendarEvents
    });
  }));

  // Team status endpoints
  router.get('/team-status', requireAuth, asyncHandler(async (req, res) => {
    const { department, year = new Date().getFullYear() } = req.query;
    const userRole = req.session.user.role;
    
    let userQuery = { isActive: true };
    
    if (userRole === 'manager') {
      const currentUser = await db.collection('users').findOne({ _id: new ObjectId(req.session.user.id) });
      if (currentUser && currentUser.department) {
        userQuery.department = currentUser.department;
      }
    }
    
    if (department && department !== 'all') {
      userQuery.department = department;
    }
    
    userQuery.role = { $ne: 'admin' };
    
    const teamMembers = await db.collection('users').find(userQuery).toArray();
    
    const membersWithLeaveData = await Promise.all(
      teamMembers.map(async (member) => {
        const userId = member._id;
        
        const hireDate = member.hireDate ? new Date(member.hireDate) : new Date(member.createdAt);
        const totalAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
        
        const usedLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'approved',
              startDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$daysCount' }
            }
          }
        ]).toArray();
        
        const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
        
        const pendingLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'pending',
              startDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$daysCount' }
            }
          }
        ]).toArray();
        
        const pendingAnnualLeave = pendingLeave.length > 0 ? pendingLeave[0].totalDays : 0;
        
        const recentLeaves = await db.collection('leaveRequests').find({
          userId: userId,
          startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
        }).sort({ createdAt: -1 }).limit(5).toArray();
        
        const today = new Date().toISOString().split('T')[0];
        const upcomingLeaves = await db.collection('leaveRequests').find({
          userId: userId,
          status: 'approved',
          startDate: { $gte: today }
        }).sort({ startDate: 1 }).limit(5).toArray();
        
        return {
          _id: member._id,
          name: member.name,
          employeeId: member.employeeId,
          position: member.position,
          department: member.department,
          leaveBalance: {
            totalAnnualLeave,
            usedAnnualLeave,
            remainingAnnualLeave: totalAnnualLeave - usedAnnualLeave,
            pendingAnnualLeave
          },
          recentLeaves: recentLeaves.map(leave => ({
            id: leave._id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            daysCount: leave.daysCount,
            status: leave.status,
            reason: leave.reason
          })),
          upcomingLeaves: upcomingLeaves.map(leave => ({
            id: leave._id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            daysCount: leave.daysCount,
            status: leave.status,
            reason: leave.reason
          }))
        };
      })
    );
    
    const departments = [...new Set(teamMembers.map(member => member.department))];
    
    res.json({
      success: true,
      data: {
        members: membersWithLeaveData,
        departments
      }
    });
  }));

  // Get specific leave request
  router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    let query = { _id: toObjectId(id) };
    
    // Regular users can only see their own requests
    if (userRole === 'user') {
      const userObjectId = await getUserObjectId(db, userId);
      if (!userObjectId) {
        return res.status(404).json({ error: 'User not found' });
      }
      query.userId = userObjectId;
    }
    
    const leaveRequest = await db.collection('leaveRequests').findOne(query);
    
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    res.json({
      success: true,
      data: leaveRequest
    });
  }));

  // Update leave request
  router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { leaveType, startDate, endDate, reason, substituteEmployee } = req.body;
    const userId = req.session.user.id;
    
    const userObjectId = await getUserObjectId(db, userId);
    if (!userObjectId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const leaveRequest = await db.collection('leaveRequests').findOne({ 
      _id: toObjectId(id),
      userId: userObjectId,
      status: 'pending'
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found or cannot be modified' });
    }
    
    // Calculate days count
    const start = new Date(startDate);
    const end = new Date(endDate);
    let daysCount = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0) { 
        // Sunday - 0 days
      } else if (dayOfWeek === 6) { 
        // Saturday - 0.5 days
        daysCount += 0.5;
      } else { 
        // Monday-Friday - 1 day
        daysCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const updateData = {
      leaveType,
      startDate,
      endDate,
      daysCount,
      reason,
      substituteEmployee: substituteEmployee || '',
      updatedAt: new Date()
    };
    
    await db.collection('leaveRequests').updateOne(
      { _id: toObjectId(id) },
      { $set: updateData }
    );
    
    res.json({
      success: true,
      message: 'Leave request updated successfully'
    });
  }));

  // Delete leave request
  router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    
    const userObjectId = await getUserObjectId(db, userId);
    if (!userObjectId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const result = await db.collection('leaveRequests').deleteOne({ 
      _id: toObjectId(id),
      userId: userObjectId,
      status: 'pending'
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Leave request not found or cannot be deleted' });
    }
    
    res.json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  }));

  // Approve/reject leave request
  router.post('/:id/approve', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, comment } = req.body;
    const approverId = req.session.user.id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const approver = await db.collection('users').findOne({ _id: new ObjectId(approverId) });
    
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: new ObjectId(approverId),
      approvedByName: approver.name,
      approvedAt: new Date(),
      approvalComment: comment || '',
      updatedAt: new Date()
    };
    
    const result = await db.collection('leaveRequests').updateOne(
      { _id: toObjectId(id), status: 'pending' },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Leave request not found or already processed' });
    }
    
    res.json({
      success: true,
      message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });
  }));

  // Get pending leave requests (for managers/admins)
  router.get('/pending', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const pendingRequests = await db.collection('leaveRequests').find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: pendingRequests
    });
  }));

  // Calendar endpoints
  router.get('/calendar/:month', requireAuth, asyncHandler(async (req, res) => {
    const { month } = req.params;
    const userId = req.session.user.id;
    
    const userObjectId = await getUserObjectId(db, userId);
    if (!userObjectId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const leaveRequests = await db.collection('leaveRequests').find({
      userId: userObjectId,
      $or: [
        { startDate: { $regex: `^${month}` } },
        { endDate: { $regex: `^${month}` } },
        {
          $and: [
            { startDate: { $lt: `${month}-32` } },
            { endDate: { $gt: `${month}-01` } }
          ]
        }
      ]
    }).toArray();
    
    const user = await db.collection('users').findOne({ _id: userObjectId });
    
    const calendarEvents = leaveRequests.map(request => ({
      id: request._id,
      userId: request.userId,
      userName: request.userName || user?.name || '알 수 없음',
      userDepartment: request.userDepartment || user?.department || '부서 없음',
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      daysCount: request.daysCount,
      status: request.status,
      reason: request.reason
    }));
    
    res.json({
      success: true,
      data: calendarEvents
    });
  }));

  router.get('/team-calendar/:month', requireAuth, asyncHandler(async (req, res) => {
    const { month } = req.params;
    const { department } = req.query;
    const userRole = req.session.user.role;
    
    let matchQuery = {
      $or: [
        { startDate: { $regex: `^${month}` } },
        { endDate: { $regex: `^${month}` } },
        {
          $and: [
            { startDate: { $lt: `${month}-32` } },
            { endDate: { $gt: `${month}-01` } }
          ]
        }
      ]
    };
    
    if (department && department !== 'all') {
      matchQuery.userDepartment = department;
    }
    
    if (userRole !== 'admin') {
      matchQuery.status = 'approved';
    }
    
    const leaveRequests = await db.collection('leaveRequests').find(matchQuery).toArray();
    
    const userIds = [...new Set(leaveRequests.map(req => req.userId))];
    const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user;
      return map;
    }, {});
    
    const calendarEvents = leaveRequests.map(request => {
      const user = userMap[request.userId?.toString()];
      return {
        id: request._id,
        userId: request.userId,
        userName: request.userName || user?.name || '알 수 없음',
        userDepartment: request.userDepartment || user?.department || '부서 없음',
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        daysCount: request.daysCount,
        status: request.status,
        reason: request.reason
      };
    });
    
    res.json({
      success: true,
      data: calendarEvents
    });
  }));

  // Team status endpoints
  router.get('/team-status', requireAuth, asyncHandler(async (req, res) => {
    const { department, year = new Date().getFullYear() } = req.query;
    const userRole = req.session.user.role;
    
    let userQuery = { isActive: true };
    
    if (userRole === 'manager') {
      const currentUser = await db.collection('users').findOne({ _id: new ObjectId(req.session.user.id) });
      if (currentUser && currentUser.department) {
        userQuery.department = currentUser.department;
      }
    }
    
    if (department && department !== 'all') {
      userQuery.department = department;
    }
    
    userQuery.role = { $ne: 'admin' };
    
    const teamMembers = await db.collection('users').find(userQuery).toArray();
    
    const membersWithLeaveData = await Promise.all(
      teamMembers.map(async (member) => {
        const userId = member._id;
        
        const hireDate = member.hireDate ? new Date(member.hireDate) : new Date(member.createdAt);
        const totalAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
        
        const usedLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'approved',
              startDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$totalDays' }
            }
          }
        ]).toArray();
        
        const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
        
        const pendingLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'pending',
              startDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$totalDays' }
            }
          }
        ]).toArray();
        
        const pendingAnnualLeave = pendingLeave.length > 0 ? pendingLeave[0].totalDays : 0;
        
        const recentLeaves = await db.collection('leaveRequests').find({
          userId: userId,
          startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
        }).sort({ createdAt: -1 }).limit(5).toArray();
        
        const today = new Date().toISOString().split('T')[0];
        const upcomingLeaves = await db.collection('leaveRequests').find({
          userId: userId,
          status: 'approved',
          startDate: { $gte: today }
        }).sort({ startDate: 1 }).limit(5).toArray();
        
        return {
          _id: member._id,
          name: member.name,
          employeeId: member.employeeId,
          position: member.position,
          department: member.department,
          leaveBalance: {
            totalAnnualLeave,
            usedAnnualLeave,
            remainingAnnualLeave: totalAnnualLeave - usedAnnualLeave,
            pendingAnnualLeave
          },
          recentLeaves: recentLeaves.map(leave => ({
            id: leave._id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            daysCount: leave.daysCount,
            status: leave.status,
            reason: leave.reason
          })),
          upcomingLeaves: upcomingLeaves.map(leave => ({
            id: leave._id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            daysCount: leave.daysCount,
            status: leave.status,
            reason: leave.reason
          }))
        };
      })
    );
    
    const departments = [...new Set(teamMembers.map(member => member.department))];
    
    res.json({
      success: true,
      data: {
        members: membersWithLeaveData,
        departments
      }
    });
  }));

  // Get pending leave requests for managers/admins
  router.get('/pending', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    try {
      const userRole = req.session.user.role;
      const userDepartment = req.session.user.department;
      
      let matchCondition = { status: 'pending' };
      
      // Managers can only see their department
      if (userRole === 'manager') {
        const departmentUserIds = await db.collection('users').find({
          department: userDepartment
        }).project({ _id: 1 }).toArray();
        
        const userIds = departmentUserIds.map(user => user._id);
        matchCondition.userId = { $in: userIds };
      }
      
      const pendingRequests = await db.collection('leaveRequests').aggregate([
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
          $project: {
            id: '$_id',
            userId: '$userId',
            userName: { $arrayElemAt: ['$user.name', 0] },
            userDepartment: { $arrayElemAt: ['$user.department', 0] },
            leaveType: '$leaveType',
            startDate: '$startDate',
            endDate: '$endDate',
            totalDays: '$totalDays',
            reason: '$reason',
            substituteEmployee: '$substituteEmployee',
            submittedAt: '$submittedAt'
          }
        },
        { $sort: { submittedAt: 1 } }
      ]).toArray();
      
      res.json({
        success: true,
        data: pendingRequests
      });
      
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  // Year-end carry-over processing API
  router.post('/carry-over/:year', requireAuth, asyncHandler(async (req, res) => {
    const { year } = req.params;
    const targetYear = parseInt(year);
    const nextYear = targetYear + 1;
    
    // Only admin can process carry-over
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    try {
      // Get all users except admin users
      const users = await db.collection('users').find({ 
        role: { $ne: 'admin' },
        isActive: { $ne: false }
      }).toArray();

      const carryOverResults = [];

      for (const user of users) {
        try {
          const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
          const hireYear = hireDate.getFullYear();
          
          // Skip if user was hired after the target year
          if (hireYear > targetYear) {
            continue;
          }

          // Calculate target year's entitlement
          const targetYearDate = new Date(targetYear, 11, 31);
          const yearsOfService = Math.floor((targetYearDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
          
          let targetYearEntitlement;
          if (yearsOfService === 0) {
            const monthsWorked = Math.floor((targetYearDate - hireDate) / (1000 * 60 * 60 * 24 * 30.44));
            targetYearEntitlement = Math.min(monthsWorked, 11);
          } else {
            targetYearEntitlement = Math.min(15 + (yearsOfService - 1), 25);
          }

          // Get target year's used leave
          const usedLeave = await db.collection('leaveRequests').aggregate([
            {
              $match: {
                userId: user._id,
                leaveType: 'annual',
                status: 'approved',
                startDate: { 
                  $gte: new Date(`${targetYear}-01-01`), 
                  $lte: new Date(`${targetYear}-12-31`) 
                }
              }
            },
            {
              $group: {
                _id: null,
                totalUsed: { $sum: '$daysCount' }
              }
            }
          ]).toArray();

          const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalUsed : 0;
          
          // Calculate unused leave
          const unusedLeave = Math.max(0, targetYearEntitlement - usedAnnualLeave);
          
          // Apply carry-over limit (maximum 15 days)
          const carryOverAmount = Math.min(unusedLeave, 15);

          if (carryOverAmount > 0) {
            // Check if carry-over already exists for this user and year
            const existingCarryOver = await db.collection('leaveAdjustments').findOne({
              userId: user._id,
              year: nextYear,
              adjustmentType: 'carry_over'
            });

            if (!existingCarryOver) {
              // Create carry-over adjustment record
              await db.collection('leaveAdjustments').insertOne({
                userId: user._id,
                year: nextYear,
                adjustmentType: 'carry_over',
                amount: carryOverAmount,
                reason: `Automatic carry-over from ${targetYear}`,
                createdAt: new Date(),
                createdBy: req.session.user.id
              });

              carryOverResults.push({
                userId: user._id,
                userName: user.name,
                targetYearEntitlement,
                usedAnnualLeave,
                unusedLeave,
                carryOverAmount,
                status: 'processed'
              });
            } else {
              carryOverResults.push({
                userId: user._id,
                userName: user.name,
                targetYearEntitlement,
                usedAnnualLeave,
                unusedLeave,
                carryOverAmount: existingCarryOver.amount,
                status: 'already_exists'
              });
            }
          } else {
            carryOverResults.push({
              userId: user._id,
              userName: user.name,
              targetYearEntitlement,
              usedAnnualLeave,
              unusedLeave,
              carryOverAmount: 0,
              status: 'no_carry_over'
            });
          }
        } catch (userError) {
          console.error(`Error processing carry-over for user ${user._id}:`, userError);
          carryOverResults.push({
            userId: user._id,
            userName: user.name,
            status: 'error',
            error: userError.message
          });
        }
      }

      res.json({
        success: true,
        message: `Carry-over processing completed for year ${targetYear}`,
        data: {
          targetYear,
          nextYear,
          totalUsers: users.length,
          processed: carryOverResults.filter(r => r.status === 'processed').length,
          alreadyExists: carryOverResults.filter(r => r.status === 'already_exists').length,
          noCarryOver: carryOverResults.filter(r => r.status === 'no_carry_over').length,
          errors: carryOverResults.filter(r => r.status === 'error').length,
          results: carryOverResults
        }
      });

    } catch (error) {
      console.error('Carry-over processing error:', error);
      res.status(500).json({ error: 'Failed to process carry-over' });
    }
  }));

  return router;
}

module.exports = createLeaveRoutes;