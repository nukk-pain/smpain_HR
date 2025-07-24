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
router.get('/:month', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { month } = req.params;
  const userId = req.session.user.id;
  
  const userObjectId = await getUserObjectId(db, userId);
  if (!userObjectId) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // 모든 직원의 연차 표시 (승인된 것과 대기중인 것 구분)
  let matchQuery = {
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
  };
  
  // Add department filter if specified
  const { department } = req.query;
  if (department && department !== 'all') {
    matchQuery.userDepartment = department;
  }
  
  const leaveRequests = await db.collection('leaveRequests').find(matchQuery).toArray();
  
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
 * Get team leave status
 * GET /api/leave/team-status
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { department, year = new Date().getFullYear() } = req.query;
  
  // Get all users excluding admin
  let userQuery = { role: { $ne: 'admin' } };
  if (department && department !== 'all') {
    userQuery.department = department;
  }
  
  const users = await db.collection('users').find(userQuery).toArray();
  
  // Get all leave requests for the year
  const leaveRequests = await db.collection('leaveRequests').find({
    startDate: { 
      $gte: `${year}-01-01`, 
      $lte: `${year}-12-31` 
    }
  }).toArray();
  
  // Create user map for quick lookup
  const userMap = users.reduce((map, user) => {
    map[user._id.toString()] = user;
    return map;
  }, {});
  
  // Get leave balance for each user from DB (consistent with personal dashboard)
  const members = await Promise.all(users.map(async (user) => {
    const userLeaveRequests = leaveRequests.filter(req => 
      req.userId && req.userId.toString() === user._id.toString()
    );
    
    // Calculate annual leave entitlement
    const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
    const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
    const carryOverLeave = await getCarryOverLeave(db, user._id, year);
    const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
    
    // Use DB stored values (consistent with personal dashboard)
    const remainingAnnualLeave = user.leaveBalance || 0;
    const usedAnnualLeave = Math.max(0, totalAnnualLeave - remainingAnnualLeave);
    const pendingAnnualLeave = 0; // Already deducted from leaveBalance when requested
    
    // Get recent and upcoming leaves
    const now = new Date();
    const recentLeaves = userLeaveRequests
      .filter(req => new Date(req.endDate) < now)
      .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
      .slice(0, 5)
      .map(req => ({
        id: req._id,
        leaveType: req.leaveType,
        startDate: req.startDate,
        endDate: req.endDate,
        daysCount: req.daysCount,
        status: req.status,
        reason: req.reason
      }));
    
    const upcomingLeaves = userLeaveRequests
      .filter(req => new Date(req.startDate) >= now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5)
      .map(req => ({
        id: req._id,
        leaveType: req.leaveType,
        startDate: req.startDate,
        endDate: req.endDate,
        daysCount: req.daysCount,
        status: req.status,
        reason: req.reason
      }));
    
    return {
      _id: user._id,
      name: user.name,
      employeeId: user.employeeId,
      position: user.position,
      department: user.department,
      leaveBalance: {
        totalAnnualLeave,
        usedAnnualLeave,
        remainingAnnualLeave,
        pendingAnnualLeave
      },
      recentLeaves,
      upcomingLeaves
    };
  }));
  
  // Get unique departments
  const departments = [...new Set(users.map(user => user.department).filter(Boolean))];
  
  res.json({
    success: true,
    data: {
      members,
      departments
    }
  });
}));

/**
 * Get department leave statistics
 * GET /api/leave/department-stats
 */
router.get('/department-stats', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { year = new Date().getFullYear() } = req.query;
  
  // Get all users excluding admin
  const users = await db.collection('users').find({ role: { $ne: 'admin' } }).toArray();
  
  // Get all leave requests for the year
  const leaveRequests = await db.collection('leaveRequests').find({
    startDate: { 
      $gte: `${year}-01-01`, 
      $lte: `${year}-12-31` 
    }
  }).toArray();
  
  // Group by department
  const departmentMap = users.reduce((map, user) => {
    const dept = user.department || 'Unknown';
    if (!map[dept]) {
      map[dept] = {
        users: [],
        totalMembers: 0,
        activeMembers: 0
      };
    }
    map[dept].users.push(user);
    map[dept].totalMembers++;
    map[dept].activeMembers++; // Assuming all users are active
    return map;
  }, {});
  
  // Calculate statistics for each department
  const departmentStats = await Promise.all(
    Object.entries(departmentMap).map(async ([department, info]) => {
      const deptUsers = info.users;
      const deptLeaveRequests = leaveRequests.filter(req => 
        deptUsers.some(user => user._id.toString() === req.userId?.toString())
      );
      
      // Calculate leave usage for each user in department
      const userStats = await Promise.all(deptUsers.map(async (user) => {
        const userLeaveRequests = deptLeaveRequests.filter(req => 
          req.userId && req.userId.toString() === user._id.toString()
        );
        
        const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
        const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
        const carryOverLeave = await getCarryOverLeave(db, user._id, year);
        const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
        
        const usedAnnualLeave = userLeaveRequests
          .filter(req => req.leaveType === 'annual' && req.status === 'approved')
          .reduce((sum, req) => sum + (req.daysCount || 0), 0);
        
        const pendingAnnualLeave = userLeaveRequests
          .filter(req => req.leaveType === 'annual' && req.status === 'pending')
          .reduce((sum, req) => sum + (req.daysCount || 0), 0);
        
        return {
          totalAnnualLeave,
          usedAnnualLeave,
          pendingAnnualLeave,
          usagePercentage: totalAnnualLeave > 0 ? (usedAnnualLeave / totalAnnualLeave) * 100 : 0
        };
      }));
      
      // Calculate department aggregates
      const totalLeaveUsed = userStats.reduce((sum, stat) => sum + stat.usedAnnualLeave, 0);
      const totalLeaveRemaining = userStats.reduce((sum, stat) => 
        sum + (stat.totalAnnualLeave - stat.usedAnnualLeave), 0);
      const avgLeaveUsage = userStats.length > 0 
        ? userStats.reduce((sum, stat) => sum + stat.usagePercentage, 0) / userStats.length 
        : 0;
      
      const pendingRequests = deptLeaveRequests.filter(req => req.status === 'pending').length;
      const totalRequests = deptLeaveRequests.length;
      const approvedRequests = deptLeaveRequests.filter(req => req.status === 'approved').length;
      const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;
      
      return {
        department,
        totalMembers: info.totalMembers,
        activeMembers: info.activeMembers,
        avgLeaveUsage,
        totalLeaveUsed,
        totalLeaveRemaining,
        pendingRequests,
        approvalRate
      };
    })
  );
  
  res.json({
    success: true,
    data: departmentStats
  });
}));

/**
 * Get detailed leave log for specific employee (for managers/admins)
 * GET /api/leave/employee/:employeeId/log
 */
router.get('/:employeeId/log', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
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
        balance: {
          year: parseInt(year),
          baseAnnualLeave,
          carryOverLeave,
          totalAnnualLeave,
          usedAnnualLeave: usedLeave,
          pendingAnnualLeave: pendingLeave,
          remainingAnnualLeave: totalAnnualLeave - usedLeave,
          cancelledLeave
        },
        leaveHistory: leaveRequests.map(req => ({
          id: req._id,
          leaveType: req.leaveType,
          startDate: req.startDate,
          endDate: req.endDate,
          daysCount: req.daysCount,
          status: req.status,
          reason: req.reason,
          createdAt: req.createdAt,
          requestedAt: req.requestedAt || req.createdAt,
          cancellationRequested: req.cancellationRequested || false,
          cancellationStatus: req.cancellationStatus,
          cancellationReason: req.cancellationReason
        })),
        summary: {
          statusSummary,
          leaveTypeSummary,
          totalCancellations: cancellationHistory.length
        },
        cancellationHistory: cancellationHistory.map(addIdField)
      }
    });
    
  } catch (error) {
    console.error('Employee leave log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

module.exports = router;