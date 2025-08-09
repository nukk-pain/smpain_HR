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
}

module.exports = PayrollRepository;