const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { toObjectId, addIdField, requirePermission } = require('./utils/leaveHelpers');

const router = express.Router();

// Get database instance from app
const getDb = (req) => req.app.locals.db;

/**
 * Approve or reject leave request
 * POST /api/leave/:id/approve
 */
router.post('/:id', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { action, comment } = req.body;
  const approverId = req.user.id;
  
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  // Validate that rejection requires a reason/comment
  if (action === 'reject' && (!comment || comment.trim().length === 0)) {
    return res.status(400).json({ 
      error: 'Rejection reason is required',
      message: 'Please provide a reason for rejecting this leave request'
    });
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
  
  // 연차 요청 처리: 승인 시 이미 차감된 상태 유지, 거부 시 잔액 복구
  const leaveRequest = await db.collection('leaveRequests').findOne({ _id: toObjectId(id) });
  if (leaveRequest && (leaveRequest.leaveType === 'annual' || leaveRequest.leaveType === 'Annual Leave')) {
    const user = await db.collection('users').findOne({ _id: leaveRequest.userId });
    if (user) {
      const currentBalance = user.leaveBalance || 0;
      const requestDays = leaveRequest.daysCount || leaveRequest.actualLeaveDays || 0;
      
      if (action === 'approve') {
        // 승인: 이미 차감된 상태 유지 (추가 처리 불필요)
        console.log(`연차 승인: ${user.name} (${user.employeeId}) - 사용: ${requestDays}일, 현재 잔액: ${currentBalance}일 (이미 차감됨)`);
      } else if (action === 'reject') {
        // 거부: 차감된 연차를 복구
        const newBalance = currentBalance + requestDays;
        
        await db.collection('users').updateOne(
          { _id: leaveRequest.userId },
          { 
            $set: { 
              leaveBalance: newBalance,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`연차 거부: ${user.name} (${user.employeeId}) - 복구: ${requestDays}일, 잔액: ${currentBalance} → ${newBalance}`);
      }
    }
  }
  
  res.json({
    success: true,
    message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
  });
}));

/**
 * Get pending leave requests (for supervisors/admins)
 * GET /api/leave/pending
 */
router.get('/', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const currentUser = req.user;
  
  let query = { status: 'pending' };
  
  // If user is a supervisor (not admin), filter by departments they can manage
  if (currentUser.role === 'supervisor' && currentUser.visibleTeams) {
    const visibleDepartments = currentUser.visibleTeams.map(team => team.departmentName);
    query.userDepartment = { $in: visibleDepartments };
  }
  
  const pendingRequests = await db.collection('leaveRequests').find(query).sort({ createdAt: -1 }).toArray();
  
  res.json({
    success: true,
    data: pendingRequests.map(addIdField)
  });
}));

/**
 * Alternative approve endpoint for compatibility
 * POST /api/leave/pending/:id/approve  
 */
router.post('/:id/approve', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { approved, note, rejectionReason } = req.body;
  const approverId = req.user.id;
  
  // Convert to the format expected by the existing approval logic
  const action = approved ? 'approve' : 'reject';
  const comment = note || rejectionReason || '';
  
  // Validate that rejection requires a reason/comment
  if (action === 'reject' && (!comment || comment.trim().length === 0)) {
    return res.status(400).json({ 
      error: 'Rejection reason is required',
      message: 'Please provide a reason for rejecting this leave request'
    });
  }
  
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
  
  // 연차는 이미 신청 시점에 차감되어 있으므로, 승인 시 추가 차감하지 않음
  // 거부 시에는 leaveRequests.js의 메인 approve 엔드포인트에서 처리됨
  if (action === 'approve') {
    const leaveRequest = await db.collection('leaveRequests').findOne({ _id: toObjectId(id) });
    if (leaveRequest && leaveRequest.leaveType === 'annual') {
      console.log(`연차 승인 확인: ${leaveRequest.userName} - ${leaveRequest.daysCount}일 (이미 차감됨)`);
    }
  }
  
  // 거부 시 연차 복구
  if (action === 'reject') {
    const leaveRequest = await db.collection('leaveRequests').findOne({ _id: toObjectId(id) });
    if (leaveRequest && leaveRequest.leaveType === 'annual' && leaveRequest.deductedDays > 0) {
      const user = await db.collection('users').findOne({ _id: leaveRequest.userId });
      if (user) {
        await db.collection('users').updateOne(
          { _id: leaveRequest.userId },
          { 
            $inc: { leaveBalance: leaveRequest.deductedDays }
          }
        );
        console.log(`연차 거부 복구: ${user.name} (${user.employeeId}) - 복구: ${leaveRequest.deductedDays}일`);
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