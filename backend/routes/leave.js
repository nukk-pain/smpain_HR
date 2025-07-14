const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

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
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
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
      userId: new ObjectId(userId),
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
      query.userId = new ObjectId(userId);
    }
    
    const leaveRequests = await db.collection('leaveRequests').find(query).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: leaveRequests
    });
  }));

  // Get specific leave request
  router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    
    let query = { _id: new ObjectId(id) };
    
    // Regular users can only see their own requests
    if (userRole === 'user') {
      query.userId = new ObjectId(userId);
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
    
    const leaveRequest = await db.collection('leaveRequests').findOne({ 
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
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
      { _id: new ObjectId(id) },
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
    
    const result = await db.collection('leaveRequests').deleteOne({ 
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
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
      { _id: new ObjectId(id), status: 'pending' },
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

  // Get leave balance
  router.get('/balance', requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const currentYear = new Date().getFullYear();
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Calculate annual leave entitlement
    const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
    const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
    const totalAnnualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
    
    // Get used annual leave
    const usedLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          leaveType: 'annual',
          status: 'approved',
          startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
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
    
    // Get pending annual leave
    const pendingLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          leaveType: 'annual',
          status: 'pending',
          startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
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
    
    const leaveBalance = {
      userId,
      year: currentYear,
      totalAnnualLeave,
      usedAnnualLeave,
      pendingAnnualLeave,
      remainingAnnualLeave: totalAnnualLeave - usedAnnualLeave,
      breakdown: {
        annual: { total: totalAnnualLeave, used: usedAnnualLeave, remaining: totalAnnualLeave - usedAnnualLeave },
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
    
    const leaveRequests = await db.collection('leaveRequests').find({
      userId: new ObjectId(userId),
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
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
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
        const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
        const totalAnnualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
        
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

  return router;
}

module.exports = createLeaveRoutes;