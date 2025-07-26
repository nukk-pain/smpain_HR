const BaseRepository = require('./BaseRepository');
const { ObjectId } = require('mongodb');

class LeaveRepository extends BaseRepository {
  constructor() {
    super('leaveRequests');
  }

  async findByUserId(userId) {
    return await this.findAll({ userId: new ObjectId(userId) });
  }

  async findByStatus(status) {
    return await this.findAll({ status });
  }

  async findPendingRequests() {
    return await this.findAll({ status: 'pending' });
  }

  async findApprovedRequests() {
    return await this.findAll({ status: 'approved' });
  }

  async findUserPendingRequests(userId) {
    return await this.findAll({ 
      userId: new ObjectId(userId), 
      status: 'pending' 
    });
  }

  async findUserLeaveHistory(userId, options = {}) {
    const query = { userId: new ObjectId(userId) };
    
    if (options.status) {
      query.status = options.status;
    }

    if (options.startDate && options.endDate) {
      query.startDate = {
        $gte: new Date(options.startDate),
        $lte: new Date(options.endDate)
      };
    }

    return await this.findAll(query, {
      sort: { startDate: -1 },
      limit: options.limit,
      skip: options.skip
    });
  }

  async findLeaveRequestsInRange(startDate, endDate) {
    return await this.findAll({
      status: 'approved',
      $or: [
        {
          startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        },
        {
          endDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        },
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(endDate) }
        }
      ]
    });
  }

  async approveLeaveRequest(requestId, approverId, approvalNote = '') {
    return await this.update(requestId, {
      status: 'approved',
      approverId: new ObjectId(approverId),
      approvalDate: new Date(),
      approvalNote
    });
  }

  async rejectLeaveRequest(requestId, approverId, rejectionReason) {
    return await this.update(requestId, {
      status: 'rejected',
      approverId: new ObjectId(approverId),
      approvalDate: new Date(),
      rejectionReason
    });
  }

  async cancelLeaveRequest(requestId, cancelReason = '') {
    return await this.update(requestId, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason
    });
  }

  async getLeaveStatsByUser(userId, year) {
    const pipeline = [
      {
        $match: {
          userId: new ObjectId(userId),
          status: 'approved',
          startDate: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$startDate' },
          totalDays: { $sum: '$daysCount' },
          requestCount: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    return await this.aggregate(pipeline);
  }

  async getMonthlyLeaveStats(year, month) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const pipeline = [
      {
        $match: {
          status: 'approved',
          startDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalDays: { $sum: '$daysCount' },
          requestCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          department: '$user.department',
          totalDays: 1,
          requestCount: 1
        }
      }
    ];

    return await this.aggregate(pipeline);
  }

  async findConflictingRequests(userId, startDate, endDate, excludeRequestId) {
    const query = {
      userId: new ObjectId(userId),
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        },
        {
          endDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        },
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(endDate) }
        }
      ]
    };

    if (excludeRequestId) {
      query._id = { $ne: new ObjectId(excludeRequestId) };
    }

    return await this.findAll(query);
  }

  async getTotalUsedLeave(userId, year) {
    const pipeline = [
      {
        $match: {
          userId: new ObjectId(userId),
          status: 'approved',
          startDate: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$daysCount' }
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    return result.length > 0 ? result[0].totalDays : 0;
  }

  async getUpcomingLeaves(days = 7) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return await this.findAll({
      status: 'approved',
      startDate: {
        $gte: today,
        $lte: futureDate
      }
    }, {
      sort: { startDate: 1 }
    });
  }

  async bulkUpdateStatus(requestIds, status, updatedBy, note = '') {
    const collection = await this.getCollection();
    return await collection.updateMany(
      { _id: { $in: requestIds.map(id => new ObjectId(id)) } },
      {
        $set: {
          status,
          approverId: new ObjectId(updatedBy),
          approvalDate: new Date(),
          approvalNote: note,
          updatedAt: new Date()
        }
      }
    );
  }
}

module.exports = LeaveRepository;