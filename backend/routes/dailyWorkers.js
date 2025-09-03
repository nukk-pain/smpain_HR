/**
 * AI-HEADER
 * @intent: API endpoints for daily worker salary management
 * @domain_meaning: Routes for managing temporary/daily worker compensation
 * @misleading_names: None
 * @data_contracts: RESTful API with JSON request/response
 * @pii: Worker names stored, no sensitive personal data
 * @invariants: Only admins can manage daily workers
 * @rag_keywords: daily worker routes, temporary worker API, salary management
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { requireAuth, requirePermission } = require('../middleware/permissions');

/**
 * Get daily workers for a specific month
 * @DomainMeaning: Retrieve all daily workers for given month
 * @SideEffects: Database read
 * @Invariants: Returns array (empty if no data)
 */
router.get('/daily-workers/:yearMonth', requireAuth, async (req, res) => {
  const { yearMonth } = req.params;
  const db = req.app.locals.db;

  try {
    const workers = await db.collection('daily_workers')
      .find({ yearMonth })
      .sort({ name: 1 })
      .toArray();

    res.json({
      success: true,
      data: workers
    });
  } catch (error) {
    console.error('Error fetching daily workers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily workers'
    });
  }
});

/**
 * Create new daily worker record
 * @DomainMeaning: Add new temporary worker salary entry
 * @SideEffects: Database write, audit log
 * @Invariants: Admin only, validates required fields
 */
router.post('/daily-workers', requireAuth, requirePermission('payroll:manage'), async (req, res) => {
  const { name, salary_in_10k, salary, yearMonth, notes } = req.body;
  const db = req.app.locals.db;

  // Validation
  if (!name || !salary_in_10k || !yearMonth) {
    return res.status(400).json({
      success: false,
      error: 'Name, salary, and yearMonth are required'
    });
  }

  try {
    const worker = {
      name,
      salary_in_10k: Number(salary_in_10k),
      salary: Number(salary_in_10k) * 10000,
      yearMonth,
      notes: notes || '',
      createdAt: new Date(),
      createdBy: req.user.id,
      updatedAt: new Date(),
      updatedBy: req.user.id
    };

    const result = await db.collection('daily_workers').insertOne(worker);

    // Audit log
    await db.collection('audit_logs').insertOne({
      action: 'daily_worker_create',
      workerId: result.insertedId,
      workerName: name,
      yearMonth,
      performedBy: new ObjectId(req.user.id),
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: { ...worker, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating daily worker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create daily worker'
    });
  }
});

/**
 * Bulk save daily workers (insert new and update existing)
 * @DomainMeaning: Save multiple daily workers at once
 * @SideEffects: Replaces all daily workers for the month
 * @Invariants: Admin only, validates all workers
 */
router.post('/daily-workers/bulk', requireAuth, requirePermission('payroll:manage'), async (req, res) => {
  const { yearMonth, workers } = req.body;
  const db = req.app.locals.db;

  // Validation
  if (!yearMonth || !Array.isArray(workers)) {
    return res.status(400).json({
      success: false,
      error: 'YearMonth and workers array are required'
    });
  }

  // MongoDB session for transaction
  const client = db.client;
  if (!client) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      // Delete existing workers for this month
      await db.collection('daily_workers').deleteMany(
        { yearMonth },
        { session }
      );

      // Insert new workers if any
      if (workers.length > 0) {
        const workersToInsert = workers.map(w => ({
          name: w.name,
          salary_in_10k: Number(w.salary_in_10k),
          salary: Number(w.salary_in_10k) * 10000,
          yearMonth,
          notes: w.notes || '',
          createdAt: new Date(),
          createdBy: req.user.id,
          updatedAt: new Date(),
          updatedBy: req.user.id
        }));

        await db.collection('daily_workers').insertMany(
          workersToInsert,
          { session }
        );

        // Audit log
        await db.collection('audit_logs').insertOne({
          action: 'daily_workers_bulk_save',
          yearMonth,
          workerCount: workers.length,
          performedBy: new ObjectId(req.user.id),
          timestamp: new Date()
        }, { session });
      }

      res.json({
        success: true,
        message: `${workers.length}명의 일용직 급여가 저장되었습니다`,
        count: workers.length
      });
    });
  } catch (error) {
    console.error('Error bulk saving daily workers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save daily workers'
    });
  } finally {
    await session.endSession();
  }
});

/**
 * Update daily worker record
 * @DomainMeaning: Modify existing daily worker salary entry
 * @SideEffects: Database write, audit log
 * @Invariants: Admin only, worker must exist
 */
router.put('/daily-workers/:id', requireAuth, requirePermission('payroll:manage'), async (req, res) => {
  const { id } = req.params;
  const { name, salary_in_10k, salary, yearMonth, notes } = req.body;
  const db = req.app.locals.db;

  try {
    const updateData = {
      name,
      salary_in_10k: Number(salary_in_10k),
      salary: Number(salary_in_10k) * 10000,
      yearMonth,
      notes: notes || '',
      updatedAt: new Date(),
      updatedBy: req.user.id
    };

    const result = await db.collection('daily_workers').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Daily worker not found'
      });
    }

    // Audit log
    await db.collection('audit_logs').insertOne({
      action: 'daily_worker_update',
      workerId: new ObjectId(id),
      workerName: name,
      changes: updateData,
      performedBy: new ObjectId(req.user.id),
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Daily worker updated successfully'
    });
  } catch (error) {
    console.error('Error updating daily worker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update daily worker'
    });
  }
});

/**
 * Delete daily worker record
 * @DomainMeaning: Remove daily worker entry
 * @SideEffects: Database delete, audit log
 * @Invariants: Admin only, soft delete optional
 */
router.delete('/daily-workers/:id', requireAuth, requirePermission('payroll:manage'), async (req, res) => {
  const { id } = req.params;
  const db = req.app.locals.db;

  try {
    // Get worker info for audit log
    const worker = await db.collection('daily_workers').findOne({ _id: new ObjectId(id) });
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Daily worker not found'
      });
    }

    // Delete the worker
    await db.collection('daily_workers').deleteOne({ _id: new ObjectId(id) });

    // Audit log
    await db.collection('audit_logs').insertOne({
      action: 'daily_worker_delete',
      workerId: new ObjectId(id),
      workerName: worker.name,
      yearMonth: worker.yearMonth,
      deletedData: worker,
      performedBy: new ObjectId(req.user.id),
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Daily worker deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting daily worker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete daily worker'
    });
  }
});

/**
 * Get monthly statistics including daily workers
 * @DomainMeaning: Calculate total salaries including temporary workers
 * @SideEffects: Database read from multiple collections
 * @Invariants: Returns comprehensive payroll statistics
 */
router.get('/stats-with-daily/:yearMonth', requireAuth, async (req, res) => {
  const { yearMonth } = req.params;
  const db = req.app.locals.db;

  try {
    // Get regular payroll total
    const payrollStats = await db.collection('payroll').aggregate([
      { $match: { yearMonth } },
      {
        $group: {
          _id: null,
          totalRegularSalary: { $sum: '$netPay' },
          employeeCount: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get daily worker total
    const dailyWorkerStats = await db.collection('daily_workers').aggregate([
      { $match: { yearMonth } },
      {
        $group: {
          _id: null,
          totalDailyWorkerSalary: { $sum: '$salary' },
          dailyWorkerCount: { $sum: 1 }
        }
      }
    ]).toArray();

    const regularStats = payrollStats[0] || { totalRegularSalary: 0, employeeCount: 0 };
    const dailyStats = dailyWorkerStats[0] || { totalDailyWorkerSalary: 0, dailyWorkerCount: 0 };

    res.json({
      success: true,
      data: {
        regularSalary: regularStats.totalRegularSalary,
        dailyWorkerSalary: dailyStats.totalDailyWorkerSalary,
        totalSalary: regularStats.totalRegularSalary + dailyStats.totalDailyWorkerSalary,
        employeeCount: regularStats.employeeCount,
        dailyWorkerCount: dailyStats.dailyWorkerCount,
        totalWorkerCount: regularStats.employeeCount + dailyStats.dailyWorkerCount
      }
    });
  } catch (error) {
    console.error('Error fetching payroll stats with daily workers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll statistics'
    });
  }
});

module.exports = router;