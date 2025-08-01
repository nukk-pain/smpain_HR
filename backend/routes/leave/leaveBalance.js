const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId } = require('./utils/leaveHelpers');
const { calculateAnnualLeaveEntitlement, getCarryOverLeave } = require('./utils/leaveCalculations');

const router = express.Router();

/**
 * Get leave balance for a user (simplified version using direct leaveBalance field)
 * GET /api/leave/balance/:userId? or GET /api/leave/balance
 */
router.get('/:userId?', requireAuth, asyncHandler(async (req, res) => {
  const db = req.app.locals.db;
  const targetUserId = req.params.userId || req.user.id;
  
  // Get user info
  const userObjectId = await getUserObjectId(db, targetUserId);
  if (!userObjectId) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = await db.collection('users').findOne({ _id: userObjectId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const currentYear = new Date().getFullYear();
  
  // Calculate total entitlement
  const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
  const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
  const carryOverLeave = await getCarryOverLeave(db, user._id, currentYear);
  const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
  
  // 신청 시점 차감 방식: users.leaveBalance 필드에서 직접 조회
  const remainingAnnualLeave = user.leaveBalance || 0;
  const usedAnnualLeave = Math.max(0, totalAnnualLeave - remainingAnnualLeave);
  
  const leaveBalance = {
    userId: user._id,
    year: currentYear,
    baseAnnualLeave,
    carryOverLeave,
    totalAnnualLeave,
    usedAnnualLeave,
    pendingAnnualLeave: 0, // 이미 차감되어 있으므로 0
    remainingAnnualLeave,
    breakdown: {
      annual: { 
        base: baseAnnualLeave,
        carryOver: carryOverLeave,
        total: totalAnnualLeave, 
        used: usedAnnualLeave, 
        remaining: remainingAnnualLeave,
      }
    }
  };

  res.json({
    success: true,
    data: leaveBalance
  });
}));

module.exports = router;