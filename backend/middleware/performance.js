const os = require('os');
const process = require('process');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(), // endpoint -> { count, totalTime, errors }
      systemStats: {
        startTime: Date.now(),
        requestCount: 0,
        errorCount: 0,
        activeConnections: 0
      },
      responseTimeHistory: [],
      memoryUsageHistory: [],
      cpuUsageHistory: []
    };
    
    this.startPerformanceTracking();
  }

  // Start background performance tracking
  startPerformanceTracking() {
    // Track system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 3600000);
  }

  // Collect system performance metrics
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const systemLoad = os.loadavg();

    // Store memory usage
    this.metrics.memoryUsageHistory.push({
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external
    });

    // Store CPU usage
    this.metrics.cpuUsageHistory.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system,
      systemLoad: systemLoad[0] // 1-minute load average
    });

    // Keep only last 100 entries
    if (this.metrics.memoryUsageHistory.length > 100) {
      this.metrics.memoryUsageHistory = this.metrics.memoryUsageHistory.slice(-100);
    }
    
    if (this.metrics.cpuUsageHistory.length > 100) {
      this.metrics.cpuUsageHistory = this.metrics.cpuUsageHistory.slice(-100);
    }
  }

  // Request timing middleware
  requestTimingMiddleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      const startMemory = process.memoryUsage();
      
      // Increment active connections
      this.metrics.systemStats.activeConnections++;
      this.metrics.systemStats.requestCount++;

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        this.recordRequest(req, res, responseTime, startMemory);
        this.metrics.systemStats.activeConnections--;
        
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Record request metrics
  recordRequest(req, res, responseTime, startMemory) {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const endMemory = process.memoryUsage();
    
    // Initialize endpoint metrics if not exists
    if (!this.metrics.requests.has(endpoint)) {
      this.metrics.requests.set(endpoint, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        lastAccess: Date.now(),
        memoryImpact: 0
      });
    }

    const endpointMetrics = this.metrics.requests.get(endpoint);
    
    // Update metrics
    endpointMetrics.count++;
    endpointMetrics.totalTime += responseTime;
    endpointMetrics.minTime = Math.min(endpointMetrics.minTime, responseTime);
    endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, responseTime);
    endpointMetrics.lastAccess = Date.now();
    endpointMetrics.memoryImpact += endMemory.heapUsed - startMemory.heapUsed;

    // Track errors
    if (res.statusCode >= 400) {
      endpointMetrics.errors++;
      this.metrics.systemStats.errorCount++;
    }

    // Store response time in history
    this.metrics.responseTimeHistory.push({
      timestamp: Date.now(),
      endpoint,
      responseTime,
      statusCode: res.statusCode,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed
    });

    // Keep only last 1000 response times
    if (this.metrics.responseTimeHistory.length > 1000) {
      this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.slice(-1000);
    }

    // Log slow requests
    if (responseTime > 1000) { // Slower than 1 second
      console.warn(`🐌 Slow request detected: ${endpoint} took ${responseTime.toFixed(2)}ms`);
    }

    // Log memory-intensive requests
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    if (memoryDelta > 10 * 1024 * 1024) { // More than 10MB
      console.warn(`🧠 Memory-intensive request: ${endpoint} used ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const uptime = Date.now() - this.metrics.systemStats.startTime;
    const requestMetrics = Array.from(this.metrics.requests.entries()).map(([endpoint, metrics]) => ({
      endpoint,
      count: metrics.count,
      avgResponseTime: metrics.totalTime / metrics.count,
      minResponseTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
      maxResponseTime: metrics.maxTime,
      errorRate: (metrics.errors / metrics.count) * 100,
      lastAccess: metrics.lastAccess,
      avgMemoryImpact: metrics.memoryImpact / metrics.count
    }));

    // Calculate system averages
    const recentResponseTimes = this.metrics.responseTimeHistory.slice(-100);
    const avgResponseTime = recentResponseTimes.length > 0 
      ? recentResponseTimes.reduce((sum, r) => sum + r.responseTime, 0) / recentResponseTimes.length
      : 0;

    const recentMemoryUsage = this.metrics.memoryUsageHistory.slice(-10);
    const avgMemoryUsage = recentMemoryUsage.length > 0
      ? recentMemoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemoryUsage.length
      : 0;

    const recentCpuUsage = this.metrics.cpuUsageHistory.slice(-10);
    const avgCpuLoad = recentCpuUsage.length > 0
      ? recentCpuUsage.reduce((sum, c) => sum + c.systemLoad, 0) / recentCpuUsage.length
      : 0;

    return {
      system: {
        uptime: Math.floor(uptime / 1000), // seconds
        totalRequests: this.metrics.systemStats.requestCount,
        totalErrors: this.metrics.systemStats.errorCount,
        activeConnections: this.metrics.systemStats.activeConnections,
        errorRate: (this.metrics.systemStats.errorCount / this.metrics.systemStats.requestCount) * 100,
        avgResponseTime: avgResponseTime.toFixed(2),
        avgMemoryUsage: Math.floor(avgMemoryUsage / 1024 / 1024), // MB
        avgCpuLoad: avgCpuLoad.toFixed(2)
      },
      endpoints: requestMetrics.sort((a, b) => b.count - a.count), // Sort by most used
      slowestEndpoints: requestMetrics
        .filter(e => e.avgResponseTime > 100) // Only endpoints slower than 100ms
        .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
        .slice(0, 10),
      errorProneEndpoints: requestMetrics
        .filter(e => e.errorRate > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 10),
      memoryIntensiveEndpoints: requestMetrics
        .filter(e => e.avgMemoryImpact > 1024 * 1024) // More than 1MB on average
        .sort((a, b) => b.avgMemoryImpact - a.avgMemoryImpact)
        .slice(0, 10)
    };
  }

  // Get real-time system metrics
  getCurrentSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const systemLoad = os.loadavg();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();

    return {
      memory: {
        heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
        external: Math.floor(memoryUsage.external / 1024 / 1024), // MB
        systemFree: Math.floor(freeMemory / 1024 / 1024), // MB
        systemTotal: Math.floor(totalMemory / 1024 / 1024), // MB
        systemUsagePercent: ((totalMemory - freeMemory) / totalMemory * 100).toFixed(1)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAvg1: systemLoad[0].toFixed(2),
        loadAvg5: systemLoad[1].toFixed(2),
        loadAvg15: systemLoad[2].toFixed(2),
        coreCount: os.cpus().length
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()), // seconds
        pid: process.pid
      }
    };
  }

  // Health check based on performance metrics
  getHealthStatus() {
    const current = this.getCurrentSystemMetrics();
    const summary = this.getPerformanceSummary();
    
    const health = {
      status: 'healthy',
      score: 100,
      issues: [],
      recommendations: []
    };

    // Check memory usage
    if (current.memory.systemUsagePercent > 90) {
      health.score -= 30;
      health.issues.push('High system memory usage');
      health.recommendations.push('Consider adding more RAM or optimizing memory usage');
    } else if (current.memory.systemUsagePercent > 80) {
      health.score -= 15;
      health.issues.push('Moderate system memory usage');
    }

    // Check CPU load
    if (current.cpu.loadAvg1 > current.cpu.coreCount * 0.8) {
      health.score -= 25;
      health.issues.push('High CPU load');
      health.recommendations.push('Optimize CPU-intensive operations or scale horizontally');
    }

    // Check response times
    if (summary.system.avgResponseTime > 1000) {
      health.score -= 20;
      health.issues.push('Slow response times');
      health.recommendations.push('Optimize database queries and add caching');
    } else if (summary.system.avgResponseTime > 500) {
      health.score -= 10;
      health.issues.push('Moderate response times');
    }

    // Check error rate
    if (summary.system.errorRate > 5) {
      health.score -= 30;
      health.issues.push('High error rate');
      health.recommendations.push('Investigate and fix recurring errors');
    } else if (summary.system.errorRate > 1) {
      health.score -= 10;
      health.issues.push('Moderate error rate');
    }

    // Determine overall status
    if (health.score >= 80) {
      health.status = 'healthy';
    } else if (health.score >= 60) {
      health.status = 'warning';
    } else if (health.score >= 40) {
      health.status = 'degraded';
    } else {
      health.status = 'critical';
    }

    return health;
  }

  // Clean old metrics data
  cleanOldMetrics() {
    const oneHourAgo = Date.now() - 3600000;
    
    // Clean old response time history
    this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.filter(
      r => r.timestamp > oneHourAgo
    );

    // Reset endpoint metrics for inactive endpoints
    for (const [endpoint, metrics] of this.metrics.requests.entries()) {
      if (metrics.lastAccess < oneHourAgo) {
        this.metrics.requests.delete(endpoint);
      }
    }

    console.log('🧹 Cleaned old performance metrics');
  }

  // Generate performance report
  generatePerformanceReport() {
    const summary = this.getPerformanceSummary();
    const health = this.getHealthStatus();
    const current = this.getCurrentSystemMetrics();

    return {
      timestamp: new Date().toISOString(),
      health,
      system: current,
      performance: summary,
      alerts: this.generatePerformanceAlerts(summary, current)
    };
  }

  // Generate performance alerts
  generatePerformanceAlerts(summary, current) {
    const alerts = [];

    // Memory alerts
    if (current.memory.systemUsagePercent > 85) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: `System memory usage is ${current.memory.systemUsagePercent}%`,
        recommendation: 'Monitor memory usage and consider optimization'
      });
    }

    // Response time alerts
    if (summary.system.avgResponseTime > 800) {
      alerts.push({
        type: 'performance',
        severity: 'medium',
        message: `Average response time is ${summary.system.avgResponseTime}ms`,
        recommendation: 'Optimize slow endpoints and database queries'
      });
    }

    // Error rate alerts
    if (summary.system.errorRate > 2) {
      alerts.push({
        type: 'errors',
        severity: 'high',
        message: `Error rate is ${summary.system.errorRate.toFixed(2)}%`,
        recommendation: 'Investigate and fix recurring errors'
      });
    }

    // CPU load alerts
    if (current.cpu.loadAvg1 > current.cpu.coreCount * 0.7) {
      alerts.push({
        type: 'cpu',
        severity: 'medium',
        message: `CPU load average is ${current.cpu.loadAvg1}`,
        recommendation: 'Monitor CPU usage and optimize intensive operations'
      });
    }

    return alerts;
  }

  // Middleware for performance monitoring
  performanceMiddleware() {
    return this.requestTimingMiddleware();
  }
}

module.exports = PerformanceMonitor;