const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId, addIdField, requirePermission } = require('./utils/leaveHelpers');
const { calculateAnnualLeaveEntitlement, getCarryOverLeave } = require('./utils/leaveCalculations');

const router = express.Router();

// Get database instance from app
const getDb = (req) => req.app.locals.db;

/**
 * Get personal calendar (shows all employees' leave)
 * GET /api/leave/calendar/:month
 */
router.get('/calendar/:month', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { month } = req.params;
  const userId = req.session.user.id;
  
  const userObjectId = await getUserObjectId(db, userId);
  if (!userObjectId) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // 모든 직원의 연차 표시 (승인된 것과 대기중인 것 구분)
  const leaveRequests = await db.collection('leaveRequests').find({
    status: { $in: ['pending', 'approved'] }, // rejected는 제외
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
  
  // 사용자 정보 한 번에 조회
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

/**
 * Get team calendar
 * GET /api/leave/team-calendar/:month
 */
router.get('/team-calendar/:month', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
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
  
  // 모든 사용자가 pending과 approved 휴가를 볼 수 있도록 수정
  // rejected 상태만 제외
  matchQuery.status = { $in: ['pending', 'approved'] };
  
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

/**
 * Get team leave status
 * GET /api/leave/team-status
 */
router.get('/team-status', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { department, view = 'team' } = req.query;
  const currentMonth = new Date().toISOString().substring(0, 7);
  
  let matchQuery = {
    startDate: { $regex: `^${currentMonth}` },
    status: { $in: ['pending', 'approved'] }
  };
  
  if (department && department !== 'all') {
    matchQuery.userDepartment = department;
  }
  
  const leaveRequests = await db.collection('leaveRequests').find(matchQuery).toArray();
  
  // Get user information for all requests
  const userIds = [...new Set(leaveRequests.map(req => req.userId))];
  const users = await db.collection('users').find({ 
    _id: { $in: userIds },
    role: { $ne: 'admin' }
  }).toArray();
  
  const userMap = users.reduce((map, user) => {
    map[user._id.toString()] = user;
    return map;
  }, {});
  
  // Calculate statistics
  const totalRequests = leaveRequests.length;
  const pendingRequests = leaveRequests.filter(req => req.status === 'pending').length;
  const approvedRequests = leaveRequests.filter(req => req.status === 'approved').length;
  
  // Get unique users on leave
  const usersOnLeave = [...new Set(leaveRequests.map(req => req.userId.toString()))];
  
  // Calculate total leave days
  const totalLeaveDays = leaveRequests.reduce((sum, req) => sum + (req.daysCount || 0), 0);
  
  // Department breakdown
  const departmentStats = {};
  users.forEach(user => {
    const dept = user.department || 'Unknown';
    if (!departmentStats[dept]) {
      departmentStats[dept] = { total: 0, onLeave: 0, requests: 0 };
    }
    departmentStats[dept].total++;
  });
  
  leaveRequests.forEach(req => {
    const user = userMap[req.userId.toString()];
    if (user) {
      const dept = user.department || 'Unknown';
      if (departmentStats[dept]) {
        departmentStats[dept].requests++;
        if (req.status === 'approved') {
          departmentStats[dept].onLeave++;
        }
      }
    }
  });
  
  // Top leave requests by user
  const userLeaveCount = {};
  leaveRequests.forEach(req => {
    const userId = req.userId.toString();
    if (!userLeaveCount[userId]) {
      userLeaveCount[userId] = 0;
    }
    userLeaveCount[userId]++;
  });
  
  const topUsers = Object.entries(userLeaveCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([userId, count]) => {
      const user = userMap[userId];
      return {
        userId,
        userName: user?.name || 'Unknown',
        department: user?.department || 'Unknown',
        requestCount: count
      };
    });
  
  res.json({
    success: true,
    data: {
      overview: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        usersOnLeave: usersOnLeave.length,
        totalLeaveDays,
        currentMonth
      },
      departmentStats,
      topUsers,
      recentRequests: leaveRequests
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(req => {
          const user = userMap[req.userId.toString()];
          return {
            id: req._id,
            userName: user?.name || 'Unknown',
            department: user?.department || 'Unknown',
            leaveType: req.leaveType,
            startDate: req.startDate,
            endDate: req.endDate,
            daysCount: req.daysCount,
            status: req.status,
            createdAt: req.createdAt
          };
        })
    }
  });
}));

/**
 * Get detailed leave log for specific employee (for managers/admins)
 * GET /api/leave/employee/:employeeId/log
 */
router.get('/employee/:employeeId/log', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { employeeId } = req.params;
  const { year = new Date().getFullYear() } = req.query;
  
  try {
    // Find user by employeeId or MongoDB _id
    let user;
    if (ObjectId.isValid(employeeId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(employeeId) });
    } else {
      user = await db.collection('users').findOne({ employeeId: employeeId });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Get all leave requests for this employee in the specified year
    const leaveRequests = await db.collection('leaveRequests').find({
      userId: user._id,
      startDate: { 
        $gte: `${year}-01-01`, 
        $lte: `${year}-12-31` 
      }
    }).sort({ createdAt: -1 }).toArray();
    
    // Calculate leave balance
    const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
    const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
    const carryOverLeave = await getCarryOverLeave(db, user._id, year);
    const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
    
    // Calculate used leave by status
    const usedLeave = leaveRequests
      .filter(req => req.leaveType === 'annual' && req.status === 'approved')
      .reduce((sum, req) => sum + req.daysCount, 0);
    
    const pendingLeave = leaveRequests
      .filter(req => req.leaveType === 'annual' && req.status === 'pending')
      .reduce((sum, req) => sum + req.daysCount, 0);
    
    const cancelledLeave = leaveRequests
      .filter(req => req.leaveType === 'annual' && req.status === 'cancelled')
      .reduce((sum, req) => sum + req.daysCount, 0);
    
    // Group requests by status for summary
    const statusSummary = {
      total: leaveRequests.length,
      pending: leaveRequests.filter(req => req.status === 'pending').length,
      approved: leaveRequests.filter(req => req.status === 'approved').length,
      rejected: leaveRequests.filter(req => req.status === 'rejected').length,
      cancelled: leaveRequests.filter(req => req.status === 'cancelled').length
    };
    
    // Group by leave type
    const leaveTypeSummary = leaveRequests.reduce((acc, req) => {
      const type = req.leaveType || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, totalDays: 0 };
      }
      acc[type].count++;
      acc[type].totalDays += req.daysCount || 0;
      return acc;
    }, {});
    
    // Get cancellation history
    const cancellationHistory = leaveRequests.filter(req => req.cancellationRequested);
    
    res.json({
      success: true,
      data: {
        employee: {
          id: user._id,
          name: user.name,
          employeeId: user.employeeId,
          department: user.department,
          hireDate: user.hireDate
        },
        leaveBalance: {
          year: parseInt(year),
          baseAnnualLeave,
          carryOverLeave,
          totalAnnualLeave,
          usedLeave,
          pendingLeave,
          remainingLeave: totalAnnualLeave - usedLeave,
          cancelledLeave
        },
        summary: {
          statusSummary,
          leaveTypeSummary,
          totalCancellations: cancellationHistory.length
        },
        requests: leaveRequests.map(addIdField),
        cancellationHistory: cancellationHistory.map(addIdField)
      }
    });
    
  } catch (error) {
    console.error('Employee leave log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

module.exports = router;