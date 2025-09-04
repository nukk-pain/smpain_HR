/**
 * AI-HEADER
 * @intent: API endpoints for incentive configuration and calculation
 * @domain_meaning: Routes for managing employee commission settings and calculations
 * @misleading_names: None
 * @data_contracts: RESTful API with JSON request/response
 * @pii: References userId but no direct PII storage
 * @invariants: Only admins can modify configs, all users can view their own
 * @rag_keywords: incentive routes, commission API, calculation endpoints
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const IncentiveService = require('../services/IncentiveService');
const { requireAuth, requirePermission } = require('../middleware/permissions');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get incentive configuration for a user
 * @DomainMeaning: Retrieve employee's commission calculation settings
 * @SideEffects: Database read
 * @Invariants: User can view own config, admin can view all
 */
router.get('/config/:userId', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const db = req.app.locals.db;
  
  // Check permissions - users can view their own, admins can view all
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Permission denied' 
    });
  }

  try {
    const user = await db.collection('users').findOne({ 
      _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId 
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const service = new IncentiveService();
    const config = user.incentiveConfig || service.getDefaultConfig();

    res.json({
      success: true,
      data: {
        ...config,
        userName: user.name,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Error fetching incentive config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch incentive configuration' 
    });
  }
}));

/**
 * Update incentive configuration
 * @DomainMeaning: Modify employee's commission calculation settings
 * @SideEffects: Database write, audit log
 * @Invariants: Only admins can modify configurations
 */
router.put('/config/:userId', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type, parameters, customFormula, isActive, effectiveDate } = req.body;
  const db = req.app.locals.db;

  try {
    const service = new IncentiveService();
    
    // Build configuration object
    const config = {
      type: type || 'PERSONAL_PERCENT',
      parameters: parameters || {},
      customFormula: customFormula || null,
      isActive: isActive !== undefined ? isActive : true,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      lastModified: new Date(),
      modifiedBy: new ObjectId(req.user.id)
    };

    // Validate configuration
    const validation = service.validateConfig(config);
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration',
        details: validation.errors 
      });
    }

    // Update user document
    const result = await db.collection('users').updateOne(
      { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId },
      { 
        $set: { 
          incentiveConfig: config,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Log the change for audit
    await db.collection('audit_logs').insertOne({
      action: 'incentive_config_update',
      userId: new ObjectId(userId),
      performedBy: new ObjectId(req.user.id),
      changes: { 
        type: config.type,
        isActive: config.isActive,
        effectiveDate: config.effectiveDate
      },
      timestamp: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Incentive configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Error updating incentive config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update incentive configuration' 
    });
  }
}));

/**
 * Calculate incentive for a user
 * @DomainMeaning: Compute commission amount for specific period
 * @SideEffects: Database reads (user, salesData)
 * @Invariants: Returns non-negative amount
 */
router.post('/calculate', requireAuth, asyncHandler(async (req, res) => {
  const { userId, yearMonth } = req.body;
  const db = req.app.locals.db;

  // Validate input
  if (!userId || !yearMonth) {
    return res.status(400).json({ 
      success: false, 
      error: 'userId and yearMonth are required' 
    });
  }

  // Check permissions
  if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ 
      success: false, 
      error: 'Permission denied' 
    });
  }

  try {
    const service = new IncentiveService();
    const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    
    const result = await service.calculateIncentive(userObjectId, yearMonth, db);
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error calculating incentive:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to calculate incentive' 
    });
  }
}));

/**
 * Simulate incentive calculation
 * @DomainMeaning: Test commission calculation with hypothetical data
 * @SideEffects: None - pure calculation
 * @Invariants: Does not modify any data
 */
router.post('/simulate', requireAuth, asyncHandler(async (req, res) => {
  const { config, salesData } = req.body;

  // Validate input
  if (!config || !salesData) {
    return res.status(400).json({ 
      success: false, 
      error: 'config and salesData are required' 
    });
  }

  try {
    const service = new IncentiveService();
    
    // Validate configuration first
    const validation = service.validateConfig(config);
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration',
        details: validation.errors 
      });
    }

    const amount = await service.simulate(config, salesData);
    
    res.json({ 
      success: true, 
      amount,
      salesData,
      config: {
        type: config.type,
        parameters: config.parameters
      }
    });
  } catch (error) {
    console.error('Error in simulation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Simulation failed' 
    });
  }
}));

/**
 * Batch calculate incentives for all users
 * @DomainMeaning: Compute commissions for all active employees in a period
 * @SideEffects: Database reads, potential heavy computation
 * @Invariants: Admin only, returns array of results
 */
router.post('/batch-calculate', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
  const { yearMonth } = req.body;
  const db = req.app.locals.db;

  if (!yearMonth) {
    return res.status(400).json({ 
      success: false, 
      error: 'yearMonth is required' 
    });
  }

  try {
    const service = new IncentiveService();
    
    // Get all active users with incentive configs
    const users = await db.collection('users').find({
      isActive: true,
      'incentiveConfig.isActive': true
    }).toArray();

    const results = [];
    const errors = [];

    // Process each user
    for (const user of users) {
      try {
        const result = await service.calculateIncentive(user._id, yearMonth, db);
        results.push({
          userId: user._id,
          name: user.name,
          department: user.department,
          ...result
        });
      } catch (error) {
        console.error(`Error calculating for user ${user.name}:`, error);
        errors.push({
          userId: user._id,
          name: user.name,
          error: error.message
        });
      }
    }

    // Log batch calculation
    await db.collection('audit_logs').insertOne({
      action: 'batch_incentive_calculation',
      yearMonth,
      performedBy: new ObjectId(req.user.id),
      summary: {
        totalProcessed: results.length,
        totalErrors: errors.length,
        totalAmount: results.reduce((sum, r) => sum + r.amount, 0)
      },
      timestamp: new Date()
    });

    res.json({ 
      success: true, 
      data: {
        results,
        errors,
        summary: {
          processed: results.length,
          failed: errors.length,
          totalAmount: results.reduce((sum, r) => sum + r.amount, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error in batch calculation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Batch calculation failed' 
    });
  }
}));

/**
 * Get available incentive types
 * @DomainMeaning: List all supported commission calculation methods
 * @SideEffects: None
 * @Invariants: Returns static configuration
 */
router.get('/types', requireAuth, (req, res) => {
  const service = new IncentiveService();
  const types = service.getAvailableTypes();
  
  res.json({
    success: true,
    data: types
  });
});

/**
 * Validate formula
 * @DomainMeaning: Check if custom formula syntax is valid
 * @SideEffects: None - validation only
 * @Invariants: Does not execute formula, only validates
 */
router.post('/validate', requireAuth, asyncHandler(async (req, res) => {
  const { formula, testData } = req.body;

  if (!formula) {
    return res.status(400).json({ 
      success: false, 
      error: 'Formula is required' 
    });
  }

  try {
    const service = new IncentiveService();
    
    // Test the formula with sample data if provided
    if (testData) {
      const result = await service.simulate({
        type: 'CUSTOM',
        customFormula: formula,
        parameters: {}
      }, testData);
      
      res.json({
        success: true,
        isValid: true,
        testResult: result
      });
    } else {
      // Just validate syntax
      const config = {
        type: 'CUSTOM',
        customFormula: formula,
        parameters: {}
      };
      
      const validation = service.validateConfig(config);
      
      res.json({
        success: validation.isValid,
        isValid: validation.isValid,
        errors: validation.errors
      });
    }
  } catch (error) {
    res.json({
      success: false,
      isValid: false,
      error: error.message
    });
  }
}));

/**
 * Get incentive history for a user
 * @DomainMeaning: Retrieve past commission calculations
 * @SideEffects: Database read from payroll collection
 * @Invariants: Returns chronological history
 */
router.get('/history/:userId', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  const db = req.app.locals.db;

  // Check permissions
  if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ 
      success: false, 
      error: 'Permission denied' 
    });
  }

  try {
    const query = {
      userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    };

    // Add date filter if provided
    if (startDate || endDate) {
      query.yearMonth = {};
      if (startDate) query.yearMonth.$gte = startDate;
      if (endDate) query.yearMonth.$lte = endDate;
    }

    // Get incentive data from payroll records
    const history = await db.collection('payroll')
      .find(query)
      .sort({ yearMonth: -1 })
      .project({
        yearMonth: 1,
        incentive: 1,
        'allowances.incentive': 1,
        calculatedAt: 1
      })
      .limit(12) // Last 12 months
      .toArray();

    // Also try payroll_new collection
    const newHistory = await db.collection('payroll_new')
      .find(query)
      .sort({ yearMonth: -1 })
      .project({
        yearMonth: 1,
        'allowances.incentive': 1,
        calculatedAt: 1
      })
      .limit(12)
      .toArray();

    // Combine and format results
    const combinedHistory = [...history, ...newHistory]
      .map(record => ({
        yearMonth: record.yearMonth,
        amount: record.incentive || record.allowances?.incentive || 0,
        calculatedAt: record.calculatedAt
      }))
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

    res.json({
      success: true,
      data: combinedHistory
    });
  } catch (error) {
    console.error('Error fetching incentive history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch incentive history' 
    });
  }
}));

module.exports = router;