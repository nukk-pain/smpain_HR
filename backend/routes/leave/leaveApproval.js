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
router.post('/:id/approve', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
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
  
  // 연차 승인 시 즉시 연차 잔여일수 차감
  if (action === 'approve') {
    const leaveRequest = await db.collection('leaveRequests').findOne({ _id: toObjectId(id) });
    if (leaveRequest && leaveRequest.leaveType === 'annual') {
      const user = await db.collection('users').findOne({ _id: leaveRequest.userId });
      if (user) {
        const currentBalance = user.leaveBalance || 0;
        const newBalance = Math.max(0, currentBalance - leaveRequest.daysCount);
        
        await db.collection('users').updateOne(
          { _id: leaveRequest.userId },
          { 
            $set: { 
              leaveBalance: newBalance,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`연차 승인: ${user.name} (${user.employeeId}) - 사용: ${leaveRequest.daysCount}일, 잔여: ${newBalance}일`);
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
router.get('/pending', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const pendingRequests = await db.collection('leaveRequests').find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
  
  res.json({
    success: true,
    data: pendingRequests.map(addIdField)
  });
}));

module.exports = router;