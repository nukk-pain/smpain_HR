/**
 * Metrics Collector Service
 * Collects system and application metrics
 */

const os = require('os');
const v8 = require('v8');
const BaseService = require('../core/BaseService');
const IMetricsCollector = require('../interfaces/IMetricsCollector');
const MetricsDTO = require('../dto/MetricsDTO');

class MetricsCollector extends BaseService {
  constructor(dependencies) {
    super(dependencies);
    this.collectionName = 'system_metrics';
    this.collection = null;
    this.metricsBuffer = [];
    this.bufferFlushInterval = 5000; // 5 seconds
    this.flushTimer = null;
  }
  
  async onInitialize() {
    if (this.db) {
      this.collection = this.db.collection(this.collectionName);
      await this.ensureIndexes();
    }
    
    // Start buffer flush timer
    this.startBufferFlush();
  }
  
  async onShutdown() {
    // Stop buffer flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining metrics
    await this.flushMetricsBuffer();
  }
  
  async ensureIndexes() {
    if (!this.collection) return;
    
    try {
      await this.collection.createIndex({ timestamp: -1 });
      await this.collection.createIndex({ 'tags.type': 1, timestamp: -1 });
      await this.collection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days TTL
      );
    } catch (error) {
      this.logger.error('Failed to create indexes:', error);
    }
  }
  
  /**
   * Start periodic buffer flush
   */
  startBufferFlush() {
    this.flushTimer = setInterval(async () => {
      await this.flushMetricsBuffer();
    }, this.bufferFlushInterval);
  }
  
  /**
   * Flush metrics buffer to database
   */
  async flushMetricsBuffer() {
    if (this.metricsBuffer.length === 0 || !this.collection) {
      return;
    }
    
    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      await this.collection.insertMany(metricsToFlush);
      this.logger.debug(`Flushed ${metricsToFlush.length} metrics to database`);
    } catch (error) {
      this.logger.error('Failed to flush metrics buffer:', error);
      // Re-add metrics to buffer if flush failed
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }
  
  /**
   * Collect all system metrics
   */
  async collectMetrics() {
    const metrics = MetricsDTO.createSystemMetrics({
      cpu: await this.getCPUMetrics(),
      memory: this.getMemoryMetrics(),
      disk: await this.getDiskMetrics(),
      network: await this.getNetworkMetrics(),
      eventLoopDelay: await this.measureEventLoopDelay(),
      gcStats: await this.getGCStats(),
      ...this.getProcessMetrics()
    });
    
    // Buffer the metrics
    this.metricsBuffer.push(metrics.toObject());
    
    // Flush if buffer is getting large
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetricsBuffer();
    }
    
    return metrics;
  }
  
  /**
   * Get CPU metrics
   */
  async getCPUMetrics() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return {
      usage: usage,
      count: cpus.length,
      loadAverage: os.loadavg(),
      model: cpus[0].model
    };
  }
  
  /**
   * Get memory metrics
   */
  getMemoryMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = process.memoryUsage();
    
    return {
      system: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percentage: (usedMem / totalMem) * 100
      },
      process: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers || 0
      },
      heap: v8.getHeapStatistics()
    };
  }
  
  /**
   * Get disk metrics (placeholder - needs implementation based on OS)
   */
  async getDiskMetrics() {
    // This would need OS-specific implementation
    return {
      available: null,
      used: null,
      total: null
    };
  }
  
  /**
   * Get network metrics (placeholder)
   */
  async getNetworkMetrics() {
    // This would need more sophisticated implementation
    return {
      interfaces: os.networkInterfaces(),
      connections: null
    };
  }
  
  /**
   * Measure event loop delay
   */
  async measureEventLoopDelay() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        resolve(delay);
      });
    });
  }
  
  /**
   * Get garbage collection statistics
   */
  async getGCStats() {
    if (typeof global.gc !== 'function') {
      return null; // GC not exposed
    }
    
    try {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      return {
        heapFreed: before.heapUsed - after.heapUsed,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get GC stats:', error);
      return null;
    }
  }
  
  /**
   * Get process metrics
   */
  getProcessMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }
  
  /**
   * Get database metrics
   */
  async collectDatabaseMetrics() {
    if (!this.db) {
      return null;
    }
    
    try {
      const stats = await this.db.stats();
      const serverStatus = await this.db.admin().serverStatus();
      
      return {
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        connections: {
          current: serverStatus.connections?.current,
          available: serverStatus.connections?.available
        },
        opcounters: serverStatus.opcounters
      };
    } catch (error) {
      this.logger.error('Failed to collect database metrics:', error);
      return null;
    }
  }
  
  /**
   * Get system health
   */
  async getSystemHealth() {
    const metrics = await this.collectMetrics();
    const dbMetrics = await this.collectDatabaseMetrics();
    
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      checks: {}
    };
    
    // Check CPU usage
    if (metrics.cpu && metrics.cpu.usage > 80) {
      health.status = 'degraded';
      health.checks.cpu = { status: 'warning', message: `High CPU usage: ${metrics.cpu.usage}%` };
    }
    
    // Check memory usage
    if (metrics.memory && metrics.memory.system.percentage > 85) {
      health.status = 'degraded';
      health.checks.memory = { status: 'warning', message: `High memory usage: ${metrics.memory.system.percentage.toFixed(2)}%` };
    }
    
    // Check event loop delay
    if (metrics.eventLoopDelay > 100) {
      health.status = 'degraded';
      health.checks.eventLoop = { status: 'warning', message: `High event loop delay: ${metrics.eventLoopDelay.toFixed(2)}ms` };
    }
    
    // Check database connections
    if (dbMetrics && dbMetrics.connections) {
      const connectionUsage = (dbMetrics.connections.current / dbMetrics.connections.available) * 100;
      if (connectionUsage > 80) {
        health.status = 'degraded';
        health.checks.database = { status: 'warning', message: `High DB connection usage: ${connectionUsage.toFixed(2)}%` };
      }
    }
    
    return health;
  }
  
  /**
   * Record a custom metric
   */
  async recordMetric(name, value, tags = {}) {
    const metric = new MetricsDTO({
      name,
      value,
      tags,
      timestamp: new Date()
    });
    
    this.metricsBuffer.push(metric.toObject());
    
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetricsBuffer();
    }
  }
  
  /**
   * Get metric history
   */
  async getMetricHistory(metricName, startDate, endDate) {
    if (!this.collection) {
      return [];
    }
    
    try {
      const history = await this.collection.find({
        name: metricName,
        timestamp: { $gte: startDate, $lte: endDate }
      })
      .sort({ timestamp: 1 })
      .toArray();
      
      return history;
    } catch (error) {
      this.logger.error('Failed to get metric history:', error);
      return [];
    }
  }
}

module.exports = MetricsCollector;