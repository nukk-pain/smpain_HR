const BaseRepository = require('./BaseRepository');
const { ObjectId } = require('mongodb');

class PayrollRepository extends BaseRepository {
  constructor() {
    super('payroll');
  }

  /**
   * AI-HEADER Enhanced PayrollRepository Methods
   * DomainMeaning: Create payroll records with comprehensive schema including allowances and deductions
   * MisleadingNames: createPayroll vs createPayrollRecord - both create new payroll entries
   * SideEffects: Inserts record into payroll collection, calculates totals automatically
   * Invariants: netSalary = baseSalary + totalAllowances - totalDeductions
   * RAG_Keywords: payroll create, salary calculation, allowances deductions
   * DuplicatePolicy: canonical - this is the primary method for creating enhanced payroll records
   * FunctionIdentity: sha256(createPayroll_enhanced_schema)
   */
  async createPayroll(payrollData) {
    try {
      // Check for duplicate payroll record
      const existing = await this.findOne({
        userId: payrollData.userId,
        year: payrollData.year,
        month: payrollData.month
      });

      if (existing) {
        throw new Error('Payroll record already exists for this user and period');
      }

      // Calculate totals
      const totalAllowances = Object.values(payrollData.allowances || {}).reduce((sum, val) => sum + (val || 0), 0);
      const totalDeductions = Object.values(payrollData.deductions || {}).reduce((sum, val) => sum + (val || 0), 0);
      const netSalary = (payrollData.baseSalary || 0) + totalAllowances - totalDeductions;

      // Prepare full payroll record
      const fullRecord = {
        ...payrollData,
        totalAllowances,
        totalDeductions,
        netSalary,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.create(fullRecord);
      return result;
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw error;
      }
      throw new Error(`Error creating payroll record: ${error.message}`);
    }
  }

  /**
   * AI-HEADER 
   * DomainMeaning: Approve a pending payroll record and set approval metadata
   * MisleadingNames: approvePayroll vs markAsApproved - both update approval status
   * SideEffects: Updates payroll record status, sets approvedBy and approvedAt
   * Invariants: Can only approve pending payrolls, approver must be provided
   * RAG_Keywords: payroll approval, status update, workflow
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(approvePayroll_workflow)
   */
  async approvePayroll(payrollId, approverId) {
    try {
      const updateData = {
        paymentStatus: 'approved',
        approvedBy: new ObjectId(approverId),
        approvedAt: new Date(),
        updatedAt: new Date()
      };

      const updated = await this.update(payrollId, updateData);
      return updated;
    } catch (error) {
      throw new Error(`Error approving payroll: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Find payroll record for specific user and time period
   * MisleadingNames: findByUserAndPeriod vs findUserPayroll - both find by user/period
   * SideEffects: None - read-only operation
   * Invariants: userId must be ObjectId, year/month must be numbers
   * RAG_Keywords: payroll lookup, user period search
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(findByUserAndPeriod_enhanced)
   */
  async findByUserAndPeriod(userId, year, month) {
    try {
      return await this.findOne({
        userId: new ObjectId(userId),
        year: year,
        month: month
      });
    } catch (error) {
      throw new Error(`Error finding payroll by user and period: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Calculate aggregate payroll summary for a specific period
   * MisleadingNames: getPayrollSummaryByPeriod vs calculatePeriodSummary - both aggregate period data
   * SideEffects: None - read-only aggregation
   * Invariants: Returns null if no data found, all totals are numeric
   * RAG_Keywords: payroll summary, period aggregation, totals calculation
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(getPayrollSummaryByPeriod_aggregation)
   */
  async getPayrollSummaryByPeriod(year, month) {
    try {
      const pipeline = [
        {
          $match: {
            year: year,
            month: month
          }
        },
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            totalBaseSalary: { $sum: '$baseSalary' },
            totalAllowances: { $sum: '$totalAllowances' },
            totalDeductions: { $sum: '$totalDeductions' },
            totalNetPay: { $sum: '$netSalary' },
            averageBaseSalary: { $avg: '$baseSalary' },
            averageNetPay: { $avg: '$netSalary' }
          }
        }
      ];

      const result = await this.aggregate(pipeline);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new Error(`Error calculating payroll summary: ${error.message}`);
    }
  }

  async findByYearMonth(year, month) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    return await this.findAll({ yearMonth });
  }

  async findByUserAndMonth(userId, year, month) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    return await this.findOne({ 
      userId: new ObjectId(userId), 
      yearMonth 
    });
  }

  async findUserPayrollHistory(userId, limit = 12) {
    return await this.findAll(
      { userId: new ObjectId(userId) },
      { 
        sort: { yearMonth: -1 },
        limit 
      }
    );
  }

  async createOrUpdatePayroll(userId, year, month, payrollData) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    
    return await this.upsert(
      { 
        userId: new ObjectId(userId), 
        yearMonth 
      },
      {
        ...payrollData,
        userId: new ObjectId(userId),
        yearMonth,
        year,
        month
      }
    );
  }

  async bulkCreatePayroll(payrollDataArray) {
    const collection = await this.getCollection();
    
    const operations = payrollDataArray.map(data => ({
      updateOne: {
        filter: { 
          userId: new ObjectId(data.userId), 
          yearMonth: data.yearMonth 
        },
        update: { 
          $set: {
            ...data,
            userId: new ObjectId(data.userId),
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        upsert: true
      }
    }));

    return await collection.bulkWrite(operations);
  }

  async getPayrollSummary(year, month) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    
    const pipeline = [
      { $match: { yearMonth } },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalBaseSalary: { $sum: '$baseSalary' },
          totalIncentive: { $sum: '$incentive' },
          totalAllowances: { $sum: '$totalAllowances' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNetPay: { $sum: '$netPay' },
          averageBaseSalary: { $avg: '$baseSalary' },
          averageIncentive: { $avg: '$incentive' }
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    return result.length > 0 ? result[0] : null;
  }

  async getPayrollByDepartment(year, month) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    
    const pipeline = [
      { $match: { yearMonth } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user.department',
          employeeCount: { $sum: 1 },
          totalBaseSalary: { $sum: '$baseSalary' },
          totalIncentive: { $sum: '$incentive' },
          totalNetPay: { $sum: '$netPay' },
          averageSalary: { $avg: '$baseSalary' }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    return await this.aggregate(pipeline);
  }

  async getTopEarners(year, month, limit = 10) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    
    const pipeline = [
      { $match: { yearMonth } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userName: '$user.name',
          department: '$user.department',
          baseSalary: 1,
          incentive: 1,
          netPay: 1,
          totalEarnings: { $add: ['$baseSalary', '$incentive'] }
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: limit }
    ];

    return await this.aggregate(pipeline);
  }

  async getPayrollTrends(userId, months = 6) {
    const pipeline = [
      { $match: { userId: new ObjectId(userId) } },
      { $sort: { yearMonth: -1 } },
      { $limit: months },
      {
        $project: {
          yearMonth: 1,
          baseSalary: 1,
          incentive: 1,
          totalAllowances: 1,
          totalDeductions: 1,
          netPay: 1
        }
      },
      { $sort: { yearMonth: 1 } }
    ];

    return await this.aggregate(pipeline);
  }

  async findPendingPayrolls() {
    return await this.findAll({ status: 'pending' });
  }

  async markPayrollAsProcessed(payrollId) {
    return await this.update(payrollId, { 
      status: 'processed',
      processedAt: new Date()
    });
  }

  async bulkUpdateStatus(payrollIds, status) {
    const collection = await this.getCollection();
    return await collection.updateMany(
      { _id: { $in: payrollIds.map(id => new ObjectId(id)) } },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );
  }

  async getYearlyPayrollSummary(userId, year) {
    const pipeline = [
      {
        $match: {
          userId: new ObjectId(userId),
          year: year
        }
      },
      {
        $group: {
          _id: null,
          totalBaseSalary: { $sum: '$baseSalary' },
          totalIncentive: { $sum: '$incentive' },
          totalAllowances: { $sum: '$totalAllowances' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNetPay: { $sum: '$netPay' },
          months: { $push: '$month' }
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    return result.length > 0 ? result[0] : null;
  }

  async deletePayrollByMonth(year, month) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    return await this.deleteMany({ yearMonth });
  }

  async findIncompletePayrolls(year, month) {
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    
    return await this.findAll({
      yearMonth,
      $or: [
        { baseSalary: { $exists: false } },
        { baseSalary: null },
        { baseSalary: 0 }
      ]
    });
  }

  /**
   * Calculate payroll totals from base salary, allowances, and deductions
   * @param {Object} payrollData - Object with baseSalary, allowances, deductions
   * @returns {Object} - Object with totalAllowances, totalDeductions, netSalary
   */
  calculatePayrollTotals(payrollData) {
    const { baseSalary = 0, allowances = {}, deductions = {} } = payrollData;
    
    const totalAllowances = Object.values(allowances).reduce((sum, value) => sum + (value || 0), 0);
    const totalDeductions = Object.values(deductions).reduce((sum, value) => sum + (value || 0), 0);
    const netSalary = baseSalary + totalAllowances - totalDeductions;
    
    return {
      totalAllowances,
      totalDeductions,
      netSalary
    };
  }

  /**
   * Validate payroll data
   * @param {Object} data - Payroll data to validate
   * @param {boolean} strict - Whether to perform strict validation
   * @throws {Error} - If validation fails
   */
  validatePayrollData(data, strict = false) {
    const errors = [];
    
    if (strict) {
      if (!data.userId) errors.push('userId is required');
      if (!data.year) errors.push('year is required');
      if (!data.month) errors.push('month is required');
    }
    
    if (data.baseSalary !== undefined && data.baseSalary < 0) {
      errors.push('baseSalary cannot be negative');
    }
    
    if (data.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (data.year < 2020 || data.year > currentYear + 1) {
        errors.push('year must be between 2020 and next year');
      }
    }
    
    if (data.month !== undefined) {
      if (data.month < 1 || data.month > 12) {
        errors.push('month must be between 1 and 12');
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Check for duplicate payroll period
   * @param {Object} data - Object with userId, year, month
   * @throws {Error} - If duplicate exists
   */
  async checkDuplicatePeriod(data) {
    const existing = await this.findByUserAndPeriod(data.userId, data.year, data.month);
    if (existing) {
      throw new Error(`Payroll record already exists for ${data.year}-${data.month}`);
    }
  }

  /**
   * Validate payroll status transition
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - Target status
   * @throws {Error} - If transition is invalid
   */
  validateStatusTransition(fromStatus, toStatus) {
    const validTransitions = {
      'pending': ['approved', 'cancelled'],
      'approved': ['paid', 'cancelled'],
      'paid': [], // No transitions from paid
      'cancelled': [] // No transitions from cancelled
    };
    
    if (!validTransitions[fromStatus]) {
      throw new Error(`Invalid current status: ${fromStatus}`);
    }
    
    if (!validTransitions[fromStatus].includes(toStatus)) {
      throw new Error(`Invalid status transition from ${fromStatus} to ${toStatus}`);
    }
  }

  /**
   * Calculate monthly summary from payroll records
   * @param {Array} records - Array of payroll records
   * @returns {Object} - Summary statistics
   */
  calculateMonthlySummary(records) {
    if (!records || records.length === 0) {
      return {
        totalEmployees: 0,
        totalBaseSalary: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalNetSalary: 0,
        paidCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        cancelledCount: 0,
        averageNetSalary: 0
      };
    }
    
    const summary = {
      totalEmployees: records.length,
      totalBaseSalary: records.reduce((sum, r) => sum + (r.baseSalary || 0), 0),
      totalAllowances: records.reduce((sum, r) => sum + (r.totalAllowances || 0), 0),
      totalDeductions: records.reduce((sum, r) => sum + (r.totalDeductions || 0), 0),
      totalNetSalary: records.reduce((sum, r) => sum + (r.netSalary || 0), 0),
      paidCount: records.filter(r => r.paymentStatus === 'paid').length,
      pendingCount: records.filter(r => r.paymentStatus === 'pending').length,
      approvedCount: records.filter(r => r.paymentStatus === 'approved').length,
      cancelledCount: records.filter(r => r.paymentStatus === 'cancelled').length
    };
    
    summary.averageNetSalary = summary.totalNetSalary / summary.totalEmployees;
    
    return summary;
  }
}

module.exports = PayrollRepository;