// Database indexes for performance optimization
const { connectToDatabase } = require('../utils/database');

/**
 * Create optimized indexes for the HR application
 * Based on query patterns identified in the refactored code
 */
async function createOptimizedIndexes() {
  try {
    const { db } = await connectToDatabase();
    
    console.log('Creating optimized database indexes...');
    
    // Users collection indexes
    await createUsersIndexes(db);
    
    // Leave requests collection indexes  
    await createLeaveRequestsIndexes(db);
    
    // Departments collection indexes
    await createDepartmentsIndexes(db);
    
    // Payroll collections indexes
    await createPayrollIndexes(db);
    
    // Sessions collection indexes (for session store)
    await createSessionsIndexes(db);
    
    console.log('✅ All database indexes created successfully');
    
    // Return index analysis
    return await analyzeIndexUsage(db);
    
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Create indexes for users collection
 */
async function createUsersIndexes(db) {
  const users = db.collection('users');
  
  // Primary query patterns
  await users.createIndex({ username: 1 }, { unique: true, name: 'idx_username_unique' });
  await users.createIndex({ employeeId: 1 }, { unique: true, sparse: true, name: 'idx_employeeId_unique' });
  
  // Filtering and sorting patterns
  await users.createIndex({ role: 1, isActive: 1 }, { name: 'idx_role_active' });
  await users.createIndex({ department: 1, isActive: 1 }, { name: 'idx_department_active' });
  await users.createIndex({ isActive: 1, createdAt: -1 }, { name: 'idx_active_created_desc' });
  
  // Leave balance queries
  await users.createIndex({ leaveBalance: 1, isActive: 1 }, { name: 'idx_leave_balance_active' });
  
  // Manager queries
  await users.createIndex({ role: 1, department: 1 }, { name: 'idx_role_department' });
  
  // Name search (for autocomplete)
  await users.createIndex({ name: 'text' }, { name: 'idx_name_text' });
  
  console.log('✅ Users collection indexes created');
}

/**
 * Create indexes for leave_requests collection
 */
async function createLeaveRequestsIndexes(db) {
  const leaveRequests = db.collection('leave_requests');
  
  // Primary query patterns
  await leaveRequests.createIndex({ userId: 1, status: 1 }, { name: 'idx_user_status' });
  await leaveRequests.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_created_desc' });
  
  // Date range queries (most common)
  await leaveRequests.createIndex({ startDate: 1, endDate: 1 }, { name: 'idx_date_range' });
  await leaveRequests.createIndex({ userId: 1, startDate: 1, endDate: 1 }, { name: 'idx_user_date_range' });
  
  // Conflict detection queries
  await leaveRequests.createIndex({ 
    userId: 1, 
    status: 1, 
    startDate: 1, 
    endDate: 1 
  }, { name: 'idx_conflict_detection' });
  
  // Approval workflow queries
  await leaveRequests.createIndex({ status: 1, requestDate: -1 }, { name: 'idx_status_request_date' });
  await leaveRequests.createIndex({ approverId: 1, approvedAt: -1 }, { name: 'idx_approver_approved_date' });
  
  // Department manager queries
  await leaveRequests.createIndex({ 
    'user.department': 1, 
    status: 1, 
    createdAt: -1 
  }, { name: 'idx_dept_status_created' });
  
  // Monthly/yearly reports
  await leaveRequests.createIndex({ 
    userId: 1, 
    status: 1,
    $expr: { 
      $and: [
        { $eq: [{ $year: '$startDate' }, '$$year'] },
        { $eq: [{ $month: '$startDate' }, '$$month'] }
      ]
    }
  }, { name: 'idx_user_status_month' });
  
  // Compound index for common filter combinations
  await leaveRequests.createIndex({ 
    userId: 1, 
    status: 1, 
    startDate: 1 
  }, { name: 'idx_user_status_start_date' });
  
  console.log('✅ Leave requests collection indexes created');
}

/**
 * Create indexes for departments collection
 */
async function createDepartmentsIndexes(db) {
  const departments = db.collection('departments');
  
  try {
    // Primary query patterns
    await departments.createIndex({ code: 1 }, { unique: true, name: 'idx_code_unique' });
    
    // Department name unique index with case-insensitive collation
    await departments.createIndex(
      { name: 1 }, 
      { 
        unique: true, 
        name: 'idx_department_name_unique',
        collation: { locale: 'ko', strength: 2 } // Case insensitive Korean collation
      }
    );
    
    // Filtering patterns
    await departments.createIndex({ isActive: 1, name: 1 }, { name: 'idx_active_name' });
    await departments.createIndex({ managerId: 1 }, { sparse: true, name: 'idx_manager' });
    await departments.createIndex({ supervisorId: 1 }, { sparse: true, name: 'idx_supervisor' });
    
    // Text search for department names
    await departments.createIndex({ name: 'text', description: 'text' }, { name: 'idx_text_search' });
    
    console.log('✅ Departments collection indexes created');
  } catch (error) {
    if (error.code !== 85) { // IndexOptionsConflict - ignore if index already exists
      console.error('❌ Departments index creation failed:', error);
      throw error;
    }
    console.log('✅ Department indexes already exist');
  }
}

/**
 * Create indexes for payroll collections
 */
async function createPayrollIndexes(db) {
  const payroll = db.collection('payroll');
  
  // Primary query patterns
  await payroll.createIndex({ employeeId: 1, yearMonth: 1 }, { unique: true, name: 'idx_employee_yearmonth_unique' });
  await payroll.createIndex({ yearMonth: 1, employeeId: 1 }, { name: 'idx_yearmonth_employee' });
  
  // Reporting queries
  await payroll.createIndex({ yearMonth: 1, department: 1 }, { name: 'idx_yearmonth_department' });
  await payroll.createIndex({ employeeId: 1, createdAt: -1 }, { name: 'idx_employee_created_desc' });
  
  // Salary analysis
  await payroll.createIndex({ yearMonth: 1, totalSalary: -1 }, { name: 'idx_yearmonth_salary_desc' });
  
  console.log('✅ Payroll collection indexes created');
}

/**
 * Create indexes for sessions collection (connect-mongo)
 */
async function createSessionsIndexes(db) {
  const sessions = db.collection('sessions');
  
  // Session cleanup and expiration
  await sessions.createIndex({ expires: 1 }, { 
    expireAfterSeconds: 0, 
    name: 'idx_expires_ttl' 
  });
  
  // Session lookup
  await sessions.createIndex({ _id: 1 }, { name: 'idx_session_id' });
  
  console.log('✅ Sessions collection indexes created');
}

/**
 * Analyze index usage and effectiveness
 */
async function analyzeIndexUsage(db) {
  const analysis = {
    collections: {},
    recommendations: []
  };
  
  const collections = ['users', 'leave_requests', 'departments', 'payroll', 'sessions'];
  
  for (const collectionName of collections) {
    const collection = db.collection(collectionName);
    
    // Get index statistics
    const indexStats = await collection.aggregate([
      { $indexStats: {} }
    ]).toArray();
    
    // Get collection statistics
    const collStats = await collection.stats();
    
    analysis.collections[collectionName] = {
      documentCount: collStats.count,
      storageSize: collStats.storageSize,
      totalIndexSize: collStats.totalIndexSize,
      indexes: indexStats.map(stat => ({
        name: stat.name,
        usageCount: stat.accesses?.ops || 0,
        lastUsed: stat.accesses?.since || null
      }))
    };
    
    // Generate recommendations
    const unusedIndexes = indexStats.filter(stat => 
      (stat.accesses?.ops || 0) === 0 && stat.name !== '_id_'
    );
    
    if (unusedIndexes.length > 0) {
      analysis.recommendations.push({
        collection: collectionName,
        type: 'unused_indexes',
        message: `Consider removing unused indexes: ${unusedIndexes.map(i => i.name).join(', ')}`
      });
    }
  }
  
  return analysis;
}

/**
 * Drop all custom indexes (for cleanup/reset)
 */
async function dropCustomIndexes() {
  try {
    const { db } = await connectToDatabase();
    
    const collections = ['users', 'leave_requests', 'departments', 'payroll', 'sessions'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      
      for (const index of indexes) {
        if (index.name !== '_id_') {
          try {
            await collection.dropIndex(index.name);
            console.log(`Dropped index ${index.name} from ${collectionName}`);
          } catch (error) {
            console.warn(`Could not drop index ${index.name}: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ All custom indexes dropped');
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
    throw error;
  }
}

/**
 * Optimize existing queries with hints
 */
function getQueryOptimizations() {
  return {
    // Users queries
    findActiveUsers: { isActive: 1, createdAt: -1 },
    findUsersByDepartment: { department: 1, isActive: 1 },
    findUsersByRole: { role: 1, isActive: 1 },
    searchUsersByName: { name: 'text' },
    
    // Leave requests queries
    findUserLeaveRequests: { userId: 1, status: 1 },
    findPendingRequests: { status: 1, createdAt: -1 },
    findRequestsByDateRange: { startDate: 1, endDate: 1 },
    detectLeaveConflicts: { 
      userId: 1, 
      status: 1, 
      startDate: 1, 
      endDate: 1 
    },
    
    // Departments queries
    findActiveDepartments: { isActive: 1, name: 1 },
    findDepartmentByCode: { code: 1 },
    
    // Payroll queries
    findPayrollByMonth: { yearMonth: 1, employeeId: 1 },
    findEmployeePayrollHistory: { employeeId: 1, createdAt: -1 }
  };
}

/**
 * Create unique index for department names with case-insensitive collation
 * @param {Object} db - Database instance
 */
async function createDepartmentNameUniqueIndex(db = null) {
  try {
    const database = db || (await connectToDatabase()).db;
    const departments = database.collection('departments');
    
    // Department name unique index with case-insensitive collation
    await departments.createIndex(
      { name: 1 }, 
      { 
        unique: true, 
        name: 'idx_department_name_unique',
        collation: { locale: 'ko', strength: 2 } // Case insensitive Korean collation
      }
    );
    
    console.log('✅ Department name unique index created');
    return { success: true, indexName: 'idx_department_name_unique' };
    
  } catch (error) {
    if (error.code === 85) { // IndexOptionsConflict - index already exists
      console.log('✅ Department name unique index already exists');
      return { success: true, indexName: 'idx_department_name_unique', existed: true };
    }
    console.error('❌ Department name unique index creation failed:', error);
    throw error;
  }
}

module.exports = {
  createOptimizedIndexes,
  dropCustomIndexes,
  analyzeIndexUsage,
  getQueryOptimizations,
  createDepartmentNameUniqueIndex
};