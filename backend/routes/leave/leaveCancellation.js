const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId, toObjectId, addIdField, requirePermission } = require('./utils/leaveHelpers');

const router = express.Router();

// Get database instance from app
const getDb = (req) => req.app.locals.db;

/**
 * Request cancellation for approved leave
 * POST /api/leave/:id/cancel
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
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
 * Approve/reject leave cancellation (for managers/admins)
 * POST /api/leave/:id/cancel/approve
 */
router.post('/approve', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { action, comment } = req.body;
  const approverId = req.user.id;
  
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
}));

/**
 * Get pending cancellation requests (for managers/admins)
 * GET /api/leave/cancellations/pending
 */
router.get('/pending', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  
  try {
    const userRole = req.user.role;
    const userDepartment = req.user.department;
    
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

/**
 * Get user's cancellation history
 * GET /api/leave/cancellations/history
 */
router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const userId = req.user.id;
  
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

module.exports = router;