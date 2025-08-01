// Load environment variables based on NODE_ENV and environment
if (process.env.NODE_ENV === 'production') {
  // Check if running in Cloud Run (Google Cloud sets this)
  if (process.env.K_SERVICE) {
    require('dotenv').config({ path: '.env.cloudrun' });
    console.log('🌐 Loading Cloud Run configuration');
  } else {
    require('dotenv').config({ path: '.env.production' });
    console.log('🏢 Loading production configuration');
  }
} else {
  // Try .env.development first, then fall back to .env
  const result = require('dotenv').config({ path: '.env.development' });
  if (result.error) {
    require('dotenv').config();
  }
  console.log('🔧 Loading development configuration');
}

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
// const multer = require('multer'); // Not used currently

// Import route modules
const createAuthRoutes = require('./routes/auth');
const createUserRoutes = require('./routes/users');
const leaveRoutes = require('./routes/leave');
const createDepartmentRoutes = require('./routes/departments');
const createPositionRoutes = require('./routes/positions');
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
const PORT = process.env.PORT || 8080;

// MongoDB connection setup
const isDevelopment = process.env.NODE_ENV !== 'production';

// MongoDB connection string with authentication
// For Atlas, use MONGODB_URI environment variable
const MONGO_URL = process.env.MONGODB_URI || process.env.MONGODB_URL || (isDevelopment
  ? 'mongodb://localhost:27017'
  : 'mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu'
);
const DB_NAME = process.env.DB_NAME || 'SM_nomu';

// Debug logging
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 MONGODB_URI from env:', process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@'));
console.log('🔍 MONGODB_URL from env:', process.env.MONGODB_URL);
console.log('🔍 Using connection string:', (process.env.MONGODB_URI || process.env.MONGODB_URL || 'fallback')?.replace(/:[^:]*@/, ':****@'));
console.log('🔍 Using MONGO_URL:', MONGO_URL);
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';
const SESSION_NAME = process.env.SESSION_NAME || 'connect.sid';
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000; // 24시간
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3727';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

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
    'users:view', 'users:manage', 'users:create', 'users:edit', 'users:delete',
    'leave:view', 'leave:manage', 'payroll:view', 'payroll:manage',
    'reports:view', 'files:view', 'files:manage', 'departments:view',
    'departments:manage', 'admin:permissions'
  ]
};

// Permission middleware
// JWT-based permission middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userPermissions = req.user.permissions || [];
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
  console.log('🚀 Starting MongoDB connection...');
  try {
    // MongoDB Atlas connection options
    const connectionOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const client = new MongoClient(MONGO_URL, connectionOptions);
    await client.connect();
    db = client.db(DB_NAME);

    // Mask password in connection string for logging
    const maskedUrl = MONGO_URL.replace(/:[^:]*@/, ':****@');
    console.log(`✅ Connected to MongoDB at ${maskedUrl}`);
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
      const hashedPassword = bcrypt.hashSync('admin', BCRYPT_ROUNDS);
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

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(securityHeaders);

// Session must be before CORS for cookie handling
const sessionConfig = {
  name: SESSION_NAME,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URL,
    dbName: DB_NAME,
    collectionName: 'sessions',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' allows cross-site cookies with secure
    domain: undefined // Let browser handle domain
  }
};

console.log('🔐 Session configuration:', {
  name: SESSION_NAME,
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  maxAge: sessionConfig.cookie.maxAge,
  environment: process.env.NODE_ENV
});

app.use(session(sessionConfig));

// CORS setup after session
app.use(cors(corsOptions));

// Force CORS headers for production (in case reverse proxy strips them)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://hr.smpain.synology.me', 
      'https://hrbackend.smpain.synology.me',
      'https://smpain-hr.vercel.app',
      'https://hr-frontend.vercel.app',
      'https://hr-frontend-git-main.vercel.app',
      'https://hr-frontend-git-cloud.vercel.app'
    ];

    // Also check for Vercel preview URLs (pattern matching)
    const isVercelPreview = origin && /^https:\/\/.*\.vercel\.app$/.test(origin);

    if (allowedOrigins.includes(origin) || isVercelPreview) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.sendStatus(204);
    }

    next();
  });
}

// Routes will be initialized after database connection

// Health check
app.get('/api/health', (_, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    deployedAt: process.env.DEPLOYED_AT || new Date().toISOString(),
    buildId: process.env.BUILD_ID || 'unknown',
    version: '2025.07.31-cors-fix',
    environment: isDevelopment ? 'development' : 'production',
    database: 'MongoDB',
    dbUrl: MONGO_URL,
    dbName: DB_NAME
  });
});

// CORS test endpoint
app.options('/api/cors-test', cors(corsOptions));
app.get('/api/cors-test', cors(corsOptions), (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
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


// Initialize routes after database connection
async function initializeRoutes() {
  console.log('🔗 Initializing routes...');


  // Make database available to all routes through app.locals
  app.locals.db = db;


  app.use('/api/auth', createAuthRoutes(db));
  app.use('/api/users', createUserRoutes(db));
  app.use('/api/leave', leaveRoutes);
  app.use('/api/departments', createDepartmentRoutes(db));
  app.use('/api/positions', createPositionRoutes(db));
  app.use('/api/payroll', createPayrollRoutes(db));
  app.use('/api/bonus', createBonusRoutes(db));
  app.use('/api/sales', createSalesRoutes(db));
  app.use('/api/payroll-upload', createUploadRoutes(db));
  app.use('/api/reports', createReportsRoutes(db));
  app.use('/api/admin', createAdminRoutes(db));

  // Health check endpoint for Cloud Run
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Error handling middleware
  app.use(errorHandler);

  // 404 handler - must be last
  app.use('*', (_, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  console.log('✅ Routes initialized');
}

// Ensure admin permissions are up to date
async function ensureAdminPermissions() {
  try {
    const result = await db.collection('users').updateOne(
      { username: 'admin' },
      {
        $set: {
          permissions: DEFAULT_PERMISSIONS.admin
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Admin permissions updated');
    } else {
      console.log('✅ Admin permissions already up to date');
    }
  } catch (error) {
    console.error('❌ Error updating admin permissions:', error.message);
  }
}

// Start server
async function startServer() {
  await connectDB();
  await ensureAdminPermissions();
  await initializeRoutes();

  server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  });
}

// Handle graceful shutdown
let server;

const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');

      // Close database connection if available
      if (global.db && global.db.close) {
        global.db.close(() => {
          console.log('✅ Database connection closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing shutdown...');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start the application
console.log('🏁 Starting server application...');
startServer().catch(error => {
  console.error('💥 Server startup failed:', error);
  process.exit(1);
});

module.exports = app;