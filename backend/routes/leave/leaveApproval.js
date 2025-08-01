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
  
  // 연차 승인 시 로그만 남기고, 실제 잔여일수는 leaveBalance.js에서 실시간 계산
  if (action === 'approve') {
    const leaveRequest = await db.collection('leaveRequests').findOne({ _id: toObjectId(id) });
    if (leaveRequest && leaveRequest.leaveType === 'annual') {
      const user = await db.collection('users').findOne({ _id: leaveRequest.userId });
      if (user) {
        console.log(`연차 승인: ${user.name} (${user.employeeId}) - 사용: ${leaveRequest.daysCount}일`);
      }
    }
  }
  
  res.json({
    success: true,
    message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
  });
}));

/**
 * Get pending leave requests (for managers/admins)
 * GET /api/leave/pending
 */
router.get('/', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const currentUser = req.user;
  
  let query = { status: 'pending' };
  
  // If user is a manager (not admin), filter by departments they can manage
  if (currentUser.role === 'manager' && currentUser.visibleTeams) {
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
  
  // 승인된 경우 연차 차감
  if (action === 'approve') {
    const leaveRequest = await db.collection('leaveRequests').findOne({ _id: toObjectId(id) });
    if (leaveRequest && leaveRequest.leaveType === 'annual') {
      const user = await db.collection('users').findOne({ _id: leaveRequest.userId });
      if (user) {
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