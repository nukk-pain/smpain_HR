const BaseRepository = require('./BaseRepository');
const { ObjectId } = require('mongodb');

class PayrollRepository extends BaseRepository {
  constructor() {
    super('payroll');
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