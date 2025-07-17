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

    // 자동 carry-over 계산 비활성화
    // 앞으로는 수동으로만 carry-over 추가하도록 함
    // 프로그램 시작 시에는 현재 년도 기본 연차만 계산
    
    return manualCarryOver;
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

// Helper function to add id field mapping for frontend consistency
const addIdField = (request) => ({
  ...request,
  id: request._id ? request._id.toString() : request.id
});

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

  // Leave exception management routes (for admin/manager) - MUST BE BEFORE /:id ROUTES
  // Create leave exception (allow multiple leaves on specific dates)
  router.post('/exceptions', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const { date, maxConcurrentLeaves, reason } = req.body;
    const createdBy = await getUserObjectId(db, req.session.user.id);
    
    if (!createdBy) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate input
    if (!date || !maxConcurrentLeaves || maxConcurrentLeaves < 2) {
      return res.status(400).json({ error: '날짜와 최소 2명 이상의 허용 인원을 입력해주세요.' });
    }

    // Check if exception already exists for this date
    const existingException = await db.collection('leaveExceptions').findOne({ date });
    if (existingException) {
      return res.status(400).json({ error: '해당 날짜에 이미 예외 설정이 존재합니다.' });
    }

    const exception = {
      date,
      maxConcurrentLeaves: parseInt(maxConcurrentLeaves),
      reason: reason || '',
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('leaveExceptions').insertOne(exception);
    
    res.json({
      success: true,
      data: { id: result.insertedId, ...exception }
    });
  }));

  // Get leave exceptions
  router.get('/exceptions', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const { month } = req.query;
    
    let query = {};
    if (month) {
      // Filter by month if provided (YYYY-MM format)
      query.date = { $regex: `^${month}` };
    }

    const exceptions = await db.collection('leaveExceptions').find(query).sort({ date: 1 }).toArray();
    
    res.json({
      success: true,
      data: exceptions
    });
  }));

  // Update leave exception
  router.put('/exceptions/:id', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { maxConcurrentLeaves, reason } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid exception ID' });
    }

    const updateData = {
      maxConcurrentLeaves: parseInt(maxConcurrentLeaves),
      reason: reason || '',
      updatedAt: new Date()
    };

    const result = await db.collection('leaveExceptions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Exception not found' });
    }

    res.json({
      success: true,
      message: '예외 설정이 업데이트되었습니다.'
    });
  }));

  // Delete leave exception
  router.delete('/exceptions/:id', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid exception ID' });
    }

    const result = await db.collection('leaveExceptions').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Exception not found' });
    }

    res.json({
      success: true,
      message: '예외 설정이 삭제되었습니다.'
    });
  }));

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
    
    // Check for conflicting leave requests from other employees
    const conflictingLeaves = await db.collection('leaveRequests').find({
      userId: { $ne: user._id }, // 다른 사용자
      status: { $in: ['approved', 'pending'] }, // 승인되었거나 대기중인 휴가
      $or: [
        // 신청 날짜가 기존 휴가 기간과 겹치는 경우
        {
          $and: [
            { startDate: { $lte: endDate } },
            { endDate: { $gte: startDate } }
          ]
        }
      ]
    }).toArray();

    if (conflictingLeaves.length > 0) {
      // Check if there are any exception dates that allow multiple leaves
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);
      let hasExceptionForEntirePeriod = true;

      // Check each day in the requested period
      for (let d = new Date(requestStart); d <= requestEnd; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Get exception for this date
        const exception = await db.collection('leaveExceptions').findOne({ date: dateString });
        
        if (!exception) {
          hasExceptionForEntirePeriod = false;
          break;
        }

        // Count current leaves on this date
        const leavesOnThisDate = conflictingLeaves.filter(leave => {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          return d >= leaveStart && d <= leaveEnd;
        }).length;

        // If this date already has max concurrent leaves or more, reject
        if (leavesOnThisDate >= exception.maxConcurrentLeaves) {
          hasExceptionForEntirePeriod = false;
          break;
        }
      }

      // If no exceptions cover the entire period or limits are exceeded, reject
      if (!hasExceptionForEntirePeriod) {
        const conflictingUsers = conflictingLeaves.map(leave => leave.userName).join(', ');
        return res.status(400).json({ 
          error: `해당 기간에 이미 휴가를 신청한 직원이 있습니다: ${conflictingUsers}`,
          conflictingLeaves: conflictingLeaves.map(leave => ({
            userName: leave.userName,
            startDate: leave.startDate,
            endDate: leave.endDate,
            status: leave.status
          }))
        });
      }
    }

    // Check leave balance for annual leave (allow -3 days advance)
    if (leaveType === 'annual') {
      const currentYear = new Date().getFullYear();
      
      // Calculate total annual leave including carry-over
      const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
      const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
      const carryOverLeave = await getCarryOverLeave(db, user._id, currentYear);
      const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
      
      // Get used annual leave
      const usedLeave = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            userId: user._id,
            leaveType: 'annual',
            status: { $in: ['approved', 'pending'] },
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
      const remainingLeave = totalAnnualLeave - usedAnnualLeave;
      
      // Allow advance usage up to -3 days
      if (remainingLeave - daysCount < -3) {
        return res.status(400).json({ 
          error: '연차 잔여일수가 부족합니다. 최대 3일까지 미리 사용할 수 있습니다.',
          currentBalance: remainingLeave,
          requestedDays: daysCount,
          allowedMinimum: -3
        });
      }
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
    
    // Regular users and managers can only see their own requests
    if (userRole === 'user' || userRole === 'manager') {
      const userObjectId = await getUserObjectId(db, userId);
      if (!userObjectId) {
        return res.status(404).json({ error: 'User not found' });
      }
      query.userId = userObjectId;
    }
    
    const leaveRequests = await db.collection('leaveRequests').find(query).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: leaveRequests.map(addIdField)
    });
  }));

  // Get pending leave requests (for managers/admins)
  router.get('/pending', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const pendingRequests = await db.collection('leaveRequests').find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    
    res.json({
      success: true,
      data: pendingRequests.map(addIdField)
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
          remaining: totalAnnualLeave - usedAnnualLeave,
          allowedAdvanceUsage: 3
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

  // Team status endpoints
  router.get('/team-status', requireAuth, asyncHandler(async (req, res) => {
    const { department, year = new Date().getFullYear() } = req.query;
    const userRole = req.session.user.role;
    
    let userQuery = { isActive: true };
    
    if (userRole === 'manager') {
      // Manager는 admin 바로 아래급으로 전체 직원을 관리할 수 있음
      // 별도 필터링 없이 모든 직원 확인 가능
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
    
    // Regular users and managers can only see their own requests
    if (userRole === 'user' || userRole === 'manager') {
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
    
    // Check leave balance for annual leave (allow -3 days advance)
    if (leaveType === 'annual') {
      const currentYear = new Date().getFullYear();
      const user = await db.collection('users').findOne({ _id: userObjectId });
      
      // Calculate total annual leave including carry-over
      const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
      const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
      const carryOverLeave = await getCarryOverLeave(db, user._id, currentYear);
      const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
      
      // Get used annual leave (exclude current request)
      const usedLeave = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            userId: userObjectId,
            leaveType: 'annual',
            status: { $in: ['approved', 'pending'] },
            _id: { $ne: toObjectId(id) },
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
      const remainingLeave = totalAnnualLeave - usedAnnualLeave;
      
      // Allow advance usage up to -3 days
      if (remainingLeave - daysCount < -3) {
        return res.status(400).json({ 
          error: '연차 잔여일수가 부족합니다. 최대 3일까지 미리 사용할 수 있습니다.',
          currentBalance: remainingLeave,
          requestedDays: daysCount,
          allowedMinimum: -3
        });
      }
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
      data: pendingRequests.map(addIdField)
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

  // Team status endpoints
  router.get('/team-status', requireAuth, asyncHandler(async (req, res) => {
    const { department, year = new Date().getFullYear() } = req.query;
    const userRole = req.session.user.role;
    
    let userQuery = { isActive: true };
    
    if (userRole === 'manager') {
      // Manager는 admin 바로 아래급으로 전체 직원을 관리할 수 있음
      // 별도 필터링 없이 모든 직원 확인 가능
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

  // Leave cancellation routes
  
  // Request cancellation for approved leave
  router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.session.user.id;
    
    const userObjectId = await getUserObjectId(db, userId);
    if (!userObjectId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find the leave request
    const leaveRequest = await db.collection('leaveRequests').findOne({
      _id: toObjectId(id),
      userId: userObjectId
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    // Check if leave is in approved status
    if (leaveRequest.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved leave requests can be cancelled' });
    }
    
    // Check if leave has already been cancelled or cancellation is pending
    if (leaveRequest.cancellationRequested) {
      return res.status(400).json({ error: 'Cancellation already requested for this leave' });
    }
    
    // Check if leave start date is in the future
    const today = new Date().toISOString().split('T')[0];
    if (leaveRequest.startDate <= today) {
      return res.status(400).json({ error: 'Cannot cancel leave that has already started' });
    }
    
    // Validate reason
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: '취소 사유를 5자 이상 입력해주세요.' });
    }
    
    // Update leave request with cancellation information
    const updateData = {
      cancellationRequested: true,
      cancellationRequestedAt: new Date(),
      cancellationReason: reason.trim(),
      cancellationStatus: 'pending',
      updatedAt: new Date()
    };
    
    const result = await db.collection('leaveRequests').updateOne(
      { _id: toObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Failed to update leave request' });
    }
    
    res.json({
      success: true,
      message: '휴가 취소 신청이 완료되었습니다. 관리자 승인을 기다려주세요.'
    });
  }));
  
  // Approve/reject leave cancellation (for managers/admins)
  router.post('/:id/cancel/approve', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, comment } = req.body;
    const approverId = req.session.user.id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const approverObjectId = await getUserObjectId(db, approverId);
    if (!approverObjectId) {
      return res.status(404).json({ error: 'Approver not found' });
    }
    
    const approver = await db.collection('users').findOne({ _id: approverObjectId });
    
    // Find the leave request
    const leaveRequest = await db.collection('leaveRequests').findOne({
      _id: toObjectId(id),
      cancellationRequested: true,
      cancellationStatus: 'pending'
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave cancellation request not found or already processed' });
    }
    
    let updateData = {
      cancellationStatus: action === 'approve' ? 'approved' : 'rejected',
      cancellationApprovedBy: approverObjectId,
      cancellationApprovedByName: approver.name,
      cancellationApprovedAt: new Date(),
      cancellationComment: comment || '',
      updatedAt: new Date()
    };
    
    // If cancellation is approved, change the leave status to cancelled
    if (action === 'approve') {
      updateData.status = 'cancelled';
    }
    
    const result = await db.collection('leaveRequests').updateOne(
      { _id: toObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Failed to update cancellation request' });
    }
    
    res.json({
      success: true,
      message: `Leave cancellation ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });
  }));
  
  // Get pending cancellation requests (for managers/admins)
  router.get('/cancellations/pending', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
    try {
      const userRole = req.session.user.role;
      const userDepartment = req.session.user.department;
      
      let matchCondition = {
        cancellationRequested: true,
        cancellationStatus: 'pending'
      };
      
      // Managers can only see their department
      if (userRole === 'manager') {
        const departmentUserIds = await db.collection('users').find({
          department: userDepartment
        }).project({ _id: 1 }).toArray();
        
        const userIds = departmentUserIds.map(user => user._id);
        matchCondition.userId = { $in: userIds };
      }
      
      const pendingCancellations = await db.collection('leaveRequests').aggregate([
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
            daysCount: '$daysCount',
            reason: '$reason',
            status: '$status',
            cancellationRequestedAt: '$cancellationRequestedAt',
            cancellationReason: '$cancellationReason',
            cancellationStatus: '$cancellationStatus'
          }
        },
        { $sort: { cancellationRequestedAt: 1 } }
      ]).toArray();
      
      res.json({
        success: true,
        data: pendingCancellations.map(addIdField)
      });
      
    } catch (error) {
      console.error('Get pending cancellations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));
  
  // Get user's cancellation history
  router.get('/cancellations/history', requireAuth, asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    
    const userObjectId = await getUserObjectId(db, userId);
    if (!userObjectId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const cancellationHistory = await db.collection('leaveRequests').find({
      userId: userObjectId,
      cancellationRequested: true
    }).sort({ cancellationRequestedAt: -1 }).toArray();
    
    const historyData = cancellationHistory.map(request => addIdField({
      _id: request._id,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      daysCount: request.daysCount,
      reason: request.reason,
      status: request.status,
      cancellationRequestedAt: request.cancellationRequestedAt,
      cancellationReason: request.cancellationReason,
      cancellationStatus: request.cancellationStatus,
      cancellationApprovedByName: request.cancellationApprovedByName,
      cancellationApprovedAt: request.cancellationApprovedAt,
      cancellationComment: request.cancellationComment
    }));
    
    res.json({
      success: true,
      data: historyData
    });
  }));

  // Get detailed leave log for specific employee (for managers/admins)
  router.get('/employee/:employeeId/log', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
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
        cancelled: leaveRequests.filter(req => req.status === 'cancelled').length,
        cancellationRequested: leaveRequests.filter(req => req.cancellationRequested).length
      };
      
      res.json({
        success: true,
        data: {
          employee: {
            _id: user._id,
            name: user.name,
            employeeId: user.employeeId,
            department: user.department,
            position: user.position,
            hireDate: user.hireDate
          },
          year: parseInt(year),
          leaveBalance: {
            baseAnnualLeave,
            carryOverLeave,
            totalAnnualLeave,
            usedLeave,
            pendingLeave,
            cancelledLeave,
            remainingLeave: totalAnnualLeave - usedLeave
          },
          statusSummary,
          leaveRequests: leaveRequests.map(addIdField)
        }
      });
      
    } catch (error) {
      console.error('Get employee leave log error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }));

  return router;
}

module.exports = createLeaveRoutes;