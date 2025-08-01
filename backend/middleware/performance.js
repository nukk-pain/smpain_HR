// Performance monitoring and optimization middleware
const { cacheManager } = require('../utils/cache');

/**
 * Request timing middleware
 */
function requestTimer(req, res, next) {
  const start = Date.now();
  
  // Add start time to request
  req.startTime = start;
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    
    // Add timing header
    res.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests (over 1 second)
    if (duration > 1000) {
      console.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
    
    // Log performance metrics
    logPerformanceMetrics(req, res, duration);
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Memory usage monitoring middleware
 */
function memoryMonitor(req, res, next) {
  const memUsage = process.memoryUsage();
  
  // Warning if memory usage is high (over 512MB)
  if (memUsage.rss > 512 * 1024 * 1024) {
    console.warn('⚠️ High memory usage:', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }
  
  // Add memory info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Memory-Usage', `${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  }
  
  next();
}

/**
 * Response compression middleware
 */
function enableCompression() {
  const compression = require('compression');
  
  return compression({
    // Only compress responses larger than 1KB
    threshold: 1024,
    
    // Compression filter
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // Use compression filter
      return compression.filter(req, res);
    },
    
    // Compression level (6 is a good balance of speed vs compression)
    level: 6,
    
    // Window size
    windowBits: 15,
    
    // Memory level
    memLevel: 8
  });
}

/**
 * Static file caching headers
 */
function staticFileCache(req, res, next) {
  // Set cache headers for static files
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    // Cache for 1 year
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.match(/\.(html|htm)$/)) {
    // Cache HTML for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');
  }
  
  next();
}

/**
 * API response caching middleware
 */
function apiCache(duration = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip caching if user is authenticated (for personalized data)
    if (req.session && req.user) {
      return next();
    }
    
    // Create cache key
    const cacheKey = `api:${req.originalUrl}`;
    
    // Try to get from cache
    const cached = cacheManager.get(cacheKey, 'short');
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Override res.json to cache response
    const originalJson = res.json;
    res.json = function(data) {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheManager.set(cacheKey, data, 'short', duration);
        res.set('X-Cache', 'MISS');
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Request rate limiting
 */
function rateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [ip, timestamps] of requests.entries()) {
      const filtered = timestamps.filter(time => time > windowStart);
      if (filtered.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, filtered);
      }
    }
    
    // Get current requests for this IP
    const currentRequests = requests.get(key) || [];
    const recentRequests = currentRequests.filter(time => time > windowStart);
    
    // Check rate limit
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    // Add headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - recentRequests.length),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });
    
    next();
  };
}

/**
 * Query optimization hints
 */
function addQueryHints(req, res, next) {
  // Add database query hints based on request pattern
  req.queryHints = {};
  
  // User-related queries
  if (req.originalUrl.includes('/users')) {
    if (req.query.department) {
      req.queryHints.index = { department: 1, isActive: 1 };
    } else if (req.query.role) {
      req.queryHints.index = { role: 1, isActive: 1 };
    } else {
      req.queryHints.index = { isActive: 1, createdAt: -1 };
    }
  }
  
  // Leave request queries
  if (req.originalUrl.includes('/leave')) {
    if (req.query.status) {
      req.queryHints.index = { status: 1, createdAt: -1 };
    } else if (req.query.startDate && req.query.endDate) {
      req.queryHints.index = { startDate: 1, endDate: 1 };
    } else {
      req.queryHints.index = { userId: 1, status: 1 };
    }
  }
  
  // Department queries
  if (req.originalUrl.includes('/departments')) {
    req.queryHints.index = { isActive: 1, name: 1 };
  }
  
  next();
}

/**
 * Log performance metrics
 */
function logPerformanceMetrics(req, res, duration) {
  const metrics = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    duration: duration,
    statusCode: res.statusCode,
    contentLength: res.get('Content-Length') || 0,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  };
  
  // In production, you might want to send this to a monitoring service
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Performance Metrics:', metrics);
  }
  
  // Store in cache for monitoring dashboard
  const metricsKey = `metrics:${Date.now()}`;
  cacheManager.set(metricsKey, metrics, 'short', 3600); // Keep for 1 hour
}

/**
 * Performance monitoring dashboard data
 */
function getPerformanceStats() {
  const allKeys = cacheManager.keys('short');
  const metricsKeys = allKeys.filter(key => key.startsWith('metrics:'));
  
  const metrics = metricsKeys.map(key => cacheManager.get(key, 'short')).filter(Boolean);
  
  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowestRequests: [],
      errorRate: 0,
      requestsByEndpoint: {},
      memoryUsage: process.memoryUsage()
    };
  }
  
  const totalRequests = metrics.length;
  const averageResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
  const slowestRequests = metrics
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map(m => ({ url: m.url, duration: m.duration, timestamp: m.timestamp }));
  
  const errorRequests = metrics.filter(m => m.statusCode >= 400);
  const errorRate = (errorRequests.length / totalRequests) * 100;
  
  const requestsByEndpoint = metrics.reduce((acc, m) => {
    const endpoint = m.url.split('?')[0]; // Remove query params
    acc[endpoint] = (acc[endpoint] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    slowestRequests,
    errorRate: Math.round(errorRate * 100) / 100,
    requestsByEndpoint,
    memoryUsage: process.memoryUsage(),
    cacheStats: cacheManager.getStats()
  };
}

/**
 * Health check endpoint
 */
function healthCheck() {
  return (req, res) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cache: cacheManager.getStats()
    };
    
    // Check if memory usage is concerning
    if (memUsage.rss > 1024 * 1024 * 1024) { // Over 1GB
      health.status = 'warning';
      health.warnings = ['High memory usage'];
    }
    
    res.json(health);
  };
}

module.exports = {
  requestTimer,
  memoryMonitor,
  enableCompression,
  staticFileCache,
  apiCache,
  rateLimiter,
  addQueryHints,
  getPerformanceStats,
  healthCheck
};