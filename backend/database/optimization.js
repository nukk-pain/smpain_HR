const { MongoClient } = require('mongodb');

class DatabaseOptimizer {
  constructor(db) {
    this.db = db;
  }

  // Create indexes for better query performance
  async createIndexes() {
    console.log('🔧 Creating database indexes...');

    try {
      // Users collection indexes
      await this.db.collection('users').createIndexes([
        { key: { username: 1 }, unique: true },
        { key: { employeeId: 1 }, unique: true },
        { key: { department: 1 } },
        { key: { role: 1 } },
        { key: { isActive: 1 } },
        { key: { createdAt: 1 } },
        { key: { name: 1 } },
        // Compound indexes for common queries
        { key: { department: 1, isActive: 1 } },
        { key: { role: 1, isActive: 1 } },
      ]);

      // Monthly payments collection indexes
      await this.db.collection('monthly_payments').createIndexes([
        { key: { employee_id: 1 } },
        { key: { year_month: 1 } },
        { key: { created_at: 1 } },
        // Compound indexes for payroll queries
        { key: { employee_id: 1, year_month: 1 }, unique: true },
        { key: { year_month: 1, employee_id: 1 } },
        { key: { year_month: -1 } }, // For latest records first
      ]);

      // Leave logs collection indexes
      await this.db.collection('leave_logs').createIndexes([
        { key: { user_id: 1 } },
        { key: { start_date: 1 } },
        { key: { end_date: 1 } },
        { key: { status: 1 } },
        { key: { leave_type: 1 } },
        { key: { created_at: 1 } },
        // Compound indexes for leave queries
        { key: { user_id: 1, start_date: 1 } },
        { key: { user_id: 1, status: 1 } },
        { key: { status: 1, start_date: 1 } },
        { key: { start_date: 1, end_date: 1 } }, // For date range queries
      ]);

      // Bonuses collection indexes
      await this.db.collection('bonuses').createIndexes([
        { key: { user_id: 1 } },
        { key: { year_month: 1 } },
        { key: { type: 1 } },
        { key: { approved: 1 } },
        { key: { date: 1 } },
        { key: { created_at: 1 } },
        // Compound indexes
        { key: { user_id: 1, year_month: 1 } },
        { key: { year_month: 1, type: 1 } },
        { key: { approved: 1, year_month: 1 } },
      ]);

      // Sales data collection indexes
      await this.db.collection('sales_data').createIndexes([
        { key: { user_id: 1 } },
        { key: { year_month: 1 } },
        { key: { created_at: 1 } },
        { key: { updated_at: 1 } },
        // Compound indexes
        { key: { user_id: 1, year_month: 1 }, unique: true },
        { key: { year_month: 1, sales_amount: -1 } }, // For top performers
      ]);

      // Payroll uploads collection indexes
      await this.db.collection('payroll_uploads').createIndexes([
        { key: { year_month: 1 } },
        { key: { uploaded_at: 1 } },
        { key: { processed: 1 } },
        { key: { uploaded_by: 1 } },
        // Compound indexes
        { key: { year_month: 1, processed: 1 } },
        { key: { uploaded_at: -1 } }, // For latest uploads first
      ]);

      // Departments collection indexes
      await this.db.collection('departments').createIndexes([
        { key: { name: 1 }, unique: true },
        { key: { manager_id: 1 } },
        { key: { created_at: 1 } },
      ]);

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  // Analyze query performance
  async analyzePerformance() {
    console.log('📊 Analyzing database performance...');

    const collections = [
      'users', 'monthly_payments', 'leave_logs', 
      'bonuses', 'sales_data', 'payroll_uploads', 'departments'
    ];

    for (const collectionName of collections) {
      try {
        const collection = this.db.collection(collectionName);
        const stats = await collection.stats();
        
        console.log(`\n📁 Collection: ${collectionName}`);
        console.log(`   Documents: ${stats.count}`);
        console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   Average document size: ${stats.avgObjSize} bytes`);
        console.log(`   Indexes: ${stats.nindexes}`);
        console.log(`   Total index size: ${(stats.totalIndexSize / 1024).toFixed(2)} KB`);

        // List indexes
        const indexes = await collection.listIndexes().toArray();
        console.log('   Index details:');
        indexes.forEach(index => {
          console.log(`     - ${index.name}: ${JSON.stringify(index.key)}`);
        });

      } catch (error) {
        console.log(`   ⚠️ Could not analyze ${collectionName}: ${error.message}`);
      }
    }
  }

  // Optimize queries with aggregation pipelines
  getOptimizedPipelines() {
    return {
      // Monthly payroll summary with employee details
      monthlyPayrollSummary: (yearMonth) => [
        {
          $match: { year_month: yearMonth }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'employee_id',
            foreignField: '_id',
            as: 'employee'
          }
        },
        {
          $unwind: '$employee'
        },
        {
          $project: {
            employee_id: 1,
            employee_name: '$employee.name',
            department: '$employee.department',
            position: '$employee.position',
            base_salary: 1,
            incentive: 1,
            bonus_total: 1,
            award_total: 1,
            total_input: {
              $add: ['$base_salary', '$incentive', '$bonus_total', '$award_total']
            },
            actual_payment: 1,
            difference: {
              $subtract: ['$actual_payment', {
                $add: ['$base_salary', '$incentive', '$bonus_total', '$award_total']
              }]
            }
          }
        },
        {
          $sort: { department: 1, employee_name: 1 }
        }
      ],

      // Department statistics
      departmentStats: (yearMonth) => [
        {
          $match: { year_month: yearMonth }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'employee_id',
            foreignField: '_id',
            as: 'employee'
          }
        },
        {
          $unwind: '$employee'
        },
        {
          $group: {
            _id: '$employee.department',
            employee_count: { $sum: 1 },
            total_base_salary: { $sum: '$base_salary' },
            total_incentive: { $sum: '$incentive' },
            total_bonus: { $sum: '$bonus_total' },
            total_award: { $sum: '$award_total' },
            total_payroll: {
              $sum: {
                $add: ['$base_salary', '$incentive', '$bonus_total', '$award_total']
              }
            }
          }
        },
        {
          $project: {
            department: '$_id',
            employee_count: 1,
            total_base_salary: 1,
            total_incentive: 1,
            total_bonus: 1,
            total_award: 1,
            total_payroll: 1,
            average_payroll: {
              $divide: ['$total_payroll', '$employee_count']
            }
          }
        },
        {
          $sort: { total_payroll: -1 }
        }
      ],

      // Top performers by sales
      topPerformers: (yearMonth, limit = 10) => [
        {
          $match: { year_month: yearMonth }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'employee'
          }
        },
        {
          $unwind: '$employee'
        },
        {
          $lookup: {
            from: 'monthly_payments',
            let: { emp_id: '$user_id', ym: '$year_month' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$employee_id', '$$emp_id'] },
                      { $eq: ['$year_month', '$$ym'] }
                    ]
                  }
                }
              }
            ],
            as: 'payroll'
          }
        },
        {
          $unwind: { path: '$payroll', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            employee_id: '$user_id',
            employee_name: '$employee.name',
            department: '$employee.department',
            sales_amount: 1,
            target_amount: 1,
            achievement_rate: {
              $multiply: [
                { $divide: ['$sales_amount', '$target_amount'] },
                100
              ]
            },
            incentive: '$payroll.incentive',
            total_pay: {
              $add: [
                { $ifNull: ['$payroll.base_salary', 0] },
                { $ifNull: ['$payroll.incentive', 0] },
                { $ifNull: ['$payroll.bonus_total', 0] },
                { $ifNull: ['$payroll.award_total', 0] }
              ]
            }
          }
        },
        {
          $sort: { sales_amount: -1 }
        },
        {
          $limit: limit
        }
      ],

      // Monthly trends for the last 6 months
      monthlyTrends: (currentYearMonth) => {
        const [year, month] = currentYearMonth.split('-');
        const monthsBack = [];
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(parseInt(year), parseInt(month) - 1 - i, 1);
          const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsBack.push(ym);
        }

        return [
          {
            $match: { year_month: { $in: monthsBack } }
          },
          {
            $group: {
              _id: '$year_month',
              employee_count: { $sum: 1 },
              total_base_salary: { $sum: '$base_salary' },
              total_incentive: { $sum: '$incentive' },
              total_bonus: { $sum: '$bonus_total' },
              total_award: { $sum: '$award_total' },
              total_payroll: {
                $sum: {
                  $add: ['$base_salary', '$incentive', '$bonus_total', '$award_total']
                }
              }
            }
          },
          {
            $sort: { _id: 1 }
          }
        ];
      },

      // Employee leave balance calculation
      leaveBalance: (userId, year) => [
        {
          $match: {
            user_id: userId,
            start_date: {
              $gte: new Date(`${year}-01-01`),
              $lt: new Date(`${year + 1}-01-01`)
            },
            status: 'approved'
          }
        },
        {
          $group: {
            _id: {
              user_id: '$user_id',
              leave_type: '$leave_type'
            },
            total_days: {
              $sum: {
                $cond: [
                  '$half_day',
                  0.5,
                  {
                    $divide: [
                      { $subtract: ['$end_date', '$start_date'] },
                      86400000 // milliseconds in a day
                    ]
                  }
                ]
              }
            }
          }
        },
        {
          $group: {
            _id: '$_id.user_id',
            leave_breakdown: {
              $push: {
                type: '$_id.leave_type',
                days: '$total_days'
              }
            },
            total_used: { $sum: '$total_days' }
          }
        }
      ]
    };
  }

  // Clean up old data
  async cleanupOldData() {
    console.log('🧹 Cleaning up old data...');

    try {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      // Clean up old payroll uploads (keep for 2 years)
      const uploadsResult = await this.db.collection('payroll_uploads').deleteMany({
        uploaded_at: { $lt: twoYearsAgo }
      });

      console.log(`🗑️ Removed ${uploadsResult.deletedCount} old payroll uploads`);

      // Clean up old leave logs (keep for 2 years)
      const leaveResult = await this.db.collection('leave_logs').deleteMany({
        created_at: { $lt: twoYearsAgo }
      });

      console.log(`🗑️ Removed ${leaveResult.deletedCount} old leave logs`);

      // Archive old monthly payments instead of deleting
      const archiveDate = new Date();
      archiveDate.setFullYear(archiveDate.getFullYear() - 1);
      const archiveYearMonth = `${archiveDate.getFullYear()}-${String(archiveDate.getMonth() + 1).padStart(2, '0')}`;

      const paymentsResult = await this.db.collection('monthly_payments').updateMany(
        { year_month: { $lt: archiveYearMonth } },
        { $set: { archived: true, archived_at: new Date() } }
      );

      console.log(`📦 Archived ${paymentsResult.modifiedCount} old monthly payments`);

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // Database health check
  async healthCheck() {
    console.log('🔍 Performing database health check...');

    const checks = {
      connection: false,
      collections: 0,
      indexes: 0,
      dataIntegrity: true,
      performance: 'good'
    };

    try {
      // Check connection
      await this.db.admin().ping();
      checks.connection = true;

      // Count collections
      const collections = await this.db.listCollections().toArray();
      checks.collections = collections.length;

      // Count total indexes
      let totalIndexes = 0;
      for (const collection of collections) {
        const indexes = await this.db.collection(collection.name).listIndexes().toArray();
        totalIndexes += indexes.length;
      }
      checks.indexes = totalIndexes;

      // Check data integrity
      const users = await this.db.collection('users').countDocuments();
      const payments = await this.db.collection('monthly_payments').countDocuments();
      
      if (payments > users * 12) { // Assuming max 12 months per user
        checks.dataIntegrity = false;
      }

      // Performance check (average query time)
      const startTime = Date.now();
      await this.db.collection('users').findOne();
      const queryTime = Date.now() - startTime;
      
      if (queryTime > 100) {
        checks.performance = 'slow';
      } else if (queryTime > 50) {
        checks.performance = 'fair';
      }

      console.log('📊 Health Check Results:');
      console.log(`   Connection: ${checks.connection ? '✅' : '❌'}`);
      console.log(`   Collections: ${checks.collections}`);
      console.log(`   Indexes: ${checks.indexes}`);
      console.log(`   Data Integrity: ${checks.dataIntegrity ? '✅' : '⚠️'}`);
      console.log(`   Performance: ${checks.performance}`);
      console.log(`   Query Time: ${queryTime}ms`);

      return checks;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return { ...checks, error: error.message };
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = await this.db.stats();
      return {
        database: stats.db,
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize,
        avgObjSize: stats.avgObjSize
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }
}

module.exports = DatabaseOptimizer;