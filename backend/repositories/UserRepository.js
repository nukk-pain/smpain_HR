const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByUsername(username) {
    return await this.findOne({ username });
  }

  async findByEmployeeId(employeeId) {
    return await this.findOne({ employeeId });
  }

  async findActiveUsers() {
    return await this.findAll({ isActive: { $ne: false } });
  }

  async findByDepartment(department) {
    return await this.findAll({ department });
  }

  async findByRole(role) {
    return await this.findAll({ role });
  }

  async createUser(userData) {
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    userData.isActive = userData.isActive !== false;
    userData.leaveBalance = userData.leaveBalance || 0;
    
    return await this.create(userData);
  }

  async updateUser(id, userData) {
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    return await this.update(id, userData);
  }

  async updateLeaveBalance(userId, newBalance) {
    return await this.update(userId, { leaveBalance: newBalance });
  }

  async incrementLeaveBalance(userId, amount) {
    const collection = await this.getCollection();
    return await collection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $inc: { leaveBalance: amount },
        $set: { updatedAt: new Date() }
      }
    );
  }

  async decrementLeaveBalance(userId, amount) {
    return await this.incrementLeaveBalance(userId, -amount);
  }

  async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async findUsersWithLeaveBalance(minBalance = 0) {
    return await this.findAll({
      leaveBalance: { $gte: minBalance },
      isActive: { $ne: false }
    });
  }

  async findUsersByManager(managerId) {
    return await this.findAll({ managerId });
  }

  async getUserStats() {
    const pipeline = [
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $ne: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ];

    return await this.aggregate(pipeline);
  }

  async findUsersForPayroll(year, month) {
    return await this.findAll({
      isActive: { $ne: false },
      $or: [
        { terminationDate: null },
        { terminationDate: { $gte: new Date(year, month - 1, 1) } }
      ]
    });
  }

  async updateBaseSalary(userId, baseSalary) {
    return await this.update(userId, { baseSalary });
  }

  async bulkUpdateDepartment(userIds, department) {
    const collection = await this.getCollection();
    return await collection.updateMany(
      { _id: { $in: userIds.map(id => new ObjectId(id)) } },
      { 
        $set: { 
          department,
          updatedAt: new Date()
        }
      }
    );
  }

  async deactivateUser(userId, terminationDate = new Date()) {
    return await this.update(userId, {
      isActive: false,
      terminationDate
    });
  }

  async reactivateUser(userId) {
    return await this.update(userId, {
      isActive: true,
      terminationDate: null
    });
  }
}

module.exports = UserRepository;