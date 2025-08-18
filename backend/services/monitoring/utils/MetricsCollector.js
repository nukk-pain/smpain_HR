/**
 * AI-HEADER
 * intent: Utility functions for collecting system and application metrics
 * domain_meaning: Gathers performance metrics for monitoring and alerting
 * misleading_names: None
 * data_contracts: Returns metric objects with standardized structure
 * PII: No PII data collected
 * invariants: Metrics collection must not impact application performance
 * rag_keywords: metrics collection, performance monitoring, system metrics
 */

const os = require('os');
const v8 = require('v8');

/**
 * DomainMeaning: Helper class for collecting various system metrics
 * MisleadingNames: None
 * SideEffects: None - read only operations
 * Invariants: All methods must be non-blocking
 * RAG_Keywords: metrics, performance, monitoring, system stats
 * DuplicatePolicy: canonical
 * FunctionIdentity: metrics-collector-001
 */
class MetricsCollector {
  /**
   * DomainMeaning: Collect CPU usage metrics
   * MisleadingNames: None
   * SideEffects: None - reads system stats
   * Invariants: Must return valid CPU percentage
   * RAG_Keywords: cpu usage, system load, performance
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-cpu-metrics-001
   */
  static getCPUMetrics() {
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
      loadAverage: os.loadavg(),
      cores: cpus.length
    };
  }

  /**
   * DomainMeaning: Collect memory usage metrics
   * MisleadingNames: None
   * SideEffects: None - reads memory stats
   * Invariants: Must return memory in MB
   * RAG_Keywords: memory usage, heap, RAM, memory stats
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-memory-metrics-001
   */
  static getMemoryMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    return {
      system: {
        total: Math.round(totalMemory / 1024 / 1024),
        free: Math.round(freeMemory / 1024 / 1024),
        used: Math.round(usedMemory / 1024 / 1024),
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      process: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
      },
      heap: {
        totalHeapSize: Math.round(heapStats.total_heap_size / 1024 / 1024),
        usedHeapSize: Math.round(heapStats.used_heap_size / 1024 / 1024),
        heapSizeLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024),
        mallocedMemory: Math.round(heapStats.malloced_memory / 1024 / 1024),
        externalMemory: Math.round(heapStats.external_memory / 1024 / 1024)
      }
    };
  }

  /**
   * DomainMeaning: Measure event loop delay
   * MisleadingNames: None
   * SideEffects: None - measures timing
   * Invariants: Must return delay in milliseconds
   * RAG_Keywords: event loop, latency, performance
   * DuplicatePolicy: canonical
   * FunctionIdentity: measure-event-loop-001
   */
  static async measureEventLoopDelay() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const end = process.hrtime.bigint();
        const delay = Number(end - start) / 1000000; // Convert to milliseconds
        resolve(delay);
      });
    });
  }

  /**
   * DomainMeaning: Get garbage collection statistics
   * MisleadingNames: None
   * SideEffects: None - reads GC stats if available
   * Invariants: Must handle absence of GC stats gracefully
   * RAG_Keywords: garbage collection, GC stats, memory management
   * DuplicatePolicy: canonical
   * FunctionIdentity: get-gc-stats-001
   */
  static getGCStats() {
    try {
      if (global.gc) {
        // Force a garbage collection if exposed
        global.gc();
        
        const heapStats = v8.getHeapStatistics();
        return {
          numberOfNativeContexts: heapStats.number_of_native_contexts,
          numberOfDetachedContexts: heapStats.number_of_detached_contexts,
          gcTime: process.cpuUsage().system / 1000 // Approximate GC time in ms
        };
      }
      
      return {
        numberOfNativeContexts: 0,
        numberOfDetachedContexts: 0,
        gcTime: 0,
        note: 'GC stats not available (run with --expose-gc flag)'
      };
    } catch (error) {
      return {
        error: 'Failed to collect GC stats',
        message: error.message
      };
    }
  }

  /**
   * DomainMeaning: Collect all system metrics
   * MisleadingNames: None
   * SideEffects: None - aggregates all metrics
   * Invariants: Must return complete metrics object
   * RAG_Keywords: system metrics, performance data, monitoring
   * DuplicatePolicy: canonical
   * FunctionIdentity: collect-all-metrics-001
   */
  static async collectAllMetrics() {
    const [cpuMetrics, memoryMetrics, eventLoopDelay, gcStats] = await Promise.all([
      this.getCPUMetrics(),
      this.getMemoryMetrics(),
      this.measureEventLoopDelay(),
      this.getGCStats()
    ]);
    
    return {
      timestamp: new Date(),
      cpu: cpuMetrics,
      memory: memoryMetrics,
      eventLoop: {
        delay: eventLoopDelay
      },
      gc: gcStats,
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }
}

module.exports = MetricsCollector;