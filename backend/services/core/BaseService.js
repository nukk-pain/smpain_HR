/**
 * Base Service Class
 * Foundation for all modular services with common dependencies
 */

class BaseService {
  constructor(dependencies = {}) {
    // Core dependencies injection
    this.logger = dependencies.logger || console;
    this.db = dependencies.db || null;
    this.config = dependencies.config || {};
    this.cache = dependencies.cache || null;
    
    // Service metadata
    this.serviceName = this.constructor.name;
    this.initialized = false;
    this.startTime = Date.now();
    
    // Performance tracking
    this.metrics = {
      callCount: 0,
      errorCount: 0,
      totalDuration: 0
    };
  }
  
  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    this.logger.info(`Initializing ${this.serviceName}...`);
    
    try {
      await this.onInitialize();
      this.initialized = true;
      this.logger.info(`${this.serviceName} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.serviceName}:`, error);
      throw error;
    }
  }
  
  /**
   * Override this method in derived classes for custom initialization
   */
  async onInitialize() {
    // Override in derived classes
  }
  
  /**
   * Shutdown the service gracefully
   */
  async shutdown() {
    if (!this.initialized) {
      return;
    }
    
    this.logger.info(`Shutting down ${this.serviceName}...`);
    
    try {
      await this.onShutdown();
      this.initialized = false;
      this.logger.info(`${this.serviceName} shut down successfully`);
    } catch (error) {
      this.logger.error(`Error during ${this.serviceName} shutdown:`, error);
      throw error;
    }
  }
  
  /**
   * Override this method in derived classes for custom shutdown
   */
  async onShutdown() {
    // Override in derived classes
  }
  
  /**
   * Wrap async methods with error handling and metrics
   */
  wrapMethod(methodName, method) {
    return async (...args) => {
      const startTime = Date.now();
      this.metrics.callCount++;
      
      try {
        const result = await method.apply(this, args);
        this.metrics.totalDuration += Date.now() - startTime;
        return result;
      } catch (error) {
        this.metrics.errorCount++;
        this.metrics.totalDuration += Date.now() - startTime;
        
        this.logger.error(`${this.serviceName}.${methodName} failed:`, {
          error: error.message,
          stack: error.stack,
          args: this.sanitizeArgs(args)
        });
        
        throw error;
      }
    };
  }
  
  /**
   * Sanitize arguments for logging (remove sensitive data)
   */
  sanitizeArgs(args) {
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    
    return args.map(arg => {
      if (typeof arg !== 'object' || arg === null) {
        return arg;
      }
      
      const sanitized = { ...arg };
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });
      
      return sanitized;
    });
  }
  
  /**
   * Get service health status
   */
  getHealth() {
    const uptime = Date.now() - this.startTime;
    const avgDuration = this.metrics.callCount > 0 
      ? this.metrics.totalDuration / this.metrics.callCount 
      : 0;
    
    return {
      service: this.serviceName,
      status: this.initialized ? 'healthy' : 'not_initialized',
      uptime,
      metrics: {
        ...this.metrics,
        avgDuration,
        errorRate: this.metrics.callCount > 0 
          ? this.metrics.errorCount / this.metrics.callCount 
          : 0
      }
    };
  }
  
  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized;
  }
}

module.exports = BaseService;