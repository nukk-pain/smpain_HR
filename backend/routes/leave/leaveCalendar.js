const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId } = require('./utils/leaveHelpers');

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
  const userId = req.user.id;
  
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
  const users = await db.collection('users').find({ 
    _id: { $in: userIds }
  }).toArray();
  
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
      reason: request.reason,
      isMyRequest: request.userId?.toString() === userObjectId.toString()
    };
  });
  
  res.json({
    success: true,
    data: calendarEvents
  });
}));

module.exports = router;