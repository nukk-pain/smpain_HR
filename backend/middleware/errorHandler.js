const { ObjectId } = require('mongodb');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(500).json({
      success: false,
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.message
    });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 10MB.'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const validationError = new Error(error.details[0].message);
      validationError.name = 'ValidationError';
      return next(validationError);
    }
    next();
  };
};

// MongoDB ObjectId validation
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
    }
    next();
  };
};

// JWT Authentication middleware
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');
    
    const token = extractTokenFromHeader(authHeader);
    console.log('🔍 Extracted token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.error('❌ No token found in authorization header');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - No token provided'
      });
    }
    
    const decoded = verifyToken(token);
    console.log('✅ Token verified successfully:', { userId: decoded.id, role: decoded.role });
    req.user = decoded; // Set user info for route handlers
    next();
  } catch (error) {
    console.error('❌ JWT Auth error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Role-based authorization middleware (JWT-based)
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Rate limiting middleware
const createRateLimiter = (windowMs, max) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const userRequests = requests.get(ip).filter(time => time > windowStart);
    
    if (userRequests.length >= max) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
    }

    userRequests.push(now);
    requests.set(ip, userRequests);
    next();
  };
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    // ALLOWED_ORIGINS 환경변수가 있으면 사용, 없으면 기본값 사용
    const customOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [];
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          ...customOrigins,
          // Vercel deployments - 모든 Vercel preview URL 허용
          /^https:\/\/.*\.vercel\.app$/,
          /^https:\/\/.*-.*\.vercel\.app$/,
          // Production URLs
          'https://hr-frontend.vercel.app',
          'https://hr-frontend-git-main.vercel.app',
          // Legacy origins
          'https://hr.smpain.synology.me',
          'http://hr.smpain.synology.me',
          'https://hrbackend.smpain.synology.me',
          'http://192.168.0.30:3727',
          'http://192.168.0.30:8090', // Nginx Proxy Manager
          // Development origins (for production backend with dev frontend)
          'http://localhost:3000', 
          'http://localhost:3727', 
          'http://localhost:3728', 
          'http://localhost:5173',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3727', 
          'http://127.0.0.1:3728',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:8080',
          process.env.FRONTEND_URL
        ].filter(Boolean)
      : [
          // Development origins
          'http://localhost:3000', 
          'http://localhost:3727', 
          'http://localhost:3728', // 추가 포트
          'http://localhost:3729', // 프리뷰 기능 테스트용 포트
          'http://localhost:5173',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3727', 
          'http://127.0.0.1:3728', // 127.0.0.1 주소 추가
          'http://127.0.0.1:3729', // 프리뷰 기능 테스트용 포트
          'http://127.0.0.1:5173',
          'http://127.0.0.1:8080'
        ];
    
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin (including regex patterns)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'x-csrf-token'],
  exposedHeaders: ['Set-Cookie']
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potential XSS patterns
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

module.exports = {
  errorHandler,
  asyncHandler,
  validateRequest,
  validateObjectId,
  requireAuth,
  requireRole,
  createRateLimiter,
  requestLogger,
  corsOptions,
  securityHeaders,
  sanitizeInput
};