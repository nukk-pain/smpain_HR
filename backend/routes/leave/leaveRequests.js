const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId, toObjectId, addIdField, requirePermission } = require('./utils/leaveHelpers');
const { calculateAnnualLeaveEntitlement, getCarryOverLeave, getCurrentPolicy, calculateBusinessDaysWithPolicy } = require('./utils/leaveCalculations');

const router = express.Router();

// Get database instance from app
const getDb = (req) => req.app.locals.db;

/**
 * Create new leave request
 * POST /api/leave
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
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
  
  // Calculate days count using policy-based calculation
  const daysCount = await calculateBusinessDaysWithPolicy(db, startDate, endDate);
  
  // Get current policy for validation
  const policy = await getCurrentPolicy(db);
  
  // Validate advance notice requirement
  const startDateObj = new Date(startDate);
  const today = new Date();
  const daysInAdvance = Math.floor((startDateObj - today) / (1000 * 60 * 60 * 24));
  
  if (leaveType === 'annual' && daysInAdvance < policy.leaveTypes.annual.advanceNotice) {
    return res.status(400).json({ 
      error: `연차는 최소 ${policy.leaveTypes.annual.advanceNotice}일 전에 신청해야 합니다.` 
    });
  }
  
  if (daysInAdvance < policy.businessRules.minAdvanceDays) {
    return res.status(400).json({ 
      error: `휴가는 최소 ${policy.businessRules.minAdvanceDays}일 전에 신청해야 합니다.` 
    });
  }
  
  // Validate consecutive days limit for annual leave
  if (leaveType === 'annual' && daysCount > policy.leaveTypes.annual.maxConsecutive) {
    return res.status(400).json({ 
      error: `연차는 최대 ${policy.leaveTypes.annual.maxConsecutive}일까지 연속으로 사용할 수 있습니다.` 
    });
  }
  
  // Check concurrent requests limit
  const pendingRequestsCount = await db.collection('leaveRequests').countDocuments({
    userId: userObjectId,
    status: 'pending'
  });
  
  if (pendingRequestsCount >= policy.businessRules.maxConcurrentRequests) {
    return res.status(400).json({ 
      error: `최대 ${policy.businessRules.maxConcurrentRequests}개의 휴가 신청만 동시에 대기할 수 있습니다.` 
    });
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
        error: `해당 기간에 이미 휴가를 신청한 직원이 있습니다: ${conflictingUsers}. 팀 달력에서 다른 직원들의 연차 현황을 확인하실 수 있습니다.`,
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

/**
 * Get leave requests
 * GET /api/leave
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
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

/**
 * Get specific leave request
 * GET /api/leave/:id
 */
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
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
    data: addIdField(leaveRequest)
  });
}));

/**
 * Update leave request
 * PUT /api/leave/:id
 */
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
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
  
  // Calculate days count using policy-based calculation
  const daysCount = await calculateBusinessDaysWithPolicy(db, startDate, endDate);
  
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

/**
 * Delete leave request
 * DELETE /api/leave/:id
 */
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
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

module.exports = router;