const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
// const multer = require('multer'); // Not used currently

// Import route modules
const createAuthRoutes = require('./routes/auth');
const createUserRoutes = require('./routes/users');
const createLeaveRoutes = require('./routes/leave');
const createDepartmentRoutes = require('./routes/departments');
const createPayrollRoutes = require('./routes/payroll');
const createBonusRoutes = require('./routes/bonus');
const createSalesRoutes = require('./routes/sales');
const createUploadRoutes = require('./routes/upload');
const createReportsRoutes = require('./routes/reports');
const createAdminRoutes = require('./routes/admin');

// Import middleware
const {
  errorHandler,
  asyncHandler,
  requireAuth,
  requestLogger,
  securityHeaders,
  corsOptions
} = require('./middleware/errorHandler');

const app = express();
const PORT = 5455;

// MongoDB connection setup
const isDevelopment = process.env.NODE_ENV !== 'production';
const MONGO_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu';

let db;

// Permission constants
const PERMISSIONS = {
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  LEAVE_VIEW: 'leave:view',
  LEAVE_MANAGE: 'leave:manage',
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_MANAGE: 'payroll:manage',
  REPORTS_VIEW: 'reports:view',
  FILES_VIEW: 'files:view',
  FILES_MANAGE: 'files:manage',
  DEPARTMENTS_VIEW: 'departments:view',
  DEPARTMENTS_MANAGE: 'departments:manage',
  ADMIN_PERMISSIONS: 'admin:permissions'
};

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
  user: ['leave:view'],
  manager: ['leave:view', 'leave:manage', 'users:view'],
  admin: [
    'leave:view', 'leave:manage', 'users:view', 'users:manage',
    'payroll:view', 'payroll:manage', 'reports:view', 'files:view',
    'files:manage', 'departments:view', 'departments:manage', 'admin:permissions'
  ]
};

// Permission middleware
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

// Multer configuration for file uploads (commented out - not used)
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//   }
// });

// Connect to MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB at ${MONGO_URL}`);
    console.log(`📊 Using database: ${DB_NAME}`);

    // Initialize sample data
    await initializeData();

    // Update existing users with permissions
    await updateExistingUsersPermissions();

    console.log('📊 Database initialization completed');

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Initialize sample data
async function initializeData() {
  try {
    // Check if admin user exists
    const adminUser = await db.collection('users').findOne({ username: 'admin' });

    if (!adminUser) {
      const hashedPassword = bcrypt.hashSync('admin', 10);
      await db.collection('users').insertOne({
        username: 'admin',
        password: hashedPassword,
        name: '관리자',
        role: 'admin',
        isActive: true,
        permissions: DEFAULT_PERMISSIONS.admin,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Admin user created');
    }

    // Create indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('leaveRequests').createIndex({ userId: 1 });
    await db.collection('leaveRequests').createIndex({ status: 1 });
    await db.collection('leaveRequests').createIndex({ startDate: 1 });

    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ Error initializing data:', error);
  }
}

// Update existing users with permissions
async function updateExistingUsersPermissions() {
  try {
    const users = await db.collection('users').find({ permissions: { $exists: false } }).toArray();

    for (const user of users) {
      const permissions = DEFAULT_PERMISSIONS[user.role] || [];
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { permissions, updatedAt: new Date() } }
      );
    }

    if (users.length > 0) {
      console.log(`✅ Updated ${users.length} users with default permissions`);
    }
  } catch (error) {
    console.error('❌ Error updating user permissions:', error);
  }
}

// Middleware setup
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(securityHeaders);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// Routes will be initialized after database connection

// Health check
app.get('/api/health', (_, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: isDevelopment ? 'development' : 'production',
    database: 'MongoDB',
    dbUrl: MONGO_URL,
    dbName: DB_NAME
  });
});

// Available permissions endpoint
app.get('/api/permissions', requireAuth, requirePermission(PERMISSIONS.ADMIN_PERMISSIONS), (_, res) => {
  const availablePermissions = [
    { id: 'users:view', name: '사용자 조회', category: '사용자 관리' },
    { id: 'users:manage', name: '사용자 관리', category: '사용자 관리' },
    { id: 'leave:view', name: '휴가 조회', category: '휴가 관리' },
    { id: 'leave:manage', name: '휴가 관리', category: '휴가 관리' },
    { id: 'payroll:view', name: '급여 조회', category: '급여 관리' },
    { id: 'payroll:manage', name: '급여 관리', category: '급여 관리' },
    { id: 'reports:view', name: '보고서 조회', category: '보고서' },
    { id: 'files:view', name: '파일 조회', category: '파일 관리' },
    { id: 'files:manage', name: '파일 관리', category: '파일 관리' },
    { id: 'departments:view', name: '부서 조회', category: '부서 관리' },
    { id: 'departments:manage', name: '부서 관리', category: '부서 관리' },
    { id: 'admin:permissions', name: '권한 관리', category: '관리자' }
  ];

  res.json({
    success: true,
    data: availablePermissions
  });
});

// Admin dashboard stats endpoint
app.get('/api/admin/stats/system', requireAuth, asyncHandler(async (_, res) => {
  // const currentDate = new Date();
  // const currentMonth = currentDate.toISOString().substring(0, 7);

  // Get current month data
  const totalUsers = await db.collection('users').countDocuments({ role: { $ne: 'admin' } });
  // const activeUsers = await db.collection('users').countDocuments({ isActive: true, role: { $ne: 'admin' } });

  // Basic payroll stats (placeholder data for now)
  const payrollData = {
    total_employees: totalUsers,
    total_payroll: 0,
    total_incentive: 0,
    total_bonus: 0,
    avg_salary: 0
  };

  res.json({
    success: true,
    data: payrollData
  });
}));

// Admin system health endpoint
app.get('/api/admin/system-health', requireAuth, asyncHandler(async (_, res) => {
  // Check database connection
  let dbHealth = 'excellent';
  let avgResponseTime = Math.floor(Math.random() * 50) + 10; // Mock response time

  try {
    const startTime = Date.now();
    await db.collection('users').findOne({});
    avgResponseTime = Date.now() - startTime;
  } catch (error) {
    dbHealth = 'poor';
    avgResponseTime = 999;
  }

  const healthData = {
    dbHealth,
    avgResponseTime,
    activeConnections: Math.floor(Math.random() * 10) + 1,
    systemLoad: Math.floor(Math.random() * 40) + 10,
    lastBackup: new Date().toISOString()
  };

  res.json({
    success: true,
    data: healthData
  });
}));

// Admin alerts endpoint
app.get('/api/admin/alerts', requireAuth, asyncHandler(async (_, res) => {
  // Generate some mock alerts
  const alerts = [
    {
      id: '1',
      type: 'info',
      title: '시스템 정상 작동',
      message: '모든 시스템이 정상적으로 작동 중입니다.',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      type: 'success',
      title: '백업 완료',
      message: '일일 데이터 백업이 성공적으로 완료되었습니다.',
      timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }
  ];

  res.json({
    success: true,
    data: alerts
  });
}));

// Admin performance stats endpoint
app.get('/api/admin/performance-stats', requireAuth, asyncHandler(async (_, res) => {
  // Mock performance data
  const performanceData = {
    topPerformers: [
      {
        name: '김직원',
        department: '물리치료',
        achievementRate: 95.5,
        totalEarnings: 3500000
      },
      {
        name: '박매니저',
        department: '간호, 원무',
        achievementRate: 88.2,
        totalEarnings: 4200000
      }
    ],
    departmentRankings: [
      {
        department: '물리치료',
        avgPerformance: 92.3,
        totalSales: 15000000
      },
      {
        department: '간호, 원무',
        avgPerformance: 87.8,
        totalSales: 12000000
      }
    ]
  };

  res.json({
    success: true,
    data: performanceData
  });
}));

// Departments endpoints

app.get('/api/organization-chart', requireAuth, asyncHandler(async (_, res) => {
  try {
    const users = await db.collection('users').find(
      { isActive: true },
      { projection: { password: 0 } }
    ).toArray();

    // Simple organization structure
    const adminUsers = users.filter(u => u.role === 'admin');
    const managerUsers = users.filter(u => u.role === 'manager');
    const regularUsers = users.filter(u => u.role === 'user');

    const organizationTree = adminUsers.map(admin => ({
      ...admin,
      subordinates: managerUsers.concat(regularUsers)
    }));

    const summary = {
      totalEmployees: users.length,
      totalDepartments: new Set(users.map(u => u.department).filter(d => d)).size,
      managersCount: managerUsers.length,
      adminCount: adminUsers.length
    };

    res.json({
      success: true,
      data: {
        organizationTree,
        summary
      }
    });
  } catch (error) {
    console.error('Get organization chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

app.get('/api/positions', requireAuth, asyncHandler(async (_, res) => {
  try {
    // Get unique positions from users collection
    const positions = await db.collection('users').aggregate([
      { $match: { isActive: true, position: { $exists: true, $ne: null, $ne: '' } } },
      {
        $group: {
          _id: '$position',
          employeeCount: { $sum: 1 },
          departments: { $addToSet: '$department' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const positionsWithData = positions.map(pos => ({
      _id: pos._id,
      title: pos._id,
      employeeCount: pos.employeeCount,
      department: pos.departments.length === 1 ? pos.departments[0] : '',
      description: '',
      level: 1, // Default level
      isActive: true
    }));

    res.json({ success: true, data: positionsWithData });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

// Initialize routes after database connection
async function initializeRoutes() {
  console.log('🔗 Initializing routes...');

  // Add debug middleware
  app.use((req, _, next) => {
    console.log(`📍 Request: ${req.method} ${req.url}`);
    next();
  });

  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/users', createUserRoutes(db));
  app.use('/api/leave', createLeaveRoutes(db));
  app.use('/api/departments', createDepartmentRoutes(db));
  app.use('/api/payroll', createPayrollRoutes(db));
  app.use('/api/bonus', createBonusRoutes(db));
  app.use('/api/sales', createSalesRoutes(db));
  app.use('/api/payroll-upload', createUploadRoutes(db));
  app.use('/api/reports', createReportsRoutes(db));
  app.use('/api/admin', createAdminRoutes(db));

  // Error handling middleware
  app.use(errorHandler);

  // 404 handler - must be last
  app.use('*', (_, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  console.log('✅ Routes initialized');
}

// Start server
async function startServer() {
  await connectDB();
  await initializeRoutes();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  process.exit(0);
});

// Start the application
startServer().catch(console.error);

module.exports = app;