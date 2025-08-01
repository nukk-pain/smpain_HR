const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId, requirePermission } = require('./utils/leaveHelpers');

const router = express.Router();

// Get database instance from app
const getDb = (req) => req.app.locals.db;

/**
 * Create leave exception
 * POST /api/leave/exceptions
 */
router.post('/', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { date, maxConcurrentLeaves, reason } = req.body;
  const createdBy = await getUserObjectId(db, req.user.id);
  
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

/**
 * Get leave exceptions
 * GET /api/leave/exceptions
 */
router.get('/', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
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

/**
 * Update leave exception
 * PUT /api/leave/exceptions/:id
 */
router.put('/:id', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
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

/**
 * Delete leave exception
 * DELETE /api/leave/exceptions/:id
 */
router.delete('/:id', requireAuth, requirePermission('leave:manage'), asyncHandler(async (req, res) => {
  const db = getDb(req);
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

module.exports = router;