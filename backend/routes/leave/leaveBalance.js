const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, asyncHandler } = require('../../middleware/errorHandler');
const { getUserObjectId } = require('./utils/leaveHelpers');
const { calculateAnnualLeaveEntitlement, getCarryOverLeave } = require('./utils/leaveCalculations');

const router = express.Router();

// Get database instance from app
const getDb = (req) => req.app.locals.db;

/**
 * Get leave balance
 * GET /api/leave/balance
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const userId = req.session.user.id;
  const currentYear = new Date().getFullYear();
  
  // Handle case where userId might be a name instead of ObjectId
  let user;
  if (ObjectId.isValid(userId)) {
    user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  } else {
    // If userId is not valid ObjectId, try to find by name or username
    user = await db.collection('users').findOne({ 
      $or: [
        { name: userId },
        { username: userId }
      ]
    });
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Calculate annual leave entitlement including carry-over
  const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
  const baseAnnualLeave = calculateAnnualLeaveEntitlement(hireDate);
  const carryOverLeave = await getCarryOverLeave(db, user._id, currentYear);
  const totalAnnualLeave = baseAnnualLeave + carryOverLeave;
  
  // Get used annual leave using the actual user ObjectId
  const usedLeave = await db.collection('leaveRequests').aggregate([
    {
      $match: {
        userId: user._id,
        leaveType: 'annual',
        status: 'approved',
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
  
  // Get pending annual leave using the actual user ObjectId
  const pendingLeave = await db.collection('leaveRequests').aggregate([
    {
      $match: {
        userId: user._id,
        leaveType: 'annual',
        status: 'pending',
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
  
  const pendingAnnualLeave = pendingLeave.length > 0 ? pendingLeave[0].totalDays : 0;
  
  const leaveBalance = {
    userId: user._id,
    year: currentYear,
    baseAnnualLeave,
    carryOverLeave,
    totalAnnualLeave,
    usedAnnualLeave,
    pendingAnnualLeave,
    remainingAnnualLeave: totalAnnualLeave - usedAnnualLeave,
    breakdown: {
      annual: { 
        base: baseAnnualLeave,
        carryOver: carryOverLeave,
        total: totalAnnualLeave, 
        used: usedAnnualLeave, 
        remaining: totalAnnualLeave - usedAnnualLeave,
        allowedAdvanceUsage: 3
      },
      sick: { total: 12, used: 0, remaining: 12 },
      personal: { total: 3, used: 0, remaining: 3 },
      family: { total: 0, used: 0, remaining: 0 }
    }
  };
  
  res.json({
    success: true,
    data: leaveBalance
  });
}));

/**
 * Year-end carry-over processing
 * POST /api/leave/carry-over/:year
 */
router.post('/carry-over/:year', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { year } = req.params;
  const targetYear = parseInt(year);
  const nextYear = targetYear + 1;
  
  // Only admin can process carry-over
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  try {
    // Get all users except admin users
    const users = await db.collection('users').find({ 
      role: { $ne: 'admin' },
      isActive: { $ne: false }
    }).toArray();

    const carryOverResults = [];

    for (const user of users) {
      try {
        const hireDate = user.hireDate ? new Date(user.hireDate) : new Date(user.createdAt);
        const hireYear = hireDate.getFullYear();
        
        // Skip if user was hired after the target year
        if (hireYear > targetYear) {
          continue;
        }

        // Calculate target year's entitlement
        const targetYearDate = new Date(targetYear, 11, 31);
        const yearsOfService = Math.floor((targetYearDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
        
        let targetYearEntitlement;
        if (yearsOfService === 0) {
          const monthsWorked = Math.floor((targetYearDate - hireDate) / (1000 * 60 * 60 * 24 * 30.44));
          targetYearEntitlement = Math.min(monthsWorked, 11);
        } else {
          targetYearEntitlement = Math.min(15 + (yearsOfService - 1), 25);
        }

        // Get target year's used leave
        const usedLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: user._id,
              leaveType: 'annual',
              status: 'approved',
              startDate: { 
                $gte: new Date(`${targetYear}-01-01`), 
                $lte: new Date(`${targetYear}-12-31`) 
              }
            }
          },
          {
            $group: {
              _id: null,
              totalUsed: { $sum: '$daysCount' }
            }
          }
        ]).toArray();

        const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalUsed : 0;
        
        // Calculate unused leave
        const unusedLeave = Math.max(0, targetYearEntitlement - usedAnnualLeave);
        
        // Apply carry-over limit (maximum 15 days)
        const carryOverAmount = Math.min(unusedLeave, 15);

        if (carryOverAmount > 0) {
          // Check if carry-over already exists for this user and year
          const existingCarryOver = await db.collection('leaveAdjustments').findOne({
            userId: user._id,
            year: nextYear,
            adjustmentType: 'carry_over'
          });

          if (!existingCarryOver) {
            // Create carry-over adjustment record
            await db.collection('leaveAdjustments').insertOne({
              userId: user._id,
              year: nextYear,
              adjustmentType: 'carry_over',
              amount: carryOverAmount,
              reason: `Automatic carry-over from ${targetYear}`,
              createdAt: new Date(),
              createdBy: req.session.user.id
            });

            carryOverResults.push({
              userId: user._id,
              userName: user.name,
              targetYearEntitlement,
              usedAnnualLeave,
              unusedLeave,
              carryOverAmount,
              status: 'processed'
            });
          } else {
            carryOverResults.push({
              userId: user._id,
              userName: user.name,
              targetYearEntitlement,
              usedAnnualLeave,
              unusedLeave,
              carryOverAmount: existingCarryOver.amount,
              status: 'already_exists'
            });
          }
        } else {
          carryOverResults.push({
            userId: user._id,
            userName: user.name,
            targetYearEntitlement,
            usedAnnualLeave,
            unusedLeave,
            carryOverAmount: 0,
            status: 'no_carry_over'
          });
        }
      } catch (userError) {
        console.error(`Error processing carry-over for user ${user._id}:`, userError);
        carryOverResults.push({
          userId: user._id,
          userName: user.name,
          status: 'error',
          error: userError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Carry-over processing completed for year ${targetYear}`,
      data: {
        targetYear,
        nextYear,
        totalUsers: users.length,
        processed: carryOverResults.filter(r => r.status === 'processed').length,
        alreadyExists: carryOverResults.filter(r => r.status === 'already_exists').length,
        noCarryOver: carryOverResults.filter(r => r.status === 'no_carry_over').length,
        errors: carryOverResults.filter(r => r.status === 'error').length,
        results: carryOverResults
      }
    });

  } catch (error) {
    console.error('Carry-over processing error:', error);
    res.status(500).json({ error: 'Failed to process carry-over' });
  }
}));

module.exports = router;