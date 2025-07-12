const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const IncentiveCalculator = require('./incentiveCalculator');
const ExcelProcessor = require('./excelProcessor');
const ReportGenerator = require('./reportGenerator');

// Phase 4 imports - System Integration & Optimization
const {
  errorHandler,
  asyncHandler,
  requireAuth,
  requireRole,
  requestLogger,
  securityHeaders,
  sanitizeInput,
  corsOptions
} = require('./middleware/errorHandler');
const { createValidator, userSchemas, payrollSchemas } = require('./middleware/validation');
const DatabaseOptimizer = require('./database/optimization');
const SecurityManager = require('./middleware/security');
const PerformanceMonitor = require('./middleware/performance');

const app = express();
const PORT = 5444;

// Initialize modules
const incentiveCalculator = new IncentiveCalculator();
const excelProcessor = new ExcelProcessor();
const reportGenerator = new ReportGenerator();

// Phase 4 module initialization
const securityManager = new SecurityManager();
const performanceMonitor = new PerformanceMonitor();
let dbOptimizer;

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const validation = excelProcessor.validateFile(file);
    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.errors.join(', ')), false);
    }
  }
});

// MongoDB connection setup
const isDevelopment = process.env.NODE_ENV !== 'production';
const MONGO_URL = isDevelopment 
  ? 'mongodb://localhost:27017' 
  : 'mongodb://192.168.0.30:27017';
const DB_NAME = 'SM_nomu';

let db;

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB at ${MONGO_URL}`);
    console.log(`📊 Using database: ${DB_NAME}`);
    
    // Phase 4 - Initialize database optimizer
    dbOptimizer = new DatabaseOptimizer(db);
    
    // Create indexes for performance optimization
    await dbOptimizer.createIndexes();
    
    // Initialize sample data
    await initializeData();
    
    // Update existing users with permissions
    await updateExistingUsersPermissions();
    
    // Run initial health check
    const healthCheck = await dbOptimizer.healthCheck();
    console.log('📊 Database health check completed');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Generate sequential employeeId
async function generateEmployeeId() {
  try {
    // Find the latest employeeId that matches the pattern EMP###
    const latestEmployee = await db.collection('users')
      .find({
        employeeId: { $regex: /^EMP\d{3}$/ }
      })
      .sort({ employeeId: -1 })
      .limit(1)
      .toArray();
    
    let nextNumber = 1;
    if (latestEmployee.length > 0) {
      // Extract the numeric part from the latest employeeId
      const latestId = latestEmployee[0].employeeId;
      const numberPart = parseInt(latestId.substring(3));
      nextNumber = numberPart + 1;
    }
    
    // Format as EMP### (3 digits with leading zeros)
    return `EMP${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating employeeId:', error);
    throw error;
  }
}

// Permission definitions
const PERMISSIONS = {
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  LEAVE_VIEW: 'leave:view',
  LEAVE_MANAGE: 'leave:manage',
  LEAVE_APPROVE: 'leave:approve',
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_MANAGE: 'payroll:manage',
  DEPARTMENTS_VIEW: 'departments:view',
  DEPARTMENTS_MANAGE: 'departments:manage',
  POSITIONS_VIEW: 'positions:view',
  POSITIONS_MANAGE: 'positions:manage',
  REPORTS_VIEW: 'reports:view',
  FILES_VIEW: 'files:view',
  FILES_MANAGE: 'files:manage',
  ADMIN_PERMISSIONS: 'admin:permissions'
};

// Role-based default permissions
const DEFAULT_PERMISSIONS = {
  admin: Object.values(PERMISSIONS), // 원장: 모든 권한
  manager: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.LEAVE_VIEW,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.POSITIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW
  ], // 관리자: 직원 및 휴가 관리만
  user: [
    PERMISSIONS.LEAVE_VIEW
  ] // 일반 사용자: 자신의 휴가만
};

// Permission check middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPermissions = req.session.user.permissions || [];
    const hasPermission = userPermissions.includes(permission);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Helper function to check if user has permission
const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

// Update existing users with permissions
async function updateExistingUsersPermissions() {
  try {
    const users = await db.collection('users').find({}).toArray();
    
    for (const user of users) {
      if (!user.permissions || user.permissions.length === 0) {
        const defaultPermissions = DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.user;
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { permissions: defaultPermissions } }
        );
        console.log(`✅ Updated permissions for user: ${user.name} (${user.role})`);
      }
    }
  } catch (error) {
    console.error('Error updating user permissions:', error);
  }
}

// Initialize sample data
async function initializeData() {
  try {
    // Check if admin user exists
    const adminExists = await db.collection('users').findOne({ username: 'admin' });
    
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin', 10);
      
      // Create admin user
      await db.collection('users').insertOne({
        username: 'admin',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'admin',
        isActive: true,
        hireDate: new Date('2024-01-01'),
        department: 'IT',
        position: 'System Administrator',
        employeeId: 'ADM001',
        accountNumber: '123-456-789012',
        managerId: null,
        contractType: 'regular',
        terminationDate: null,
        permissions: DEFAULT_PERMISSIONS.admin,
        createdAt: new Date()
      });
      
      console.log('✅ Admin user created (admin/admin)');
      
      // Create sample users
      const sampleUsers = [
        { 
          username: 'shin', 
          name: '신홍재', 
          role: 'user', 
          baseSalary: 3000000, 
          incentiveFormula: 'sales * 0.15',
          hireDate: new Date('2023-03-15'),
          department: '영업1팀',
          position: '대리',
          employeeId: 'EMP001',
          accountNumber: '111-222-333444',
          managerId: null,
          contractType: 'regular'
        },
        { 
          username: 'jung', 
          name: '정민정', 
          role: 'user', 
          baseSalary: 2800000, 
          incentiveFormula: 'sales * 0.13',
          hireDate: new Date('2023-06-01'),
          department: '영업2팀',
          position: '사원',
          employeeId: 'EMP002',
          accountNumber: '333-444-555666',
          managerId: null,
          contractType: 'regular'
        },
        { 
          username: 'oh', 
          name: '오현중', 
          role: 'manager', 
          baseSalary: 3500000, 
          incentiveFormula: 'sales > 5000000 ? sales * 0.3 : 0',
          hireDate: new Date('2022-01-10'),
          department: '영업1팀',
          position: '과장',
          employeeId: 'MGR001',
          accountNumber: '555-666-777888',
          managerId: null,
          contractType: 'regular'
        },
        { 
          username: 'kim', 
          name: '김채영', 
          role: 'user', 
          baseSalary: 2500000, 
          incentiveFormula: 'sales >= 8000000 ? 2000000 : 0',
          hireDate: new Date('2023-09-01'),
          department: '영업2팀',
          position: '사원',
          employeeId: 'EMP003',
          accountNumber: '777-888-999000',
          managerId: null,
          contractType: 'contract'
        }
      ];

      for (const user of sampleUsers) {
        const hashedPassword = bcrypt.hashSync('password123', 10);
        
        await db.collection('users').insertOne({
          ...user,
          password: hashedPassword,
          isActive: true,
          terminationDate: null,
          permissions: DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.user,
          createdAt: new Date()
        });
      }
      
      console.log('✅ Sample users created');
      
      // Create sample payroll data
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      const users = await db.collection('users').find({ role: { $ne: 'admin' } }).toArray();
      
      for (const user of users) {
        // Sample sales data
        const salesAmount = Math.floor(Math.random() * 10000000) + 1000000; // 1M-11M
        
        await db.collection('salesData').insertOne({
          userId: user._id,
          yearMonth: currentMonth,
          salesAmount: salesAmount,
          createdAt: new Date()
        });
        
        // Calculate incentive
        const incentive = calculateIncentive(salesAmount, user.incentiveFormula);
        
        await db.collection('monthlyPayments').insertOne({
          userId: user._id,
          yearMonth: currentMonth,
          baseSalary: user.baseSalary,
          incentive: incentive,
          bonus: 0,
          award: Math.random() > 0.7 ? 100000 : 0, // Random award
          totalInput: user.baseSalary + incentive + (Math.random() > 0.7 ? 100000 : 0),
          actualPayment: 0,
          difference: 0,
          createdAt: new Date()
        });
      }
      
      console.log('✅ Sample payroll data created');
    }

    // Initialize departments
    const departmentExists = await db.collection('departments').countDocuments();
    if (departmentExists === 0) {
      const departments = [
        { name: 'IT', description: 'Information Technology Department', managerId: null, isActive: true, createdAt: new Date() },
        { name: '영업1팀', description: 'Sales Team 1', managerId: null, isActive: true, createdAt: new Date() },
        { name: '영업2팀', description: 'Sales Team 2', managerId: null, isActive: true, createdAt: new Date() },
        { name: '인사부', description: 'Human Resources Department', managerId: null, isActive: true, createdAt: new Date() },
        { name: '회계부', description: 'Accounting Department', managerId: null, isActive: true, createdAt: new Date() }
      ];
      
      await db.collection('departments').insertMany(departments);
      console.log('✅ Sample departments created');
    }
    
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Helper function to calculate incentive using safe calculator
function calculateIncentive(sales, formula) {
  try {
    return incentiveCalculator.calculate(formula, { sales });
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 0;
  }
}

// Middleware
// Phase 4 - Enhanced middleware with security and performance monitoring
app.use(requestLogger); // Log all requests
app.use(securityHeaders); // Add security headers
app.use(sanitizeInput); // Sanitize user input
app.use(performanceMonitor.performanceMiddleware()); // Monitor performance
app.use(securityManager.securityMiddleware()); // Security checks

app.use(cors(corsOptions)); // Enhanced CORS configuration

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: 'test-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware functions are imported from middleware/errorHandler

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.collection('users').findOne({ 
      username: username, 
      isActive: true 
    });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions || []
    };

    const { password: _, ...userInfo } = user;
    res.json({ success: true, user: userInfo });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      // Validate ObjectId format before querying
      if (!ObjectId.isValid(req.session.user.id)) {
        console.error('Invalid ObjectId in session:', req.session.user.id);
        req.session.destroy();
        return res.json({ authenticated: false });
      }

      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(req.session.user.id),
        isActive: true 
      });
      
      if (user) {
        const { password: _, ...userInfo } = user;
        res.json({ authenticated: true, user: userInfo });
      } else {
        req.session.destroy();
        res.json({ authenticated: false });
      }
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    console.error('Get user error:', error);
    console.error('Session user:', req.session?.user);
    res.json({ authenticated: false });
  }
});

// Change password endpoint
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
    }

    // Get user from database
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // Verify current password
    const isCurrentPasswordValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // Hash new password
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

    // Update password in database
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedNewPassword, updatedAt: new Date() } }
    );

    res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
  }
});

// Payroll routes
app.get('/api/payroll/monthly/:year_month', requireAuth, async (req, res) => {
  try {
    const { year_month } = req.params;
    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    let matchCondition = { yearMonth: year_month };

    // If not admin/manager, only show own data
    if (userRole === 'user') {
      matchCondition.userId = new ObjectId(userId);
    }

    const payrollData = await db.collection('monthlyPayments').aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'salesData',
          let: { userId: '$userId', yearMonth: '$yearMonth' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$yearMonth', '$$yearMonth'] }
                  ]
                }
              }
            }
          ],
          as: 'salesData'
        }
      },
      {
        $project: {
          id: '$_id',
          user_id: '$userId',
          name: { $arrayElemAt: ['$user.name', 0] },
          username: { $arrayElemAt: ['$user.username', 0] },
          year_month: '$yearMonth',
          base_salary: '$baseSalary',
          incentive: '$incentive',
          bonus: '$bonus',
          award: '$award',
          total_input: '$totalInput',
          actual_payment: '$actualPayment',
          difference: '$difference',
          incentive_formula: { $arrayElemAt: ['$user.incentiveFormula', 0] },
          sales_amount: { $arrayElemAt: ['$salesData.salesAmount', 0] }
        }
      },
      { $sort: { name: 1 } }
    ]).toArray();

    res.json(payrollData);

  } catch (error) {
    console.error('Get monthly payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/payroll/monthly', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId, yearMonth, baseSalary, actualPayment } = req.body;

    if (!userId || !yearMonth) {
      return res.status(400).json({ error: 'User ID and year month are required' });
    }

    // Get user info
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get sales data for incentive calculation
    const salesData = await db.collection('salesData').findOne({
      userId: new ObjectId(userId),
      yearMonth: yearMonth
    });

    const incentive = salesData ? 
      calculateIncentive(salesData.salesAmount, user.incentiveFormula) : 0;

    // Get bonus and award totals
    const bonusTotal = await db.collection('bonuses').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          yearMonth: yearMonth,
          bonusType: 'bonus'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const awardTotal = await db.collection('bonuses').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          yearMonth: yearMonth,
          bonusType: 'award'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const bonus = bonusTotal.length > 0 ? bonusTotal[0].total : 0;
    const award = awardTotal.length > 0 ? awardTotal[0].total : 0;

    const paymentData = {
      userId: new ObjectId(userId),
      yearMonth: yearMonth,
      baseSalary: baseSalary || user.baseSalary || 0,
      incentive: incentive,
      bonus: bonus,
      award: award,
      totalInput: (baseSalary || user.baseSalary || 0) + incentive + bonus + award,
      actualPayment: actualPayment || 0,
      difference: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    paymentData.difference = paymentData.totalInput - paymentData.actualPayment;

    // Check if monthly payment already exists
    const existingPayment = await db.collection('monthlyPayments').findOne({
      userId: new ObjectId(userId),
      yearMonth: yearMonth
    });

    if (existingPayment) {
      // Update existing payment
      await db.collection('monthlyPayments').updateOne(
        {
          userId: new ObjectId(userId),
          yearMonth: yearMonth
        },
        { $set: paymentData }
      );
    } else {
      // Create new payment
      await db.collection('monthlyPayments').insertOne(paymentData);
    }

    res.json({ 
      success: true, 
      message: 'Monthly payment updated successfully' 
    });

  } catch (error) {
    console.error('Update monthly payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/payroll/monthly/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { baseSalary, actualPayment } = req.body;

    const existingPayment = await db.collection('monthlyPayments').findOne({
      _id: new ObjectId(id)
    });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Monthly payment not found' });
    }

    const updateData = {
      updatedAt: new Date()
    };

    if (baseSalary !== undefined) {
      updateData.baseSalary = parseFloat(baseSalary);
    }

    if (actualPayment !== undefined) {
      updateData.actualPayment = parseFloat(actualPayment);
    }

    // Recalculate total and difference
    const newBaseSalary = updateData.baseSalary || existingPayment.baseSalary;
    const newActualPayment = updateData.actualPayment || existingPayment.actualPayment;
    
    updateData.totalInput = newBaseSalary + existingPayment.incentive + existingPayment.bonus + existingPayment.award;
    updateData.difference = updateData.totalInput - newActualPayment;

    await db.collection('monthlyPayments').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json({ 
      success: true, 
      message: 'Monthly payment updated successfully' 
    });

  } catch (error) {
    console.error('Update monthly payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/payroll/monthly/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.collection('monthlyPayments').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Monthly payment not found' });
    }

    res.json({ 
      success: true, 
      message: 'Monthly payment deleted successfully' 
    });

  } catch (error) {
    console.error('Delete monthly payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/payroll/employee/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.session.user.role;
    const currentUserId = req.session.user.id;

    // Users can only view their own data, admins/managers can view all
    if (userRole === 'user' && userId !== currentUserId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const payrollHistory = await db.collection('monthlyPayments').aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'salesData',
          let: { userId: '$userId', yearMonth: '$yearMonth' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$yearMonth', '$$yearMonth'] }
                  ]
                }
              }
            }
          ],
          as: 'salesData'
        }
      },
      {
        $project: {
          id: '$_id',
          user_id: '$userId',
          name: { $arrayElemAt: ['$user.name', 0] },
          username: { $arrayElemAt: ['$user.username', 0] },
          year_month: '$yearMonth',
          base_salary: '$baseSalary',
          incentive: '$incentive',
          bonus: '$bonus',
          award: '$award',
          total_input: '$totalInput',
          actual_payment: '$actualPayment',
          difference: '$difference',
          incentive_formula: { $arrayElemAt: ['$user.incentiveFormula', 0] },
          sales_amount: { $arrayElemAt: ['$salesData.salesAmount', 0] },
          created_at: '$createdAt',
          updated_at: '$updatedAt'
        }
      },
      { $sort: { year_month: -1 } }
    ]).toArray();

    res.json(payrollHistory);

  } catch (error) {
    console.error('Get employee payroll history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payroll statistics for a specific year-month
app.get('/api/payroll/stats/:yearMonth', requireAuth, async (req, res) => {
  try {
    const { yearMonth } = req.params;
    
    // Aggregate payroll statistics for the given year-month
    const stats = await db.collection('monthlyPayments').aggregate([
      { $match: { yearMonth: yearMonth } },
      {
        $group: {
          _id: null,
          employeeCount: { $sum: 1 },
          totalBaseSalary: { $sum: '$baseSalary' },
          totalIncentive: { $sum: '$incentive' },
          totalBonus: { $sum: '$bonus' },
          totalAward: { $sum: '$award' },
          grandTotal: { $sum: '$actualPayment' }
        }
      }
    ]).toArray();

    // If no payroll data exists for the given month, return 404
    if (stats.length === 0) {
      return res.status(404).json({ 
        error: 'No payroll data found for the specified month',
        yearMonth: yearMonth 
      });
    }

    const result = stats[0];
    
    // Remove the _id field and return the statistics
    const response = {
      employeeCount: result.employeeCount,
      totalBaseSalary: result.totalBaseSalary || 0,
      totalIncentive: result.totalIncentive || 0,
      totalBonus: result.totalBonus || 0,
      totalAward: result.totalAward || 0,
      grandTotal: result.grandTotal || 0,
      yearMonth: yearMonth
    };

    res.json(response);
  } catch (error) {
    console.error('Get payroll stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin leave management routes
app.get('/api/admin/leave/overview', requireRole(['admin']), async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // 전체 직원 정보 조회 (admin 제외)
    const employees = await db.collection('users').find({
      isActive: true,
      role: { $ne: 'admin' }
    }).toArray();
    
    // 각 직원의 휴가 현황 계산
    const employeeLeaveOverview = await Promise.all(
      employees.map(async (employee) => {
        const userId = employee._id;
        
        // 근속년수 계산
        const hireDate = new Date(employee.hireDate);
        const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
        
        // 연차 계산
        const totalAnnualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
        
        // 사용한 연차 계산
        const usedLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'approved',
              startDate: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$daysCount' }
            }
          }
        ]).toArray();
        
        const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
        
        // 대기중인 연차 계산
        const pendingLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'pending',
              startDate: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$daysCount' }
            }
          }
        ]).toArray();
        
        const pendingAnnualLeave = pendingLeave.length > 0 ? pendingLeave[0].totalDays : 0;
        const remainingAnnualLeave = totalAnnualLeave - usedAnnualLeave;
        const usageRate = Math.round((usedAnnualLeave / totalAnnualLeave) * 100);
        
        // 위험도 계산 (미사용 연차 기준)
        let riskLevel = 'low';
        if (usageRate < 30) riskLevel = 'high';
        else if (usageRate < 60) riskLevel = 'medium';
        
        return {
          employeeId: employee._id,
          name: employee.name,
          department: employee.department || '미분류',
          position: employee.position || '직원',
          totalAnnualLeave,
          usedAnnualLeave,
          pendingAnnualLeave,
          remainingAnnualLeave,
          usageRate,
          riskLevel,
          yearsOfService
        };
      })
    );
    
    // 전체 통계 계산
    const totalEmployees = employeeLeaveOverview.length;
    const averageUsageRate = Math.round(
      employeeLeaveOverview.reduce((sum, emp) => sum + emp.usageRate, 0) / totalEmployees
    );
    const highRiskCount = employeeLeaveOverview.filter(emp => emp.riskLevel === 'high').length;
    
    res.json({
      success: true,
      data: {
        statistics: {
          totalEmployees,
          averageUsageRate,
          highRiskCount
        },
        employees: employeeLeaveOverview
      }
    });
    
  } catch (error) {
    console.error('Get admin leave overview error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 연차 조정 API
app.post('/api/admin/leave/adjust', requireRole(['admin']), async (req, res) => {
  try {
    const { employeeId, type, amount, reason } = req.body;
    const adminId = req.session.user.id;
    
    // 직원 정보 조회
    const employee = await db.collection('users').findOne({ 
      _id: new ObjectId(employeeId) 
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: '직원을 찾을 수 없습니다.'
      });
    }
    
    // 현재 연차 잔액 계산
    const currentYear = new Date().getFullYear();
    const hireDate = new Date(employee.hireDate);
    const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
    const baseTotalAnnualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
    
    // 기존 조정 내역 조회
    const existingAdjustments = await db.collection('leaveAdjustments').find({
      employeeId: new ObjectId(employeeId),
      year: currentYear
    }).toArray();
    
    const totalAdjustments = existingAdjustments.reduce((sum, adj) => {
      return sum + (adj.type === 'add' ? adj.amount : -adj.amount);
    }, 0);
    
    // 사용된 연차 조회
    const usedLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(employeeId),
          leaveType: 'annual',
          status: 'approved',
          startDate: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$daysCount' }
        }
      }
    ]).toArray();
    
    const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
    const currentTotalLeave = baseTotalAnnualLeave + totalAdjustments;
    const beforeBalance = currentTotalLeave - usedAnnualLeave;
    
    // 조정 후 잔액 계산
    const adjustmentAmount = type === 'add' ? amount : -amount;
    const afterBalance = beforeBalance + adjustmentAmount;
    
    // 조정 내역 저장
    const adjustmentRecord = {
      employeeId: new ObjectId(employeeId),
      employeeName: employee.name,
      type: type,
      amount: amount,
      reason: reason,
      adjustedBy: new ObjectId(adminId),
      adjustedByName: req.session.user.name,
      adjustedAt: new Date(),
      year: currentYear,
      beforeBalance: beforeBalance,
      afterBalance: afterBalance,
      beforeTotalLeave: currentTotalLeave,
      afterTotalLeave: currentTotalLeave + adjustmentAmount
    };
    
    await db.collection('leaveAdjustments').insertOne(adjustmentRecord);
    
    res.json({
      success: true,
      message: '연차 조정이 완료되었습니다.',
      data: {
        beforeBalance,
        afterBalance,
        adjustmentAmount,
        adjustmentRecord
      }
    });
    
  } catch (error) {
    console.error('Leave adjustment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 특정 직원의 연차 조정 히스토리 조회
app.get('/api/admin/leave/employee/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const currentYear = new Date().getFullYear();
    
    // 직원 정보 조회
    const employee = await db.collection('users').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: '직원을 찾을 수 없습니다.'
      });
    }
    
    // 기본 연차 계산
    const hireDate = new Date(employee.hireDate);
    const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
    const baseAnnualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
    
    // 조정 내역 조회
    const adjustments = await db.collection('leaveAdjustments').find({
      employeeId: new ObjectId(id),
      year: currentYear
    }).sort({ adjustedAt: -1 }).toArray();
    
    const totalAdjustments = adjustments.reduce((sum, adj) => {
      return sum + (adj.type === 'add' ? adj.amount : -adj.amount);
    }, 0);
    
    // 사용된 연차 조회
    const usedLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(id),
          leaveType: 'annual',
          status: 'approved',
          startDate: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$daysCount' }
        }
      }
    ]).toArray();
    
    const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
    
    // 이월 연차 (임시로 0으로 설정)
    const carryOverLeave = 0;
    
    const currentStatus = {
      employee: {
        id: employee._id,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        hireDate: employee.hireDate,
        yearsOfService
      },
      leaveStatus: {
        baseAnnualLeave,
        carryOverLeave,
        totalAdjustments,
        totalAnnualLeave: baseAnnualLeave + carryOverLeave + totalAdjustments,
        usedAnnualLeave,
        remainingAnnualLeave: baseAnnualLeave + carryOverLeave + totalAdjustments - usedAnnualLeave
      },
      adjustmentHistory: adjustments
    };
    
    res.json({
      success: true,
      data: currentStatus
    });
    
  } catch (error) {
    console.error('Get employee leave details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Leave routes
app.get('/api/leave', requireAuth, async (req, res) => {
  try {
    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    console.log('🔍 Leave requests - User:', userId, 'Role:', userRole);

    let matchCondition = {};

    // Role-based filtering
    if (userRole === 'user') {
      matchCondition.userId = new ObjectId(userId);
      console.log('🔒 User role detected - filtering by userId:', userId);
    } else {
      console.log('👔 Admin/Manager role detected - showing all requests');
    }

    const leaveRequests = await db.collection('leaveRequests').aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approver'
        }
      },
      {
        $project: {
          id: '$_id',
          userId: '$userId',
          userName: { $arrayElemAt: ['$user.name', 0] },
          userDepartment: { $arrayElemAt: ['$user.department', 0] },
          leaveType: '$leaveType',
          startDate: '$startDate',
          endDate: '$endDate',
          daysCount: '$daysCount',
          reason: '$reason',
          substituteEmployee: '$substituteEmployee',
          status: '$status',
          approvedBy: '$approvedBy',
          approvedByName: { $arrayElemAt: ['$approver.name', 0] },
          approvedAt: '$approvedAt',
          approvalComment: '$approvalComment',
          createdAt: '$createdAt',
          updatedAt: '$updatedAt'
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    res.json({
      success: true,
      data: leaveRequests
    });

  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE: 휴가 신청 생성
app.post('/api/leave', requireAuth, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, substituteEmployee } = req.body;
    const userId = req.session.user.id;
    
    // 날짜 유효성 검사
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
      return res.status(400).json({ 
        success: false, 
        error: '과거 날짜로는 휴가를 신청할 수 없습니다.' 
      });
    }
    
    if (start > end) {
      return res.status(400).json({ 
        success: false, 
        error: '시작일이 종료일보다 늦을 수 없습니다.' 
      });
    }
    
    // 휴가 일수 계산 (일요일 제외, 토요일 0.5일)
    let daysCount = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0) { 
        // 일요일 - 0일
      } else if (dayOfWeek === 6) { 
        // 토요일 - 0.5일
        daysCount += 0.5;
      } else { 
        // 월~금 - 1일
        daysCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 잔여 연차 확인 (연차인 경우)
    if (leaveType === 'annual') {
      const userInfo = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      const hireDate = new Date(userInfo.hireDate);
      const currentYear = new Date().getFullYear();
      const yearsWorked = currentYear - hireDate.getFullYear();
      
      // 연차 계산
      let totalAnnualLeave = 11; // 1년차 기본
      if (yearsWorked >= 1) {
        totalAnnualLeave = Math.min(15 + (yearsWorked - 1), 25); // 2년차 이상, 최대 25일
      }
      
      // 이미 사용된 연차 계산
      const usedAnnualLeave = await db.collection('leaveRequests').aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            leaveType: 'annual',
            status: { $in: ['approved', 'pending'] },
            startDate: { $regex: `^${currentYear}` }
          }
        },
        { $group: { _id: null, totalDays: { $sum: '$daysCount' } } }
      ]).toArray();
      
      const usedDays = usedAnnualLeave.length > 0 ? usedAnnualLeave[0].totalDays : 0;
      const remainingDays = totalAnnualLeave - usedDays;
      
      if (daysCount > remainingDays) {
        return res.status(400).json({
          success: false,
          error: `잔여 연차가 부족합니다. (신청: ${daysCount}일, 잔여: ${remainingDays}일)`
        });
      }
    }
    
    // 동일 기간 중복 신청 확인
    const existingRequest = await db.collection('leaveRequests').findOne({
      userId: new ObjectId(userId),
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: '해당 기간에 이미 신청된 휴가가 있습니다.'
      });
    }
    
    // 하루 한 명 제한 확인 (관리자 특별 허가일 제외)
    const sameDayRequests = await db.collection('leaveRequests').countDocuments({
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });
    
    if (sameDayRequests > 0) {
      return res.status(400).json({
        success: false,
        error: '해당 기간에 이미 다른 직원의 휴가가 승인되었습니다.'
      });
    }
    
    // 휴가 신청 생성
    const leaveRequest = {
      userId: new ObjectId(userId),
      leaveType,
      startDate,
      endDate,
      daysCount,
      reason,
      substituteEmployee: substituteEmployee || '',
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      approvalComment: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('leaveRequests').insertOne(leaveRequest);
    
    res.json({
      success: true,
      message: '휴가 신청이 완료되었습니다.',
      data: {
        id: result.insertedId,
        ...leaveRequest
      }
    });
    
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// UPDATE: 휴가 신청 수정
app.put('/api/leave/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveType, startDate, endDate, reason, substituteEmployee } = req.body;
    const userId = req.session.user.id;
    
    // 기존 신청 확인
    const existingRequest = await db.collection('leaveRequests').findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    });
    
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        error: '휴가 신청을 찾을 수 없습니다.'
      });
    }
    
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '승인 대기 중인 신청만 수정할 수 있습니다.'
      });
    }
    
    // 날짜 유효성 검사
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
      return res.status(400).json({ 
        success: false, 
        error: '과거 날짜로는 휴가를 신청할 수 없습니다.' 
      });
    }
    
    if (start > end) {
      return res.status(400).json({ 
        success: false, 
        error: '시작일이 종료일보다 늦을 수 없습니다.' 
      });
    }
    
    // 휴가 일수 계산 (일요일 제외, 토요일 0.5일)
    let daysCount = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0) { 
        // 일요일 - 0일
      } else if (dayOfWeek === 6) { 
        // 토요일 - 0.5일
        daysCount += 0.5;
      } else { 
        // 월~금 - 1일
        daysCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 업데이트 실행
    const updateResult = await db.collection('leaveRequests').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          leaveType,
          startDate,
          endDate,
          daysCount,
          reason,
          substituteEmployee: substituteEmployee || '',
          updatedAt: new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: '휴가 신청 수정에 실패했습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '휴가 신청이 수정되었습니다.'
    });
    
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE: 휴가 신청 취소
app.delete('/api/leave/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    
    // 기존 신청 확인
    const existingRequest = await db.collection('leaveRequests').findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    });
    
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        error: '휴가 신청을 찾을 수 없습니다.'
      });
    }
    
    if (existingRequest.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: '승인된 휴가는 취소할 수 없습니다. 관리자에게 문의하세요.'
      });
    }
    
    // 삭제 실행
    const deleteResult = await db.collection('leaveRequests').deleteOne({
      _id: new ObjectId(id)
    });
    
    if (deleteResult.deletedCount === 0) {
      return res.status(400).json({
        success: false,
        error: '휴가 신청 취소에 실패했습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '휴가 신청이 취소되었습니다.'
    });
    
  } catch (error) {
    console.error('Delete leave request error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 휴가 승인/거부
app.post('/api/leave/:id/approve', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'approve' or 'reject'
    const approverId = req.session.user.id;
    
    // 신청 확인
    const leaveRequest = await db.collection('leaveRequests').findOne({
      _id: new ObjectId(id)
    });
    
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        error: '휴가 신청을 찾을 수 없습니다.'
      });
    }
    
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '이미 처리된 신청입니다.'
      });
    }
    
    // 권한 확인 (관리자는 모든 신청, 매니저는 같은 부서만)
    if (req.session.user.role === 'manager') {
      const applicant = await db.collection('users').findOne({
        _id: leaveRequest.userId
      });
      
      if (applicant.department !== req.session.user.department) {
        return res.status(403).json({
          success: false,
          error: '같은 부서 직원의 휴가만 승인할 수 있습니다.'
        });
      }
    }
    
    // 승인/거부 처리
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: new ObjectId(approverId),
      approvedAt: new Date(),
      approvalComment: comment || '',
      updatedAt: new Date()
    };
    
    const updateResult = await db.collection('leaveRequests').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: '승인 처리에 실패했습니다.'
      });
    }
    
    res.json({
      success: true,
      message: action === 'approve' ? '휴가가 승인되었습니다.' : '휴가가 거부되었습니다.'
    });
    
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 휴가 잔여일수 조회
app.get('/api/leave/balance', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const currentYear = new Date().getFullYear();
    
    // 사용자 정보 조회
    const userInfo = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!userInfo) {
      return res.status(404).json({
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.'
      });
    }
    
    // 연차 계산
    const hireDate = new Date(userInfo.hireDate);
    const yearsWorked = currentYear - hireDate.getFullYear();
    
    let totalAnnualLeave = 11; // 1년차 기본
    if (yearsWorked >= 1) {
      totalAnnualLeave = Math.min(15 + (yearsWorked - 1), 25); // 2년차 이상, 최대 25일
    }
    
    // 사용된 연차 계산
    const usedAnnualLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          leaveType: 'annual',
          status: 'approved',
          startDate: { $regex: `^${currentYear}` }
        }
      },
      { $group: { _id: null, totalDays: { $sum: '$daysCount' } } }
    ]).toArray();
    
    // 대기 중인 연차 계산
    const pendingAnnualLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          leaveType: 'annual',
          status: 'pending',
          startDate: { $regex: `^${currentYear}` }
        }
      },
      { $group: { _id: null, totalDays: { $sum: '$daysCount' } } }
    ]).toArray();
    
    const usedDays = usedAnnualLeave.length > 0 ? usedAnnualLeave[0].totalDays : 0;
    const pendingDays = pendingAnnualLeave.length > 0 ? pendingAnnualLeave[0].totalDays : 0;
    const remainingDays = totalAnnualLeave - usedDays;
    
    // 다른 휴가 타입별 통계
    const leaveByType = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          status: 'approved',
          startDate: { $regex: `^${currentYear}` }
        }
      },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: '$daysCount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    const breakdown = {
      annual: { total: totalAnnualLeave, used: usedDays, remaining: remainingDays },
      personal: { total: 3, used: 0, remaining: 3, type: 'unpaid' }, // 무급 개인휴가
      family: { total: 999, used: 0, remaining: 999, approvalRequired: true } // 경조사는 부서장 승인 필요
    };
    
    // 타입별 사용량 업데이트
    leaveByType.forEach(type => {
      if (breakdown[type._id]) {
        breakdown[type._id].used = type.totalDays;
        if (type._id !== 'family') {
          breakdown[type._id].remaining = breakdown[type._id].total - type.totalDays;
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        userId,
        year: currentYear,
        totalAnnualLeave,
        usedAnnualLeave: usedDays,
        pendingAnnualLeave: pendingDays,
        remainingAnnualLeave: remainingDays,
        carryOverFromPreviousYear: 0, // 추후 구현
        breakdown
      }
    });
    
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 특정 사용자 휴가 잔여일수 조회 (관리자/매니저)
app.get('/api/leave/balance/:userId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId } = req.params;
    const currentYear = new Date().getFullYear();
    
    // 권한 확인 (매니저는 같은 부서만)
    if (req.session.user.role === 'manager') {
      const targetUser = await db.collection('users').findOne({
        _id: new ObjectId(userId)
      });
      
      if (!targetUser || targetUser.department !== req.session.user.department) {
        return res.status(403).json({
          success: false,
          error: '같은 부서 직원의 정보만 조회할 수 있습니다.'
        });
      }
    }
    
    // 사용자 정보 조회
    const userInfo = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!userInfo) {
      return res.status(404).json({
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.'
      });
    }
    
    // 연차 계산 (동일한 로직)
    const hireDate = new Date(userInfo.hireDate);
    const yearsWorked = currentYear - hireDate.getFullYear();
    
    let totalAnnualLeave = 11;
    if (yearsWorked >= 1) {
      totalAnnualLeave = Math.min(15 + (yearsWorked - 1), 25);
    }
    
    // 사용된 연차 계산
    const usedAnnualLeave = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          leaveType: 'annual',
          status: 'approved',
          startDate: { $regex: `^${currentYear}` }
        }
      },
      { $group: { _id: null, totalDays: { $sum: '$daysCount' } } }
    ]).toArray();
    
    const usedDays = usedAnnualLeave.length > 0 ? usedAnnualLeave[0].totalDays : 0;
    const remainingDays = totalAnnualLeave - usedDays;
    
    res.json({
      success: true,
      data: {
        userId,
        userName: userInfo.name,
        year: currentYear,
        totalAnnualLeave,
        usedAnnualLeave: usedDays,
        remainingAnnualLeave: remainingDays
      }
    });
    
  } catch (error) {
    console.error('Get user leave balance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 승인 대기 목록 조회
app.get('/api/leave/pending', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const userRole = req.session.user.role;
    const userDepartment = req.session.user.department;
    
    let matchCondition = { status: 'pending' };
    
    // 매니저는 같은 부서만
    if (userRole === 'manager') {
      const departmentUserIds = await db.collection('users').find({
        department: userDepartment
      }).project({ _id: 1 }).toArray();
      
      const userIds = departmentUserIds.map(user => user._id);
      matchCondition.userId = { $in: userIds };
    }
    
    const pendingRequests = await db.collection('leaveRequests').aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          id: '$_id',
          userId: '$userId',
          userName: { $arrayElemAt: ['$user.name', 0] },
          userDepartment: { $arrayElemAt: ['$user.department', 0] },
          leaveType: '$leaveType',
          startDate: '$startDate',
          endDate: '$endDate',
          daysCount: '$daysCount',
          reason: '$reason',
          substituteEmployee: '$substituteEmployee',
          createdAt: '$createdAt'
        }
      },
      { $sort: { createdAt: 1 } }
    ]).toArray();
    
    res.json({
      success: true,
      data: pendingRequests
    });
    
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Users routes
app.get('/api/users', requireAuth, requirePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
  try {
    const { department, position, isActive, search } = req.query;
    
    // Build query filter
    let query = {};
    
    if (department) {
      query.department = department;
    }
    
    if (position) {
      query.position = position;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await db.collection('users').find(query, {
      projection: { password: 0 }
    }).sort({ name: 1 }).toArray();

    // Calculate years of service for each user
    const now = new Date();
    const usersWithCalculations = users.map(user => {
      const yearsOfService = user.hireDate ? 
        Math.floor((now - new Date(user.hireDate)) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
      
      // Calculate annual leave entitlement (1년차: 11일, 2년차 이상: 15일 + (근속년수-1), 최대 25일)
      const annualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
      
      return {
        ...user,
        yearsOfService,
        annualLeave,
        // Add formatted dates
        hireDateFormatted: user.hireDate ? new Date(user.hireDate).toLocaleDateString('ko-KR') : null,
        terminationDateFormatted: user.terminationDate ? new Date(user.terminationDate).toLocaleDateString('ko-KR') : null
      };
    });

    res.json(usersWithCalculations);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate additional information
    const now = new Date();
    const yearsOfService = user.hireDate ? 
      Math.floor((now - new Date(user.hireDate)) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
    
    // 1년차: 11일, 2년차 이상: 15일 + (근속년수-1), 최대 25일
    const annualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
    
    // Get manager info if exists
    let manager = null;
    if (user.managerId) {
      manager = await db.collection('users').findOne(
        { _id: new ObjectId(user.managerId) },
        { projection: { _id: 1, name: 1, position: 1, department: 1 } }
      );
    }

    // Get subordinates
    const subordinates = await db.collection('users').find(
      { managerId: new ObjectId(id) },
      { projection: { _id: 1, name: 1, position: 1, department: 1 } }
    ).toArray();

    res.json({
      ...user,
      yearsOfService,
      annualLeave,
      manager,
      subordinates,
      hireDateFormatted: user.hireDate ? new Date(user.hireDate).toLocaleDateString('ko-KR') : null,
      terminationDateFormatted: user.terminationDate ? new Date(user.terminationDate).toLocaleDateString('ko-KR') : null
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', requireAuth, requirePermission(PERMISSIONS.USERS_CREATE), async (req, res) => {
  try {
    const { 
      username, 
      password, 
      name, 
      role, 
      hireDate, 
      department, 
      position, 
      employeeId, 
      accountNumber, 
      managerId, 
      contractType, 
      baseSalary, 
      incentiveFormula 
    } = req.body;

    // Validate required fields
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Generate employeeId if not provided
    let finalEmployeeId = employeeId;
    if (!finalEmployeeId) {
      finalEmployeeId = await generateEmployeeId();
    } else {
      // Check if provided employeeId already exists
      const existingEmployeeId = await db.collection('users').findOne({ employeeId: finalEmployeeId });
      if (existingEmployeeId) {
        return res.status(400).json({ error: 'Employee ID already exists' });
      }
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user object
    const userData = {
      username,
      password: hashedPassword,
      name,
      role,
      isActive: true,
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      department: department || '',
      position: position || '',
      employeeId: finalEmployeeId,
      accountNumber: accountNumber || '',
      managerId: managerId ? new ObjectId(managerId) : null,
      contractType: contractType || 'regular',
      baseSalary: baseSalary || 0,
      incentiveFormula: incentiveFormula || '',
      terminationDate: null,
      permissions: DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user,
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(userData);

    // Return user without password
    const { password: _, ...userResponse } = userData;
    res.json({
      success: true,
      user: { ...userResponse, _id: result.insertedId },
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.session.user.role;
    
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.password;
    delete updateData.createdAt;
    delete updateData.yearsOfService;
    delete updateData.annualLeave;
    delete updateData.manager;
    delete updateData.subordinates;
    delete updateData.hireDateFormatted;
    delete updateData.terminationDateFormatted;

    // Managers can only update certain fields
    if (userRole === 'manager') {
      const allowedFields = ['name', 'position', 'baseSalary', 'incentiveFormula'];
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });
    }

    // Convert date strings to Date objects
    if (updateData.hireDate) {
      updateData.hireDate = new Date(updateData.hireDate);
    }
    if (updateData.terminationDate) {
      updateData.terminationDate = new Date(updateData.terminationDate);
    }
    if (updateData.managerId) {
      updateData.managerId = new ObjectId(updateData.managerId);
    }

    updateData.updatedAt = new Date();

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'User updated successfully' 
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.body;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Get the user to check if it exists and if it's an admin
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (permanent) {
      // Prevent deletion of admin user
      if (user.username === 'admin') {
        return res.status(403).json({ error: 'Cannot delete admin user' });
      }

      // Permanent deletion (use with caution)
      const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Clean up related data
      let deletedLeaveLogsCount = 0;
      let deletedPayrollCount = 0;

      // Delete leave logs for the user
      const deleteLeaveLogsResult = await db.collection('leave_logs').deleteMany({
        userId: new ObjectId(id)
      });
      deletedLeaveLogsCount = deleteLeaveLogsResult.deletedCount;

      // Delete payroll data for the user
      const deletePayrollResult = await db.collection('monthly_payments').deleteMany({
        userId: new ObjectId(id)
      });
      deletedPayrollCount = deletePayrollResult.deletedCount;

      console.log(`User permanently deleted: ${user.username}, ${deletedLeaveLogsCount} leave logs, ${deletedPayrollCount} payroll records`);
      
      res.json({ 
        success: true, 
        message: 'User permanently deleted along with related data',
        deletedLeaveLogsCount,
        deletedPayrollCount
      });
    } else {
      // Soft deletion (deactivate user)
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            isActive: false, 
            terminationDate: new Date(),
            updatedAt: new Date() 
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'User deactivated successfully' 
      });
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:id/activate', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: true, 
          terminationDate: null,
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'User activated successfully' 
    });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/users/:id/reset-password', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          password: hashedPassword, 
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id/employment-info', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const hireDate = new Date(user.hireDate);
    const yearsOfService = Math.floor((now - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
    const monthsOfService = Math.floor((now - hireDate) / (1000 * 60 * 60 * 24 * 30.44));
    
    // Calculate annual leave entitlement (1년차: 11일, 2년차 이상: 15일 + (근속년수-1), 최대 25일)
    const annualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
    
    // Get leave usage for current year
    const currentYear = now.getFullYear();
    const leaveUsage = await db.collection('leaveRequests').aggregate([
      {
        $match: {
          userId: new ObjectId(id),
          status: 'approved',
          startDate: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$daysCount' }
        }
      }
    ]).toArray();

    const usedLeave = leaveUsage.length > 0 ? leaveUsage[0].totalDays : 0;
    const remainingLeave = annualLeave - usedLeave;

    // Get payroll summary
    const payrollSummary = await db.collection('monthlyPayments').aggregate([
      { $match: { userId: new ObjectId(id) } },
      { $sort: { yearMonth: -1 } },
      { $limit: 12 },
      {
        $group: {
          _id: null,
          avgBaseSalary: { $avg: '$baseSalary' },
          avgIncentive: { $avg: '$incentive' },
          avgBonus: { $avg: '$bonus' },
          avgAward: { $avg: '$award' },
          avgTotal: { $avg: '$totalInput' },
          totalMonths: { $sum: 1 }
        }
      }
    ]).toArray();

    const payrollInfo = payrollSummary.length > 0 ? payrollSummary[0] : null;

    res.json({
      employee: {
        id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        department: user.department,
        position: user.position,
        contractType: user.contractType
      },
      employment: {
        hireDate: user.hireDate,
        yearsOfService,
        monthsOfService,
        terminationDate: user.terminationDate,
        isActive: user.isActive
      },
      leave: {
        annualLeaveEntitlement: annualLeave,
        usedLeave,
        remainingLeave,
        currentYear
      },
      payroll: payrollInfo
    });

  } catch (error) {
    console.error('Get employment info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/bulk-import', requireRole('admin'), async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array is required' });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const userData of users) {
      try {
        const { username, password, name, role, employeeId } = userData;
        
        // Validate required fields
        if (!username || !password || !name || !role) {
          results.push({
            ...userData,
            status: 'error',
            error: 'Missing required fields'
          });
          errorCount++;
          continue;
        }

        // Check if username already exists
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
          results.push({
            ...userData,
            status: 'error',
            error: 'Username already exists'
          });
          errorCount++;
          continue;
        }

        // Generate employeeId if not provided
        let finalEmployeeId = employeeId;
        if (!finalEmployeeId) {
          finalEmployeeId = await generateEmployeeId();
        } else {
          // Check if provided employeeId already exists
          const existingEmployeeId = await db.collection('users').findOne({ employeeId: finalEmployeeId });
          if (existingEmployeeId) {
            results.push({
              ...userData,
              status: 'error',
              error: 'Employee ID already exists'
            });
            errorCount++;
            continue;
          }
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Create user object
        const newUser = {
          username,
          password: hashedPassword,
          name,
          role,
          isActive: true,
          hireDate: userData.hireDate ? new Date(userData.hireDate) : new Date(),
          department: userData.department || '',
          position: userData.position || '',
          employeeId: finalEmployeeId,
          accountNumber: userData.accountNumber || '',
          managerId: userData.managerId ? new ObjectId(userData.managerId) : null,
          contractType: userData.contractType || 'regular',
          baseSalary: userData.baseSalary || 0,
          incentiveFormula: userData.incentiveFormula || '',
          terminationDate: null,
          createdAt: new Date()
        };

        const result = await db.collection('users').insertOne(newUser);
        
        results.push({
          ...userData,
          status: 'success',
          id: result.insertedId,
          employeeId: finalEmployeeId
        });
        successCount++;

      } catch (error) {
        results.push({
          ...userData,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    res.json({
      success: true,
      summary: {
        total: users.length,
        success: successCount,
        errors: errorCount
      },
      results
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Departments routes
app.get('/api/departments', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    // Get departments from departments collection with employee count
    const departments = await db.collection('departments').find({ isActive: true }).sort({ name: 1 }).toArray();
    
    // Add employee count for each department
    const departmentsWithCount = await Promise.all(departments.map(async (dept) => {
      const employeeCount = await db.collection('users').countDocuments({ 
        department: dept.name,
        isActive: true 
      });
      
      // Get positions in this department
      const positions = await db.collection('users').distinct('position', { 
        department: dept.name,
        isActive: true 
      });
      
      // Get managers in this department
      const managers = await db.collection('users').find({ 
        department: dept.name,
        role: 'manager',
        isActive: true 
      }, { projection: { name: 1, _id: 1 } }).toArray();
      
      return {
        ...dept,
        employeeCount,
        positions: positions.filter(p => p),
        managers: managers.map(m => ({ name: m.name, id: m._id.toString() }))
      };
    }));

    res.json({ success: true, data: departmentsWithCount });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/departments', requireRole('admin'), async (req, res) => {
  try {
    const { name, description, managerId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    // Check if department already exists
    const existingDept = await db.collection('departments').findOne({ name: name.trim() });
    if (existingDept) {
      return res.status(400).json({ error: 'Department name already exists' });
    }

    // Create department
    const departmentData = {
      name: name.trim(),
      description: description?.trim() || '',
      managerId: managerId || null,
      createdAt: new Date(),
      isActive: true
    };

    const result = await db.collection('departments').insertOne(departmentData);
    
    res.json({
      success: true,
      department: { ...departmentData, _id: result.insertedId },
      message: 'Department created successfully'
    });

  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update department
app.put('/api/departments/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, managerId } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Department name is required' });
    }

    // Check if department name already exists (excluding current department)
    const existingDept = await db.collection('departments').findOne({ 
      name: name.trim(),
      _id: { $ne: new ObjectId(id) }
    });
    
    if (existingDept) {
      return res.status(400).json({ error: 'Department name already exists' });
    }

    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      managerId: managerId || null,
      updatedAt: new Date()
    };

    const result = await db.collection('departments').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ success: true, message: 'Department updated successfully' });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete department
app.delete('/api/departments/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get department name first
    const department = await db.collection('departments').findOne({ _id: new ObjectId(id) });
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department has employees
    const employeeCount = await db.collection('users').countDocuments({ 
      department: department.name,
      isActive: true 
    });

    if (employeeCount > 0) {
      // Get list of employees in this department
      const employees = await db.collection('users').find({ 
        department: department.name,
        isActive: true 
      }, { projection: { name: 1, position: 1 } }).toArray();
      
      return res.status(400).json({ 
        error: `Cannot delete department "${department.name}". It has ${employeeCount} active employee(s).`,
        details: 'Please reassign or deactivate all employees before deleting the department.',
        employees: employees.map(emp => ({ name: emp.name, position: emp.position }))
      });
    }

    const result = await db.collection('departments').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/departments/:name/employees', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name } = req.params;
    
    const employees = await db.collection('users').find(
      { 
        department: name,
        isActive: true 
      },
      { projection: { password: 0 } }
    ).sort({ position: 1, name: 1 }).toArray();

    // Calculate additional info for each employee
    const now = new Date();
    const employeesWithInfo = employees.map(employee => {
      const yearsOfService = employee.hireDate ? 
        Math.floor((now - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
      
      return {
        ...employee,
        yearsOfService,
        hireDateFormatted: employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('ko-KR') : null
      };
    });

    res.json({
      department: name,
      employees: employeesWithInfo,
      summary: {
        totalEmployees: employees.length,
        managers: employees.filter(e => e.role === 'manager').length,
        regular: employees.filter(e => e.contractType === 'regular').length,
        contract: employees.filter(e => e.contractType === 'contract').length
      }
    });

  } catch (error) {
    console.error('Get department employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/organization-chart', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const users = await db.collection('users').find(
      { isActive: true },
      { projection: { password: 0 } }
    ).toArray();

    // Build organization tree
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), {
        ...user,
        subordinates: []
      });
    });

    const rootUsers = [];
    
    users.forEach(user => {
      if (user.managerId) {
        const manager = userMap.get(user.managerId.toString());
        if (manager) {
          manager.subordinates.push(userMap.get(user._id.toString()));
        }
      } else {
        rootUsers.push(userMap.get(user._id.toString()));
      }
    });

    // Group by department
    const departments = {};
    users.forEach(user => {
      if (user.department) {
        if (!departments[user.department]) {
          departments[user.department] = [];
        }
        departments[user.department].push(userMap.get(user._id.toString()));
      }
    });

    res.json({
      organizationTree: rootUsers,
      departments,
      summary: {
        totalEmployees: users.length,
        totalDepartments: Object.keys(departments).length,
        managersCount: users.filter(u => u.role === 'manager').length,
        adminCount: users.filter(u => u.role === 'admin').length
      }
    });

  } catch (error) {
    console.error('Get organization chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bonus routes
app.get('/api/bonus/:year_month', requireAuth, async (req, res) => {
  try {
    const { year_month } = req.params;
    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    let matchCondition = { yearMonth: year_month };

    // If not admin/manager, only show own data
    if (userRole === 'user') {
      matchCondition.userId = new ObjectId(userId);
    }

    const bonusData = await db.collection('bonuses').aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          id: '$_id',
          user_id: '$userId',
          user_name: { $arrayElemAt: ['$user.name', 0] },
          year_month: '$yearMonth',
          bonus_type: '$bonusType',
          amount: '$amount',
          reason: '$reason',
          approved_by: '$approvedBy',
          approved_at: '$approvedAt',
          created_at: '$createdAt'
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    res.json(bonusData);

  } catch (error) {
    console.error('Get bonus data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/bonus', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId, yearMonth, bonusType, amount, reason } = req.body;
    const approvedBy = req.session.user.id;

    if (!userId || !yearMonth || !bonusType || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bonusData = {
      userId: new ObjectId(userId),
      yearMonth: yearMonth,
      bonusType: bonusType, // 'bonus' or 'award'
      amount: parseFloat(amount),
      reason: reason || '',
      approvedBy: new ObjectId(approvedBy),
      approvedAt: new Date(),
      createdAt: new Date()
    };

    const result = await db.collection('bonuses').insertOne(bonusData);

    // Update monthly payments to reflect the bonus
    await updateMonthlyPaymentBonus(userId, yearMonth, bonusType, amount);

    res.json({ 
      success: true, 
      bonusId: result.insertedId,
      message: 'Bonus added successfully' 
    });

  } catch (error) {
    console.error('Add bonus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/bonus/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const existingBonus = await db.collection('bonuses').findOne({
      _id: new ObjectId(id)
    });

    if (!existingBonus) {
      return res.status(404).json({ error: 'Bonus not found' });
    }

    const updateData = {
      amount: parseFloat(amount),
      reason: reason || existingBonus.reason,
      updatedAt: new Date()
    };

    await db.collection('bonuses').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Update monthly payments to reflect the bonus change
    await updateMonthlyPaymentBonus(
      existingBonus.userId, 
      existingBonus.yearMonth, 
      existingBonus.bonusType, 
      amount
    );

    res.json({ 
      success: true, 
      message: 'Bonus updated successfully' 
    });

  } catch (error) {
    console.error('Update bonus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/bonus/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const existingBonus = await db.collection('bonuses').findOne({
      _id: new ObjectId(id)
    });

    if (!existingBonus) {
      return res.status(404).json({ error: 'Bonus not found' });
    }

    await db.collection('bonuses').deleteOne({ _id: new ObjectId(id) });

    // Update monthly payments to remove the bonus
    await updateMonthlyPaymentBonus(
      existingBonus.userId, 
      existingBonus.yearMonth, 
      existingBonus.bonusType, 
      0
    );

    res.json({ 
      success: true, 
      message: 'Bonus deleted successfully' 
    });

  } catch (error) {
    console.error('Delete bonus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to update monthly payments bonus
async function updateMonthlyPaymentBonus(userId, yearMonth, bonusType, amount) {
  try {
    // Get current monthly payment
    const monthlyPayment = await db.collection('monthlyPayments').findOne({
      userId: new ObjectId(userId),
      yearMonth: yearMonth
    });

    if (!monthlyPayment) {
      // If no monthly payment exists, create one
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) return;

      const newPayment = {
        userId: new ObjectId(userId),
        yearMonth: yearMonth,
        baseSalary: user.baseSalary || 0,
        incentive: 0,
        bonus: bonusType === 'bonus' ? parseFloat(amount) : 0,
        award: bonusType === 'award' ? parseFloat(amount) : 0,
        totalInput: 0,
        actualPayment: 0,
        difference: 0,
        createdAt: new Date()
      };

      newPayment.totalInput = newPayment.baseSalary + newPayment.incentive + newPayment.bonus + newPayment.award;
      await db.collection('monthlyPayments').insertOne(newPayment);
    } else {
      // Update existing monthly payment
      const updateData = {};
      
      if (bonusType === 'bonus') {
        updateData.bonus = parseFloat(amount);
      } else if (bonusType === 'award') {
        updateData.award = parseFloat(amount);
      }

      // Recalculate total
      const newBonus = bonusType === 'bonus' ? parseFloat(amount) : monthlyPayment.bonus;
      const newAward = bonusType === 'award' ? parseFloat(amount) : monthlyPayment.award;
      updateData.totalInput = monthlyPayment.baseSalary + monthlyPayment.incentive + newBonus + newAward;
      updateData.difference = updateData.totalInput - monthlyPayment.actualPayment;
      updateData.updatedAt = new Date();

      await db.collection('monthlyPayments').updateOne(
        {
          userId: new ObjectId(userId),
          yearMonth: yearMonth
        },
        { $set: updateData }
      );
    }
  } catch (error) {
    console.error('Update monthly payment bonus error:', error);
  }
}

// Sales data routes
app.get('/api/sales/:year_month', requireAuth, async (req, res) => {
  try {
    const { year_month } = req.params;
    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    let matchCondition = { yearMonth: year_month };

    // If not admin/manager, only show own data
    if (userRole === 'user') {
      matchCondition.userId = new ObjectId(userId);
    }

    const salesData = await db.collection('salesData').aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          id: '$_id',
          user_id: '$userId',
          user_name: { $arrayElemAt: ['$user.name', 0] },
          year_month: '$yearMonth',
          sales_amount: '$salesAmount',
          created_at: '$createdAt'
        }
      },
      { $sort: { user_name: 1 } }
    ]).toArray();

    res.json(salesData);

  } catch (error) {
    console.error('Get sales data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/sales', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId, yearMonth, salesAmount } = req.body;

    if (!userId || !yearMonth || salesAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if sales data already exists
    const existingSales = await db.collection('salesData').findOne({
      userId: new ObjectId(userId),
      yearMonth: yearMonth
    });

    if (existingSales) {
      // Update existing sales data
      await db.collection('salesData').updateOne(
        {
          userId: new ObjectId(userId),
          yearMonth: yearMonth
        },
        {
          $set: {
            salesAmount: parseFloat(salesAmount),
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Create new sales data
      await db.collection('salesData').insertOne({
        userId: new ObjectId(userId),
        yearMonth: yearMonth,
        salesAmount: parseFloat(salesAmount),
        createdAt: new Date()
      });
    }

    // Update incentive in monthly payments
    await updateMonthlyPaymentIncentive(userId, yearMonth);

    res.json({ 
      success: true, 
      message: 'Sales data updated successfully' 
    });

  } catch (error) {
    console.error('Update sales data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/sales/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { salesAmount } = req.body;

    if (salesAmount === undefined) {
      return res.status(400).json({ error: 'Sales amount is required' });
    }

    const existingSales = await db.collection('salesData').findOne({
      _id: new ObjectId(id)
    });

    if (!existingSales) {
      return res.status(404).json({ error: 'Sales data not found' });
    }

    await db.collection('salesData').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          salesAmount: parseFloat(salesAmount),
          updatedAt: new Date()
        }
      }
    );

    // Update incentive in monthly payments
    await updateMonthlyPaymentIncentive(existingSales.userId, existingSales.yearMonth);

    res.json({ 
      success: true, 
      message: 'Sales data updated successfully' 
    });

  } catch (error) {
    console.error('Update sales data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/sales/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const existingSales = await db.collection('salesData').findOne({
      _id: new ObjectId(id)
    });

    if (!existingSales) {
      return res.status(404).json({ error: 'Sales data not found' });
    }

    await db.collection('salesData').deleteOne({ _id: new ObjectId(id) });

    // Update incentive in monthly payments (set to 0)
    await updateMonthlyPaymentIncentive(existingSales.userId, existingSales.yearMonth);

    res.json({ 
      success: true, 
      message: 'Sales data deleted successfully' 
    });

  } catch (error) {
    console.error('Delete sales data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to update monthly payment incentive
async function updateMonthlyPaymentIncentive(userId, yearMonth) {
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const salesData = await db.collection('salesData').findOne({
      userId: new ObjectId(userId),
      yearMonth: yearMonth
    });

    if (!user || !salesData) return;

    const incentive = calculateIncentive(salesData.salesAmount, user.incentiveFormula);

    // Update monthly payment incentive
    const monthlyPayment = await db.collection('monthlyPayments').findOne({
      userId: new ObjectId(userId),
      yearMonth: yearMonth
    });

    if (monthlyPayment) {
      const updateData = {
        incentive: incentive,
        totalInput: monthlyPayment.baseSalary + incentive + monthlyPayment.bonus + monthlyPayment.award,
        updatedAt: new Date()
      };
      updateData.difference = updateData.totalInput - monthlyPayment.actualPayment;

      await db.collection('monthlyPayments').updateOne(
        {
          userId: new ObjectId(userId),
          yearMonth: yearMonth
        },
        { $set: updateData }
      );
    }
  } catch (error) {
    console.error('Update monthly payment incentive error:', error);
  }
}

// PayrollUpload routes
app.get('/api/payroll-upload', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const uploads = await db.collection('payrollUploads').find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(uploads);

  } catch (error) {
    console.error('Get payroll uploads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// File upload endpoints
app.post('/api/payroll-upload', requireRole(['admin', 'manager']), upload.single('payrollFile'), async (req, res) => {
  try {
    const { yearMonth } = req.body;
    const uploadedBy = req.session.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!yearMonth) {
      return res.status(400).json({ error: 'Year month is required' });
    }

    // Parse Excel file
    const parseResult = await excelProcessor.parsePayrollExcel(file.buffer);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Failed to parse Excel file', 
        details: parseResult.error 
      });
    }

    // Generate upload metadata
    const metadata = excelProcessor.generateUploadMetadata(file, parseResult, yearMonth);

    // Save upload record
    const uploadData = {
      ...metadata,
      uploadedBy: new ObjectId(uploadedBy),
      uploadedData: parseResult.data.rows,
      status: 'uploaded',
      yearMonth: yearMonth
    };

    const result = await db.collection('payrollUploads').insertOne(uploadData);

    res.json({ 
      success: true, 
      uploadId: result.insertedId,
      message: 'Payroll file uploaded and parsed successfully',
      data: {
        totalRows: parseResult.data.totalRows,
        validRows: parseResult.data.validRows,
        invalidRows: parseResult.data.invalidRows,
        summary: parseResult.data.summary
      }
    });

  } catch (error) {
    console.error('Upload payroll file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Preview uploaded data before processing
app.get('/api/payroll-upload/:id/preview', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const upload = await db.collection('payrollUploads').findOne({
      _id: new ObjectId(id)
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = upload.uploadedData.slice(startIndex, endIndex);

    res.json({
      upload: {
        id: upload._id,
        originalName: upload.originalName,
        yearMonth: upload.yearMonth,
        uploadedAt: upload.uploadedAt,
        status: upload.status,
        parseResult: upload.parseResult
      },
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: upload.uploadedData.length,
        pages: Math.ceil(upload.uploadedData.length / limit)
      }
    });

  } catch (error) {
    console.error('Preview upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare uploaded data with system data
app.get('/api/payroll-upload/:id/compare/:year_month', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, year_month } = req.params;

    // Get uploaded data
    const upload = await db.collection('payrollUploads').findOne({
      _id: new ObjectId(id)
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Get system data for comparison
    const systemData = await db.collection('monthlyPayments').aggregate([
      { $match: { yearMonth: year_month } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: '$userId',
          employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
          name: { $arrayElemAt: ['$user.name', 0] },
          department: { $arrayElemAt: ['$user.department', 0] },
          position: { $arrayElemAt: ['$user.position', 0] },
          baseSalary: '$baseSalary',
          incentive: '$incentive',
          bonus: '$bonus',
          award: '$award',
          totalInput: '$totalInput',
          actualPayment: '$actualPayment',
          difference: '$difference'
        }
      }
    ]).toArray();

    // Perform comparison
    const comparison = await excelProcessor.compareWithSystemData(upload.uploadedData, systemData);

    res.json({
      uploadId: id,
      yearMonth: year_month,
      comparison: comparison,
      uploadInfo: {
        originalName: upload.originalName,
        uploadedAt: upload.uploadedAt,
        totalRows: upload.parseResult.totalRows
      }
    });

  } catch (error) {
    console.error('Compare data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/payroll-upload/:id/process', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { yearMonth } = req.body;

    if (!yearMonth) {
      return res.status(400).json({ error: 'Year month is required' });
    }

    const upload = await db.collection('payrollUploads').findOne({
      _id: new ObjectId(id)
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Update upload status to processing
    await db.collection('payrollUploads').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'processing',
          processedAt: new Date()
        }
      }
    );

    // Process uploaded data and update monthly payments
    const processedData = [];
    let processedCount = 0;

    for (const data of upload.uploadedData) {
      try {
        // Find user by username or name
        const user = await db.collection('users').findOne({
          $or: [
            { username: data.username },
            { name: data.name }
          ]
        });

        if (!user) {
          processedData.push({
            ...data,
            error: 'User not found'
          });
          continue;
        }

        // Update monthly payment with actual payment data
        const updateData = {
          actualPayment: parseFloat(data.actualPayment) || 0,
          updatedAt: new Date()
        };

        // Calculate difference
        const monthlyPayment = await db.collection('monthlyPayments').findOne({
          userId: user._id,
          yearMonth: yearMonth
        });

        if (monthlyPayment) {
          updateData.difference = monthlyPayment.totalInput - updateData.actualPayment;
          
          await db.collection('monthlyPayments').updateOne(
            {
              userId: user._id,
              yearMonth: yearMonth
            },
            { $set: updateData }
          );
        }

        processedData.push({
          ...data,
          userId: user._id,
          processed: true
        });
        processedCount++;

      } catch (error) {
        processedData.push({
          ...data,
          error: error.message
        });
      }
    }

    // Update upload status to completed
    await db.collection('payrollUploads').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'completed',
          processedCount: processedCount,
          processedData: processedData,
          completedAt: new Date()
        }
      }
    );

    res.json({ 
      success: true, 
      processedCount: processedCount,
      totalCount: upload.uploadedData.length,
      message: 'Payroll data processed successfully' 
    });

  } catch (error) {
    console.error('Process payroll upload error:', error);
    
    // Update upload status to error
    await db.collection('payrollUploads').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          status: 'error',
          error: error.message,
          errorAt: new Date()
        }
      }
    );

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Report generation endpoints
app.get('/api/reports/payroll/:year_month/excel', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { year_month } = req.params;

    // Get payroll data
    const payrollData = await db.collection('monthlyPayments').aggregate([
      { $match: { yearMonth: year_month } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
          name: { $arrayElemAt: ['$user.name', 0] },
          department: { $arrayElemAt: ['$user.department', 0] },
          position: { $arrayElemAt: ['$user.position', 0] },
          baseSalary: '$baseSalary',
          incentive: '$incentive',
          bonus: '$bonus',
          award: '$award',
          totalInput: '$totalInput',
          actualPayment: '$actualPayment',
          difference: '$difference'
        }
      },
      { $sort: { department: 1, name: 1 } }
    ]).toArray();

    if (payrollData.length === 0) {
      return res.status(404).json({ error: 'No payroll data found for this month' });
    }

    // Generate Excel report
    const workbook = await reportGenerator.generatePayrollExcelReport(payrollData, { yearMonth: year_month });
    const buffer = await reportGenerator.saveToBuffer(workbook);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="payroll_report_${year_month}.xlsx"`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Generate payroll Excel report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/comparison/:upload_id/:year_month/excel', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { upload_id, year_month } = req.params;

    // Get comparison data
    const upload = await db.collection('payrollUploads').findOne({
      _id: new ObjectId(upload_id)
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const systemData = await db.collection('monthlyPayments').aggregate([
      { $match: { yearMonth: year_month } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: '$userId',
          employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
          name: { $arrayElemAt: ['$user.name', 0] },
          department: { $arrayElemAt: ['$user.department', 0] },
          position: { $arrayElemAt: ['$user.position', 0] },
          baseSalary: '$baseSalary',
          incentive: '$incentive',
          bonus: '$bonus',
          award: '$award',
          totalInput: '$totalInput',
          actualPayment: '$actualPayment',
          difference: '$difference'
        }
      }
    ]).toArray();

    const comparison = await excelProcessor.compareWithSystemData(upload.uploadedData, systemData);

    // Generate comparison report
    const workbook = await reportGenerator.generateComparisonReport(comparison, { yearMonth: year_month });
    const buffer = await reportGenerator.saveToBuffer(workbook);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="comparison_report_${year_month}.xlsx"`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Generate comparison report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/payslip/:user_id/:year_month/excel', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { user_id, year_month } = req.params;

    // Get employee payroll data
    const payrollData = await db.collection('monthlyPayments').aggregate([
      { 
        $match: { 
          userId: new ObjectId(user_id),
          yearMonth: year_month 
        } 
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          employeeId: { $arrayElemAt: ['$user.employeeId', 0] },
          name: { $arrayElemAt: ['$user.name', 0] },
          department: { $arrayElemAt: ['$user.department', 0] },
          position: { $arrayElemAt: ['$user.position', 0] },
          baseSalary: '$baseSalary',
          incentive: '$incentive',
          bonus: '$bonus',
          award: '$award',
          totalInput: '$totalInput',
          actualPayment: '$actualPayment',
          difference: '$difference'
        }
      }
    ]).toArray();

    if (payrollData.length === 0) {
      return res.status(404).json({ error: 'No payroll data found' });
    }

    const employeeData = payrollData[0];

    // Generate payslip
    const workbook = await reportGenerator.generatePayslip(employeeData, { yearMonth: year_month });
    const buffer = await reportGenerator.saveToBuffer(workbook);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="payslip_${employeeData.name}_${year_month}.xlsx"`);
    
    res.send(buffer);

  } catch (error) {
    console.error('Generate payslip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Excel download template
app.get('/api/reports/template/payroll', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const templateData = [
      {
        employeeId: 'EMP001',
        name: '홍길동',
        department: '영업팀',
        position: '대리',
        baseSalary: 3000000,
        incentive: 500000,
        bonus: 100000,
        award: 50000,
        totalInput: 3650000,
        actualPayment: 3650000,
        difference: 0
      }
    ];

    const workbook = await reportGenerator.generatePayrollExcelReport(templateData, { yearMonth: 'YYYY-MM' });
    const buffer = await reportGenerator.saveToBuffer(workbook);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll_template.xlsx"');
    
    res.send(buffer);

  } catch (error) {
    console.error('Generate template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/payroll-upload/:id/comparison/:year_month', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, year_month } = req.params;

    const upload = await db.collection('payrollUploads').findOne({
      _id: new ObjectId(id)
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Get current system data
    const systemData = await db.collection('monthlyPayments').aggregate([
      { $match: { yearMonth: year_month } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          user_id: '$userId',
          user_name: { $arrayElemAt: ['$user.name', 0] },
          username: { $arrayElemAt: ['$user.username', 0] },
          system_total: '$totalInput',
          system_actual: '$actualPayment',
          system_difference: '$difference'
        }
      }
    ]).toArray();

    // Create comparison data
    const comparison = upload.uploadedData.map(uploadedItem => {
      const systemItem = systemData.find(s => 
        s.user_name === uploadedItem.name || 
        s.username === uploadedItem.username
      );

      return {
        name: uploadedItem.name,
        username: uploadedItem.username,
        uploaded_actual: parseFloat(uploadedItem.actualPayment) || 0,
        system_total: systemItem ? systemItem.system_total : 0,
        system_actual: systemItem ? systemItem.system_actual : 0,
        difference: systemItem ? 
          systemItem.system_total - (parseFloat(uploadedItem.actualPayment) || 0) : 0,
        match: systemItem ? 
          Math.abs(systemItem.system_total - (parseFloat(uploadedItem.actualPayment) || 0)) < 0.01 : false
      };
    });

    res.json({
      uploadId: id,
      yearMonth: year_month,
      comparison: comparison,
      summary: {
        total_records: comparison.length,
        matched_records: comparison.filter(c => c.match).length,
        unmatched_records: comparison.filter(c => !c.match).length,
        total_difference: comparison.reduce((sum, c) => sum + c.difference, 0)
      }
    });

  } catch (error) {
    console.error('Get payroll comparison error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/payroll-upload/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.collection('payrollUploads').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({ 
      success: true, 
      message: 'Upload deleted successfully' 
    });

  } catch (error) {
    console.error('Delete payroll upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard and Statistics API
app.get('/api/admin/stats/system', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    // Get current month
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // Get total users
    const totalUsers = await db.collection('users').countDocuments({ 
      isActive: true,
      role: { $ne: 'admin' }
    });

    // Get current month payroll summary
    const payrollSummary = await db.collection('monthlyPayments').aggregate([
      { $match: { yearMonth: currentMonth } },
      {
        $group: {
          _id: null,
          totalBaseSalary: { $sum: '$baseSalary' },
          totalIncentive: { $sum: '$incentive' },
          totalBonus: { $sum: '$bonus' },
          totalAward: { $sum: '$award' },
          totalInput: { $sum: '$totalInput' },
          totalActualPayment: { $sum: '$actualPayment' },
          totalDifference: { $sum: '$difference' },
          employeeCount: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get current month sales summary
    const salesSummary = await db.collection('salesData').aggregate([
      { $match: { yearMonth: currentMonth } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$salesAmount' },
          averageSales: { $avg: '$salesAmount' },
          employeeCount: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get bonus/award summary for current month
    const bonusSummary = await db.collection('bonuses').aggregate([
      { $match: { yearMonth: currentMonth } },
      {
        $group: {
          _id: '$bonusType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get recent leave requests
    const recentLeaves = await db.collection('leaveRequests').aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          user_name: { $arrayElemAt: ['$user.name', 0] },
          leave_type: '$leaveType',
          start_date: '$startDate',
          end_date: '$endDate',
          status: '$status',
          created_at: '$createdAt'
        }
      },
      { $sort: { created_at: -1 } },
      { $limit: 10 }
    ]).toArray();

    const stats = {
      users: {
        total: totalUsers,
        active: totalUsers
      },
      payroll: {
        currentMonth: currentMonth,
        totalBaseSalary: payrollSummary.length > 0 ? payrollSummary[0].totalBaseSalary : 0,
        totalIncentive: payrollSummary.length > 0 ? payrollSummary[0].totalIncentive : 0,
        totalBonus: payrollSummary.length > 0 ? payrollSummary[0].totalBonus : 0,
        totalAward: payrollSummary.length > 0 ? payrollSummary[0].totalAward : 0,
        totalInput: payrollSummary.length > 0 ? payrollSummary[0].totalInput : 0,
        totalActualPayment: payrollSummary.length > 0 ? payrollSummary[0].totalActualPayment : 0,
        totalDifference: payrollSummary.length > 0 ? payrollSummary[0].totalDifference : 0,
        employeeCount: payrollSummary.length > 0 ? payrollSummary[0].employeeCount : 0
      },
      sales: {
        currentMonth: currentMonth,
        totalSales: salesSummary.length > 0 ? salesSummary[0].totalSales : 0,
        averageSales: salesSummary.length > 0 ? salesSummary[0].averageSales : 0,
        employeeCount: salesSummary.length > 0 ? salesSummary[0].employeeCount : 0
      },
      bonuses: bonusSummary,
      recentLeaves: recentLeaves
    };

    res.json(stats);

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/stats/payroll/:year', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { year } = req.params;
    
    // Get monthly payroll data for the year
    const monthlyData = await db.collection('monthlyPayments').aggregate([
      { 
        $match: { 
          yearMonth: { $regex: `^${year}-` }
        } 
      },
      {
        $group: {
          _id: '$yearMonth',
          totalBaseSalary: { $sum: '$baseSalary' },
          totalIncentive: { $sum: '$incentive' },
          totalBonus: { $sum: '$bonus' },
          totalAward: { $sum: '$award' },
          totalInput: { $sum: '$totalInput' },
          totalActualPayment: { $sum: '$actualPayment' },
          employeeCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Get employee performance data
    const employeePerformance = await db.collection('monthlyPayments').aggregate([
      { 
        $match: { 
          yearMonth: { $regex: `^${year}-` }
        } 
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            name: { $arrayElemAt: ['$user.name', 0] }
          },
          totalBaseSalary: { $sum: '$baseSalary' },
          totalIncentive: { $sum: '$incentive' },
          totalBonus: { $sum: '$bonus' },
          totalAward: { $sum: '$award' },
          totalInput: { $sum: '$totalInput' },
          totalActualPayment: { $sum: '$actualPayment' },
          monthCount: { $sum: 1 }
        }
      },
      { $sort: { totalInput: -1 } }
    ]).toArray();

    res.json({
      year: year,
      monthlyData: monthlyData,
      employeePerformance: employeePerformance,
      summary: {
        totalMonths: monthlyData.length,
        totalEmployees: employeePerformance.length,
        yearlyTotalInput: monthlyData.reduce((sum, month) => sum + month.totalInput, 0),
        yearlyTotalActualPayment: monthlyData.reduce((sum, month) => sum + month.totalActualPayment, 0)
      }
    });

  } catch (error) {
    console.error('Get payroll stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/stats/sales/:year', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { year } = req.params;
    
    // Get monthly sales data for the year
    const monthlySales = await db.collection('salesData').aggregate([
      { 
        $match: { 
          yearMonth: { $regex: `^${year}-` }
        } 
      },
      {
        $group: {
          _id: '$yearMonth',
          totalSales: { $sum: '$salesAmount' },
          averageSales: { $avg: '$salesAmount' },
          employeeCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Get employee sales performance
    const employeeSales = await db.collection('salesData').aggregate([
      { 
        $match: { 
          yearMonth: { $regex: `^${year}-` }
        } 
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            name: { $arrayElemAt: ['$user.name', 0] }
          },
          totalSales: { $sum: '$salesAmount' },
          averageSales: { $avg: '$salesAmount' },
          monthCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } }
    ]).toArray();

    res.json({
      year: year,
      monthlySales: monthlySales,
      employeeSales: employeeSales,
      summary: {
        totalMonths: monthlySales.length,
        totalEmployees: employeeSales.length,
        yearlyTotalSales: monthlySales.reduce((sum, month) => sum + month.totalSales, 0),
        yearlyAverageSales: monthlySales.reduce((sum, month) => sum + month.averageSales, 0) / (monthlySales.length || 1)
      }
    });

  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/dashboard/my-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Get current month payroll
    const currentPayroll = await db.collection('monthlyPayments').findOne({
      userId: new ObjectId(userId),
      yearMonth: currentMonth
    });

    // Get current month sales
    const currentSales = await db.collection('salesData').findOne({
      userId: new ObjectId(userId),
      yearMonth: currentMonth
    });

    // Get recent 6 months payroll history
    const payrollHistory = await db.collection('monthlyPayments').aggregate([
      { $match: { userId: new ObjectId(userId) } },
      { $sort: { yearMonth: -1 } },
      { $limit: 6 },
      {
        $project: {
          year_month: '$yearMonth',
          base_salary: '$baseSalary',
          incentive: '$incentive',
          bonus: '$bonus',
          award: '$award',
          total_input: '$totalInput',
          actual_payment: '$actualPayment'
        }
      }
    ]).toArray();

    // Get recent leave requests
    const recentLeaves = await db.collection('leaveRequests').aggregate([
      { $match: { userId: new ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          leave_type: '$leaveType',
          start_date: '$startDate',
          end_date: '$endDate',
          days_count: '$daysCount',
          status: '$status',
          created_at: '$createdAt'
        }
      }
    ]).toArray();

    res.json({
      currentMonth: {
        payroll: currentPayroll,
        sales: currentSales
      },
      payrollHistory: payrollHistory,
      recentLeaves: recentLeaves
    });

  } catch (error) {
    console.error('Get my stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Incentive calculation and formula management API
app.post('/api/incentive/validate', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { formula } = req.body;
    
    if (!formula) {
      return res.status(400).json({ error: 'Formula is required' });
    }

    const validation = incentiveCalculator.validateFormula(formula);
    
    res.json({
      isValid: validation.isValid,
      error: validation.error,
      analysis: validation.isValid ? incentiveCalculator.analyzeFormula(formula) : null
    });

  } catch (error) {
    console.error('Formula validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/incentive/simulate', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { formula, salesValues } = req.body;
    
    if (!formula || !Array.isArray(salesValues)) {
      return res.status(400).json({ error: 'Formula and sales values array are required' });
    }

    // Validate formula first
    const validation = incentiveCalculator.validateFormula(formula);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const simulation = incentiveCalculator.simulateIncentive(formula, salesValues);
    
    res.json({
      formula: formula,
      results: simulation,
      summary: {
        totalTests: simulation.length,
        validResults: simulation.filter(r => !r.error).length,
        errorResults: simulation.filter(r => r.error).length,
        averageIncentive: simulation.reduce((sum, r) => sum + (r.incentive || 0), 0) / simulation.length,
        maxIncentive: Math.max(...simulation.map(r => r.incentive || 0)),
        minIncentive: Math.min(...simulation.map(r => r.incentive || 0))
      }
    });

  } catch (error) {
    console.error('Incentive simulation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/incentive/calculate', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { formula, variables } = req.body;
    
    if (!formula) {
      return res.status(400).json({ error: 'Formula is required' });
    }

    const result = incentiveCalculator.calculate(formula, variables || {});
    
    res.json({
      formula: formula,
      variables: variables || {},
      result: result,
      formattedResult: new Intl.NumberFormat('ko-KR').format(result)
    });

  } catch (error) {
    console.error('Incentive calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:userId/incentive-formula', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { formula } = req.body;
    
    if (!formula) {
      return res.status(400).json({ error: 'Formula is required' });
    }

    // Validate formula
    const validation = incentiveCalculator.validateFormula(formula);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Update user's incentive formula
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          incentiveFormula: formula,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Recalculate incentives for all existing monthly payments
    const monthlyPayments = await db.collection('monthlyPayments').find({
      userId: new ObjectId(userId)
    }).toArray();

    for (const payment of monthlyPayments) {
      const salesData = await db.collection('salesData').findOne({
        userId: new ObjectId(userId),
        yearMonth: payment.yearMonth
      });

      if (salesData) {
        const newIncentive = calculateIncentive(salesData.salesAmount, formula);
        const newTotalInput = payment.baseSalary + newIncentive + payment.bonus + payment.award;
        
        await db.collection('monthlyPayments').updateOne(
          { _id: payment._id },
          {
            $set: {
              incentive: newIncentive,
              totalInput: newTotalInput,
              difference: newTotalInput - payment.actualPayment,
              updatedAt: new Date()
            }
          }
        );
      }
    }

    res.json({ 
      success: true, 
      message: 'Incentive formula updated successfully',
      recalculatedPayments: monthlyPayments.length
    });

  } catch (error) {
    console.error('Update incentive formula error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/incentive-analysis', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { months = 12 } = req.query;

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.incentiveFormula) {
      return res.status(400).json({ error: 'User has no incentive formula' });
    }

    // Get recent sales and incentive data
    const salesData = await db.collection('salesData').aggregate([
      { $match: { userId: new ObjectId(userId) } },
      { $sort: { yearMonth: -1 } },
      { $limit: parseInt(months) },
      {
        $lookup: {
          from: 'monthlyPayments',
          let: { userId: '$userId', yearMonth: '$yearMonth' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$yearMonth', '$$yearMonth'] }
                  ]
                }
              }
            }
          ],
          as: 'payment'
        }
      },
      {
        $project: {
          yearMonth: '$yearMonth',
          salesAmount: '$salesAmount',
          incentive: { $arrayElemAt: ['$payment.incentive', 0] },
          percentage: {
            $cond: {
              if: { $gt: ['$salesAmount', 0] },
              then: { $multiply: [{ $divide: [{ $arrayElemAt: ['$payment.incentive', 0] }, '$salesAmount'] }, 100] },
              else: 0
            }
          }
        }
      }
    ]).toArray();

    // Formula analysis
    const analysis = incentiveCalculator.analyzeFormula(user.incentiveFormula);

    // Performance metrics
    const totalSales = salesData.reduce((sum, data) => sum + data.salesAmount, 0);
    const totalIncentive = salesData.reduce((sum, data) => sum + (data.incentive || 0), 0);
    const avgPercentage = salesData.reduce((sum, data) => sum + (data.percentage || 0), 0) / salesData.length;

    res.json({
      user: {
        id: user._id,
        name: user.name,
        formula: user.incentiveFormula
      },
      analysis: analysis,
      performance: {
        totalSales: totalSales,
        totalIncentive: totalIncentive,
        averagePercentage: avgPercentage,
        monthsAnalyzed: salesData.length
      },
      monthlyData: salesData.reverse(), // Show chronologically
      recommendations: analysis.suggestions
    });

  } catch (error) {
    console.error('Get incentive analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Phase 4 - Admin API endpoints for system monitoring
app.get('/api/admin/system-health', requireAuth, requireRole(['admin']), asyncHandler(async (req, res) => {
  try {
    const performanceReport = performanceMonitor.generatePerformanceReport();
    const dbStats = await dbOptimizer.getStats();
    const dbHealth = await dbOptimizer.healthCheck();

    res.json({
      success: true,
      data: {
        dbHealth: dbHealth.connection ? 'good' : 'poor',
        avgResponseTime: performanceReport.performance.system.avgResponseTime,
        activeConnections: performanceReport.performance.system.activeConnections,
        systemLoad: performanceReport.system.cpu.loadAvg1,
        lastBackup: 'N/A', // Would be implemented with actual backup system
        performance: performanceReport,
        database: dbStats
      }
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({ success: false, error: 'Failed to get system health' });
  }
}));

app.get('/api/admin/performance-stats', requireAuth, requireRole(['admin']), asyncHandler(async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // Get top performers
    const topPerformersAgg = dbOptimizer.getOptimizedPipelines().topPerformers(currentMonth, 10);
    const topPerformers = await db.collection('sales_data').aggregate(topPerformersAgg).toArray();
    
    // Get department rankings
    const deptStatsAgg = dbOptimizer.getOptimizedPipelines().departmentStats(currentMonth);
    const departmentRankings = await db.collection('monthly_payments').aggregate(deptStatsAgg).toArray();

    res.json({
      success: true,
      data: {
        topPerformers: topPerformers.map(p => ({
          name: p.employee_name,
          department: p.department,
          achievementRate: p.achievement_rate,
          totalEarnings: p.total_pay
        })),
        departmentRankings: departmentRankings.map(d => ({
          department: d.department,
          avgPerformance: (d.total_payroll / d.employee_count) || 0,
          totalSales: d.total_payroll
        }))
      }
    });
  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get performance stats' });
  }
}));

app.get('/api/admin/alerts', requireAuth, requireRole(['admin']), asyncHandler(async (req, res) => {
  try {
    const performanceReport = performanceMonitor.generatePerformanceReport();
    const alerts = performanceReport.alerts.map(alert => ({
      id: `${alert.type}_${Date.now()}`,
      type: alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info',
      title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1) + ' Alert',
      message: alert.message,
      timestamp: new Date().toISOString()
    }));

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get alerts' });
  }
}));

app.get('/api/admin/database-stats', requireAuth, requireRole(['admin']), asyncHandler(async (req, res) => {
  try {
    await dbOptimizer.analyzePerformance();
    const stats = await dbOptimizer.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get database stats' });
  }
}));

// Position Management APIs
app.get('/api/positions', requireAuth, asyncHandler(async (req, res) => {
  try {
    const positions = await db.collection('positions').find({}).sort({ level: 1, title: 1 }).toArray();
    res.json({ success: true, data: positions });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get positions' });
  }
}));

app.post('/api/positions', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  try {
    const { title, description, level, department, responsibilities, requirements } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if position title already exists
    const existingPosition = await db.collection('positions').findOne({ title: title.trim() });
    if (existingPosition) {
      return res.status(400).json({ error: 'Position title already exists' });
    }

    const positionData = {
      title: title.trim(),
      description: description.trim(),
      level: parseInt(level) || 1,
      department: department?.trim() || null,
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      createdAt: new Date()
    };

    const result = await db.collection('positions').insertOne(positionData);
    res.json({ 
      success: true, 
      message: 'Position created successfully',
      positionId: result.insertedId
    });
  } catch (error) {
    console.error('Create position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

app.put('/api/positions/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, level, department, responsibilities, requirements } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Check if position title already exists (excluding current position)
    const existingPosition = await db.collection('positions').findOne({ 
      title: title.trim(),
      _id: { $ne: new ObjectId(id) }
    });
    
    if (existingPosition) {
      return res.status(400).json({ error: 'Position title already exists' });
    }

    const updateData = {
      title: title.trim(),
      description: description.trim(),
      level: parseInt(level) || 1,
      department: department?.trim() || null,
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      updatedAt: new Date()
    };

    const result = await db.collection('positions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({ success: true, message: 'Position updated successfully' });
  } catch (error) {
    console.error('Update position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

app.delete('/api/positions/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Check if position is assigned to any users
    const userCount = await db.collection('users').countDocuments({ 
      positionId: id,
      isActive: true 
    });

    if (userCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete position. It is assigned to ${userCount} active employee(s). Please reassign employees first.` 
      });
    }

    const result = await db.collection('positions').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({ success: true, message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Delete position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

// Users Statistics API
app.get('/api/users/stats/overview', requireAuth, asyncHandler(async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().substring(0, 7);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().substring(0, 7);
    
    // Get total and active users (excluding admin users)
    const totalUsers = await db.collection('users').countDocuments({ role: { $ne: 'admin' } });
    const activeUsers = await db.collection('users').countDocuments({ isActive: true, role: { $ne: 'admin' } });
    
    // Get users by department (excluding admin users)
    const usersByDepartment = await db.collection('users').aggregate([
      { $match: { isActive: true, role: { $ne: 'admin' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    const byDepartment = {};
    usersByDepartment.forEach(dept => {
      byDepartment[dept._id || 'Unassigned'] = dept.count;
    });
    
    // Get users by role (excluding admin users)
    const usersByRole = await db.collection('users').aggregate([
      { $match: { isActive: true, role: { $ne: 'admin' } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).toArray();
    
    const byRole = {};
    usersByRole.forEach(role => {
      byRole[role._id] = role.count;
    });
    
    // Get new users this month (excluding admin users)
    const newThisMonth = await db.collection('users').countDocuments({
      createdAt: { $gte: new Date(currentMonth + '-01') },
      role: { $ne: 'admin' }
    });
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        byDepartment,
        byRole,
        newThisMonth
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user statistics' });
  }
}));

// Leave Statistics API
app.get('/api/leave/stats/overview', requireAuth, asyncHandler(async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // Get pending leave requests
    const pendingRequests = await db.collection('leave_logs').countDocuments({
      status: 'pending'
    });
    
    // Get approved requests this month
    const approvedThisMonth = await db.collection('leave_logs').countDocuments({
      status: 'approved',
      start_date: { $regex: `^${currentMonth}` }
    });
    
    // Get leave types breakdown
    const leaveByType = await db.collection('leave_logs').aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$leave_type', count: { $sum: 1 }, days: { $sum: '$days' } } }
    ]).toArray();
    
    const typeBreakdown = {};
    leaveByType.forEach(type => {
      typeBreakdown[type._id] = {
        count: type.count,
        totalDays: type.days
      };
    });
    
    res.json({
      success: true,
      data: {
        pendingRequests,
        approvedThisMonth,
        typeBreakdown
      }
    });
  } catch (error) {
    console.error('Leave stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get leave statistics' });
  }
}));

// Calendar API endpoints
app.get('/api/leave/calendar/:month', requireAuth, async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM
    const userId = req.session.user.id;
    
    // Get leave requests for the specified month
    const leaveRequests = await db.collection('leaveRequests').find({
      userId: new ObjectId(userId),
      $or: [
        { startDate: { $regex: `^${month}` } },
        { endDate: { $regex: `^${month}` } },
        {
          $and: [
            { startDate: { $lt: `${month}-32` } },
            { endDate: { $gt: `${month}-01` } }
          ]
        }
      ]
    }).toArray();
    
    // Get user info to ensure we have userName and userDepartment
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    const calendarEvents = leaveRequests.map(request => ({
      id: request._id,
      userId: request.userId,
      userName: request.userName || user?.name || '알 수 없음',
      userDepartment: request.userDepartment || user?.department || '부서 없음',
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      daysCount: request.daysCount,
      status: request.status,
      reason: request.reason
    }));
    
    res.json({
      success: true,
      data: calendarEvents
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    res.status(500).json({ error: 'Failed to load calendar data' });
  }
});

app.get('/api/leave/team-calendar/:month', requireAuth, async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM
    const { department } = req.query;
    const userRole = req.session.user.role;
    
    // Build query based on user role and department filter
    let matchQuery = {
      $or: [
        { startDate: { $regex: `^${month}` } },
        { endDate: { $regex: `^${month}` } },
        {
          $and: [
            { startDate: { $lt: `${month}-32` } },
            { endDate: { $gt: `${month}-01` } }
          ]
        }
      ]
    };
    
    // Add department filter if specified
    if (department && department !== 'all') {
      matchQuery.userDepartment = department;
    }
    
    // If user is not admin, only show approved requests for privacy
    if (userRole !== 'admin') {
      matchQuery.status = 'approved';
    }
    
    const leaveRequests = await db.collection('leaveRequests').find(matchQuery).toArray();
    
    // Get user info for requests that might be missing userName/userDepartment
    const userIds = [...new Set(leaveRequests.map(req => req.userId))];
    const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user;
      return map;
    }, {});
    
    const calendarEvents = leaveRequests.map(request => {
      const user = userMap[request.userId?.toString()];
      return {
        id: request._id,
        userId: request.userId,
        userName: request.userName || user?.name || '알 수 없음',
        userDepartment: request.userDepartment || user?.department || '부서 없음',
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        daysCount: request.daysCount,
        status: request.status,
        reason: request.reason
      };
    });
    
    res.json({
      success: true,
      data: calendarEvents
    });
  } catch (error) {
    console.error('Team calendar API error:', error);
    res.status(500).json({ error: 'Failed to load team calendar data' });
  }
});

// Team Leave Status API endpoints
app.get('/api/leave/team-status', requireAuth, async (req, res) => {
  try {
    const { department, year = new Date().getFullYear() } = req.query;
    const userRole = req.session.user.role;
    
    // Build user query based on role and department filter
    let userQuery = { isActive: true };
    
    // If user is manager, only show their department
    if (userRole === 'manager') {
      const currentUser = await db.collection('users').findOne({ _id: new ObjectId(req.session.user.id) });
      if (currentUser && currentUser.department) {
        userQuery.department = currentUser.department;
      }
    }
    
    // Add department filter if specified
    if (department && department !== 'all') {
      userQuery.department = department;
    }
    
    // Exclude admin users from team view
    userQuery.role = { $ne: 'admin' };
    
    const teamMembers = await db.collection('users').find(userQuery).toArray();
    
    // Get leave data for each team member
    const membersWithLeaveData = await Promise.all(
      teamMembers.map(async (member) => {
        const userId = member._id;
        
        // Calculate annual leave entitlement
        const hireDate = new Date(member.hireDate);
        const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
        const totalAnnualLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
        
        // Get used annual leave for the year
        const usedLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'approved',
              startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$daysCount' }
            }
          }
        ]).toArray();
        
        const usedAnnualLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
        
        // Get pending annual leave
        const pendingLeave = await db.collection('leaveRequests').aggregate([
          {
            $match: {
              userId: userId,
              leaveType: 'annual',
              status: 'pending',
              startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
            }
          },
          {
            $group: {
              _id: null,
              totalDays: { $sum: '$daysCount' }
            }
          }
        ]).toArray();
        
        const pendingAnnualLeave = pendingLeave.length > 0 ? pendingLeave[0].totalDays : 0;
        
        // Get recent leaves (last 5)
        const recentLeaves = await db.collection('leaveRequests').find({
          userId: userId,
          startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
        }).sort({ createdAt: -1 }).limit(5).toArray();
        
        // Get upcoming leaves (approved future leaves)
        const today = new Date().toISOString().split('T')[0];
        const upcomingLeaves = await db.collection('leaveRequests').find({
          userId: userId,
          status: 'approved',
          startDate: { $gte: today }
        }).sort({ startDate: 1 }).limit(5).toArray();
        
        return {
          _id: member._id,
          name: member.name,
          employeeId: member.employeeId,
          position: member.position,
          department: member.department,
          leaveBalance: {
            totalAnnualLeave,
            usedAnnualLeave,
            remainingAnnualLeave: totalAnnualLeave - usedAnnualLeave,
            pendingAnnualLeave
          },
          recentLeaves: recentLeaves.map(leave => ({
            id: leave._id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            daysCount: leave.daysCount,
            status: leave.status,
            reason: leave.reason
          })),
          upcomingLeaves: upcomingLeaves.map(leave => ({
            id: leave._id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            daysCount: leave.daysCount,
            status: leave.status,
            reason: leave.reason
          }))
        };
      })
    );
    
    // Get unique departments for filter
    const departments = [...new Set(teamMembers.map(member => member.department))];
    
    res.json({
      success: true,
      data: {
        members: membersWithLeaveData,
        departments
      }
    });
  } catch (error) {
    console.error('Team status API error:', error);
    res.status(500).json({ error: 'Failed to load team status data' });
  }
});

app.get('/api/leave/department-stats', requireAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const userRole = req.session.user.role;
    
    // Only admin and managers can view department stats
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Get all departments with active users (excluding admin)
    const departments = await db.collection('users').aggregate([
      { $match: { isActive: true, role: { $ne: 'admin' } } },
      { $group: { _id: '$department', users: { $push: '$$ROOT' } } },
      { $match: { _id: { $ne: null } } }
    ]).toArray();
    
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const deptUsers = dept.users;
        const totalMembers = deptUsers.length;
        const activeMembers = deptUsers.filter(u => u.isActive).length;
        
        // Calculate leave statistics for department
        let totalLeaveUsed = 0;
        let totalLeaveRemaining = 0;
        let totalLeaveEntitlement = 0;
        let pendingRequests = 0;
        let approvedRequests = 0;
        let totalRequests = 0;
        
        for (const user of deptUsers) {
          const userId = user._id;
          
          // Calculate annual leave entitlement
          const hireDate = new Date(user.hireDate);
          const yearsOfService = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365.25));
          const userTotalLeave = yearsOfService === 0 ? 11 : Math.min(15 + (yearsOfService - 1), 25);
          totalLeaveEntitlement += userTotalLeave;
          
          // Get used leave for the year
          const usedLeave = await db.collection('leaveRequests').aggregate([
            {
              $match: {
                userId: userId,
                leaveType: 'annual',
                status: 'approved',
                startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
              }
            },
            {
              $group: {
                _id: null,
                totalDays: { $sum: '$daysCount' }
              }
            }
          ]).toArray();
          
          const userUsedLeave = usedLeave.length > 0 ? usedLeave[0].totalDays : 0;
          totalLeaveUsed += userUsedLeave;
          totalLeaveRemaining += (userTotalLeave - userUsedLeave);
          
          // Get pending requests count
          const userPendingRequests = await db.collection('leaveRequests').countDocuments({
            userId: userId,
            status: 'pending',
            startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
          });
          pendingRequests += userPendingRequests;
          
          // Get approval statistics
          const userApprovedRequests = await db.collection('leaveRequests').countDocuments({
            userId: userId,
            status: 'approved',
            startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
          });
          approvedRequests += userApprovedRequests;
          
          const userTotalRequests = await db.collection('leaveRequests').countDocuments({
            userId: userId,
            status: { $in: ['approved', 'rejected'] },
            startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` }
          });
          totalRequests += userTotalRequests;
        }
        
        const avgLeaveUsage = totalLeaveEntitlement > 0 ? (totalLeaveUsed / totalLeaveEntitlement) * 100 : 0;
        const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 100;
        
        return {
          department: dept._id,
          totalMembers,
          activeMembers,
          avgLeaveUsage,
          totalLeaveUsed,
          totalLeaveRemaining,
          pendingRequests,
          approvalRate
        };
      })
    );
    
    res.json({
      success: true,
      data: departmentStats
    });
  } catch (error) {
    console.error('Department stats API error:', error);
    res.status(500).json({ error: 'Failed to load department statistics' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: isDevelopment ? 'development' : 'production',
    database: 'MongoDB',
    dbUrl: MONGO_URL,
    dbName: DB_NAME
  });
});

// Phase 4 - Enhanced error handling
app.use(errorHandler);

// User permissions management - only for admin
app.get('/api/users/:id/permissions', requireAuth, requirePermission(PERMISSIONS.ADMIN_PERMISSIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      permissions: user.permissions || [],
      availablePermissions: Object.values(PERMISSIONS)
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id/permissions', requireAuth, requirePermission(PERMISSIONS.ADMIN_PERMISSIONS), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }
    
    // Validate permissions
    const validPermissions = permissions.filter(p => Object.values(PERMISSIONS).includes(p));
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { permissions: validPermissions, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User permissions updated successfully',
      permissions: validPermissions
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available permissions
app.get('/api/permissions', requireAuth, requirePermission(PERMISSIONS.ADMIN_PERMISSIONS), async (req, res) => {
  try {
    const permissionGroups = {
      users: [
        { key: PERMISSIONS.USERS_VIEW, name: '직원 조회' },
        { key: PERMISSIONS.USERS_CREATE, name: '직원 생성' },
        { key: PERMISSIONS.USERS_EDIT, name: '직원 수정' },
        { key: PERMISSIONS.USERS_DELETE, name: '직원 삭제' }
      ],
      leave: [
        { key: PERMISSIONS.LEAVE_VIEW, name: '휴가 조회' },
        { key: PERMISSIONS.LEAVE_MANAGE, name: '휴가 관리' },
        { key: PERMISSIONS.LEAVE_APPROVE, name: '휴가 승인' }
      ],
      payroll: [
        { key: PERMISSIONS.PAYROLL_VIEW, name: '급여 조회' },
        { key: PERMISSIONS.PAYROLL_MANAGE, name: '급여 관리' }
      ],
      departments: [
        { key: PERMISSIONS.DEPARTMENTS_VIEW, name: '부서 조회' },
        { key: PERMISSIONS.DEPARTMENTS_MANAGE, name: '부서 관리' }
      ],
      positions: [
        { key: PERMISSIONS.POSITIONS_VIEW, name: '직급 조회' },
        { key: PERMISSIONS.POSITIONS_MANAGE, name: '직급 관리' }
      ],
      reports: [
        { key: PERMISSIONS.REPORTS_VIEW, name: '보고서 조회' }
      ],
      files: [
        { key: PERMISSIONS.FILES_VIEW, name: '파일 조회' },
        { key: PERMISSIONS.FILES_MANAGE, name: '파일 관리' }
      ],
      admin: [
        { key: PERMISSIONS.ADMIN_PERMISSIONS, name: '권한 관리' }
      ]
    };
    
    res.json({
      success: true,
      permissions: permissionGroups
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MongoDB server running on port ${PORT}`);
    console.log(`🌐 API available at: http://localhost:${PORT}/api`);
    console.log(`📊 Database: ${DB_NAME} at ${MONGO_URL}`);
    console.log(`🔑 Admin account initialized`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});