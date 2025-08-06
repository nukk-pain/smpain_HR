const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId, toObjectId, addIdField, requirePermission } = require('./utils/leaveHelpers');
const { calculateAnnualLeaveEntitlement, getCarryOverLeave, getCurrentPolicy, calculateBusinessDaysWithPolicy } = require('./utils/leaveCalculations');
const { validateConsecutiveDays } = require('../../utils/leaveUtils');

const router = express.Router();

// Get database instance from app
const getDb = (req) => req.app.locals.db;

/**
 * Create new leave request
 * POST /api/leave
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { leaveType, startDate, endDate, reason, substituteEmployee, personalOffDays = [] } = req.body;
  const userId = req.user.id;
  
  // Get user info
  const userObjectId = await getUserObjectId(db, userId);
  if (!userObjectId) {
    return res.status(404).json({ error: 'User not found' });
  }
  const user = await db.collection('users').findOne({ _id: userObjectId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Calculate days count using policy-based calculation with personal off days
  const daysCount = await calculateBusinessDaysWithPolicy(db, startDate, endDate, personalOffDays);
  console.log(`🔍 [DEBUG] 휴가 일수 계산: ${startDate} ~ ${endDate} = ${daysCount}일 (개인 오프일 ${personalOffDays.length}개 제외)`);
  
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
  if (leaveType === 'annual') {
    try {
      validateConsecutiveDays(startDate, endDate, daysCount);
    } catch (validationError) {
      return res.status(400).json({ 
        success: false,
        error: validationError.message
      });
    }
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

  // 신청 시점 차감 방식: 연차 신청 시 잔여일수 확인 및 즉시 차감
  if (leaveType === 'annual') {
    // 현재 사용자의 잔여 연차 확인 (users.leaveBalance 필드 사용)
    const currentBalance = user.leaveBalance || 0;
    
    // Check for pending/approved requests that would affect balance
    const existingRequests = await db.collection('leaveRequests').find({
      userId: userObjectId,
      leaveType: 'annual',
      status: { $in: ['pending', 'approved'] }
    }).toArray();
    
    const totalPendingDays = existingRequests.reduce((sum, request) => sum + (request.daysCount || 0), 0);
    const effectiveBalance = currentBalance - totalPendingDays;
    
    // 잔여일수 부족 검사 (최대 3일까지 미리 사용 허용)
    if (effectiveBalance - daysCount < -3) {
      return res.status(400).json({ 
        error: 'Insufficient leave balance. Maximum advance usage of 3 days exceeded.',
        currentBalance: currentBalance,
        pendingRequests: totalPendingDays,
        effectiveBalance: effectiveBalance,
        requestedDays: daysCount,
        wouldRemain: effectiveBalance - daysCount,
        allowedMinimum: -3
      });
    }
  }
  
  // 휴가 신청 생성 및 연차 차감 처리 (트랜잭션 없이)
  try {
    // 1. 연차인 경우 잔여일수 차감
    if (leaveType === 'annual') {
      console.log(`🔍 [DEBUG] 연차 차감: userId=${userObjectId}, 차감할 일수=${daysCount}, 현재 잔여=${user.leaveBalance || 0}`);
      const deductResult = await db.collection('users').updateOne(
        { _id: userObjectId },
        { $inc: { leaveBalance: -daysCount } }
      );
      console.log(`🔍 [DEBUG] 차감 결과: ${deductResult.modifiedCount}개 문서 수정됨`);
      
      if (deductResult.matchedCount === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
    }
    
    // 2. 휴가 신청 생성
    const leaveRequest = {
      userId: userObjectId,
      userName: user.name,
      userDepartment: user.department,
      leaveType,
      startDate,
      endDate,
      daysCount,
      personalOffDays: personalOffDays || [], // 개인 오프일 저장
      actualLeaveDays: daysCount, // 실제 차감되는 연차일수 (개인 오프일 제외됨)
      reason,
      substituteEmployee: substituteEmployee || '',
      status: 'pending',
      deductedDays: leaveType === 'annual' ? daysCount : 0, // 차감된 일수 기록
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('leaveRequests').insertOne(leaveRequest);
    
    // Calculate final balance after deduction
    const finalBalance = (user.leaveBalance || 0) - (leaveType === 'annual' ? daysCount : 0);
    
    // Prepare response
    const response = {
      success: true,
      data: { id: result.insertedId, ...leaveRequest },
      message: leaveType === 'annual' ? 
        `휴가 신청이 완료되었습니다. 잔여 연차: ${finalBalance}일` :
        '휴가 신청이 완료되었습니다.'
    };
    
    // Add warning if balance becomes negative (but within allowed limit)
    if (leaveType === 'annual' && finalBalance < 0 && finalBalance >= -3) {
      response.warning = `Warning: Your leave balance will become negative (${finalBalance} days). You are using ${Math.abs(finalBalance)} days in advance. Maximum advance usage allowed is 3 days.`;
    }
    
    res.status(201).json(response);
    
  } catch (error) {
    console.error('휴가 신청 오류:', error);
    
    // 오류 시 연차 차감 롤백 (연차인 경우만)
    if (leaveType === 'annual') {
      try {
        await db.collection('users').updateOne(
          { _id: userObjectId },
          { $inc: { leaveBalance: daysCount } } // 차감했던 것을 다시 복원
        );
        console.log(`🔄 [DEBUG] 오류로 인한 연차 복원: ${daysCount}일`);
      } catch (rollbackError) {
        console.error('연차 복원 실패:', rollbackError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: '휴가 신청 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}));

/**
 * Get leave requests
 * GET /api/leave
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query = {};
  
  // All users (including admin) see only their own requests in personal leave page
  // Admin can see all requests through separate admin endpoints
  const userObjectId = await getUserObjectId(db, userId);
  if (!userObjectId) {
    return res.status(404).json({ error: 'User not found' });
  }
  query.userId = userObjectId;
  
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
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query = { _id: toObjectId(id) };
  
  // All users (including admin) can only see their own requests in personal leave page
  // Admin can see all requests through separate admin endpoints
  const userObjectId = await getUserObjectId(db, userId);
  if (!userObjectId) {
    return res.status(404).json({ error: 'User not found' });
  }
  query.userId = userObjectId;
  
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
  const { leaveType, startDate, endDate, reason, substituteEmployee, personalOffDays = [] } = req.body;
  const userId = req.user.id;
  
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
  
  // 기존 값 보존을 위한 안전한 업데이트 데이터 구성
  const effectiveStartDate = startDate || leaveRequest.startDate;
  const effectiveEndDate = endDate || leaveRequest.endDate;
  const effectiveLeaveType = leaveType || leaveRequest.leaveType;
  const effectivePersonalOffDays = personalOffDays.length > 0 ? personalOffDays : (leaveRequest.personalOffDays || []);
  
  // Calculate days count using policy-based calculation with personal off days
  const daysCount = await calculateBusinessDaysWithPolicy(db, effectiveStartDate, effectiveEndDate, effectivePersonalOffDays);
  
  // Check leave balance for annual leave (allow -3 days advance)
  if (effectiveLeaveType === 'annual') {
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
  
  // 안전한 업데이트 데이터 구성 (기존 값 보존)
  const updateData = {
    updatedAt: new Date()
  };
  
  // 제공된 필드만 업데이트
  if (leaveType !== undefined) updateData.leaveType = effectiveLeaveType;
  if (startDate !== undefined) updateData.startDate = effectiveStartDate;
  if (endDate !== undefined) updateData.endDate = effectiveEndDate;
  if (reason !== undefined) updateData.reason = reason;
  if (substituteEmployee !== undefined) updateData.substituteEmployee = substituteEmployee;
  if (personalOffDays && personalOffDays.length >= 0) updateData.personalOffDays = effectivePersonalOffDays;
  
  // 날짜가 변경된 경우 일수 재계산
  if (startDate !== undefined || endDate !== undefined || (personalOffDays && personalOffDays.length >= 0)) {
    updateData.daysCount = daysCount;
    updateData.actualLeaveDays = daysCount;
  }
  
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
  const userId = req.user.id;
  
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

/**
 * Approve or reject leave request OR cancellation request
 * POST /api/leave/:id/approve
 */
router.post('/:id/approve', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { action, comment, type = 'leave' } = req.body; // type: 'leave' | 'cancellation'
  const approverId = req.user.id;
  
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  const approver = await db.collection('users').findOne({ _id: new ObjectId(approverId) });
  
  if (type === 'cancellation') {
    // Handle cancellation approval/rejection
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
      cancellationApprovedBy: new ObjectId(approverId),
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
    
    // 연차 취소 승인 시 연차 잔여일수 복원
    if (action === 'approve' && leaveRequest.leaveType === 'annual') {
      const user = await db.collection('users').findOne({ _id: leaveRequest.userId });
      if (user) {
        const currentBalance = user.leaveBalance || 0;
        const restoredBalance = currentBalance + leaveRequest.daysCount;
        
        await db.collection('users').updateOne(
          { _id: leaveRequest.userId },
          { 
            $set: { 
              leaveBalance: restoredBalance,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`연차 취소 승인: ${user.name} (${user.employeeId}) - 복원: ${leaveRequest.daysCount}일, 잔여: ${restoredBalance}일`);
      }
    }
    
    res.json({
      success: true,
      message: `Leave cancellation ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });
  } else {
    // Handle regular leave approval/rejection
    const leaveRequest = await db.collection('leaveRequests').findOne({
      _id: toObjectId(id),
      status: 'pending'
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found or already processed' });
    }
    
    // 휴가 승인/거부 처리 (트랜잭션 없이)
    try {
      // 1. 휴가 신청 상태 업데이트
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedBy: new ObjectId(approverId),
        approvedByName: approver.name,
        approvedAt: new Date(),
        approvalComment: comment || '',
        updatedAt: new Date()
      };
      
      console.log(`🔍 [DEBUG] 휴가 ${action === 'approve' ? '승인' : '거부'} 처리: ${leaveRequest.userName} - ${leaveRequest.leaveType} ${leaveRequest.daysCount}일`);
      
      const updateResult = await db.collection('leaveRequests').updateOne(
        { _id: toObjectId(id), status: 'pending' },
        { $set: updateData }
      );
      
      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ error: 'Leave request not found or already processed' });
      }
      
      console.log(`🔍 [DEBUG] 휴가 신청 상태 업데이트 완료: ${updateResult.modifiedCount}개 문서 수정됨`);
      
      // 2. 거부 시 연차 복구
      if (action === 'reject' && leaveRequest.leaveType === 'annual' && leaveRequest.deductedDays > 0) {
        const restoreResult = await db.collection('users').updateOne(
          { _id: leaveRequest.userId },
          { $inc: { leaveBalance: leaveRequest.deductedDays } }
        );
        
        console.log(`🔍 [DEBUG] 연차 거부 시 복구: 사용자 ${leaveRequest.userName} - 복구 ${leaveRequest.deductedDays}일, 수정된 문서: ${restoreResult.modifiedCount}개`);
        
        if (restoreResult.matchedCount === 0) {
          console.error('❌ [ERROR] 연차 복구 실패: 사용자를 찾을 수 없음');
        }
      }
      
      // 3. 승인 시 로그 (기존과 동일)
      if (action === 'approve' && leaveRequest.leaveType === 'annual') {
        console.log(`✅ [DEBUG] 연차 승인: ${leaveRequest.userName} - 사용 ${leaveRequest.daysCount}일 (이미 차감됨)`);
      }
      
      res.json({
        success: true,
        message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        balanceRestored: action === 'reject' && leaveRequest.leaveType === 'annual' ? leaveRequest.deductedDays : 0
      });
      
    } catch (error) {
      console.error('❌ [ERROR] 휴가 승인/거부 처리 오류:', error);
      
      // 오류 시 수동 롤백 처리 (상태 업데이트가 완료되었지만 연차 복구가 실패한 경우)
      if (action === 'reject' && leaveRequest.leaveType === 'annual') {
        try {
          // 상태 업데이트를 원복하려 하지만, 이미 변경되었을 가능성이 높음
          console.log('🔄 [DEBUG] 오류로 인한 수동 복구 시도 중...');
        } catch (rollbackError) {
          console.error('❌ [ERROR] 수동 롤백 실패:', rollbackError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: '휴가 승인/거부 처리 중 오류가 발생했습니다.',
        details: error.message
      });
    }
  }
}));

/**
 * Request cancellation for approved leave
 * POST /api/leave/:id/cancel
 */
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  
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

/**
 * Approve or reject leave request (alternative endpoint)
 * POST /api/leave/:id/approve
 */
router.post('/:id/approve', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { approved, note, rejectionReason } = req.body;
  const approverId = req.user.id;
  
  // Convert to the format expected by the existing approval logic
  const action = approved ? 'approve' : 'reject';
  const comment = note || rejectionReason || '';
  
  // Reuse the existing approval logic
  const approver = await db.collection('users').findOne({ _id: new ObjectId(approverId) });
  
  const updateData = {
    status: action === 'approve' ? 'approved' : 'rejected',
    approvedBy: new ObjectId(approverId),
    approvedByName: approver.name,
    approvedAt: new Date(),
    approvalComment: comment,
    rejectionReason: action === 'reject' ? comment : null,
    updatedAt: new Date()
  };
  
  const result = await db.collection('leaveRequests').updateOne(
    { _id: toObjectId(id), status: 'pending' },
    { $set: updateData }
  );
  
  if (result.matchedCount === 0) {
    return res.status(404).json({ 
      success: false,
      error: 'Leave request not found or already processed' 
    });
  }
  
  // 승인된 경우 연차 차감 (기존 로직과 동일)
  if (action === 'approve') {
    const leaveRequest = await db.collection('leaveRequests').findOne({ _id: toObjectId(id) });
    if (leaveRequest && leaveRequest.leaveType === 'annual') {
      const user = await db.collection('users').findOne({ _id: leaveRequest.userId });
      if (user) {
        // leaveBalance 차감
        await db.collection('users').updateOne(
          { _id: new ObjectId(leaveRequest.userId) },
          { 
            $inc: { leaveBalance: -leaveRequest.actualLeaveDays }
          }
        );
        console.log(`연차 승인 및 차감: ${user.name} (${user.employeeId}) - 사용: ${leaveRequest.actualLeaveDays}일`);
      }
    }
  }
  
  res.json({
    success: true,
    message: approved ? 'Leave request approved' : 'Leave request rejected',
    data: { ...updateData, _id: id }
  });
}));

module.exports = router;