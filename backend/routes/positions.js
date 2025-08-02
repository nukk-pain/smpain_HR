const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/permissions');

function createPositionRoutes(db) {
  const router = express.Router();

  /**
   * Get all positions
   * GET /api/positions
   */
  router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const positions = await db.collection('positions')
      .find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray();
    
    const responseData = positions.map(position => ({
      ...position,
      id: position._id,
      title: position.name  // 프론트엔드 호환성을 위해 name을 title로도 제공
    }));

    // 캐시 비활성화
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      data: responseData
    });
  }));

  /**
   * Get position by ID
   * GET /api/positions/:id
   */
  router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid position ID' });
    }

    const position = await db.collection('positions').findOne({ _id: new ObjectId(id) });
    
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({
      success: true,
      data: {
        ...position,
        id: position._id,
        title: position.name  // 프론트엔드 호환성을 위해 name을 title로도 제공
      }
    });
  }));

  /**
   * Create new position
   * POST /api/positions
   */
  router.post('/', requireAuth, requirePermission('departments:manage'), asyncHandler(async (req, res) => {
    const { name, title, description, department, baseSalary } = req.body;
    const positionName = name || title;

    if (!positionName) {
      return res.status(400).json({ error: 'Position name is required' });
    }

    // Check if position already exists
    const existingPosition = await db.collection('positions').findOne({ 
      name: positionName.trim(),
      isActive: { $ne: false }
    });

    if (existingPosition) {
      return res.status(400).json({ error: 'Position with this name already exists' });
    }

    const newPosition = {
      name: positionName.trim(),
      description: description?.trim() || '',
      department: department?.trim() || '',
      baseSalary: baseSalary || 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.id
    };

    const result = await db.collection('positions').insertOne(newPosition);
    
    const createdPosition = await db.collection('positions').findOne({ _id: result.insertedId });

    res.status(201).json({
      success: true,
      message: 'Position created successfully',
      data: {
        ...createdPosition,
        id: createdPosition._id,
        title: createdPosition.name  // 프론트엔드 호환성을 위해 name을 title로도 제공
      }
    });
  }));

  /**
   * Update position
   * PUT /api/positions/:id
   */
  router.put('/:id', requireAuth, requirePermission('departments:manage'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, title, description, department, baseSalary } = req.body;
    const positionName = name || title;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid position ID' });
    }

    if (!positionName) {
      return res.status(400).json({ error: 'Position name is required' });
    }

    // Check if another position with same name exists
    const existingPosition = await db.collection('positions').findOne({
      name: positionName.trim(),
      _id: { $ne: new ObjectId(id) },
      isActive: { $ne: false }
    });

    if (existingPosition) {
      return res.status(400).json({ error: 'Position with this name already exists' });
    }

    const updateData = {
      name: positionName.trim(),
      description: description?.trim() || '',
      department: department?.trim() || '',
      baseSalary: baseSalary || 0,
      updatedAt: new Date(),
      updatedBy: req.user.id
    };

    const result = await db.collection('positions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    const updatedPosition = await db.collection('positions').findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Position updated successfully',
      data: {
        ...updatedPosition,
        id: updatedPosition._id,
        title: updatedPosition.name  // 프론트엔드 호환성을 위해 name을 title로도 제공
      }
    });
  }));

  /**
   * Delete position (soft delete)
   * DELETE /api/positions/:id
   */
  router.delete('/:id', requireAuth, requirePermission('departments:manage'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid position ID' });
    }

    // Check if position is being used by any users
    const usersWithPosition = await db.collection('users').countDocuments({ 
      position: { $exists: true, $ne: '' },
      isActive: { $ne: false }
    });

    if (usersWithPosition > 0) {
      // Get position name for better error message
      const position = await db.collection('positions').findOne({ _id: new ObjectId(id) });
      const positionName = position ? position.name : 'this position';
      
      return res.status(400).json({ 
        error: `Cannot delete position because ${usersWithPosition} user(s) are assigned to ${positionName}` 
      });
    }

    const result = await db.collection('positions').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: req.user.id
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({
      success: true,
      message: 'Position deleted successfully'
    });
  }));

  /**
   * Get positions by department
   * GET /api/positions/department/:department
   */
  router.get('/department/:department', requireAuth, asyncHandler(async (req, res) => {
    const { department } = req.params;

    const positions = await db.collection('positions')
      .find({ 
        department: department,
        isActive: { $ne: false }
      })
      .sort({ name: 1 })
      .toArray();

    res.json({
      success: true,
      data: positions.map(position => ({
        ...position,
        id: position._id,
        title: position.name  // 프론트엔드 호환성을 위해 name을 title로도 제공
      }))
    });
  }));

  return router;
}

module.exports = createPositionRoutes;