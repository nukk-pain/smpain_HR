const BaseRepository = require('./BaseRepository');
const UserRepository = require('./UserRepository');
const LeaveRepository = require('./LeaveRepository');
const PayrollRepository = require('./PayrollRepository');

// Create singleton instances
const userRepository = new UserRepository();
const leaveRepository = new LeaveRepository();
const payrollRepository = new PayrollRepository();

module.exports = {
  BaseRepository,
  UserRepository,
  LeaveRepository,
  PayrollRepository,
  
  // Singleton instances for common use
  userRepository,
  leaveRepository,
  payrollRepository
};