/*
 * AI-HEADER
 * Intent: Security middleware for payroll endpoints
 * Domain Meaning: Protects payroll APIs from security threats
 * Misleading Names: None
 * Data Contracts: Validates and sanitizes all payroll-related requests
 * PII: Handles sensitive salary data with enhanced security
 * Invariants: All requests must be sanitized; Rate limiting enforced
 * RAG Keywords: security, middleware, payroll, sanitization, rate-limit
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-security-middleware-protection
 */

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');

/**
 * Rate limiter for payroll endpoints
 * DomainMeaning: Prevents API abuse through rate limiting
 * SideEffects: May block legitimate requests if limit exceeded
 * Invariants: Max 100 requests per 15 minutes per IP
 * RAG_Keywords: rate, limit, payroll, api
 */
const payrollRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 * DomainMeaning: Enhanced rate limiting for critical operations
 * SideEffects: Blocks requests exceeding strict limits
 * Invariants: Max 10 requests per 5 minutes for uploads/deletes
 * RAG_Keywords: rate, limit, strict, upload, delete
 */
const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Rate limit exceeded for this operation.',
  skipSuccessfulRequests: false
});

/**
 * Sanitize payroll input data
 * DomainMeaning: Removes malicious content from payroll data
 * MisleadingNames: None
 * SideEffects: Modifies request body
 * Invariants: All string fields sanitized; Numbers validated
 * RAG_Keywords: sanitize, payroll, input, xss
 */
function sanitizePayrollInput(req, res, next) {
  try {
    if (!req.body) {
      return next();
    }

    // Sanitize string fields
    const stringFields = ['userId', 'paymentStatus', 'note', 'reason'];
    stringFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Remove XSS attempts
        req.body[field] = xss(req.body[field]);
        // Trim whitespace
        req.body[field] = req.body[field].trim();
        // Escape HTML entities
        req.body[field] = validator.escape(req.body[field]);
      }
    });

    // Validate and sanitize numeric fields
    const numericFields = ['year', 'month', 'baseSalary'];
    numericFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const value = parseFloat(req.body[field]);
        if (isNaN(value) || value < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid ${field} value`
          });
        }
        req.body[field] = value;
      }
    });

    // Validate year and month ranges
    if (req.body.year) {
      const currentYear = new Date().getFullYear();
      if (req.body.year < 2020 || req.body.year > currentYear + 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year value'
        });
      }
    }

    if (req.body.month) {
      if (req.body.month < 1 || req.body.month > 12) {
        return res.status(400).json({
          success: false,
          error: 'Invalid month value'
        });
      }
    }

    // Sanitize nested objects (allowances, deductions)
    ['allowances', 'deductions'].forEach(section => {
      if (req.body[section] && typeof req.body[section] === 'object') {
        Object.keys(req.body[section]).forEach(key => {
          const value = parseFloat(req.body[section][key]);
          if (isNaN(value) || value < 0) {
            req.body[section][key] = 0;
          } else {
            req.body[section][key] = value;
          }
        });
      }
    });

    next();
  } catch (error) {
    console.error('Error in sanitizePayrollInput:', error);
    res.status(500).json({
      success: false,
      error: 'Input validation error'
    });
  }
}

/**
 * Validate file uploads
 * DomainMeaning: Ensures uploaded files are safe
 * MisleadingNames: None
 * SideEffects: May reject valid files if validation fails
 * Invariants: Only Excel/PDF files allowed; Size limits enforced
 * RAG_Keywords: validate, file, upload, security
 */
function validateFileUpload(fileType = 'excel') {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    const file = req.file;

    // Validate file size
    const maxSizes = {
      excel: 10 * 1024 * 1024, // 10MB
      pdf: 5 * 1024 * 1024 // 5MB
    };

    const maxSize = maxSizes[fileType] || 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`
      });
    }

    // Validate file type
    const allowedTypes = {
      excel: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ],
      pdf: ['application/pdf']
    };

    const allowed = allowedTypes[fileType] || [];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Only ${fileType} files are allowed.`
      });
    }

    // Sanitize filename
    if (file.originalname) {
      // Remove path traversal attempts
      file.originalname = file.originalname.replace(/\.\./g, '');
      file.originalname = file.originalname.replace(/[\/\\]/g, '_');
      
      // Limit filename length
      if (file.originalname.length > 255) {
        const ext = file.originalname.split('.').pop();
        file.originalname = file.originalname.substring(0, 200) + '.' + ext;
      }
    }

    next();
  };
}

/**
 * Add security headers
 * DomainMeaning: Sets security headers to prevent attacks
 * MisleadingNames: None
 * SideEffects: Modifies response headers
 * Invariants: All responses include security headers
 * RAG_Keywords: security, headers, csp, xss
 */
function addSecurityHeaders(req, res, next) {
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  next();
}

/**
 * Log security events
 * DomainMeaning: Logs security-related events for monitoring
 * MisleadingNames: None
 * SideEffects: Writes to log files
 * Invariants: All security events logged
 * RAG_Keywords: log, security, audit, monitoring
 */
function logSecurityEvent(eventType, details, req) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?._id || 'anonymous',
    path: req.path,
    method: req.method,
    details
  };

  console.log('[SECURITY]', JSON.stringify(logEntry));
  
  // In production, this should write to a dedicated security log file
  // or send to a centralized logging service
}

/**
 * Validate MongoDB ObjectId
 * DomainMeaning: Ensures ID parameters are valid MongoDB ObjectIds
 * MisleadingNames: None
 * SideEffects: May reject valid requests with invalid IDs
 * Invariants: Only valid ObjectIds allowed in ID parameters
 * RAG_Keywords: validate, mongodb, objectid, parameter
 */
function validateObjectId(req, res, next) {
  const { id } = req.params;
  
  if (id) {
    // Check if it's a valid MongoDB ObjectId
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      logSecurityEvent('INVALID_OBJECT_ID', { id }, req);
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format'
      });
    }
  }
  
  next();
}

/**
 * Prevent NoSQL injection
 * DomainMeaning: Sanitizes input to prevent NoSQL injection attacks
 * MisleadingNames: None
 * SideEffects: Modifies request data
 * Invariants: Removes MongoDB operators from input
 * RAG_Keywords: nosql, injection, mongodb, sanitize
 */
function preventNoSQLInjection(req, res, next) {
  // Remove any keys that start with $ or contain dots
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (/^\$/.test(key) || /\./.test(key)) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  
  next();
}

module.exports = {
  payrollRateLimiter,
  strictRateLimiter,
  sanitizePayrollInput,
  validateFileUpload,
  addSecurityHeaders,
  logSecurityEvent,
  validateObjectId,
  preventNoSQLInjection
};